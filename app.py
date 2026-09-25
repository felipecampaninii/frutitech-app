import os
import base64
import math
import secrets
import requests
from pathlib import Path
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "false").lower() == "true"
)
origens_permitidas = [
    origem.strip()
    for origem in os.environ.get("ALLOWED_ORIGINS", "").split(",")
    if origem.strip()
]
if origens_permitidas:
    CORS(
        app,
        resources={r"/api/*": {"origins": origens_permitidas}},
        supports_credentials=True
    )

@app.route('/')
def pagina_inicial():
    return render_template('index.html')

# =========================================================
# CONFIGURAÇÃO LITEROUTER / VISÃO E BANCO DE DADOS
# =========================================================

# IMPORTANTE:
# Por segurança, use uma NOVA chave (a chave enviada no chat ficou exposta).
# No PowerShell:
#   $env:LITEROUTER_API_KEY="SUA_NOVA_CHAVE"
#
# O endpoint segue o formato OpenAI-compatible.
LITEROUTER_API_KEY = os.environ.get("LITEROUTER_API_KEY", "")
LITEROUTER_URL = "https://api.literouter.com/v1/chat/completions"

# Modelo multimodal/vision. Se sua conta LiteRouter usar outro ID de modelo
# com visão, altere somente esta linha.
LITEROUTER_MODEL = ("ministral-3b-2512:free")

TAMANHO_MAXIMO = 10 * 1024 * 1024
EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}


DB_CONFIG = {
    "host": os.environ.get("DB_HOST", ""),
    "port": int(os.environ.get("DB_PORT", "3306")),
    "user": os.environ.get("DB_USER", ""),
    "password": os.environ.get("DB_PASSWORD", ""),
    "database": os.environ.get("DB_NAME", "frutech_db"),
    "ssl_disabled": os.environ.get("DB_SSL_DISABLED", "false").lower() == "true"
}


def get_db_connection():
    """Cria e retorna uma conexão ativa com o banco."""
    if not DB_CONFIG["host"] or not DB_CONFIG["user"] or not DB_CONFIG["password"]:
        raise RuntimeError(
            "MySQL não configurado. Defina DB_HOST, DB_USER e DB_PASSWORD."
        )

    return mysql.connector.connect(**DB_CONFIG)


def coluna_existe(cursor, tabela, coluna):
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND COLUMN_NAME = %s
        """,
        (DB_CONFIG["database"], tabela, coluna)
    )
    return cursor.fetchone()[0] > 0


def constraint_existe(cursor, tabela, constraint_name):
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = %s
          AND TABLE_NAME = %s
          AND CONSTRAINT_NAME = %s
        """,
        (DB_CONFIG["database"], tabela, constraint_name)
    )
    return cursor.fetchone()[0] > 0


