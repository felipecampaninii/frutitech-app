const API_SIMULACOES_URL = "/api/simulacoes";
const API_DIAGNOSTICO_URL = "/api/diagnostico";

function obterUsuarioLogado() {
    const sessao = localStorage.getItem('frutech_usuario');

    if (!sessao) {
        return null;
    }

    try {
        const usuario = JSON.parse(sessao);

        if (!usuario || !usuario.id) {
            return null;
        }

        return usuario;

    } catch (erro) {
        console.error("Erro ao recuperar usuário:", erro);
        return null;
    }
}


// ========================================================
// FUNÇÃO PARA EVITAR PROBLEMAS COM TEXTO VINDO DO BANCO
// ========================================================

function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


// ========================================================
// DESENVOLVIMENTO DO POMAR
// Define o estágio de acordo com a idade
// ========================================================

function obterDadosEstagio(idade) {
    const anos = Number(idade) || 0;

    // Até 1 ano: muda pequena recém-implantada
    if (anos <= 1) {
        return {
            classe: "stage-plantio",
            titulo: "Plantio",

            descricao:
                "Muda cítrica em fase de implantação e enraizamento. " +
                "O manejo deve favorecer o pegamento, a emissão de brotações " +
                "e a formação inicial de uma estrutura saudável.",

            estrutura: 25,
            producao: 5
        };
    }

    // De 2 a 3 anos: árvore jovem com a copa em formação
    if (anos <= 3) {
        return {
            classe: "stage-formacao",
            titulo: "Formação",

            descricao:
                "Citro jovem em formação, com tronco ainda fino, " +
                "ramificações abertas e copa em construção. " +
                "O foco é obter arquitetura equilibrada e vigor vegetativo.",

            estrutura: 48,
            producao: 18
        };
    }

    // De 4 a 5 anos: desenvolvimento da copa
    if (anos <= 5) {
        return {
            classe: "stage-desenvolvimento",
            titulo: "Desenvolvimento",

            descricao:
                "Citro com copa em expansão, maior massa foliar e início " +
                "da diferenciação floral. O acompanhamento nutricional " +
                "sustenta o crescimento e prepara a produção.",

            estrutura: 72,
            producao: 48
        };
    }

    // A partir de 6 anos: pomar produtivo
    return {
        classe: "stage-producao",
        titulo: "Produção",

        descricao:
            "Citro adulto com copa formada e presença de frutos. " +
            "O manejo deve equilibrar carga produtiva, qualidade dos frutos, " +
            "vigor e manutenção da área foliar.",

        estrutura: 90,
        producao: 92
    };
}
// ========================================================
// INFORMAÇÕES DOS NUTRIENTES
// ========================================================

function obterDadosNutriente(elemento) {

    const nutrientes = {

        N: {
            nome: "Nitrogênio",
            funcao:
                "Favorece o crescimento vegetativo, formação de folhas " +
                "e manutenção da área fotossintética da planta."
        },

        P: {
            nome: "Fósforo",
            funcao:
                "Participa do metabolismo energético, desenvolvimento das raízes " +
                "e processos ligados ao florescimento."
        },

        K: {
            nome: "Potássio",
            funcao:
                "Importante para o equilíbrio hídrico, transporte de nutrientes " +
                "e qualidade dos frutos."
        },

        Zn: {
            nome: "Zinco",
            funcao:
                "Contribui para atividade enzimática, crescimento de brotações " +
                "e desenvolvimento adequado das folhas."
        },

        Mn: {
            nome: "Manganês",
            funcao:
                "Participa da fotossíntese e de diversas reações metabólicas " +
                "importantes para o desenvolvimento da planta."
        },

        B: {
            nome: "Boro",
            funcao:
                "Atua na formação dos tecidos, florescimento, fecundação " +
                "e desenvolvimento inicial dos frutos."
        }

    };


    return nutrientes[elemento] || {
        nome: elemento || "Nutriente",
        funcao: "Nutriente registrado na recomendação deste talhão."
    };
}


// ========================================================
// CALCULA UMA PRIORIDADE NUTRICIONAL VISUAL
// ========================================================

