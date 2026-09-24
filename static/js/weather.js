// ==========================================================
// FRU-TECH — CLIMA EM TEMPO REAL E JANELA DE PULVERIZAÇÃO
// ==========================================================

const LOCALIZACAO_PADRAO = {
    cidade: "Sertãozinho",
    estado: "SP"
};

function obterLocalizacaoSalva() {
    const salva = localStorage.getItem("frutech_localizacao");

    if (!salva) return LOCALIZACAO_PADRAO;

    try {
        const localizacao = JSON.parse(salva);
        return localizacao?.cidade && localizacao?.estado
            ? localizacao
            : LOCALIZACAO_PADRAO;
    } catch (erro) {
        console.warn("Localização salva inválida:", erro);
        return LOCALIZACAO_PADRAO;
    }
}

function interpretarCodigoClima(codigo, periodoDiurno = true) {
    const mapa = {
        0: { texto: "Céu limpo", icone: periodoDiurno ? "fa-sun" : "fa-moon", cor: periodoDiurno ? "#f5b400" : "#64748b" },
        1: { texto: "Predominantemente limpo", icone: periodoDiurno ? "fa-sun" : "fa-moon", cor: periodoDiurno ? "#f5b400" : "#64748b" },
        2: { texto: "Parcialmente nublado", icone: periodoDiurno ? "fa-cloud-sun" : "fa-cloud-moon", cor: "#8291a5" },
        3: { texto: "Nublado", icone: "fa-cloud", cor: "#9ca3af" },
        45: { texto: "Névoa", icone: "fa-smog", cor: "#9ca3af" },
        48: { texto: "Névoa", icone: "fa-smog", cor: "#9ca3af" },
        51: { texto: "Garoa leve", icone: "fa-cloud-rain", cor: "#3b82f6" },
        53: { texto: "Garoa moderada", icone: "fa-cloud-rain", cor: "#2563eb" },
        55: { texto: "Garoa forte", icone: "fa-cloud-showers-heavy", cor: "#1d4ed8" },
        61: { texto: "Chuva leve", icone: "fa-cloud-rain", cor: "#3b82f6" },
        63: { texto: "Chuva moderada", icone: "fa-cloud-showers-heavy", cor: "#2563eb" },
        65: { texto: "Chuva forte", icone: "fa-cloud-showers-heavy", cor: "#1d4ed8" },
        80: { texto: "Pancadas de chuva", icone: "fa-cloud-sun-rain", cor: "#2563eb" },
        81: { texto: "Pancadas de chuva", icone: "fa-cloud-showers-heavy", cor: "#2563eb" },
        82: { texto: "Pancadas fortes", icone: "fa-cloud-showers-heavy", cor: "#1d4ed8" },
        95: { texto: "Temporal com trovoadas", icone: "fa-bolt", cor: "#dc2626" }
    };

    return mapa[codigo] || { texto: "Condição variável", icone: "fa-cloud-sun", cor: "#8291a5" };
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}

// ==========================================================
// AVALIAÇÃO DA JANELA CLIMÁTICA PARA ADUBAÇÃO FOLIAR
// Regras definidas para o projeto:
// - Umidade relativa ideal: acima de 55%
// - Temperatura ideal: abaixo de 30 °C
// - Velocidade do vento ideal: entre 3 e 10 km/h
// ==========================================================