def index_existe(cursor, tabela, index_name):
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = %s
          AND TABLE_NAME = %s
          AND INDEX_NAME = %s
        """,
        (DB_CONFIG["database"], tabela, index_name)
    )
    return cursor.fetchone()[0] > 0


def init_db():
    """Cria as tabelas e realiza as migrações no banco Aiven."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Usuários
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS usuarios (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                cidade VARCHAR(100) DEFAULT NULL,
                estado VARCHAR(10) DEFAULT NULL,
                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        cursor.execute(
            "ALTER TABLE usuarios MODIFY COLUMN password VARCHAR(255) NOT NULL"
        )

        # 2. Histórico já nasce vinculado a usuário em instalações novas.
        # usuario_id fica NULL na estrutura para permitir migração de históricos antigos.
        # Todo novo registro criado pela API exige usuario_id válido.
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS historico_simulacoes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                usuario_id INT NULL,
                data_registro VARCHAR(60) NOT NULL,

                producao INT DEFAULT 0,
                area DECIMAL(10,2) DEFAULT 0.00,
                arvores INT DEFAULT 0,
                idade DECIMAL(6,2) DEFAULT 0.00,

                medida1 DECIMAL(10,3) DEFAULT 0.000,
                medida2 DECIMAL(10,3) DEFAULT 0.000,
                altura_total DECIMAL(10,3) DEFAULT 0.000,
                altura_caule DECIMAL(10,3) DEFAULT 0.000,
                espacamento_linhas DECIMAL(10,3) DEFAULT 0.000,
                espacamento_plantas DECIMAL(10,3) DEFAULT 0.000,

                diametro_medio DECIMAL(10,3) DEFAULT 0.000,
                altura_util DECIMAL(10,3) DEFAULT 0.000,
                volume_copa DECIMAL(14,3) DEFAULT 0.000,
                volume_copas_talhao DECIMAL(16,3) DEFAULT 0.000,
                trv DECIMAL(16,3) DEFAULT 0.000,
                trv_por_hectare DECIMAL(16,3) DEFAULT 0.000,

                finalidade VARCHAR(30) DEFAULT NULL,
                produtividade_ton DECIMAL(10,3) DEFAULT 0.000,
                n_foliar DECIMAL(10,3) DEFAULT 0.000,
                p_resina DECIMAL(10,3) DEFAULT 0.000,
                k_trocavel DECIMAL(10,3) DEFAULT 0.000,

                objetivo VARCHAR(50) NOT NULL,
                elemento VARCHAR(20) NOT NULL,
                fonte VARCHAR(150) NOT NULL,
                produto_nome VARCHAR(120) DEFAULT NULL,
                produto_fabricante VARCHAR(120) DEFAULT NULL,
                produto_identificacao VARCHAR(120) DEFAULT NULL,
                concentracao DECIMAL(10,3) DEFAULT 0.000,
                concentracao_mg_l DECIMAL(12,3) DEFAULT 0.000,

                volume DECIMAL(14,3) DEFAULT 0.000,
                volume_por_hectare DECIMAL(14,3) DEFAULT 0.000,
                massa_micronutriente DECIMAL(14,6) DEFAULT 0.000,
                massa_fonte_total DECIMAL(14,6) DEFAULT 0.000,
                dose_min_rotulo DECIMAL(14,6) DEFAULT 0.000,
                dose_max_rotulo DECIMAL(14,6) DEFAULT 0.000,
                dose_por_100l DECIMAL(14,6) DEFAULT 0.000,
                validacao_dose VARCHAR(20) DEFAULT NULL,
                confirmacao_cultura TINYINT(1) DEFAULT 0,
                confirmacao_dose TINYINT(1) DEFAULT 0,
                confirmacao_mistura TINYINT(1) DEFAULT 0,
                confirmacao_calibracao TINYINT(1) DEFAULT 0,

                n_recomendado DECIMAL(12,3) DEFAULT 0.000,
                p2o5_recomendado DECIMAL(12,3) DEFAULT 0.000,
                k2o_recomendado DECIMAL(12,3) DEFAULT 0.000,
                dose_mistura DECIMAL(14,3) DEFAULT 0.000,

                n_entregue DECIMAL(12,3) DEFAULT 0.000,
                p2o5_entregue DECIMAL(12,3) DEFAULT 0.000,
                k2o_entregue DECIMAL(12,3) DEFAULT 0.000,

                status_n VARCHAR(20) DEFAULT NULL,
                status_p VARCHAR(20) DEFAULT NULL,
                status_k VARCHAR(20) DEFAULT NULL,

                criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                INDEX idx_historico_usuario (usuario_id),
                CONSTRAINT fk_historico_usuario
                    FOREIGN KEY (usuario_id)
                    REFERENCES usuarios(id)
                    ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        """)

        # 3. Migração para bancos onde historico_simulacoes já existia.
        if not coluna_existe(cursor, "historico_simulacoes", "usuario_id"):
            cursor.execute(
                "ALTER TABLE historico_simulacoes "
                "ADD COLUMN usuario_id INT NULL AFTER id"
            )

        # Novas colunas usadas pela metodologia matemática do simulador.
        novas_colunas = {
            "medida1": "DECIMAL(10,3) DEFAULT 0.000",
            "medida2": "DECIMAL(10,3) DEFAULT 0.000",
            "altura_total": "DECIMAL(10,3) DEFAULT 0.000",
            "altura_caule": "DECIMAL(10,3) DEFAULT 0.000",
            "espacamento_linhas": "DECIMAL(10,3) DEFAULT 0.000",
            "espacamento_plantas": "DECIMAL(10,3) DEFAULT 0.000",
            "diametro_medio": "DECIMAL(10,3) DEFAULT 0.000",
            "altura_util": "DECIMAL(10,3) DEFAULT 0.000",
            "volume_copa": "DECIMAL(14,3) DEFAULT 0.000",
            "volume_copas_talhao": "DECIMAL(16,3) DEFAULT 0.000",
            "trv": "DECIMAL(16,3) DEFAULT 0.000",
            "trv_por_hectare": "DECIMAL(16,3) DEFAULT 0.000",
            "finalidade": "VARCHAR(30) DEFAULT NULL",
            "produtividade_ton": "DECIMAL(10,3) DEFAULT 0.000",
            "n_foliar": "DECIMAL(10,3) DEFAULT 0.000",
            "p_resina": "DECIMAL(10,3) DEFAULT 0.000",
            "k_trocavel": "DECIMAL(10,3) DEFAULT 0.000",
            "concentracao_mg_l": "DECIMAL(12,3) DEFAULT 0.000",
            "produto_nome": "VARCHAR(120) DEFAULT NULL",
            "produto_fabricante": "VARCHAR(120) DEFAULT NULL",
            "produto_identificacao": "VARCHAR(120) DEFAULT NULL",
            "volume_por_hectare": "DECIMAL(14,3) DEFAULT 0.000",
            "massa_micronutriente": "DECIMAL(14,6) DEFAULT 0.000",
            "massa_fonte_total": "DECIMAL(14,6) DEFAULT 0.000",
            "dose_min_rotulo": "DECIMAL(14,6) DEFAULT 0.000",
            "dose_max_rotulo": "DECIMAL(14,6) DEFAULT 0.000",
            "dose_por_100l": "DECIMAL(14,6) DEFAULT 0.000",
            "validacao_dose": "VARCHAR(20) DEFAULT NULL",
            "confirmacao_cultura": "TINYINT(1) DEFAULT 0",
            "confirmacao_dose": "TINYINT(1) DEFAULT 0",
            "confirmacao_mistura": "TINYINT(1) DEFAULT 0",
            "confirmacao_calibracao": "TINYINT(1) DEFAULT 0",
            "n_recomendado": "DECIMAL(12,3) DEFAULT 0.000",
            "p2o5_recomendado": "DECIMAL(12,3) DEFAULT 0.000",
            "k2o_recomendado": "DECIMAL(12,3) DEFAULT 0.000",
            "dose_mistura": "DECIMAL(14,3) DEFAULT 0.000",
            "n_entregue": "DECIMAL(12,3) DEFAULT 0.000",
            "p2o5_entregue": "DECIMAL(12,3) DEFAULT 0.000",
            "k2o_entregue": "DECIMAL(12,3) DEFAULT 0.000",
            "status_n": "VARCHAR(20) DEFAULT NULL",
            "status_p": "VARCHAR(20) DEFAULT NULL",
            "status_k": "VARCHAR(20) DEFAULT NULL"
        }

        for nome_coluna, definicao in novas_colunas.items():
            if not coluna_existe(cursor, "historico_simulacoes", nome_coluna):
                cursor.execute(
                    f"ALTER TABLE historico_simulacoes "
                    f"ADD COLUMN {nome_coluna} {definicao}"
                )

        cursor.execute(
            "ALTER TABLE historico_simulacoes "
            "MODIFY COLUMN idade DECIMAL(6,2) DEFAULT 0.00"
        )

        if not index_existe(cursor, "historico_simulacoes", "idx_historico_usuario"):
            cursor.execute(
                "CREATE INDEX idx_historico_usuario "
                "ON historico_simulacoes (usuario_id)"
            )

        if not constraint_existe(cursor, "historico_simulacoes", "fk_historico_usuario"):
            cursor.execute("""
                ALTER TABLE historico_simulacoes
                ADD CONSTRAINT fk_historico_usuario
                FOREIGN KEY (usuario_id)
                REFERENCES usuarios(id)
                ON DELETE CASCADE
            """)

        conn.commit()
        cursor.close()
        conn.close()

        print(
            "\n>>> SUCESSO: banco e tabelas inicializados. "
            "O histórico agora possui vínculo por usuário.\n"
        )

    except Exception as e:
        print("\n================ ERRO NA CONEXÃO/MIGRAÇÃO DO MYSQL ================")
        print(e)
        print("===================================================================\n")


# =========================================================
# ROTAS DE AUTENTICAÇÃO
# =========================================================
@app.route('/api/register', methods=['POST'])
def registrar_usuario():
    dados = request.get_json() or {}
    username = str(dados.get('username', '')).strip().lower()
    password = str(dados.get('password', ''))

    if not username or not password:
        return jsonify({"erro": "Usuário e senha são obrigatórios."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM usuarios WHERE username = %s", (username,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"erro": "Este nome de usuário já está cadastrado."}), 400

        hashed_password = generate_password_hash(password)

        cursor.execute(
            "INSERT INTO usuarios (username, password) VALUES (%s, %s)",
            (username, hashed_password)
        )
        conn.commit()
        novo_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({
            "mensagem": "Cadastro realizado com sucesso!",
            "usuario": {
                "id": novo_id,
                "username": username,
                "cidade": None,
                "estado": None
            }
        }), 201

    except Exception:
        app.logger.exception("Erro ao cadastrar usuário")
        return jsonify({"erro": "Erro interno ao cadastrar usuário."}), 500


@app.route('/api/login', methods=['POST'])
def login_usuario():
    dados = request.get_json() or {}
    username = str(dados.get('username', '')).strip().lower()
    password = str(dados.get('password', ''))

    if not username or not password:
        return jsonify({"erro": "Usuário e senha são obrigatórios."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, username, password, cidade, estado "
            "FROM usuarios WHERE username = %s",
            (username,)
        )
        usuario = cursor.fetchone()

        cursor.close()
        conn.close()

        if not usuario or not check_password_hash(usuario['password'], password):
            return jsonify({"erro": "Usuário ou senha incorretos."}), 401

        session.clear()
        session["usuario_id"] = int(usuario["id"])

        return jsonify({
            "mensagem": "Login efetuado com sucesso!",
            "usuario": {
                "id": usuario['id'],
                "username": usuario['username'],
                "cidade": usuario['cidade'],
                "estado": usuario['estado']
            }
        }), 200

    except Exception as e:
        app.logger.exception("Erro durante o login")
        return jsonify({"erro": "Erro interno durante o login."}), 500


@app.route('/api/logout', methods=['POST'])
def logout_usuario():
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada."}), 200


def usuario_da_sessao(usuario_id_recebido=None):
    """Retorna o usuário autenticado e impede acesso cruzado por alteração de ID."""
    autenticado = session.get("usuario_id")
    if autenticado is None:
        return None
    if usuario_id_recebido is not None:
        try:
            if int(usuario_id_recebido) != int(autenticado):
                return None
        except (TypeError, ValueError):
            return None
    return int(autenticado)


@app.route('/api/usuario/localizacao', methods=['POST'])
def salvar_localizacao_usuario():
    dados = request.get_json() or {}
    cidade = str(dados.get('cidade', '')).strip()
    estado = str(dados.get('estado', '')).strip()
    usuario_id = usuario_da_sessao()

    if usuario_id is None:
        return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 401

    if not cidade or not estado:
        return jsonify({"erro": "Dados de localização incompletos."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE usuarios SET cidade = %s, estado = %s WHERE id = %s",
            (cidade[:100], estado[:10], usuario_id)
        )
        conn.commit()

        if cursor.rowcount == 0:
            cursor.close()
            conn.close()
            return jsonify({"erro": "Usuário não encontrado."}), 404

        cursor.close()
        conn.close()

        return jsonify({
            "mensagem": "Localização do usuário atualizada no MySQL local!"
        }), 200

    except Exception:
        app.logger.exception("Erro ao atualizar localização")
        return jsonify({"erro": "Não foi possível atualizar a localização."}), 500


# =========================================================
# ROTA POST: DIAGNÓSTICO POR IMAGEM COM LITEROUTER VISION
# =========================================================

PROMPT_DIAGNOSTICO = """
Você é o sistema de diagnóstico visual do Fru-tech, especializado
EXCLUSIVAMENTE em plantas do gênero Citrus.

Sua função é analisar imagens de laranjeiras, limoeiros, tangerineiras,
limeiras e outros citros, procurando sinais de deficiências nutricionais,
doenças, pragas e estresses visíveis em folhas, frutos e ramos.

============================================================
ETAPA 1 — CONFIRME SE É CITRUS
============================================================

Antes de realizar qualquer diagnóstico, avalie se a planta ou material
vegetal da imagem apresenta características visuais compatíveis com Citrus.

Considere formato das folhas, margem, nervuras, pecíolo, textura,
disposição das folhas, frutos e demais características visíveis.

Se houver evidências suficientes de que NÃO é Citrus, responda somente:

**Imagem incompatível com Citrus:** A planta apresentada não possui
características visuais suficientes ou compatíveis com plantas do gênero
Citrus. O Fru-tech realiza diagnósticos exclusivamente em citros.

Nesse caso, NÃO faça diagnóstico de deficiência, doença ou praga.

Se não for possível determinar a espécie, mas a planta ainda for
visualmente compatível com Citrus, prossiga normalmente.

============================================================
ETAPA 2 — ANALISE OS SINTOMAS VISÍVEIS
============================================================

Antes de escolher um diagnóstico, examine sistematicamente:

- folhas novas ou folhas velhas afetadas;
- amarelecimento uniforme;
- clorose entre as nervuras;
- nervuras verdes ou amareladas;
- padrão simétrico ou assimétrico;
- manchas amareladas;
- manchas marrons ou escuras;
- pontuações;
- halos;
- lesões elevadas;
- aspecto corticoso;
- necrose;
- queimadura das bordas;
- secamento das pontas;
- deformação das folhas;
- folhas pequenas;
- encarquilhamento;
- queda de folhas;
- encurtamento de entrenós;
- morte de ponteiros;
- lesões em ramos;
- alterações nos frutos;
- manchas na casca;
- deformação do fruto;
- tamanho anormal;
- rachaduras;
- queda prematura.

Considere também se a distribuição dos sintomas é compatível com
nutrientes móveis ou pouco móveis na planta.

============================================================
ETAPA 3 — DEFICIÊNCIAS NUTRICIONAIS
============================================================

Compare os sintomas observados com deficiências nutricionais conhecidas
em Citrus, incluindo:

MACRONUTRIENTES:
- Nitrogênio (N)
- Fósforo (P)
- Potássio (K)
- Cálcio (Ca)
- Magnésio (Mg)
- Enxofre (S)

MICRONUTRIENTES:
- Boro (B)
- Cobre (Cu)
- Ferro (Fe)
- Manganês (Mn)
- Molibdênio (Mo)
- Níquel (Ni)
- Zinco (Zn)

Não escolha um nutriente apenas porque existe amarelecimento.

Compare o PADRÃO e a LOCALIZAÇÃO dos sintomas com outras deficiências
que possam produzir aparência semelhante.

============================================================
ETAPA 4 — DOENÇAS E PRAGAS
============================================================

Considere também doenças e pragas importantes dos citros quando seus
sinais forem visualmente compatíveis.

Compare, quando pertinente, condições como:

- Huanglongbing (HLB/greening);
- cancro cítrico;
- pinta-preta dos citros;
- verrugose;
- melanose;
- leprose dos citros;
- gomose/Phytophthora;
- mancha-marrom de Alternaria;
- fumagina;
- podridões e outras doenças visíveis;
- danos causados por ácaros;
- minador-dos-citros;
- cochonilhas;
- pulgões e outras pragas visualmente identificáveis.

NÃO diagnostique uma dessas condições apenas porque ela consta nesta lista.

Ela somente deve ser indicada quando os sinais realmente observados
forem compatíveis.

============================================================
ETAPA 5 — DIAGNÓSTICO DIFERENCIAL
============================================================

Antes de responder, compare mentalmente pelo menos as principais
hipóteses compatíveis.

Escolha como diagnóstico provável aquela que melhor explique o
CONJUNTO dos sinais visíveis.

Se duas ou mais condições forem visualmente muito semelhantes,
não invente certeza.

Informe a hipótese principal e mencione a alternativa relevante.

Evite respostas vagas como:

"pode ser deficiência de potássio ou magnésio ou fósforo".

Procure determinar qual hipótese apresenta maior compatibilidade com
o padrão observado e explique por quê.

============================================================
REGRAS IMPORTANTES
============================================================
- NÃO utilize linhas separadoras como "---", "***", "___" ou semelhantes.
- Não coloque barras invertidas antes de hífens ou outros caracteres.
- Separe as seções apenas com uma linha em branco.
- Analise exclusivamente Citrus.
- Use somente informações realmente visíveis na fotografia.
- Nunca invente sintomas.
- Não transforme uma possibilidade em certeza.
- Não diagnostique pela cor isoladamente.
- Considere simultaneamente localização, formato, distribuição e padrão
  dos sintomas.
- Diferencie deficiência nutricional de doença e dano causado por praga.
- Não confunda folhas naturalmente envelhecidas com deficiência.
- Não prescreva defensivos agrícolas ou doses apenas pela fotografia.
- Se a imagem estiver desfocada, distante ou inadequada, informe isso.
- Se houver fruto e folha na mesma imagem, considere os dois.
- Seja específico, técnico, mas fácil de compreender.
- Não escreva introduções ou despedidas.
- Não interrompa frases.
- Produza uma resposta apropriada para aparecer diretamente no Fru-tech.
- Mantenha a resposta aproximadamente entre 500 e 1000 caracteres.

============================================================
FORMATO DA RESPOSTA
============================================================

**Diagnóstico provável:**
Informe a condição mais compatível e deixe claro o grau de incerteza
quando necessário.

**Sinais identificados:**
Descreva SOMENTE os sinais realmente observados na fotografia e explique
quais deles sustentam a hipótese principal.

**Diagnóstico diferencial:**
Informe, quando relevante, uma condição semelhante e explique brevemente
por que ela parece menos compatível com a imagem.

**Recomendação:**
Informe como confirmar o diagnóstico, como análise foliar, análise de solo,
avaliação de frutos, inspeção de outras partes da planta ou avaliação de
um profissional qualificado.

A fotografia é uma ferramenta de triagem. Quando uma condição não puder
ser diferenciada visualmente com segurança, declare essa limitação.
""".strip()

def extrair_texto_literouter(dados):
    """Extrai conteúdo textual de respostas OpenAI-compatible."""
    try:
        content = dados["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError(
            "Resposta do LiteRouter não contém choices[0].message.content."
        )

    if isinstance(content, str):
        return content.strip()

    # Alguns provedores podem retornar content como lista de blocos.
    if isinstance(content, list):
        partes = []
        for bloco in content:
            if isinstance(bloco, dict):
                texto = bloco.get("text")
                if isinstance(texto, str):
                    partes.append(texto)
        resultado = "\n".join(partes).strip()
        if resultado:
            return resultado

    raise RuntimeError("LiteRouter retornou conteúdo vazio ou em formato inesperado.")


def analisar_com_literouter(conteudo_imagem, mime_type):
    if not LITEROUTER_API_KEY:
        raise RuntimeError(
            "LITEROUTER_API_KEY não configurada. "
            "Defina a variável de ambiente antes de iniciar o Flask."
        )

    imagem_base64 = base64.b64encode(conteudo_imagem).decode("ascii")
    data_url = f"data:{mime_type};base64,{imagem_base64}"

    payload = {
        "model": LITEROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Você analisa imagens de plantas com cautela, objetividade "
                    "e foco agronômico. Nunca invente detalhes não visíveis."
                )
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": PROMPT_DIAGNOSTICO
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url
                        }
                    }
                ]
            }
        ],
        "temperature": 0.2,
        "max_tokens": 1800,
        "stream": False
    }

    headers = {
        "Authorization": f"Bearer {LITEROUTER_API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    print("\n" + "=" * 70)
    print("FRU-TECH - DIAGNÓSTICO COM LITEROUTER VISION")
    print("=" * 70)
    print(f">>> Modelo: {LITEROUTER_MODEL}")
    print(f">>> MIME: {mime_type}")
    print(f">>> Imagem: {len(conteudo_imagem)} bytes")
    print(f">>> Base64: {len(imagem_base64)} caracteres")
    print(">>> Enviando imagem para o LiteRouter...")

    resposta = requests.post(
        LITEROUTER_URL,
        headers=headers,
        json=payload,
        timeout=120
    )

    print(f">>> Status HTTP: {resposta.status_code}")

    if not resposta.ok:
        corpo = resposta.text[:4000]
        print("\n" + "=" * 70)
        print("ERRO RETORNADO PELO LITEROUTER")
        print("=" * 70)
        print(corpo)
        print("=" * 70)
        raise RuntimeError(
            f"LiteRouter retornou HTTP {resposta.status_code}: {corpo}"
        )

    try:
        dados = resposta.json()
    except ValueError:
        raise RuntimeError(
            "LiteRouter respondeu HTTP 200, mas a resposta não é JSON válido."
        )

    diagnostico = extrair_texto_literouter(dados)

    choice = (dados.get("choices") or [{}])[0]
    finish_reason = choice.get("finish_reason")

    print("\n" + "=" * 70)
    print("ANÁLISE CONCLUÍDA")
    print("=" * 70)
    print(f">>> Finish reason: {finish_reason}")
    print(f">>> Tamanho do diagnóstico: {len(diagnostico)} caracteres")
    print("\n" + diagnostico)
    print("=" * 70 + "\n")

    if finish_reason == "length":
        print(
            "AVISO: o provedor informou finish_reason='length'. "
            "Aumente max_tokens se a resposta estiver incompleta."
        )

    return diagnostico, finish_reason


@app.route('/api/diagnostico', methods=['POST'])
def analisar_imagem():
    if usuario_da_sessao() is None:
        return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 401

    if not LITEROUTER_API_KEY:
        return jsonify({
            "erro": (
                "LITEROUTER_API_KEY não configurada no servidor. "
                "No PowerShell, defina $env:LITEROUTER_API_KEY e reinicie o app."
            )
        }), 503

    if 'imagem' not in request.files:
        return jsonify({
            "erro": "Nenhuma imagem foi enviada no formulário."
        }), 400

    arquivo = request.files['imagem']

    if not arquivo or arquivo.filename == '':
        return jsonify({
            "erro": "Nenhum arquivo de imagem foi selecionado."
        }), 400

    nome_arquivo = arquivo.filename or "imagem.jpg"
    extensao = Path(nome_arquivo).suffix.lower()

    if extensao not in EXTENSOES_PERMITIDAS:
        return jsonify({
            "erro": "Formato inválido. Envie JPG, JPEG, PNG ou WEBP."
        }), 400

    mime_type = (arquivo.mimetype or "").lower()
    if mime_type not in TIPOS_PERMITIDOS:
        return jsonify({
            "erro": "O arquivo enviado não é uma imagem JPG, PNG ou WEBP permitida."
        }), 400

    conteudo = arquivo.read()

    if not conteudo:
        return jsonify({
            "erro": "A imagem enviada está vazia."
        }), 400

    if len(conteudo) > TAMANHO_MAXIMO:
        return jsonify({
            "erro": "A imagem deve ter no máximo 10 MB."
        }), 413

    print("\n" + "#" * 70)
    print("NOVA SOLICITAÇÃO DE DIAGNÓSTICO")
    print("#" * 70)
    print(f">>> Arquivo: {nome_arquivo}")
    print(f">>> MIME: {mime_type}")
    print(f">>> Tamanho: {len(conteudo)} bytes")

    try:
        diagnostico, finish_reason = analisar_com_literouter(
            conteudo,
            mime_type
        )

        # Mantém a chave "diagnostico" usada pelo JavaScript atual.
        return jsonify({
            "sucesso": True,
            "arquivo": nome_arquivo,
            "modelo": LITEROUTER_MODEL,
            "diagnostico": diagnostico,
            "finish_reason": finish_reason,
            "aviso": (
                "O resultado é uma análise automatizada por imagem e deve ser "
                "confirmado por avaliação agronômica quando necessário."
            )
        }), 200

    except requests.exceptions.Timeout:
        print("ERRO: timeout ao consultar o LiteRouter.")
        return jsonify({
            "erro": "O LiteRouter demorou demais para responder. Tente novamente."
        }), 504

    except requests.exceptions.RequestException as e:
        print(f"ERRO DE CONEXÃO COM LITEROUTER: {e}")
        return jsonify({
            "erro": "Erro de conexão com o serviço de diagnóstico."
        }), 502

    except Exception as e:
        print("\n" + "!" * 70)
        print("ERRO DURANTE A ANÁLISE")
        print("!" * 70)
        print(str(e))
        print("!" * 70 + "\n")

        return jsonify({
            "erro": "Não foi possível analisar a imagem."
        }), 500


# =========================================================
# ROTAS DO SIMULADOR - HISTÓRICO SEPARADO POR USUÁRIO
# =========================================================
def usuario_existe(usuario_id):
    """Confere se o ID recebido pertence a um usuário cadastrado."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM usuarios WHERE id = %s", (usuario_id,))
    existe = cursor.fetchone() is not None
    cursor.close()
    conn.close()
    return existe


