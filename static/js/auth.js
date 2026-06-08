document.addEventListener("DOMContentLoaded", function() {
    // Verifica se já existe login persistido no navegador
    const usuarioSalvo = localStorage.getItem("usuarioLogado");
    if (usuarioSalvo) {
        const usuario = JSON.parse(usuarioSalvo);
        inicializarSessao(usuario.id, usuario.username);
    }
});

function alternarAbasAuth(alvo) {
    if (alvo === 'cadastro') {
        document.getElementById('boxLogin').style.display = 'none';
        document.getElementById('boxCadastro').style.display = 'block';
    } else {
        document.getElementById('boxCadastro').style.display = 'none';
        document.getElementById('boxLogin').style.display = 'block';
    }
}

function inicializarSessao(id, username) {
    localStorage.setItem("usuarioLogado", JSON.stringify({ id: id, username: username }));
    document.getElementById('lblNomeUsuario').innerText = username;
    document.getElementById('telaAuth').classList.remove('active');
    document.getElementById('menuInferior').style.display = 'flex';
    mudarTela('home');
}

function fazerLogout() {
    localStorage.removeItem("usuarioLogado");
    document.getElementById('menuInferior').style.display = 'none';
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
    document.getElementById('telaAuth').classList.add('active');
    alternarAbasAuth('login');
}

async function realizarCadastro() {
    const username = document.getElementById('cadUser').value;
    const senha = document.getElementById('cadSenha').value;
    const confirma_senha = document.getElementById('cadSenhaConfirma').value;

    if(senha !== confirma_senha) {
        alert("❌ Erro: As senhas digitadas não batem!");
        return;
    }

    const response = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha, confirma_senha })
    });

    const result = await response.json();
    if (result.success) {
        alert(result.message);
        inicializarSessao(result.user_id, result.username);
    } else {
        alert("❌ " + result.message);
    }
}

async function realizarLogin() {
    const username = document.getElementById('loginUser').value;
    const senha = document.getElementById('loginSenha').value;

    const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, senha })
    });

    const result = await response.json();
    if (result.success) {
        inicializarSessao(result.user_id, result.username);
    } else {
        alert("❌ " + result.message);
    }
}

function mudarTela(idTela) {
    if (!localStorage.getItem("usuarioLogado")) return; // Bloqueia navegação sem login
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
    const telaAlvo = document.getElementById(idTela);
    if (telaAlvo) telaAlvo.classList.add('active');
}