function avaliarCondicoesPulverizacao(temperatura, umidade, vento) {
    const valores = [temperatura, umidade, vento].map(Number);

    if (valores.some((valor) => !Number.isFinite(valor))) {
        return {
            nivel: "aguardando",
            titulo: "AGUARDANDO DADOS CLIMÁTICOS",
            resumo: "Ainda não é possível recomendar a pulverização.",
            detalhe: "Aguarde a atualização dos dados meteorológicos da cidade.",
            icone: "fa-clock"
        };
    }

    const temperaturaIdeal = temperatura < 30;
    const umidadeIdeal = umidade > 55;
    const ventoIdeal = vento >= 3 && vento <= 10;

    const condicaoCritica =
        temperatura >= 35 ||
        umidade <= 40 ||
        vento < 1 ||
        vento > 15;

    const motivos = [];

    if (!temperaturaIdeal) motivos.push(`temperatura de ${Math.round(temperatura)} °C`);
    if (!umidadeIdeal) motivos.push(`umidade de ${Math.round(umidade)}%`);
    if (!ventoIdeal) motivos.push(`vento de ${Math.round(vento)} km/h`);

    if (temperaturaIdeal && umidadeIdeal && ventoIdeal) {
        return {
            nivel: "apto",
            titulo: "APTO PARA PULVERIZAÇÃO",
            resumo: "Momento recomendável para adubação foliar.",
            detalhe: "Temperatura, umidade e vento estão dentro da faixa indicada.",
            icone: "fa-check"
        };
    }

    if (condicaoCritica) {
        return {
            nivel: "nao-apto",
            titulo: "NÃO APTO PARA PULVERIZAÇÃO",
            resumo: "Adie a aplicação e aguarde condições mais seguras.",
            detalhe: `Condição desfavorável: ${motivos.join(", ")}.`,
            icone: "fa-xmark"
        };
    }

    return {
        nivel: "atencao",
        titulo: "APLICAÇÃO COM ATENÇÃO",
        resumo: "As condições estão próximas, mas fora da faixa ideal.",
        detalhe: `Verifique novamente antes da aplicação: ${motivos.join(", ")}.`,
        icone: "fa-triangle-exclamation"
    };
}

function aplicarStatusPulverizacao(elemento, avaliacao) {
    if (!elemento || !avaliacao) return;

    elemento.classList.remove(
        "status-verde",
        "status-amarelo",
        "status-vermelho",
        "spray-ok",
        "spray-warning",
        "spray-danger"
    );

    if (avaliacao.nivel === "apto") {
        elemento.classList.add("status-verde", "spray-ok");
    } else if (avaliacao.nivel === "nao-apto") {
        elemento.classList.add("status-vermelho", "spray-danger");
    } else {
        elemento.classList.add("status-amarelo", "spray-warning");
    }

    const titulo = elemento.querySelector(".spray-status-title");
    const resumo = elemento.querySelector(".spray-status-summary");
    const detalhe = elemento.querySelector(".spray-status-detail");
    const icone = elemento.querySelector(".spray-status-icon");

    if (titulo) titulo.textContent = avaliacao.titulo;
    if (resumo) resumo.textContent = avaliacao.resumo;
    if (detalhe) detalhe.textContent = avaliacao.detalhe;

    if (icone) {
        icone.className = `fa-solid ${avaliacao.icone} spray-status-icon`;
        icone.setAttribute("aria-hidden", "true");
    }
}

function atualizarIndicadoresPulverizacao(dadosClimaticos) {
    const avaliacao = avaliarCondicoesPulverizacao(
        dadosClimaticos.temperatura,
        dadosClimaticos.umidade,
        dadosClimaticos.vento
    );

    aplicarStatusPulverizacao(
        document.getElementById("clima-pulverizacao-status"),
        avaliacao
    );

    aplicarStatusPulverizacao(
        document.getElementById("statusPulverizacao"),
        avaliacao
    );

    return avaliacao;
}

function obterChuvaDoHorarioAtual(dados) {
    const horarios = dados?.hourly?.time;
    const probabilidades = dados?.hourly?.precipitation_probability;
    const horaAtual = dados?.current?.time;

    if (!Array.isArray(horarios) || !Array.isArray(probabilidades)) return 0;

    const indiceExato = horarios.indexOf(horaAtual);
    if (indiceExato >= 0) return Number(probabilidades[indiceExato]) || 0;

    const prefixoHora = String(horaAtual || "").slice(0, 13);
    const indiceAproximado = horarios.findIndex((hora) => String(hora).startsWith(prefixoHora));
    return indiceAproximado >= 0 ? Number(probabilidades[indiceAproximado]) || 0 : 0;
}

