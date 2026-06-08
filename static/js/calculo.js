const tabela4 = [
    { limite: 30, n: 160, p: 80,  k: 100 },
    { limite: 40, n: 180, p: 100, k: 120 },
    { limite: 50, n: 200, p: 120, k: 160 },
    { limite: 999, n: 260, p: 160, k: 200 }
];

function mostrarPasso2() {
    const prod = document.getElementById('producao').value;
    const area = document.getElementById('areaTalhao').value;
    const arv = document.getElementById('arvores').value;

    if (!prod || !area || !arv) {
        alert('❌ Preencha os dados do talhão antes de avançar.');
        return;
    }
    document.getElementById('passo1').style.display = 'none';
    document.getElementById('passo2').style.display = 'block';
}

async function calcularAdubacao() {
    const producao = parseFloat(document.getElementById('producao').value);
    const areaTalhaoValor = parseFloat(document.getElementById('areaTalhao').value);
    const qtdArvores = parseInt(document.getElementById('arvores').value);
    const tipoAnalise = document.getElementById('tipoAnalise').value;
    const nutrienteValor = document.getElementById('nutrienteSelect').value;
    const concentracaoFonte = parseFloat(document.getElementById('concentracao').value);

    if (isNaN(producao) || isNaN(areaTalhaoValor) || isNaN(qtdArvores) || concentracaoFonte <= 0) {
        alert('❌ Erro nos dados numéricos.');
        return;
    }

    let faixa = tabela4.find(f => producao <= f.limite) || tabela4[tabela4.length - 1];
    let recomendacaoKgHectare = faixa[nutrienteValor.toLowerCase()] || 0;

    let necessidadeTotalAduboKg = (recomendacaoKgHectare * areaTalhaoValor) / (concentracaoFonte / 100);
    let dosagemPorPlantaGrama = (necessidadeTotalAduboKg / qtdArvores) * 1000;

    // Renderiza o resultado na tela para o usuário ver na hora
    document.getElementById('resultado').innerHTML = `
        <div class="resultado-box" style="margin-top:15px; padding:10px; background:#e8f5e9; border-radius:5px; border-left: 4px solid #2e7d32;">
            <h4>Recomendação Sólida</h4>
            <p>Total Adubo: <b>${necessidadeTotalAduboKg.toFixed(2)}</b> kg</p>
            <p>Por Planta: <b>${dosagemPorPlantaGrama.toFixed(1)}</b> g</p>
            <div id="statusSincronismo" style="font-size:0.8rem; color:#666; margin-top:5px;">Sincronizando com o banco...</div>
        </div>
    `;

    // Captura o usuário logado do localStorage para mandar para o MySQL
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario) {
        alert("❌ Erro: Usuário não identificado. Faça login novamente.");
        return;
    }

    const agora = new Date();
    const dataString = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const dadosCalculo = {
        user_id: usuario.id,
        data: dataString,
        nutriente: nutrienteValor.toUpperCase(),
        total: necessidadeTotalAduboKg.toFixed(2),
        arvore: dosagemPorPlantaGrama.toFixed(1)
    };

    try {
        // Salva direto no Banco via API do Python
        const response = await fetch('/api/historico', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosCalculo)
        });

        if (response.ok) {
            // Atualiza o texto de carregamento para sucesso
            const statusEl = document.getElementById('statusSincronismo');
            if (statusEl) statusEl.innerHTML = "🏆 Salvo com sucesso no MySQL!";
            
            // PULO DO GATO: Se a função de listar o histórico existir na tela, 
            // força ela a rodar em segundo plano para se atualizar com o novo cálculo
            if (typeof mostrarHistorico === 'function') {
                mostrarHistorico();
            }
        } else {
            const statusEl = document.getElementById('statusSincronismo');
            if (statusEl) statusEl.innerHTML = "❌ Erro ao salvar no banco remoto.";
        }
    } catch (error) {
        console.error("Erro na requisição de salvamento:", error);
        const statusEl = document.getElementById('statusSincronismo');
        if (statusEl) statusEl.innerHTML = "❌ Sem conexão com o servidor.";
    }
}