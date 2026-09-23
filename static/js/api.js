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
                <path d="M49 58 C33 61 21 53 18 40 C34 35 52 40 61 54 C58 56 54 57 49 58Z" fill="url(#leafPlantio)"/>
                <path d="M102 50 C116 48 127 37 129 24 C113 22 97 29 91 44 C94 47 97 49 102 50Z" fill="url(#leafPlantio)"/>
                <path d="M80 65 C67 52 68 32 80 18 C93 31 94 51 80 65Z" fill="url(#leafPlantio)"/>
                <path d="M25 42 Q43 48 58 55 M125 28 Q108 36 94 45 M80 23 L80 61" fill="none" stroke="rgba(210,244,192,.5)" stroke-width="1.4"/>
                <defs><linearGradient id="leafPlantio" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#58b94d"/><stop offset="1" stop-color="#087333"/></linearGradient></defs>
            </svg>`;
    }

    const folhasSvg = folhas.slice(0, c.folhas).map((p, i) =>
        `<g transform="translate(${p[0]} ${p[1]}) rotate(${(i % 5 - 2) * 17})">
            <path d="M-12 0 C-7-8 7-9 13 0 C7 8-7 8-12 0Z" fill="${i % 5 === 0 ? '#5dac3f' : i % 3 === 0 ? '#075f2b' : i % 2 === 0 ? '#16813a' : '#2d9440'}"/>
            <path d="M-8 0 L9 0" stroke="rgba(204,238,179,.42)" stroke-width="1"/>
        </g>`
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
                <linearGradient id="canopy-${tipo}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#2f963d"/><stop offset=".55" stop-color="#087030"/><stop offset="1" stop-color="#034f27"/></linearGradient>
            </defs>
            <ellipse cx="80" cy="140" rx="43" ry="8" fill="rgba(82,45,24,.30)"/>
            <path d="M78 140 C76 119 80 101 79 69" stroke="url(#trunk-${tipo})" stroke-width="11" stroke-linecap="round"/>
            <path d="M80 105 C70 91 59 77 45 66 M80 99 C94 84 105 70 120 61 M80 89 C78 71 78 57 82 42 M65 85 L55 58 M96 81 L107 52" fill="none" stroke="#70401f" stroke-width="5.5" stroke-linecap="round"/>
            <path d="M34 78 C25 58 37 39 55 34 C59 15 81 11 94 25 C112 19 132 33 129 52 C147 64 139 88 122 94 C114 112 91 112 79 101 C62 113 39 103 40 88 C34 86 31 82 34 78Z" fill="url(#canopy-${tipo})" opacity=".96"/>
            <path d="M42 58 C55 35 80 29 98 38 C78 40 57 48 42 58Z" fill="rgba(117,183,68,.34)"/>
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

let modoExclusaoHistorico = false;
let idsHistoricoSelecionados = new Set();

function mostrarMensagemApp(mensagem, tipo = "info", duracao = 3500) {
    const container = document.getElementById("appMessageContainer");

    if (!container) {
        console.log(`[${tipo}] ${mensagem}`);
        return;
    }

    const aviso = document.createElement("div");
    aviso.className = `app-message ${tipo}`;

    const icones = {
        success: "fa-circle-check",
        error: "fa-circle-xmark",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };

    aviso.innerHTML = `
        <i class="fa-solid ${icones[tipo] || icones.info}"></i>
        <span>${escaparHTML(mensagem)}</span>
    `;

    container.appendChild(aviso);

    setTimeout(() => {
        aviso.remove();
    }, duracao);
}

function formatarCampoHistorico(valor, sufixo = "") {
    if (valor === null || valor === undefined || valor === "") {
        return "-";
    }

    return `${escaparHTML(valor)}${sufixo}`;
}

function alternarDetalhesHistorico(id) {
    if (modoExclusaoHistorico) {
        alternarSelecaoHistorico(id);
        return;
    }

    const card = document.querySelector(`.history-item[data-id="${id}"]`);
    if (!card) return;

    card.classList.toggle("open");

    const resumo = card.querySelector(".history-summary");
    if (resumo) {
        resumo.setAttribute(
            "aria-expanded",
            card.classList.contains("open") ? "true" : "false"
        );
    }
}

function alternarModoExclusaoHistorico() {
    modoExclusaoHistorico = !modoExclusaoHistorico;
    idsHistoricoSelecionados.clear();

    const barra = document.getElementById("historySelectionBar");
    const botao = document.getElementById("btnAtivarExclusao");
    const selecionarTodos = document.getElementById("selecionarTodosHistorico");

    if (barra) {
        barra.style.display = modoExclusaoHistorico ? "block" : "none";
    }

    if (botao) {
        botao.classList.toggle("active", modoExclusaoHistorico);
    }

    if (selecionarTodos) {
        selecionarTodos.checked = false;
        selecionarTodos.indeterminate = false;
    }

    document.querySelectorAll(".history-item").forEach(card => {
        card.classList.toggle("selection-mode", modoExclusaoHistorico);
        card.classList.remove("selected");

        const checkbox = card.querySelector(".history-select-checkbox");
        if (checkbox) {
            checkbox.style.display = modoExclusaoHistorico ? "block" : "none";
            checkbox.checked = false;
        }

        if (modoExclusaoHistorico) {
            card.classList.remove("open");
        }
    });

    atualizarControlesExclusaoHistorico();
}

function cancelarModoExclusaoHistorico() {
    if (!modoExclusaoHistorico) return;
    alternarModoExclusaoHistorico();
}

function alternarSelecaoHistorico(id, evento = null) {
    if (evento) {
        evento.stopPropagation();
    }

    if (!modoExclusaoHistorico) return;

    id = Number(id);

    if (idsHistoricoSelecionados.has(id)) {
        idsHistoricoSelecionados.delete(id);
    } else {
        idsHistoricoSelecionados.add(id);
    }

    const card = document.querySelector(`.history-item[data-id="${id}"]`);
    const checkbox = card?.querySelector(".history-select-checkbox");
    const selecionado = idsHistoricoSelecionados.has(id);

    if (card) card.classList.toggle("selected", selecionado);
    if (checkbox) checkbox.checked = selecionado;

    atualizarControlesExclusaoHistorico();
}

function selecionarTodosHistorico(marcar) {
    if (!modoExclusaoHistorico) return;

    idsHistoricoSelecionados.clear();

    document.querySelectorAll(".history-item[data-id]").forEach(card => {
        const id = Number(card.dataset.id);
        const checkbox = card.querySelector(".history-select-checkbox");

        if (marcar) {
            idsHistoricoSelecionados.add(id);
        }

        card.classList.toggle("selected", marcar);
        if (checkbox) checkbox.checked = marcar;
    });

    atualizarControlesExclusaoHistorico();
}

function atualizarControlesExclusaoHistorico() {
    const cards = [...document.querySelectorAll(".history-item[data-id]")];
    const total = cards.length;
    const selecionados = idsHistoricoSelecionados.size;

    const btnExcluir = document.getElementById("btnExcluirSelecionados");
    const selecionarTodos = document.getElementById("selecionarTodosHistorico");

    if (btnExcluir) {
        btnExcluir.disabled = selecionados === 0;
        btnExcluir.innerHTML = `
            <i class="fa-solid fa-trash-can"></i>
            ${selecionados > 0 ? `Excluir ${selecionados} selecionado${selecionados === 1 ? "" : "s"}` : "Excluir selecionados"}
        `;
    }

    if (selecionarTodos) {
        selecionarTodos.checked = total > 0 && selecionados === total;
        selecionarTodos.indeterminate = selecionados > 0 && selecionados < total;
    }
}

async function excluirHistoricosSelecionados() {
    const usuario = obterUsuarioLogado();

    if (!usuario) {
        mostrarMensagemApp("Usuário não identificado. Faça login novamente.", "error");
        return;
    }

    const ids = [...idsHistoricoSelecionados];

    if (ids.length === 0) {
        mostrarMensagemApp("Selecione pelo menos um talhão para apagar.", "warning");
        return;
    }

    const confirmar = window.confirm(
        `Deseja apagar ${ids.length} registro${ids.length === 1 ? "" : "s"} selecionado${ids.length === 1 ? "" : "s"}?`
    );

    if (!confirmar) return;

    try {
        const response = await fetch(API_SIMULACOES_URL, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                usuario_id: usuario.id,
                ids: ids
            })
        });

        const resultado = await response.json();

        if (!response.ok) {
            mostrarMensagemApp(
                resultado.erro || "Não foi possível apagar os registros.",
                "error"
            );
            return;
        }

        mostrarMensagemApp(
            `${resultado.registros_excluidos ?? ids.length} registro${ids.length === 1 ? "" : "s"} apagado${ids.length === 1 ? "" : "s"} com sucesso.`,
            "success"
        );

        modoExclusaoHistorico = false;
        idsHistoricoSelecionados.clear();

        const barra = document.getElementById("historySelectionBar");
        if (barra) barra.style.display = "none";

        await carregarHistorico();

    } catch (erro) {
        console.error("Erro ao excluir registros:", erro);
        mostrarMensagemApp("Erro de conexão ao apagar os registros.", "error");
    }
}

async function carregarHistorico() {
    const container = document.getElementById("containerHistorico");

    if (!container) return;

    const usuario = obterUsuarioLogado();

    if (!usuario) {
        container.innerHTML = `
            <article class="card">
                <p class="history-error">
                    Usuário não identificado. Faça login novamente.
                </p>
            </article>
        `;
        return;
    }

    modoExclusaoHistorico = false;
    idsHistoricoSelecionados.clear();

    const barra = document.getElementById("historySelectionBar");
    if (barra) barra.style.display = "none";

    container.innerHTML = `
        <p class="history-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Buscando histórico...
        </p>
    `;

    try {
        const response = await fetch(
            `${API_SIMULACOES_URL}?usuario_id=${encodeURIComponent(usuario.id)}`
        );

        const historico = await response.json();

        if (!response.ok) {
            container.innerHTML = `
                <article class="card">
                    <p class="history-error">
                        ${escaparHTML(historico.erro || "Erro ao carregar histórico.")}
                    </p>
                </article>
            `;
            return;
        }

        if (!historico || historico.length === 0) {
            container.innerHTML = `
                <article class="card">
                    <p class="history-empty">
                        Nenhum talhão registrado ainda.<br>
                        Faça uma simulação para começar!
                    </p>
                </article>
            `;
            return;
        }

        atualizarUltimoTalhaoHome(historico[0]);

        container.innerHTML = historico.map((item, indice) => {
            const numeroTalhao = historico.length - indice;
            const id = Number(item.id);

            return `
                <article class="history-item" data-id="${id}">
                    <div
                        class="history-summary"
                        role="button"
                        tabindex="0"
                        aria-expanded="false"
                        onclick="alternarDetalhesHistorico(${id})"
                        onkeydown="if(event.key === 'Enter' || event.key === ' '){event.preventDefault(); alternarDetalhesHistorico(${id});}"
                    >
                        <input
                            class="history-select-checkbox"
                            type="checkbox"
                            aria-label="Selecionar Talhão ${numeroTalhao}"
                            style="display:none;"
                            onclick="alternarSelecaoHistorico(${id}, event)"
                        >

                        <div class="history-summary-main">
                            <div class="history-talhao-title">
                                Talhão ${numeroTalhao}
                            </div>
                            <div class="history-date">
                                <i class="fa-regular fa-calendar"></i>
                                ${escaparHTML(item.data_registro || "-")}
                            </div>
                        </div>

                        <i class="fa-solid fa-chevron-down history-chevron"></i>
                    </div>

                    <div class="history-details">
                        <div class="card-title" style="font-size:14px; margin:14px 0 8px;">
                            <i class="fa-solid fa-vial-circle-check" style="color:#136a32;"></i>
                            ${escaparHTML(item.elemento || "-")} - ${escaparHTML(item.fonte || "-")}
                        </div>

                        <div class="history-grid-data">
                            <div class="history-data-item"><span>Área do Talhão:</span><strong>${formatarCampoHistorico(item.area, " ha")}</strong></div>
                            <div class="history-data-item"><span>Produção Esperada:</span><strong>${formatarCampoHistorico(item.producao, " cx")}</strong></div>
                            <div class="history-data-item"><span>Nº de Árvores:</span><strong>${formatarCampoHistorico(item.arvores, " un")}</strong></div>
                            <div class="history-data-item"><span>Idade do Pomar:</span><strong>${formatarCampoHistorico(item.idade, " anos")}</strong></div>
                            <div class="history-data-item"><span>Volume de Calda:</span><strong>${formatarCampoHistorico(item.volume, " L/ha")}</strong></div>
                            <div class="history-data-item"><span>Concentração:</span><strong>${formatarCampoHistorico(item.concentracao, " %")}</strong></div>
                        </div>

                        ${gerarDesenvolvimentoPomar(item)}
                    </div>
                </article>
            `;
        }).join("");

    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);

        container.innerHTML = `
            <article class="card">
                <p class="history-error">
                    Não foi possível carregar os dados.
                </p>
            </article>
        `;
    }
}

// ========================================================
// IDENTIDADE VISUAL DO CLIMA PELO HORÁRIO LOCAL
// ========================================================

function atualizarIconePeriodoDia() {
    const agora = new Date();
    const hora = agora.getHours() + agora.getMinutes() / 60;
    const icone = document.getElementById("clima-icone");
    let periodo = "dia";
    let classe = "fa-solid fa-sun weather-icon weather-day-icon";
    let titulo = "Período diurno";

    if (hora >= 5 && hora < 7) {
        periodo = "amanhecer";
        classe = "fa-solid fa-cloud-sun weather-icon weather-dawn-icon";
        titulo = "Amanhecer";
    } else if (hora >= 17 && hora < 19) {
        periodo = "entardecer";
        classe = "fa-solid fa-sun weather-icon weather-sunset-icon";
        titulo = "Entardecer";
    } else if (hora >= 19 || hora < 5) {
        periodo = "noite";
        classe = "fa-solid fa-moon weather-icon weather-night-icon";
        titulo = "Período noturno";
    }

    if (icone) {
        icone.className = classe;
        icone.dataset.periodo = periodo;
        icone.setAttribute("title", titulo);
        icone.setAttribute("aria-label", titulo);
    }

    document.querySelectorAll(".citrus-scene").forEach(cena => {
        cena.classList.remove("periodo-dia", "periodo-amanhecer", "periodo-entardecer", "periodo-noite");
        cena.classList.add(`periodo-${periodo}`);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    atualizarIconePeriodoDia();
    setTimeout(atualizarIconePeriodoDia, 1500);
    setInterval(atualizarIconePeriodoDia, 60000);
});

// ========================================================
// LIMPAR HISTÓRICO

