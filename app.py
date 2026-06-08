from flask import Flask, render_template, request, jsonify, session
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
import os

app = Flask(__name__)
app.secret_key = 'sua_chave_secreta_super_segura_para_tcc'

# Configuração de conexão com o banco de dados MySQL
def get_db_connection():
    return mysql.connector.connect(
        host='projetobru1-felipe25campaninisilva-1e7b.l.aivencloud.com',
        port=14672,
        user='avnadmin',
        password='AVNS_jceMMFobSxeiRbYH2NK',
        database='defaultdb' # O nome do banco padrão no Aiven é defaultdb
    )

@app.route('/')
def index():
    return render_template('index.html')

# API de Cadastro
@app.route('/api/cadastro', methods=['POST'])
def cadastro():
    data = request.json
    username = data.get('username').strip()
    senha = data.get('senha')
    confirma_senha = data.get('confirma_senha')

    if not username or not senha:
        return jsonify({'success': False, 'message': 'Preencha todos os campos.'}), 400

    if senha != confirma_senha:
        return jsonify({'success': False, 'message': 'As senhas não coincidem.'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verifica se o usuário já existe
        cursor.execute("SELECT id FROM usuarios WHERE username = %s", (username,))
        if cursor.fetchone():
            return jsonify({'success': False, 'message': 'Este nome de usuário já está em uso.'}), 400

        # Criptografa a senha antes de salvar
        senha_hash = generate_password_hash(senha)
        
        cursor.execute("INSERT INTO usuarios (username, senha) VALUES (%s, %s)", (username, senha_hash))
        conn.commit()
        
        # Pega o ID gerado para já logar o usuário
        user_id = cursor.lastrowid
        return jsonify({'success': True, 'message': 'Conta criada com sucesso!', 'user_id': user_id, 'username': username})

    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': f'Erro no banco de dados: {err}'}), 500
    finally:
        cursor.close()
        conn.close()

# API de Login
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username').strip()
    senha = data.get('senha')

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM usuarios WHERE username = %s", (username,))
    usuario = cursor.fetchone()

    cursor.close()
    conn.close()

    if usuario and check_password_hash(usuario['senha'], senha):
        return jsonify({
            'success': True, 
            'user_id': usuario['id'], 
            'username': usuario['username']
        })
    else:
        return jsonify({'success': False, 'message': 'Usuário ou senha incorretos.'}), 401

# API para salvar cálculo no Histórico
@app.route('/api/historico', methods=['POST'])
def salvar_historico():
    data = request.json
    user_id = data.get('user_id')
    data_calculo = data.get('data')
    nutriente = data.get('nutriente')
    total = data.get('total')
    arvore = data.get('arvore')

    if not user_id:
        return jsonify({'success': False, 'message': 'Usuário não identificado.'}), 401

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO historico_calculos (usuario_id, data_calculo, nutriente, total_kg, dosagem_planta_g) VALUES (%s, %s, %s, %s, %s)",
            (user_id, data_calculo, nutriente, total, arvore)
        )
        conn.commit()
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        return jsonify({'success': False, 'message': str(err)}), 500
    finally:
        cursor.close()
        conn.close()

# API para puxar o Histórico do usuário logado
@app.route('/api/historico/<int:user_id>', methods=['GET'])
def buscar_historico(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT data_calculo as data, nutriente, total_kg as total, dosagem_planta_g as arvore FROM historico_calculos WHERE usuario_id = %s ORDER BY id DESC", (user_id,))
    resultados = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(resultados)

if __name__ == '__main__':
    # O Render injeta uma variável chamada 'PORT'. Se não achar, usa a 9000.
    port = int(os.environ.get("PORT", 9000))
    # O host '0.0.0.0' permite que o app receba conexões de fora do seu computador
    app.run(host='0.0.0.0', port=port, debug=False)