function obterPrioridadeNutricional(item) {

    const objetivo =
        String(item.objetivo || "").toLowerCase();

    const concentracao =
        Number(item.concentracao) || 0;


    let prioridade = 58;


    // Caso seja correção de deficiência
    if (objetivo.includes("corre")) {
        prioridade = 88;
    }


    // Pequeno ajuste considerando concentração
    if (concentracao > 0) {

        prioridade +=
            Math.min(8, concentracao / 4);

    }


    return Math.max(
        15,
        Math.min(96, Math.round(prioridade))
    );
}


// ========================================================
// GERA FRUTOS DA ÁRVORE
// ========================================================

function gerarFrutos(quantidade) {

    return Array.from(
        { length: quantidade },
        () => `<span class="history-fruit"></span>`
    ).join('');

}


// ========================================================
// GERA UMA ÁRVORE
// ========================================================

function gerarArvore(classe, frutos) {

    return `

        <div class="history-tree ${classe}">

            <div class="crown">

                ${gerarFrutos(frutos)}

            </div>

            <div class="trunk"></div>

        </div>

    `;

}

// ========================================================
// EVOLUÇÃO VISUAL DOS CITROS
// Gera as fases: plantio, formação, desenvolvimento e produção
// ========================================================

function gerarPlantaCitros(tipo) {
    const configuracoes = {
        plantio: { escala: 0.54, folhas: 3, flores: 0, frutos: 0 },
        formacao: { escala: 0.76, folhas: 16, flores: 6, frutos: 0 },
        desenvolvimento: { escala: 0.92, folhas: 24, flores: 10, frutos: 0 },
        producao: { escala: 1.08, folhas: 30, flores: 2, frutos: 12 }
    };

    const c = configuracoes[tipo] || configuracoes.plantio;
    const folhas = [
        [63,43],[80,32],[98,39],[113,54],[119,72],[111,91],[95,103],[75,105],
        [57,96],[43,83],[39,65],[49,50],[72,58],[91,54],[101,72],[88,84],
        [67,81],[55,69],[78,70],[104,88],[53,105],[119,101],[34,94],[129,83],
        [66,28],[91,24],[112,35],[41,57],[128,62],[78,93]
    ];
    const flores = [[55,54],[84,39],[108,60],[69,74],[98,87],[48,88],[119,78],[78,101],[91,65],[63,96]];
    const frutos = [[55,51],[81,38],[105,52],[119,70],[99,75],[75,63],[48,77],[64,91],[91,96],[113,91],[77,105],[43,96]];

    if (tipo === "plantio") {
        return `
            <svg class="citrus-tree-svg tree-${tipo}" viewBox="0 0 160 150" role="img" aria-label="Muda cítrica em fase de plantio">
                <ellipse cx="80" cy="140" rx="35" ry="7" fill="rgba(82,45,24,.28)"/>
                <path d="M77 139 C78 112 77 86 79 60" stroke="#78401f" stroke-width="7" stroke-linecap="round"/>
                <path d="M79 91 C65 78 56 68 48 58" stroke="#78401f" stroke-width="4" stroke-linecap="round"/>
                <path d="M79 80 C91 68 99 58 106 47" stroke="#78401f" stroke-width="4" stroke-linecap="round"/>
                <ellipse cx="43" cy="53" rx="25" ry="13" transform="rotate(27 43 53)" fill="url(#leafPlantio)"/>
                <ellipse cx="109" cy="43" rx="25" ry="13" transform="rotate(-31 109 43)" fill="url(#leafPlantio)"/>
                <ellipse cx="80" cy="55" rx="15" ry="28" fill="url(#leafPlantio)"/>
                <defs><linearGradient id="leafPlantio" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#58b94d"/><stop offset="1" stop-color="#087333"/></linearGradient></defs>
            </svg>`;
    }

    const folhasSvg = folhas.slice(0, c.folhas).map((p, i) =>
        `<ellipse cx="${p[0]}" cy="${p[1]}" rx="19" ry="14" transform="rotate(${(i % 3 - 1) * 18} ${p[0]} ${p[1]})" fill="${i % 4 === 0 ? '#48a83e' : i % 3 === 0 ? '#08702c' : '#168137'}"/>`
    ).join("");
    const floresSvg = flores.slice(0, c.flores).map(p =>
        `<g transform="translate(${p[0]} ${p[1]})"><circle r="5.5" fill="#fffdf4"/><circle r="2" fill="#ffd84a"/></g>`
    ).join("");
    const frutosSvg = frutos.slice(0, c.frutos).map(p =>
        `<g transform="translate(${p[0]} ${p[1]})"><circle r="6.5" fill="url(#orangeFruit)"/><ellipse cx="2" cy="-6" rx="4" ry="2" fill="#2f8b2f" transform="rotate(-25)"/></g>`
    ).join("");

    return `
        <svg class="citrus-tree-svg tree-${tipo}" style="--tree-scale:${c.escala}" viewBox="0 0 160 150" role="img" aria-label="Citro em fase de ${tipo}">
            <defs>
                <linearGradient id="trunk-${tipo}" x1="0" x2="1"><stop stop-color="#603116"/><stop offset=".5" stop-color="#9b5a2d"/><stop offset="1" stop-color="#5c2c15"/></linearGradient>
                <radialGradient id="orangeFruit" cx="30%" cy="25%"><stop stop-color="#fff48c"/><stop offset=".28" stop-color="#ffc629"/><stop offset="1" stop-color="#e98200"/></radialGradient>
            </defs>
            <ellipse cx="80" cy="140" rx="43" ry="8" fill="rgba(82,45,24,.30)"/>
            <path d="M78 140 C80 113 79 92 80 69" stroke="url(#trunk-${tipo})" stroke-width="11" stroke-linecap="round"/>
            <path d="M80 103 C68 86 58 75 48 66 M81 99 C94 82 105 71 116 62 M80 88 C78 69 78 57 81 44" fill="none" stroke="#74401f" stroke-width="6" stroke-linecap="round"/>
            <g class="svg-foliage">${folhasSvg}</g>
            <g class="svg-flowers">${floresSvg}</g>
            <g class="svg-fruits">${frutosSvg}</g>
        </svg>`;
}