def numero_finito(dados, campo, minimo=None, maximo=None):
    """Converte um campo numérico e rejeita NaN, infinito e faixas inválidas."""
    try:
        valor = float(dados.get(campo))
    except (TypeError, ValueError):
        raise ValueError(f"Campo numérico inválido: {campo}.")

    if not math.isfinite(valor):
        raise ValueError(f"Campo numérico inválido: {campo}.")
    if minimo is not None and valor < minimo:
        raise ValueError(f"O campo {campo} está abaixo do mínimo permitido.")
    if maximo is not None and valor > maximo:
        raise ValueError(f"O campo {campo} está acima do máximo permitido.")
    return valor


def texto_limitado(dados, campo, limite, obrigatorio=False):
    valor = str(dados.get(campo, "") or "").strip()
    if obrigatorio and not valor:
        raise ValueError(f"Preencha o campo {campo}.")
    if len(valor) > limite:
        raise ValueError(f"O campo {campo} excede {limite} caracteres.")
    return valor


def validar_e_calcular_aplicacao(dados):
    """Refaz no servidor os cálculos críticos enviados pelo navegador."""
    area = numero_finito(dados, "area", 0.0001, 100000)
    concentracao_fonte = numero_finito(dados, "concentracao", 0.0001, 100)
    concentracao_mg_l = numero_finito(dados, "concentracao_mg_l", 0.0001, 1000000)
    volume_ha = numero_finito(dados, "volume_por_hectare", 0.0001, 100000)
    dose_min = numero_finito(dados, "dose_min_rotulo", 0, 100000)
    dose_max = numero_finito(dados, "dose_max_rotulo", 0.0001, 100000)

    if dose_min > dose_max:
        raise ValueError("A dose mínima do rótulo não pode superar a dose máxima.")

    confirmacoes = {
        "confirmacao_cultura": dados.get("confirmacao_cultura") is True,
        "confirmacao_dose": dados.get("confirmacao_dose") is True,
        "confirmacao_mistura": dados.get("confirmacao_mistura") is True,
        "confirmacao_calibracao": dados.get("confirmacao_calibracao") is True
    }
    if not all(confirmacoes.values()):
        raise ValueError("Todas as verificações de segurança devem ser confirmadas.")

    volume_total = volume_ha * area
    massa_nutriente = (concentracao_mg_l * volume_total) / 1_000_000
    massa_fonte = massa_nutriente / (concentracao_fonte / 100)
    dose_ha = massa_fonte / area
    dose_100l = (dose_ha / volume_ha) * 100

    if dose_ha < dose_min or dose_ha > dose_max:
        raise ValueError(
            f"Dose calculada de {dose_ha:.3f} kg/ha fora do intervalo informado "
            f"({dose_min:.3f} a {dose_max:.3f} kg/ha)."
        )

    faixa = max(dose_max - dose_min, 0.001)
    margem = min(dose_ha - dose_min, dose_max - dose_ha)
    status = "atencao" if margem / faixa < 0.1 else "conferido"

    return {
        "area": area,
        "concentracao_fonte": concentracao_fonte,
        "concentracao_mg_l": concentracao_mg_l,
        "volume_ha": volume_ha,
        "volume_total": volume_total,
        "massa_nutriente": massa_nutriente,
        "massa_fonte": massa_fonte,
        "dose_ha": dose_ha,
        "dose_100l": dose_100l,
        "dose_min": dose_min,
        "dose_max": dose_max,
        "status": status,
        **confirmacoes
    }


