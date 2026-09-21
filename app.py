import os
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from inference_sdk import InferenceConfiguration, InferenceHTTPClient

app = Flask(__name__)
CORS(app)

@app.route('/')
def pagina_inicial():
    return render_template('index.html')

# =========================================================
# CONFIGURAÇÃO ROBOFLOW / DATASETHLB E BANCO DE DADOS
# =========================================================

ROBOFLOW_API_KEY = "erqLp3ThRAuBHyMzJP2X"
WORKSPACE_NAME = "marias-workspace-lthtr"
WORKFLOW_ID = "datasethlb-5opve"

CONFIANCA_MINIMA = 0.5
TAMANHO_MAXIMO = 10 * 1024 * 1024

EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
TIPOS_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}

roboflow_client = None

if ROBOFLOW_API_KEY:
    roboflow_client = InferenceHTTPClient(
        api_url="https://serverless.roboflow.com",
        api_key=ROBOFLOW_API_KEY
    ).configure(
        InferenceConfiguration(
            api_key_transport="header"
        )
    )
else:
    print(
        "AVISO: ROBOFLOW_API_KEY não configurada. "
        "A rota /api/diagnostico ficará indisponível."
    )


DB_CONFIG = {
    "host": "projetobru1-felipe25campaninisilva-1e7b.l.aivencloud.com",
    "port": 14672,
    "user": "avnadmin",
    "password": "AVNS_jceMMFobSxeiRbYH2NK",
    "database": "defaultdb",
    "ssl_disabled": False
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

                diametro_medio DECIMAL(10,3) DEFAULT 0.000,
                altura_util DECIMAL(10,3) DEFAULT 0.000,
                volume_copa DECIMAL(14,3) DEFAULT 0.000,
                volume_copas_talhao DECIMAL(16,3) DEFAULT 0.000,
                trv DECIMAL(16,3) DEFAULT 0.000,

                finalidade VARCHAR(30) DEFAULT NULL,
                produtividade_ton DECIMAL(10,3) DEFAULT 0.000,
                n_foliar DECIMAL(10,3) DEFAULT 0.000,
                p_resina DECIMAL(10,3) DEFAULT 0.000,
                k_trocavel DECIMAL(10,3) DEFAULT 0.000,

                objetivo VARCHAR(50) NOT NULL,
                elemento VARCHAR(20) NOT NULL,
                fonte VARCHAR(150) NOT NULL,
                concentracao DECIMAL(10,3) DEFAULT 0.000,
                concentracao_mg_l DECIMAL(12,3) DEFAULT 0.000,

                volume DECIMAL(14,3) DEFAULT 0.000,
                massa_micronutriente DECIMAL(14,6) DEFAULT 0.000,

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
            "diametro_medio": "DECIMAL(10,3) DEFAULT 0.000",
            "altura_util": "DECIMAL(10,3) DEFAULT 0.000",
            "volume_copa": "DECIMAL(14,3) DEFAULT 0.000",
            "volume_copas_talhao": "DECIMAL(16,3) DEFAULT 0.000",
            "trv": "DECIMAL(16,3) DEFAULT 0.000",
            "finalidade": "VARCHAR(30) DEFAULT NULL",
            "produtividade_ton": "DECIMAL(10,3) DEFAULT 0.000",
            "n_foliar": "DECIMAL(10,3) DEFAULT 0.000",
            "p_resina": "DECIMAL(10,3) DEFAULT 0.000",
            "k_trocavel": "DECIMAL(10,3) DEFAULT 0.000",
            "concentracao_mg_l": "DECIMAL(12,3) DEFAULT 0.000",
            "massa_micronutriente": "DECIMAL(14,6) DEFAULT 0.000",
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

    except Exception as e:
        return jsonify({"erro": f"Erro interno ao cadastrar: {str(e)}"}), 500


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
        return jsonify({"erro": f"Erro no servidor: {str(e)}"}), 500


@app.route('/api/usuario/localizacao', methods=['POST'])
def salvar_localizacao_usuario():
    dados = request.get_json() or {}
    username = str(dados.get('username', '')).strip().lower()
    cidade = str(dados.get('cidade', '')).strip()
    estado = str(dados.get('estado', '')).strip()

    if not username or not cidade or not estado:
        return jsonify({"erro": "Dados de localização incompletos."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "UPDATE usuarios SET cidade = %s, estado = %s WHERE username = %s",
            (cidade, estado, username)
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

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


# =========================================================
# ROTA POST: DIAGNÓSTICO POR IMAGEM COM DATASETHLB / ROBOFLOW
# =========================================================

def extrair_predicoes_roboflow(objeto):
    """
    Procura recursivamente listas de previsões no retorno do Workflow.
    Isso deixa a API tolerante a pequenas diferenças na estrutura
    devolvida pelo inference-sdk.
    """
    encontradas = []

    if isinstance(objeto, dict):
        predictions = objeto.get("predictions")

        if isinstance(predictions, list):
            for pred in predictions:
                if isinstance(pred, dict):
                    classe = (
                        pred.get("class")
                        or pred.get("class_name")
                        or pred.get("label")
                    )
                    confianca = pred.get("confidence")

                    if classe is not None:
                        encontradas.append({
                            "classe": str(classe),
                            "confianca": confianca
                        })

        for valor in objeto.values():
            encontradas.extend(extrair_predicoes_roboflow(valor))

    elif isinstance(objeto, list):
        for item in objeto:
            encontradas.extend(extrair_predicoes_roboflow(item))

    # Remove duplicatas idênticas que podem aparecer ao percorrer
    # diferentes níveis do retorno do workflow.
    unicas = []
    vistos = set()

    for pred in encontradas:
        chave = (pred["classe"], str(pred["confianca"]))
        if chave not in vistos:
            vistos.add(chave)
            unicas.append(pred)

    return unicas


def montar_texto_diagnostico(resultado):
    """
    Converte as classes retornadas pelo DatasetHLB para o formato textual
    que o JavaScript atual já espera em data.diagnostico.
    Não inventa sintomas ou tratamentos que o modelo não retornou.
    """
    predicoes = extrair_predicoes_roboflow(resultado)

    # Mantém apenas previsões que também respeitem o limite local.
    filtradas = []
    for pred in predicoes:
        try:
            confianca = float(pred["confianca"])
        except (TypeError, ValueError):
            confianca = None

        if confianca is None or confianca >= CONFIANCA_MINIMA:
            filtradas.append({
                "classe": pred["classe"],
                "confianca": confianca
            })

    filtradas.sort(
        key=lambda p: p["confianca"] if p["confianca"] is not None else -1,
        reverse=True
    )

    if not filtradas:
        return (
            "**Diagnóstico:** Nenhuma classe foi identificada com confiança "
            "mínima de 50%.\n\n"
            "**Resultado:** O DatasetHLB não encontrou uma detecção suficientemente "
            "confiável nesta imagem.\n\n"
            "**Recomendação:** Tente outra foto nítida, bem iluminada e com a parte "
            "da planta ocupando a maior parte da imagem. A análise por imagem deve "
            "ser confirmada por um profissional agrícola."
        )

    principal = filtradas[0]
    confianca_txt = (
        f"{principal['confianca'] * 100:.1f}%"
        if principal["confianca"] is not None
        else "não informada"
    )

    outras = []
    for pred in filtradas[1:6]:
        if pred["confianca"] is None:
            outras.append(pred["classe"])
        else:
            outras.append(
                f"{pred['classe']} ({pred['confianca'] * 100:.1f}%)"
            )

    texto = (
        f"**Diagnóstico:** {principal['classe']}\n\n"
        f"**Confiança do modelo:** {confianca_txt}\n\n"
        "**Modelo:** DatasetHLB (Roboflow)"
    )

    if outras:
        texto += "\n\n**Outras detecções:** " + ", ".join(outras)

    texto += (
        "\n\n**Recomendação:** O resultado é uma análise automatizada por imagem. "
        "Confirme o diagnóstico com um profissional agrícola antes de definir o manejo."
    )

    return texto


@app.route('/api/diagnostico', methods=['POST'])
def analisar_imagem():
    if roboflow_client is None:
        return jsonify({
            "erro": (
                "ROBOFLOW_API_KEY não configurada no servidor. "
                "Crie o arquivo .env e defina ROBOFLOW_API_KEY."
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

    if arquivo.mimetype not in TIPOS_PERMITIDOS:
        return jsonify({
            "erro": "O arquivo enviado não é uma imagem permitida."
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

    caminho_temporario = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=extensao
        ) as arquivo_temporario:
            arquivo_temporario.write(conteudo)
            caminho_temporario = arquivo_temporario.name

        print(
            f">>> Enviando imagem ao DatasetHLB "
            f"(workflow {WORKFLOW_ID})..."
        )

        resultado = roboflow_client.run_workflow(
            workspace_name=WORKSPACE_NAME,
            workflow_id=WORKFLOW_ID,
            images={
                "image": caminho_temporario
            },
            parameters={
                "confidence": CONFIANCA_MINIMA,
                "iou_threshold": 0.3,
                "class_agnostic_nms": False,
                "max_detections": 100
            },
            use_cache=True
        )

        diagnostico = montar_texto_diagnostico(resultado)

        print(">>> SUCESSO: análise concluída pelo DatasetHLB.")

        # 'diagnostico' mantém compatibilidade com o JavaScript atual.
        # 'resultado' fica disponível caso o front-end queira usar
        # caixas, classes e demais dados estruturados futuramente.
        return jsonify({
            "sucesso": True,
            "arquivo": nome_arquivo,
            "modelo": "DatasetHLB",
            "confianca_minima": CONFIANCA_MINIMA,
            "diagnostico": diagnostico,
            "resultado": resultado,
            "aviso": (
                "O resultado é uma análise por imagem e deve ser "
                "confirmado por um profissional agrícola."
            )
        }), 200

    except Exception as e:
        print(
            "\n================ ERRO DATASETHLB / ROBOFLOW ================"
        )
        print(e)
        print(
            "=============================================================\n"
        )

        return jsonify({
            "erro": (
                "Não foi possível analisar a imagem. "
                "Verifique a conexão, a API key da Roboflow e tente novamente."
            )
        }), 500

    finally:
        if caminho_temporario and os.path.exists(caminho_temporario):
            try:
                os.remove(caminho_temporario)
            except OSError as e:
                print(f"Não foi possível remover arquivo temporário: {e}")


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

    try:
        if not usuario_existe(usuario_id):
            return jsonify({"erro": "Usuário não encontrado."}), 404

        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
            INSERT INTO historico_simulacoes
            (
                usuario_id, data_registro,
                producao, area, arvores, idade,
                medida1, medida2, altura_total, altura_caule, espacamento_linhas,
                diametro_medio, altura_util, volume_copa, volume_copas_talhao, trv,
                finalidade, produtividade_ton, n_foliar, p_resina, k_trocavel,
                objetivo, elemento, fonte, concentracao, concentracao_mg_l,
                volume, massa_micronutriente,
                n_recomendado, p2o5_recomendado, k2o_recomendado, dose_mistura,
                n_entregue, p2o5_entregue, k2o_entregue,
                status_n, status_p, status_k
            )
            VALUES (
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
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
            float(dados.get('area') or 0.0),
            int(dados.get('arvores') or 0),
            float(dados.get('idade') or 0.0),

            float(dados.get('medida1') or 0.0),
            float(dados.get('medida2') or 0.0),
            float(dados.get('altura_total') or 0.0),
            float(dados.get('altura_caule') or 0.0),
            float(dados.get('espacamento_linhas') or 0.0),

            float(dados.get('diametro_medio') or 0.0),
            float(dados.get('altura_util') or 0.0),
            float(dados.get('volume_copa') or 0.0),
            float(dados.get('volume_copas_talhao') or 0.0),
            float(dados.get('trv') or 0.0),

            str(dados.get('finalidade', '') or ''),
            float(dados.get('produtividade_ton') or 0.0),
            float(dados.get('n_foliar') or 0.0),
            float(dados.get('p_resina') or 0.0),
            float(dados.get('k_trocavel') or 0.0),

            str(dados.get('objetivo', '')),
            str(dados.get('elemento', '')),
            str(dados.get('fonte', '')),
            float(dados.get('concentracao') or 0.0),
            float(dados.get('concentracao_mg_l') or 0.0),

            float(dados.get('volume') or 0.0),
            float(dados.get('massa_micronutriente') or 0.0),

            float(dados.get('n_recomendado') or 0.0),
            float(dados.get('p2o5_recomendado') or 0.0),
            float(dados.get('k2o_recomendado') or 0.0),
            float(dados.get('dose_mistura') or 0.0),

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

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/simulacoes', methods=['GET'])
def listar_simulacoes():
    usuario_id = request.args.get('usuario_id')

    if not usuario_id:
        return jsonify({"erro": "Usuário não identificado."}), 400

    try:
        usuario_id = int(usuario_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "ID de usuário inválido."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                id, usuario_id, data_registro,
                producao, area, arvores, idade,
                medida1, medida2, altura_total, altura_caule, espacamento_linhas,
                diametro_medio, altura_util, volume_copa, volume_copas_talhao, trv,
                finalidade, produtividade_ton, n_foliar, p_resina, k_trocavel,
                objetivo, elemento, fonte, concentracao, concentracao_mg_l,
                volume, massa_micronutriente,
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

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


@app.route('/api/simulacoes', methods=['DELETE'])
def limpar_simulacoes():
    usuario_id = request.args.get('usuario_id')

    if not usuario_id:
        return jsonify({"erro": "Usuário não identificado."}), 400

    try:
        usuario_id = int(usuario_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "ID de usuário inválido."}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "DELETE FROM historico_simulacoes WHERE usuario_id = %s",
            (usuario_id,)
        )
        registros_excluidos = cursor.rowcount
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({
            "mensagem": "Histórico do usuário limpo com sucesso!",
            "registros_excluidos": registros_excluidos
        }), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500


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