// ========================================================
// MONTA O PAINEL COMPLETO DE EVOLUÇÃO DO POMAR
// ========================================================

function gerarEvolucaoCitros(idade, id = "") {
    const estagio = obterDadosEstagio(idade);

    const tipoAtual =
        estagio.classe === "stage-plantio" ? "plantio" :
        estagio.classe === "stage-formacao" ? "formacao" :
        estagio.classe === "stage-desenvolvimento" ? "desenvolvimento" :
        "producao";

    const atributoId =
        id
            ? ` id="${id}"`
            : "";

    return `
        <div${atributoId}
             class="citrus-evolution ${estagio.classe}"
             data-estagio="${estagio.titulo}">

            <div class="citrus-scene">

                <div class="citrus-sun"></div>

                <div class="citrus-cloud cloud-1"></div>
                <div class="citrus-cloud cloud-2"></div>
                <div class="citrus-cloud cloud-3"></div>

                <div class="citrus-mountains mountain-back"></div>
                <div class="citrus-mountains mountain-front"></div>

                <div class="citrus-field"></div>
                <div class="citrus-soil"></div>

                <div class="citrus-current-tree">
                    ${gerarPlantaCitros(tipoAtual)}
                </div>

            </div>

            <div
                class="citrus-timeline"
                aria-label="Fase atual do pomar: ${estagio.titulo}"
            >

                <div class="citrus-stage-item stage-item-plantio">
                    <span></span>
                    <strong>Plantio</strong>
                </div>

                <div class="citrus-stage-item stage-item-formacao">
                    <span></span>
                    <strong>Formação</strong>
                </div>

                <div class="citrus-stage-item stage-item-desenvolvimento">
                    <span></span>
                    <strong>Desenvolvimento</strong>
                </div>

                <div class="citrus-stage-item stage-item-producao">
                    <span></span>
                    <strong>Produção</strong>
                </div>

            </div>

        </div>
    `;
}
// ========================================================
// GERA O DESENVOLVIMENTO DO POMAR PARA CADA TALHÃO
// ========================================================