def validar_e_calcular_geometria(dados, area, arvores):
    """Refaz a modelagem geométrica e o TRV a partir das medidas primárias."""
    medida1 = numero_finito(dados, "medida1", 0.01, 100)
    medida2 = numero_finito(dados, "medida2", 0.01, 100)
    altura_total = numero_finito(dados, "altura_total", 0.01, 100)
    altura_caule = numero_finito(dados, "altura_caule", 0, 100)
    espacamento_linhas = numero_finito(dados, "espacamento_linhas", 0.01, 1000)
    espacamento_plantas = numero_finito(dados, "espacamento_plantas", 0.01, 1000)

    altura_util = altura_total - altura_caule
    if altura_util <= 0:
        raise ValueError("A altura total deve ser maior que a altura das primeiras ramificações.")

    diametro_medio = (medida1 + medida2) / 2
    volume_copa = (
        (4 / 3) * math.pi *
        (medida1 / 2) * (medida2 / 2) * (altura_util / 2)
    )
    volume_copas_talhao = volume_copa * arvores
    trv_por_hectare = (altura_util * diametro_medio * 10_000) / espacamento_linhas
    trv_total = trv_por_hectare * area

    return {
        "medida1": medida1,
        "medida2": medida2,
        "altura_total": altura_total,
        "altura_caule": altura_caule,
        "espacamento_linhas": espacamento_linhas,
        "espacamento_plantas": espacamento_plantas,
        "diametro_medio": diametro_medio,
        "altura_util": altura_util,
        "volume_copa": volume_copa,
        "volume_copas_talhao": volume_copas_talhao,
        "trv": trv_total,
        "trv_por_hectare": trv_por_hectare
    }


