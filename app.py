import os
import io
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import mysql.connector
from PIL import Image
from google import genai
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

@app.route('/')
def pagina_inicial():
    return render_template('index.html')

# =========================================================
# CONFIGURAÇÃO DA API GEMINI E BANCO DE DADOS LOCAL
# =========================================================
# Recomendado: definir a chave no ambiente.
# Windows PowerShell: $env:GEMINI_API_KEY="SUA_CHAVE"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "AQ.Ab8RN6KFH_eYwZmalDvUwSrhRyFRsNsnOtj5Hp7BYNxxYG_gHA")
client = genai.Client(api_key=GEMINI_API_KEY)

DB_CONFIG = {
    "host": "projetobru1-felipe25campaninisilva-1e7b.l.aivencloud.com",
    "port": 14672,
    "user": "avnadmin",
    "password": "AVNS_jceMMFobSxeiRbYH2NK",
    "database": "defaultdb",
    "ssl_disabled": False
}


def get_db_connection():
    """Cria e retorna uma conexão ativa com o banco frutech_db."""
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
                idade INT DEFAULT 0,
                objetivo VARCHAR(50) NOT NULL,
                elemento VARCHAR(20) NOT NULL,
                fonte VARCHAR(150) NOT NULL,
                concentracao DECIMAL(5,2) DEFAULT 0.00,
                volume DECIMAL(10,2) DEFAULT 0.00,
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
# ROTA POST: DIAGNÓSTICO POR IMAGEM COM GEMINI IA
# =========================================================
@app.route('/api/diagnostico', methods=['POST'])
def analisar_imagem():
    if 'imagem' not in request.files:
        return jsonify({"erro": "Nenhuma imagem foi enviada no formulário."}), 400

    arquivo = request.files['imagem']

    if arquivo.filename == '':
        return jsonify({"erro": "Nenhum arquivo de imagem foi selecionado."}), 400

    try:
        imagem_pil = Image.open(io.BytesIO(arquivo.read()))

        prompt_agronomo = (
            "Você é um Engenheiro Agrônomo especialista em citricultura e nutrição vegetal.\n\n"
            "Analise a imagem enviada (folha, ramo ou fruto) e forneça um laudo prático, fluido e objetivo.\n"
            "Se a imagem não for de uma planta ou estiver desfocada, peça gentilmente uma nova foto nítida.\n\n"
            "Responda utilizando EXATAMENTE a estrutura abaixo, mantendo os títulos em negrito:\n\n"
            "**Diagnóstico:** [Identifique a doença, praga, deficiência nutricional ou 'Planta Saudável'] — "
            "**Severidade:** [Baixa | Moderada | Severa]\n\n"
            "**Sintomas:** [Descreva brevemente os sinais visuais detectados na imagem em 2 a 3 frases diretas]\n\n"
            "**Recomendação:** [Indique a ação prática de manejo (adubação foliar, defensivo ou controle biológico) "
            "e lembre brevemente sobre o uso de EPI e orientação técnica]"
        )

        modelos_gemini = [
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-2.5-flash-lite'
        ]

        resposta_texto = None
        erro_ultimo = None

        for modelo in modelos_gemini:
            try:
                print(f">>> Analisando imagem com o modelo Gemini: {modelo}...")
                response = client.models.generate_content(
                    model=modelo,
                    contents=[imagem_pil, prompt_agronomo]
                )
                resposta_texto = response.text
                print(f">>> SUCESSO com o modelo {modelo}!")
                break

            except Exception as ex:
                print(f"--- Modelo {modelo} com instabilidade: {ex}")
                erro_ultimo = ex

        if resposta_texto:
            return jsonify({"diagnostico": resposta_texto}), 200

        return jsonify({
            "erro": f"Servidores do Gemini indisponíveis. Detalhe: {str(erro_ultimo)}"
        }), 503

    except Exception as e:
        print("\n================ DETALHE DO ERRO NO DIAGNÓSTICO GEMINI ================")
        print(e)
        print("=======================================================================\n")
        return jsonify({
            "erro": f"Falha ao processar análise no Gemini: {str(e)}"
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
                usuario_id,
                data_registro,
                producao,
                area,
                arvores,
                idade,
                objetivo,
                elemento,
                fonte,
                concentracao,
                volume
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        valores = (
            usuario_id,
            str(dados.get('data', '')),
            int(dados.get('producao') or 0),
            float(dados.get('area') or 0.0),
            int(dados.get('arvores') or 0),
            int(dados.get('idade') or 0),
            str(dados.get('objetivo', '')),
            str(dados.get('elemento', '')),
            str(dados.get('fonte', '')),
            float(dados.get('concentracao') or 0.0),
            float(dados.get('volume') or 0.0)
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
                id,
                usuario_id,
                data_registro,
                producao,
                area,
                arvores,
                idade,
                objetivo,
                elemento,
                fonte,
                concentracao,
                volume,
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


if __name__ == '__main__':
    init_db()

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=True
    )
