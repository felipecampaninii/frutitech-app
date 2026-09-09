// Atualização dinâmica de fontes comerciais conforme o nutriente selecionado
function atualizarFontes() {
    const el = document.getElementById('selectElemento').value;
    const fonteSelect = document.getElementById('selectFonte');

    if (!fonteSelect) return;

    fonteSelect.innerHTML = '';

    const opcoes = {
        'N': ['Ureia Foliar (46% N)', 'Nitrato de Amônio (33% N)'],
        'P': ['MAP Purificado (61% P₂O₅)', 'Ácido Fosfórico (52% P₂O₅)'],
        'K': ['Nitrato de Potássio (44% K₂O)', 'Sulfato de Potássio (50% K₂O)'],
        'Zn': ['Sulfato de Zinco (21% Zn)', 'Zinco Quelatado EDTA (14% Zn)'],
        'Mn': ['Sulfato de Manganês (26% Mn)', 'Manganês Quelatado (13% Mn)'],
        'B': ['Ácido Bórico (17% B)', 'Octaborato de Sódio (20% B)']
    };

    if (opcoes[el]) {
        opcoes[el].forEach(f => {
            const opt = document.createElement('option');
            opt.value = f;
            opt.textContent = f;
            fonteSelect.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.textContent = 'Escolha o nutriente primeiro';
        fonteSelect.appendChild(opt);
    }
}


// ==========================================================
// PEGA O ID DO USUÁRIO LOGADO
// ==========================================================
function obterUsuarioId() {
    const sessao = localStorage.getItem('frutech_usuario');

    if (!sessao) {
        return null;
    }

    try {
        const usuario = JSON.parse(sessao);

        if (!usuario || !usuario.id) {
            return null;
        }

        return usuario.id;

    } catch (erro) {
        console.error("Erro ao ler usuário salvo:", erro);
        return null;
    }
}


// ==========================================================
// SALVA E ENVIA SIMULAÇÃO AO BACKEND
// ==========================================================
async function salvarECalcular() {

    const usuarioId = obterUsuarioId();

    if (!usuarioId) {
        alert("Sua sessão não foi identificada. Faça login novamente.");
        navigate('login');
        return;
    }

    const elemento = document.getElementById('selectElemento').value;
    const fonte = document.getElementById('selectFonte').value;

    if (!elemento || !fonte) {
        alert("Por favor, selecione o elemento e a fonte comercial antes de calcular.");
        return;
    }

    const payload = {

        // IMPORTANTE:
        // agora cada cálculo é ligado ao usuário logado
        usuario_id: usuarioId,

        data:
            new Date().toLocaleDateString('pt-BR') +
            ' às ' +
            new Date().toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }),

        producao: parseInt(
            document.getElementById('simProducao').value
        ) || 0,

        area: parseFloat(
            document.getElementById('simArea').value
        ) || 0,

        arvores: parseInt(
            document.getElementById('simArvores').value
        ) || 0,

        idade: parseInt(
            document.getElementById('simIdade').value
        ) || 0,

        objetivo:
            document.getElementById('simObjetivo').value,

        elemento: elemento,

        fonte: fonte,

        concentracao: parseFloat(
            document.getElementById('simConcentracao').value
        ) || 0,

        volume: parseFloat(
            document.getElementById('simVolume').value
        ) || 0
    };


    try {

        const response = await fetch(API_SIMULACOES_URL, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify(payload)
        });


        const data = await response.json();


        if (response.ok) {

            alert(
                "Cálculo realizado e gravado no banco MySQL com sucesso!"
            );

            navigate('historico');

        } else {

            console.error("Erro do servidor:", data);

            alert(
                "Erro ao gravar dados: " +
                (data.erro || "Erro desconhecido.")
            );
        }


    } catch (error) {

        console.error(error);

        alert(
            "Falha de conexão com a API Python. " +
            "Verifique se executou 'python app.py'!"
        );
    }
}


// ==========================================================
// ILUSTRAÇÃO DO POMAR
// ==========================================================
function atualizarIlustracaoPomar(idade) {

    const treeMain =
        document.getElementById('treeMain');

    const lblEstagio =
        document.getElementById('lblEstagio');

    const lblIdadeTexto =
        document.getElementById('lblIdadeTexto');

    const lblDescricaoEstagio =
        document.getElementById('lblDescricaoEstagio');


    if (!lblIdadeTexto || !treeMain) return;


    lblIdadeTexto.textContent =
        idade + (idade == 1 ? " Ano" : " Anos");


    const crownMain =
        treeMain.querySelector('.tree-crown');

    const trunkMain =
        treeMain.querySelector('.tree-trunk');

    const frutas =
        treeMain.querySelectorAll('.orange-fruit');


    if (idade <= 2) {

        lblEstagio.textContent =
            "Muda / Formação";

        lblDescricaoEstagio.textContent =
            "Planta jovem em fase de estabelecimento radicular e formação de copa.";

        crownMain.style.width = "30px";
        crownMain.style.height = "30px";

        trunkMain.style.height = "15px";
        trunkMain.style.width = "6px";

        frutas.forEach(
            f => f.style.opacity = "0"
        );

    } else if (idade <= 5) {

        lblEstagio.textContent =
            "Entrando em Produção";

        lblDescricaoEstagio.textContent =
            "Crescimento vegetativo ativo e início do desenvolvimento de frutos.";

        crownMain.style.width = "55px";
        crownMain.style.height = "55px";

        trunkMain.style.height = "25px";
        trunkMain.style.width = "10px";

        frutas.forEach(
            (f, idx) =>
                f.style.opacity =
                    idx < 3 ? "1" : "0"
        );

    } else if (idade <= 12) {

        lblEstagio.textContent =
            "Auge Produtivo";

        lblDescricaoEstagio.textContent =
            "Pomar adulto com copa plena e alta demanda nutricional de micronutrientes.";

        crownMain.style.width = "75px";
        crownMain.style.height = "75px";

        trunkMain.style.height = "32px";
        trunkMain.style.width = "14px";

        frutas.forEach(
            f => f.style.opacity = "1"
        );

    } else {

        lblEstagio.textContent =
            "Pomar Longevo";

        lblDescricaoEstagio.textContent =
            "Árvores de grande porte. Requer poda de limpeza e adubação foliar de manutenção.";

        crownMain.style.width = "85px";
        crownMain.style.height = "85px";

        trunkMain.style.height = "38px";
        trunkMain.style.width = "18px";

        frutas.forEach(
            f => f.style.opacity = "1"
        );
    }
}


// ==========================================================
// EVENTOS
// ==========================================================
document.addEventListener(
    "DOMContentLoaded",
    function () {

        const inputIdade =
            document.getElementById('simIdade');

        if (inputIdade) {

            inputIdade.addEventListener(
                'input',
                function (e) {

                    const idade =
                        parseInt(e.target.value) || 0;

                    atualizarIlustracaoPomar(idade);
                }
            );


            atualizarIlustracaoPomar(
                parseInt(inputIdade.value) || 8
            );
        }
    }
);