@app.route('/api/simulacoes', methods=['POST'])
def salvar_simulacao():
    dados = request.get_json() or {}
    usuario_id = dados.get('usuario_id')

    if not usuario_id:
        return jsonify({"erro": "Usuário não identificado."}), 400

    try:
        usuario_id = int(usuario_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "ID de usuário inválido."}), 400

    if usuario_da_sessao(usuario_id) is None:
        return jsonify({"erro": "Sessão inválida ou acesso não autorizado."}), 401

    try:
        if not usuario_existe(usuario_id):
            return jsonify({"erro": "Usuário não encontrado."}), 404

        aplicacao = validar_e_calcular_aplicacao(dados)
        arvores_validadas = int(numero_finito(dados, "arvores", 1, 10000000))
        geometria = validar_e_calcular_geometria(
            dados,
            aplicacao["area"],
            arvores_validadas
        )
        produto_nome = texto_limitado(dados, "produto_nome", 120, True)
        produto_fabricante = texto_limitado(dados, "produto_fabricante", 120, True)
        produto_identificacao = texto_limitado(dados, "produto_identificacao", 120, True)

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            INSERT INTO historico_simulacoes
            (
                usuario_id, data_registro,
                producao, area, arvores, idade,
                medida1, medida2, altura_total, altura_caule,
                espacamento_linhas, espacamento_plantas,
                diametro_medio, altura_util, volume_copa, volume_copas_talhao,
                trv, trv_por_hectare,
                finalidade, produtividade_ton, n_foliar, p_resina, k_trocavel,
                objetivo, elemento, fonte,
                produto_nome, produto_fabricante, produto_identificacao,
                concentracao, concentracao_mg_l,
                volume, volume_por_hectare, massa_micronutriente, massa_fonte_total,
                dose_min_rotulo, dose_max_rotulo, dose_por_100l, validacao_dose,
                confirmacao_cultura, confirmacao_dose,
                confirmacao_mistura, confirmacao_calibracao,
                n_recomendado, p2o5_recomendado, k2o_recomendado, dose_mistura,
                n_entregue, p2o5_entregue, k2o_entregue,
                status_n, status_p, status_k
            )
            VALUES (
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s
            )
        """

        valores = (
            usuario_id,
            str(dados.get('data', '')),
            int(dados.get('producao') or 0),
            aplicacao["area"],
            arvores_validadas,
            float(dados.get('idade') or 0.0),

            geometria["medida1"],
            geometria["medida2"],
            geometria["altura_total"],
            geometria["altura_caule"],
            geometria["espacamento_linhas"],
            geometria["espacamento_plantas"],

            geometria["diametro_medio"],
            geometria["altura_util"],
            geometria["volume_copa"],
            geometria["volume_copas_talhao"],
            geometria["trv"],
            geometria["trv_por_hectare"],

            str(dados.get('finalidade', '') or ''),
            float(dados.get('produtividade_ton') or 0.0),
            float(dados.get('n_foliar') or 0.0),
            float(dados.get('p_resina') or 0.0),
            float(dados.get('k_trocavel') or 0.0),

            str(dados.get('objetivo', '')),
            str(dados.get('elemento', '')),
            str(dados.get('fonte', '')),
            produto_nome,
            produto_fabricante,
            produto_identificacao,
            aplicacao["concentracao_fonte"],
            aplicacao["concentracao_mg_l"],

            aplicacao["volume_total"],
            aplicacao["volume_ha"],
            aplicacao["massa_nutriente"],
            aplicacao["massa_fonte"],
            aplicacao["dose_min"],
            aplicacao["dose_max"],
            aplicacao["dose_100l"],
            aplicacao["status"],
            aplicacao["confirmacao_cultura"],
            aplicacao["confirmacao_dose"],
            aplicacao["confirmacao_mistura"],
            aplicacao["confirmacao_calibracao"],

            float(dados.get('n_recomendado') or 0.0),
            float(dados.get('p2o5_recomendado') or 0.0),
            float(dados.get('k2o_recomendado') or 0.0),
            aplicacao["dose_ha"],

            float(dados.get('n_entregue') or 0.0),
            float(dados.get('p2o5_entregue') or 0.0),
            float(dados.get('k2o_entregue') or 0.0),

            str(dados.get('status_n', '') or ''),
            str(dados.get('status_p', '') or ''),
            str(dados.get('status_k', '') or '')
        )

        cursor.execute(query, valores)
        conn.commit()
        novo_id = cursor.lastrowid

        cursor.close()
        conn.close()

        return jsonify({
            "mensagem": "Simulação salva com sucesso!",
            "id": novo_id
        }), 201

    except ValueError as e:
        return jsonify({"erro": str(e)}), 400

    except Exception as e:
        app.logger.exception("Erro ao salvar simulação")
        return jsonify({"erro": "Não foi possível salvar a simulação."}), 500


@app.route('/api/simulacoes', methods=['GET'])
def listar_simulacoes():
    usuario_id = request.args.get('usuario_id')

    if not usuario_id:
        return jsonify({"erro": "Usuário não identificado."}), 400

    try:
        usuario_id = int(usuario_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "ID de usuário inválido."}), 400

    if usuario_da_sessao(usuario_id) is None:
        return jsonify({"erro": "Sessão inválida ou acesso não autorizado."}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id, usuario_id, data_registro,
                producao, area, arvores, idade,
                medida1, medida2, altura_total, altura_caule,
                espacamento_linhas, espacamento_plantas,
                diametro_medio, altura_util, volume_copa, volume_copas_talhao,
                trv, trv_por_hectare,
                finalidade, produtividade_ton, n_foliar, p_resina, k_trocavel,
                objetivo, elemento, fonte,
                produto_nome, produto_fabricante, produto_identificacao,
                concentracao, concentracao_mg_l,
                volume, volume_por_hectare, massa_micronutriente, massa_fonte_total,
                dose_min_rotulo, dose_max_rotulo, dose_por_100l, validacao_dose,
                confirmacao_cultura, confirmacao_dose,
                confirmacao_mistura, confirmacao_calibracao,
                n_recomendado, p2o5_recomendado, k2o_recomendado, dose_mistura,
                n_entregue, p2o5_entregue, k2o_entregue,
                status_n, status_p, status_k,
                criado_em
            FROM historico_simulacoes
            WHERE usuario_id = %s
            ORDER BY id DESC
        """, (usuario_id,))

        simulacoes = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify(simulacoes), 200

    except Exception:
        app.logger.exception("Erro ao listar simulações")
        return jsonify({"erro": "Não foi possível carregar o histórico."}), 500