function gerarDesenvolvimentoPomar(item) {

    const idade =
        Number(item.idade) || 0;


    const estagio =
        obterDadosEstagio(idade);


    const nutriente =
        obterDadosNutriente(item.elemento);


    const prioridade =
        obterPrioridadeNutricional(item);


    const objetivo =
        escaparHTML(item.objetivo || "Manejo");


    const elemento =
        escaparHTML(item.elemento || "-");


    const fonte =
        escaparHTML(item.fonte || "-");


    const producao =
        Number(item.producao) || 0;


    const arvores =
        Number(item.arvores) || 0;


    // ====================================================
    // QUANTIDADE VISUAL DE FRUTOS
    // ====================================================

    let frutos = 0;

    if (idade >= 3 && idade <= 5) {
        frutos = 3;
    }

    if (idade >= 6) {
        frutos = 6;
    }


    // ====================================================
    // TEXTO DA PRÓXIMA OBSERVAÇÃO
    // ====================================================

    let janelaObservacao;


    if (
        String(item.objetivo || "")
            .toLowerCase()
            .includes("corre")
    ) {

        janelaObservacao =
            "Realize uma nova observação visual em aproximadamente 7 a 10 dias, " +
            "comparando coloração das folhas, novos brotos e evolução dos sintomas.";

    } else {

        janelaObservacao =
            "Faça uma nova avaliação do talhão em aproximadamente 14 a 21 dias " +
            "para acompanhar o desenvolvimento e a uniformidade do pomar.";

    }


    // ====================================================
    // DESCRIÇÃO PERSONALIZADA DO TALHÃO
    // ====================================================

    let descricao = estagio.descricao;


    descricao +=
        ` Nesta simulação, o manejo definido foi ${objetivo.toLowerCase()}, ` +
        `com foco nutricional em ${nutriente.nome} (${elemento}), ` +
        `utilizando ${fonte}.`;


    if (producao > 0) {

        descricao +=
            ` A produção estimada informada para este talhão foi de ` +
            `${producao} caixas.`;

    }


    if (arvores > 0) {

        descricao +=
            ` O acompanhamento considera também as ${arvores} árvores cadastradas.`;

    }


    // ====================================================
    // INDICADOR INOVADOR
    // ÍNDICE FRU-TECH DE DESENVOLVIMENTO
    // ====================================================

    const indiceFruTech = Math.round(

        (
            estagio.estrutura +
            estagio.producao +
            (100 - prioridade / 3)
        ) / 3

    );


    let statusIndice = "Desenvolvimento equilibrado";


    if (indiceFruTech < 45) {

        statusIndice =
            "Talhão em fase inicial de desenvolvimento";

    }

    else if (indiceFruTech < 70) {

        statusIndice =
            "Talhão em evolução produtiva";

    }

    else if (indiceFruTech >= 85) {

        statusIndice =
            "Talhão com alto potencial produtivo";

    }


    // ====================================================
    // RETORNO VISUAL
    // ====================================================

    return `

        <section class="orchard-history-panel">


            <div class="orchard-history-top">

                <div class="orchard-history-title">

                    <i class="fa-solid fa-tree-city"></i>

                    Desenvolvimento do Pomar

                </div>


                <span class="orchard-stage-pill">

                    ${estagio.titulo}
                    ·
                    ${idade}
                    ${idade === 1 ? "ano" : "anos"}

                </span>

            </div>



            <!-- =========================
                 CENÁRIO DO POMAR
            ========================== -->

            ${gerarEvolucaoCitros(idade)}
            
            <!-- =========================
                 INFORMAÇÕES
            ========================== -->

            <div class="orchard-detail">


                <p class="orchard-description">

                    ${descricao}

                </p>



                <!-- NUTRIENTE -->

                <div class="nutrient-focus">

                    <div class="nutrient-symbol">

                        ${elemento}

                    </div>


                    <div class="nutrient-copy">

                        <strong>

                            Foco nutricional:
                            ${nutriente.nome}

                        </strong>


                        <span>

                            ${nutriente.funcao}

                        </span>

                    </div>

                </div>



                <!-- ===================================================
                     ÍNDICE FRU-TECH
                     PARTE DIFERENCIADA / INOVADORA
                ==================================================== -->

                <div
                    style="
                        margin-top:10px;
                        padding:11px;
                        border-radius:11px;
                        background:linear-gradient(
                            135deg,
                            #ecfdf5,
                            #f0fdf4
                        );
                        border:1px solid #bbf7d0;
                    "
                >

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            gap:10px;
                        "
                    >

                        <div>

                            <div
                                style="
                                    font-size:10px;
                                    color:#166534;
                                    font-weight:800;
                                "
                            >

                                <i class="fa-solid fa-seedling"></i>

                                Índice Fru-tech do Talhão

                            </div>


                            <div
                                style="
                                    font-size:9px;
                                    color:#6b7280;
                                    margin-top:2px;
                                "
                            >

                                ${statusIndice}

                            </div>

                        </div>


                        <div
                            style="
                                font-size:22px;
                                font-weight:900;
                                color:#15803d;
                            "
                        >

                            ${indiceFruTech}

                        </div>

                    </div>


                    <div
                        style="
                            height:7px;
                            margin-top:9px;
                            border-radius:20px;
                            overflow:hidden;
                            background:#d1fae5;
                        "
                    >

                        <div
                            style="
                                width:${indiceFruTech}%;
                                height:100%;
                                border-radius:20px;
                                background:linear-gradient(
                                    90deg,
                                    #22c55e,
                                    #84cc16
                                );
                            "
                        ></div>

                    </div>


                    <p
                        style="
                            font-size:8px;
                            line-height:1.35;
                            color:#6b7280;
                            margin-top:6px;
                        "
                    >

                        Indicador experimental calculado a partir da idade,
                        estágio produtivo e prioridade nutricional informada
                        na simulação.

                    </p>

                </div>



                <!-- ===================================================
                     PAINEL DE ACOMPANHAMENTO
                ==================================================== -->

                <div class="frutech-monitor">


                    <div class="monitor-heading">

                        <strong>

                            <i class="fa-solid fa-chart-line"></i>

                            Painel Fru-tech de Acompanhamento

                        </strong>


                        <span>

                            estimativa visual

                        </span>

                    </div>



                    <div class="monitor-row">

                        <span class="monitor-label">

                            Desenvolvimento estrutural

                        </span>


                        <div class="monitor-track">

                            <div
                                class="monitor-fill"
                                style="
                                    width:${Math.round(
                                        estagio.estrutura
                                    )}%
                                "
                            ></div>

                        </div>

                    </div>



                    <div class="monitor-row">

                        <span class="monitor-label">

                            Fase produtiva

                        </span>


                        <div class="monitor-track">

                            <div
                                class="monitor-fill"
                                style="
                                    width:${Math.round(
                                        estagio.producao
                                    )}%
                                "
                            ></div>

                        </div>

                    </div>



                    <div class="monitor-row">

                        <span class="monitor-label">

                            Prioridade nutricional

                        </span>


                        <div class="monitor-track">

                            <div
                                class="monitor-fill"
                                style="
                                    width:${prioridade}%
                                "
                            ></div>

                        </div>

                    </div>



                    <!-- PRÓXIMA OBSERVAÇÃO -->

                    <div class="monitor-next">

                        <i class="fa-solid fa-binoculars"></i>

                        <span>

                            <strong>
                                Próxima observação:
                            </strong>

                            ${janelaObservacao}

                        </span>

                    </div>


                    <div class="monitor-note">

                        Os indicadores são estimativas produzidas a partir
                        dos dados cadastrados na simulação e servem como
                        ferramenta visual de acompanhamento.

                    </div>


                </div>

            </div>

        </section>

    `;

}