async function buscarClimaAPI(cidade, estado) {
    try {
        definirTexto("clima-localizacao", `${cidade} - ${estado}`);
        definirTexto("clima-status", "Atualizando dados climáticos...");

        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cidade)}&count=10&language=pt&format=json&countryCode=BR`;
        const geoResp = await fetch(geoUrl);
        if (!geoResp.ok) throw new Error(`Geocodificação: HTTP ${geoResp.status}`);

        const geoData = await geoResp.json();
        if (!geoData.results?.length) throw new Error("Cidade não encontrada.");

        const estadoNormalizado = String(estado).toUpperCase();
        const local = geoData.results.find((resultado) =>
            resultado.country_code === "BR" &&
            String(resultado.admin1 || "").toUpperCase().includes(estadoNormalizado)
        ) || geoData.results.find((resultado) => resultado.country_code === "BR") || geoData.results[0];

        const parametros = new URLSearchParams({
            latitude: local.latitude,
            longitude: local.longitude,
            current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
            hourly: "precipitation_probability",
            wind_speed_unit: "kmh",
            timezone: "America/Sao_Paulo",
            forecast_days: "1"
        });

        const respostaClima = await fetch(`https://api.open-meteo.com/v1/forecast?${parametros}`);
        if (!respostaClima.ok) throw new Error(`Previsão: HTTP ${respostaClima.status}`);

        const dados = await respostaClima.json();
        const atual = dados.current;
        if (!atual) throw new Error("A API não retornou as condições atuais.");

        const chuva = obterChuvaDoHorarioAtual(dados);
        const clima = interpretarCodigoClima(atual.weather_code, Number(atual.is_day) === 1);

        definirTexto("clima-localizacao", `${cidade} - ${estado}`);
        definirTexto("clima-temp", `${Math.round(atual.temperature_2m)} °C`);
        definirTexto("clima-status", clima.texto);
        definirTexto("clima-umidade", `${Math.round(atual.relative_humidity_2m)}%`);
        definirTexto("clima-vento", `${Math.round(atual.wind_speed_10m)} km/h`);
        definirTexto("clima-chuva", `${Math.round(chuva)}%`);

        const icone = document.getElementById("clima-icone");
        if (icone) {
            icone.className = `fa-solid ${clima.icone} weather-icon`;
            icone.style.color = clima.cor;
        }

        const registro = {
            cidade,
            estado,
            temperatura: Number(atual.temperature_2m),
            umidade: Number(atual.relative_humidity_2m),
            vento: Number(atual.wind_speed_10m),
            chuva,
            atualizadoEm: new Date().toISOString()
        };
        localStorage.setItem("frutech_clima_atual", JSON.stringify(registro));

        atualizarIndicadoresPulverizacao(registro);

        if (typeof window.atualizarAlertasAplicacao === "function") {
            window.atualizarAlertasAplicacao();
        }
    } catch (erro) {
        console.error("Erro ao carregar clima:", erro);
        definirTexto("clima-localizacao", `${cidade} - ${estado}`);
        definirTexto("clima-status", "Dados climáticos indisponíveis");

        if (typeof window.atualizarAlertasAplicacao === "function") {
            window.atualizarAlertasAplicacao();
        }
    }
}

async function salvarNovaLocalizacao() {
    const estado = document.getElementById("cfg-estado")?.value;
    const cidade = document.getElementById("cfg-cidade")?.value.trim();

    if (!estado || !cidade) {
        alert("Por favor, selecione o estado e digite a cidade.");
        return;
    }

    localStorage.setItem("frutech_localizacao", JSON.stringify({ cidade, estado }));
    await buscarClimaAPI(cidade, estado);
    alert(`Localização alterada para ${cidade} - ${estado} com sucesso!`);

    if (typeof window.navigate === "function") window.navigate("inicio");
}

document.addEventListener("DOMContentLoaded", () => {
    const localizacao = obterLocalizacaoSalva();
    const cidade = document.getElementById("cfg-cidade");
    const estado = document.getElementById("cfg-estado");

    if (cidade) cidade.value = localizacao.cidade;
    if (estado) estado.value = localizacao.estado;

    buscarClimaAPI(localizacao.cidade, localizacao.estado);
});

window.buscarClimaAPI = buscarClimaAPI;
window.salvarNovaLocalizacao = salvarNovaLocalizacao;
window.avaliarCondicoesPulverizacao = avaliarCondicoesPulverizacao;
window.atualizarIndicadoresPulverizacao = atualizarIndicadoresPulverizacao;