@app.route('/api/simulacoes', methods=['DELETE'])
def excluir_simulacoes_selecionadas():
    dados = request.get_json(silent=True) or {}

    usuario_id = dados.get('usuario_id')
    ids = dados.get('ids')

    if not usuario_id:
        return jsonify({"erro": "Usuário não identificado."}), 400

    try:
        usuario_id = int(usuario_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "ID de usuário inválido."}), 400

    if usuario_da_sessao(usuario_id) is None:
        return jsonify({"erro": "Sessão inválida ou acesso não autorizado."}), 401

    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({
            "erro": "Nenhum registro foi selecionado para exclusão."
        }), 400

    # Converte todos os IDs para inteiro e elimina duplicados.
    try:
        ids = list(dict.fromkeys(int(item_id) for item_id in ids))
    except (TypeError, ValueError):
        return jsonify({
            "erro": "A lista de registros contém um ID inválido."
        }), 400

    # Evita uma requisição exageradamente grande por engano.
    if len(ids) > 1000:
        return jsonify({
            "erro": "Quantidade de registros selecionados acima do limite permitido."
        }), 400

    conn = None
    cursor = None

    try:
        if not usuario_existe(usuario_id):
            return jsonify({"erro": "Usuário não encontrado."}), 404

        conn = get_db_connection()
        cursor = conn.cursor()

        placeholders = ", ".join(["%s"] * len(ids))

        # IMPORTANTE:
        # usuario_id também faz parte do WHERE.
        # Portanto um usuário nunca apaga registros pertencentes a outro.
        query = f"""
            DELETE FROM historico_simulacoes
            WHERE usuario_id = %s
              AND id IN ({placeholders})
        """

        parametros = [usuario_id] + ids

        cursor.execute(query, parametros)

        registros_excluidos = cursor.rowcount

        conn.commit()

        if registros_excluidos == 0:
            return jsonify({
                "erro": "Nenhum dos registros selecionados foi encontrado para este usuário.",
                "registros_excluidos": 0
            }), 404

        return jsonify({
            "mensagem": "Registros selecionados excluídos com sucesso!",
            "registros_excluidos": registros_excluidos
        }), 200

    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass

        print("\nERRO AO EXCLUIR HISTÓRICO SELECIONADO:")
        print(e)

        return jsonify({
            "erro": "Não foi possível excluir os registros selecionados."
        }), 500

    finally:
        if cursor:
            try:
                cursor.close()
            except Exception:
                pass

        if conn:
            try:
                conn.close()
            except Exception:
                pass



# =========================================================
# INICIALIZAÇÃO DO BANCO
# =========================================================
# Fica fora do if para funcionar também no Render/Gunicorn.
# init_db() já captura falhas de conexão e não impede o Flask de subir.
init_db()


# =========================================================
# EXECUÇÃO LOCAL
# =========================================================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="127.0.0.1",
        port=port,
        debug=True,
        use_reloader=False
    )