// ========================================================
// ÚLTIMO TALHÃO NA TELA INICIAL
// Usa somente valores recebidos da API; não cria dados fictícios.
// ========================================================

function primeiroValorValido(objeto, chaves, fallback = null) {
    for (const chave of chaves) {
        const valor = objeto?.[chave];
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
            return valor;
        }
    }
    return fallback;
}

function formatarValorReal(valor, casas = 2) {
    if (valor === null || valor === undefined || valor === "") return "Não salvo";
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return escaparHTML(valor);
    return numero.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function obterRecomendacaoNPK(item) {
    const recomendacaoPronta = primeiroValorValido(item, [
        "recomendacao_npk", "recomendacaoNpk", "npk", "formula_npk", "formulacao_npk"
    ]);
    if (recomendacaoPronta !== null) return escaparHTML(recomendacaoPronta);

    const n = primeiroValorValido(item, ["dose_n", "doseN", "nitrogenio", "n_recomendado"]);
    const p = primeiroValorValido(item, ["dose_p", "doseP", "fosforo", "p_recomendado"]);
    const k = primeiroValorValido(item, ["dose_k", "doseK", "potassio", "k_recomendado"]);
    if (n !== null || p !== null || k !== null) {
        return `N ${formatarValorReal(n)} · P ${formatarValorReal(p)} · K ${formatarValorReal(k)}`;
    }

    const elemento = primeiroValorValido(item, ["elemento"]);
    const fonte = primeiroValorValido(item, ["fonte"]);
    const concentracao = primeiroValorValido(item, ["concentracao"]);
    if (elemento || fonte) {
        return `${escaparHTML(elemento || "NPK")} · ${escaparHTML(fonte || "fonte não salva")}${concentracao !== null ? ` · ${formatarValorReal(concentracao)}%` : ""}`;
    }
    return "Não salva";
}

function atualizarUltimoTalhaoHome(item) {
    const container = document.getElementById("homeUltimoTalhao");
    if (!container || !item) return;

    const idade = Number(primeiroValorValido(item, ["idade", "idade_pomar"], 0)) || 0;
    const area = primeiroValorValido(item, ["area", "area_ha"]);
    const arvores = primeiroValorValido(item, ["arvores", "quantidade_arvores", "numero_arvores"]);
    const trv = primeiroValorValido(item, ["trv_hectare", "trv_ha", "trvPorHectare", "trv"]);
    const data = primeiroValorValido(item, ["data_registro", "data", "criado_em"], "Último registro");
    const identificacao = primeiroValorValido(item, ["nome_talhao", "talhao", "identificacao"], "Último talhão registrado");
    const npk = obterRecomendacaoNPK(item);

    container.innerHTML = `
        <div class="home-lot-head">
            <i class="fa-solid fa-location-dot"></i>
            <div>
                <div class="home-lot-name">${escaparHTML(identificacao)}</div>
                <div class="home-lot-date"><i class="fa-regular fa-calendar"></i> ${escaparHTML(data)}</div>
            </div>
        </div>

        ${gerarEvolucaoCitros(idade, "homeCitrusEvolution")}

        <div class="home-stat-grid home-stat-grid-complete">
            <div class="home-stat"><i class="fa-solid fa-seedling"></i><div><span>Idade</span><strong>${formatarValorReal(idade, 0)} ${idade === 1 ? "ano" : "anos"}</strong></div></div>
            <div class="home-stat"><i class="fa-solid fa-tree"></i><div><span>Árvores</span><strong>${formatarValorReal(arvores, 0)}</strong></div></div>
            <div class="home-stat"><i class="fa-solid fa-road"></i><div><span>Área</span><strong>${formatarValorReal(area)} ha</strong></div></div>
            <div class="home-stat"><i class="fa-solid fa-ruler-combined"></i><div><span>TRV por hectare</span><strong>${formatarValorReal(trv)}${trv !== null ? " m³/ha" : ""}</strong></div></div>
            <div class="home-stat home-stat-npk"><i class="fa-solid fa-flask-vial"></i><div><span>Recomendação NPK</span><strong>${npk}</strong></div></div>
        </div>`;
}

// ========================================================
// CARREGAR HISTÓRICO
// ========================================================

async function carregarHistorico() {
    const container =
        document.getElementById("containerHistorico");

    if (!container) {
        return;
    }

    const usuario =
        obterUsuarioLogado();

    if (!usuario) {
        container.innerHTML = `
            <article class="card">
                <p
                    style="
                        font-size:13px;
                        color:#ef4444;
                        text-align:center;
                    "
                >
                    Usuário não identificado.
                    Faça login novamente.
                </p>
            </article>
        `;

        return;
    }

    container.innerHTML = `
        <p
            style="
                font-size:12px;
                color:#cbd5e1;
                text-align:center;
            "
        >
            Buscando talhões registrados...
        </p>
    `;

    try {
        const response = await fetch(
            `${API_SIMULACOES_URL}?usuario_id=${encodeURIComponent(
                usuario.id
            )}`
        );

        const historico =
            await response.json();

        if (!response.ok) {
            container.innerHTML = `
                <article class="card">
                    <p
                        style="
                            font-size:13px;
                            color:#ef4444;
                            text-align:center;
                        "
                    >
                        ${
                            escaparHTML(
                                historico.erro ||
                                "Erro ao carregar histórico."
                            )
                        }
                    </p>
                </article>
            `;

            return;
        }

        // ====================================================
        // HISTÓRICO VAZIO
        // ====================================================

        if (
            !historico ||
            historico.length === 0
        ) {
            container.innerHTML = `
                <article class="card">
                    <p
                        style="
                            font-size:13px;
                            color:#6b7280;
                            text-align:center;
                        "
                    >
                        Nenhum talhão registrado ainda.

                        <br>

                        Faça uma simulação para começar!
                    </p>
                </article>
            `;

            return;
        }

        // Atualiza toda a seção da home com o último registro real.
        atualizarUltimoTalhaoHome(historico[0]);

        // ====================================================
        // CRIA OS CARTÕES DO HISTÓRICO
        // ====================================================

        container.innerHTML =
            historico
                .map(
                    (item, indice) => `
                        <article class="card history-card">

                            <div class="history-header-info">

                                <span class="history-date">
                                    <i
                                        class="
                                            fa-regular
                                            fa-calendar-check
                                        "
                                    ></i>

                                    ${
                                        escaparHTML(
                                            item.data_registro
                                        )
                                    }
                                </span>

                                <span class="history-tag">
                                    Talhão ${
                                        historico.length -
                                        indice
                                    }
                                </span>

                            </div>

                            <div
                                class="card-title"
                                style="
                                    font-size:14px;
                                    margin-bottom:4px;
                                "
                            >
                                <i
                                    class="
                                        fa-solid
                                        fa-vial-circle-check
                                    "
                                    style="color:#136a32;"
                                ></i>

                                ${
                                    escaparHTML(
                                        item.elemento
                                    )
                                }

                                -

                                ${
                                    escaparHTML(
                                        item.fonte
                                    )
                                }
                            </div>

                            <div class="history-grid-data">

                                <div class="history-data-item">
                                    <span>
                                        Área do Talhão:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.area
                                            )
                                        }
                                        ha
                                    </strong>
                                </div>

                                <div class="history-data-item">
                                    <span>
                                        Produção Esperada:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.producao
                                            )
                                        }
                                        cx
                                    </strong>
                                </div>

                                <div class="history-data-item">
                                    <span>
                                        Nº de Árvores:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.arvores
                                            )
                                        }
                                        un
                                    </strong>
                                </div>

                                <div class="history-data-item">
                                    <span>
                                        Idade do Pomar:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.idade
                                            )
                                        }
                                        anos
                                    </strong>
                                </div>

                                <div class="history-data-item">
                                    <span>
                                        Volume de Calda:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.volume
                                            )
                                        }
                                        L/ha
                                    </strong>
                                </div>

                                <div class="history-data-item">
                                    <span>
                                        Concentração:
                                    </span>

                                    <strong>
                                        ${
                                            escaparHTML(
                                                item.concentracao
                                            )
                                        }
                                        %
                                    </strong>
                                </div>

                            </div>

                            ${gerarDesenvolvimentoPomar(item)}

                        </article>
                    `
                )
                .join("");

    } catch (erro) {
        console.error(
            "Erro ao carregar histórico:",
            erro
        );

        container.innerHTML = `
            <article class="card">
                <p
                    style="
                        font-size:13px;
                        color:#ef4444;
                        text-align:center;
                    "
                >
                    Não foi possível carregar os dados.
                </p>
            </article>
        `;
    }
}
// ========================================================
// LIMPAR HISTÓRICO
// ========================================================

async function limparHistorico() {

    const usuario =
        obterUsuarioLogado();


    if (!usuario) {

        alert(
            "Usuário não identificado. Faça login novamente."
        );

        return;
    }


    const confirmar = confirm(

        "Tem certeza que deseja apagar todos os registros do seu histórico?"

    );


    if (!confirmar) {
        return;
    }


    try {

        const response = await fetch(

            `${API_SIMULACOES_URL}?usuario_id=${encodeURIComponent(
                usuario.id
            )}`,

            {
                method: "DELETE"
            }

        );


        const resultado =
            await response.json();


        if (response.ok) {

            alert(
                "Histórico apagado com sucesso!"
            );

            carregarHistorico();

        } else {

            alert(

                "Erro ao limpar histórico: " +

                (
                    resultado.erro ||
                    "Erro desconhecido."
                )

            );

        }


    } catch (erro) {

        console.error(erro);

        alert(
            "Erro ao apagar os dados."
        );

    }

}   
