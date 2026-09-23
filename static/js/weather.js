// Localização padrão inicial do app
const LOCALIZACAO_PADRAO = {
    cidade: "Sertãozinho",
    estado: "SP"
};

// Obtém a localização salva ou utiliza a padrão
function obterLocalizacaoSalva() {
    const salva = localStorage.getItem('frutech_localizacao');
    return salva ? JSON.parse(salva) : LOCALIZACAO_PADRAO;
}

// Mapeia códigos de clima da Open-Meteo para textos e ícones FontAwesome
function interpretarCodigoClima(code) {
    const mapaClima = {
        0: { texto: "Céu Limpo", icone: "fa-sun", cor: "#f59e0b" },
        1: { texto: "Predominantemente Limpo", icone: "fa-sun", cor: "#f59e0b" },
        2: { texto: "Parcialmente Nublado", icone: "fa-cloud-sun", cor: "#f59e0b" },
        3: { texto: "Nublado", icone: "fa-cloud", cor: "#9ca3af" },
        45: { texto: "Névoa", icone: "fa-smog", cor: "#9ca3af" },
        51: { texto: "Garoa Leve", icone: "fa-cloud-rain", cor: "#3b82f6" },
        61: { texto: "Chuva Leve", icone: "fa-cloud-rain", cor: "#3b82f6" },
        63: { texto: "Chuva Moderada", icone: "fa-cloud-showers-heavy", cor: "#1d4ed8" },
        65: { texto: "Chuva Forte", icone: "fa-cloud-showers-heavy", cor: "#1d4ed8" },
        80: { texto: "Pancadas de Chuva", icone: "fa-cloud-sun-rain", cor: "#2563eb" },
        95: { texto: "Temporal com Trovoadas", icone: "fa-bolt", cor: "#dc2626" }
    };
    return mapaClima[code] || { texto: "Ensolarado", icone: "fa-sun", cor: "#f59e0b" };
}

// Busca temperatura, umidade, vento e chuva na API Open-Meteo
async function buscarClimaAPI(cidade, estado) {
    try {
        // 1. Busca Coordenadas (Latitude / Longitude) da Cidade
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=5&language=pt&format=json`;
        const geoResp = await fetch(geoUrl);
        const geoData = await geoResp.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("Cidade não encontrada.");
        }

        // Filtra pelo país BR
        const local = geoData.results.find(r => r.country_code === "BR") || geoData.results[0];
        const lat = local.latitude;
        const lon = local.longitude;

        // 2. Busca o Clima Atual e Previsão na Open-Meteo
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=America%2FSao_Paulo`;
        const wResp = await fetch(weatherUrl);
        const wData = await wResp.json();

        const atual = wData.current;
        const probabilidadeChuva = wData.hourly && wData.hourly.precipitation_probability ? wData.hourly.precipitation_probability[0] : 0;
        const infoClima = interpretarCodigoClima(atual.weather_code);

        // 3. Atualiza a Interface do Aplicativo
        document.getElementById('clima-localizacao').textContent = `${cidade} - ${estado}`;
        document.getElementById('clima-temp').textContent = `${Math.round(atual.temperature_2m)}°c`;
        document.getElementById('clima-status').textContent = infoClima.texto;
        document.getElementById('clima-umidade').textContent = `${atual.relative_humidity_2m}%`;
        document.getElementById('clima-vento').textContent = `${Math.round(atual.wind_speed_10m)} km/h`;
        document.getElementById('clima-chuva').textContent = `${probabilidadeChuva}%`;

        // Atualiza o Ícone do Clima
        const iconeElem = document.getElementById('clima-icone');
        if (iconeElem) {
            iconeElem.className = `fa-solid ${infoClima.icone} weather-icon`;
            iconeElem.style.color = infoClima.cor;
        }

    } catch (error) {
        console.error("Erro ao carregar clima:", error);
        document.getElementById('clima-localizacao').textContent = `${cidade} - ${estado}`;
        document.getElementById('clima-status').textContent = "Dados indisponíveis";
    }
}

// Salva a nova cidade e estado no localStorage
function salvarNovaLocalizacao() {
    const estado = document.getElementById('cfg-estado').value;
    const cidade = document.getElementById('cfg-cidade').value.trim();

    if (!estado || !cidade) {
        alert("Por favor, selecione o estado e digite a cidade!");
        return;
    }

    const novaLoc = { cidade, estado };
    localStorage.setItem('frutech_localizacao', JSON.stringify(novaLoc));
    
    // Atualiza o clima imediatamente e navega para a tela inicial
    buscarClimaAPI(cidade, estado);
    alert(`Localização alterada para ${cidade} - ${estado} com sucesso!`);
    navigate('inicio');
}

// Carrega os dados na inicialização do aplicativo
document.addEventListener("DOMContentLoaded", function() {
    const loc = obterLocalizacaoSalva();
    
    // Preenche os campos da tela de configurações se existirem
    const inputCidade = document.getElementById('cfg-cidade');
    const selectEstado = document.getElementById('cfg-estado');
    if (inputCidade) inputCidade.value = loc.cidade;
    if (selectEstado) selectEstado.value = loc.estado;

    // Dispara a busca do clima
    buscarClimaAPI(loc.cidade, loc.estado);
});