async function mostrarHistorico() {
    const listaHistorico = document.getElementById('listaHistorico');
    if (!listaHistorico) return;

    // Coloca um indicador visual de carregamento rápido
    listaHistorico.innerHTML = '<p style="text-align:center; color:#666;">Buscando histórico sincronizado...</p>';

    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (!usuario) {
        listaHistorico.innerHTML = '<p style="color:red;">Erro: Usuário não está logado.</p>';
        return;
    }

    try {
        // Faz a requisição ao servidor Flask buscando os dados do MySQL
        const response = await fetch(`/api/historico/${usuario.id}`);
        const historico = await response.json();

        // Limpa completamente a div para não duplicar os cards antigos da tela anterior
        listaHistorico.innerHTML = '';

        if (!historico || historico.length === 0) {
            listaHistorico.innerHTML = `
                <div style="border-left: 4px solid #ffa000; background: rgba(255,160,0,0.05); padding:12px; border-radius:5px;">
                    <p style="margin:0; color:#555;">Nenhum cálculo salvo nesta conta ainda. Use o simulador para gerar recomendações.</p>
                </div>
            `;
            return;
        }

        // Percorre cada elemento retornado do banco e ACUMULA (+=) na tela
        historico.forEach((item, index) => {
            listaHistorico.innerHTML += `
                <div class="card" style="border-left: 4px solid #2e7d32; margin-bottom: 15px; padding: 14px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-radius:8px; position:relative;">
                    <span style="font-size: 0.75rem; color: #888; position: absolute; top: 12px; right: 12px;">#${historico.length - index} - ${item.data}</span>
                    <p style="margin: 0 0 8px 0; font-size: 1.1rem;"><strong>Nutriente:</strong> <span style="color:#2e7d32; font-weight:bold;">${item.nutriente.toUpperCase()}</span></p>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; background:#f9f9f9; padding:8px; border-radius:5px; margin-top:5px;">
                        <div>
                            <small style="color:#666; display:block;">Volume Total:</small>
                            <span style="font-size:1rem; font-weight:bold; color:#333;">${item.total} kg</span>
                        </div>
                        <div>
                            <small style="color:#666; display:block;">Por Planta:</small>
                            <span style="font-size:1rem; font-weight:bold; color:#333;">${item.arvore} g</span>
                        </div>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Erro ao renderizar histórico:", error);
        listaHistorico.innerHTML = '<p style="color:red;">Erro crítico ao carregar dados do servidor.</p>';
    }
}