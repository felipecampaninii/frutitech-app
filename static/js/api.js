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

function obterImagemEstagioCitros(tipo) {
    const imagens = {
        plantio: "/static/images/laranjeira-plantio.png",
        formacao: "/static/images/laranjeira-formacao.png",
        desenvolvimento: "/static/images/laranjeira-desenvolvimento.png",
        producao: "/static/images/laranjeira-producao.png"
    };

    return imagens[tipo] || imagens.plantio;
}

function gerarPlantaCitros(tipo) {
    const nomes = {
        plantio: "Muda cítrica em fase de plantio",
        formacao: "Laranjeira jovem em formação",
        desenvolvimento: "Laranjeira em desenvolvimento e florescimento",
        producao: "Laranjeira adulta em produção"
    };

    const tipoSeguro = Object.prototype.hasOwnProperty.call(nomes, tipo)
        ? tipo
        : "plantio";

    return `
        <figure class="citrus-plant plant-${tipoSeguro}">
            <span class="plant-shadow" aria-hidden="true"></span>
            <img
                src="${obterImagemEstagioCitros(tipoSeguro)}"
                alt="${nomes[tipoSeguro]}"
                loading="lazy"
                decoding="async"
            >
        </figure>
    `;
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

    const ordemEstagios = ["plantio", "formacao", "desenvolvimento", "producao"];
    const indiceAtual = ordemEstagios.indexOf(tipoAtual);

    function gerarItemEtapa(tipo, titulo) {
        const indice = ordemEstagios.indexOf(tipo);
        const estado = indice < indiceAtual
            ? "is-complete"
            : indice === indiceAtual
                ? "is-current"
                : "is-upcoming";

        return `
            <div class="citrus-stage-item stage-item-${tipo} ${estado}">
                <span></span>
                <strong>${titulo}</strong>
            </div>
        `;
    }

    return `
        <div${atributoId}
             class="citrus-evolution ${estagio.classe}"
             data-estagio="${estagio.titulo}">

            <div class="citrus-scene">
                <div class="citrus-current-tree">
                    ${gerarPlantaCitros(tipoAtual)}
                </div>

            </div>

            <div
                class="citrus-timeline"
                aria-label="Fase atual do pomar: ${estagio.titulo}"
            >

                ${gerarItemEtapa("plantio", "Plantio")}
                ${gerarItemEtapa("formacao", "Formação")}
                ${gerarItemEtapa("desenvolvimento", "Desenvolvimento")}
                ${gerarItemEtapa("producao", "Produção")}

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
        const dose = (rotulo, valor) => valor === null
            ? `<span class="npk-value npk-pending">${rotulo}: análise não informada</span>`
            : `<span class="npk-value">${rotulo} ${formatarValorReal(valor)} kg/ha</span>`;

        return `${dose("N", n)} <span class="npk-separator">·</span> ${dose("P", p)} <span class="npk-separator">·</span> ${dose("K", k)}`;
    }

    const elemento = primeiroValorValido(item, ["elemento"]);
    const fonte = primeiroValorValido(item, ["fonte"]);
    const concentracao = primeiroValorValido(item, ["concentracao"]);
    if (elemento || fonte) {
        return `${escaparHTML(elemento || "NPK")} · ${escaparHTML(fonte || "fonte não salva")}${concentracao !== null ? ` · ${formatarValorReal(concentracao)}%` : ""}`;
    }
    return "Não salva";
}

function atualizarUltimoTalhaoHome(item, numeroTalhao = null) {
    const container = document.getElementById("homeUltimoTalhao");
    if (!container || !item) return;

    const idade = Number(primeiroValorValido(item, ["idade", "idade_pomar"], 0)) || 0;
    const area = primeiroValorValido(item, ["area", "area_ha"]);
    const arvores = primeiroValorValido(item, ["arvores", "quantidade_arvores", "numero_arvores"]);
    const trv = primeiroValorValido(item, ["trv_hectare", "trv_ha", "trvPorHectare", "trv"]);
    const data = primeiroValorValido(item, ["data_registro", "data", "criado_em"], "Último registro");
    const identificacaoSalva = primeiroValorValido(item, ["nome_talhao", "talhao", "identificacao"]);
    const numeroRegistro = numeroTalhao || primeiroValorValido(item, ["numero_talhao", "id"], 1);
    const identificacao = identificacaoSalva || `Talhão ${numeroRegistro}`;
    const npk = obterRecomendacaoNPK(item);

    container.innerHTML = `
        <div class="home-lot-head">
            <i class="fa-solid fa-location-dot"></i>
            <div>
                <div class="home-lot-name">${escaparHTML(identificacao)}</div>
                <div class="home-lot-date"><i class="fa-regular fa-calendar"></i> Atualizado em ${escaparHTML(data)}</div>
            </div>
        </div>

        ${gerarEvolucaoCitros(idade, "homeCitrusEvolution")}

        <div class="home-stat-grid home-stat-grid-complete">
            <div class="home-stat"><i class="fa-solid fa-seedling"></i><div><span>Idade</span><strong>${formatarValorReal(idade, 0)} ${idade === 1 ? "ano" : "anos"}</strong></div></div>
            <div class="home-stat"><i class="fa-solid fa-tree"></i><div><span>Árvores</span><strong>${formatarValorReal(arvores, 0)}</strong></div></div>
            <div class="home-stat"><i class="fa-solid fa-road"></i><div><span>Área</span><strong>${formatarValorReal(area)} ha</strong></div></div>
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

        atualizarUltimoTalhaoHome(historico[0], historico.length);

        container.innerHTML = historico.map((item, indice) => {
            const numeroTalhao = historico.length - indice;
            const id = Number(item.id);
            const estagioResumo = obterDadosEstagio(Number(item.idade) || 0);
            const iconeEstagio = estagioResumo.classe === "stage-desenvolvimento" || estagioResumo.classe === "stage-producao"
                ? "fa-leaf"
                : "fa-seedling";

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
                            <div class="history-stage-badge ${estagioResumo.classe}">
                                <i class="fa-solid ${iconeEstagio}"></i>
                                ${escaparHTML(estagioResumo.titulo)}
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
// ========================================================

async function limparHistorico() {
    const usuario = obterUsuarioLogado();

    if (!usuario) {
        alert("Usuário não identificado. Faça login novamente.");
        return;
    }

    const confirmar = confirm(
        "Tem certeza que deseja apagar todos os registros do seu histórico?"
    );

    if (!confirmar) return;

    try {
        const response = await fetch(
            `${API_SIMULACOES_URL}?usuario_id=${encodeURIComponent(usuario.id)}`,
            { method: "DELETE" }
        );

        const resultado = await response.json();

        if (!response.ok) {
            alert("Erro ao limpar histórico: " + (resultado.erro || "Erro desconhecido."));
            return;
        }

        alert("Histórico apagado com sucesso!");
        await carregarHistorico();
    } catch (erro) {
        console.error("Erro ao apagar histórico:", erro);
        alert("Erro ao apagar os dados.");
    }
}

window.limparHistorico = limparHistorico;

// ========================================================
// EXPERIÊNCIA VISUAL DO DIAGNÓSTICO
// Mantém o mesmo input e o mesmo fluxo de análise já existente.
// ========================================================

function atualizarEtapaDiagnostico(etapaAtual) {
    document.querySelectorAll("[data-diagnosis-step]").forEach((etapa) => {
        const numero = Number(etapa.dataset.diagnosisStep);
        etapa.classList.toggle("is-active", numero === etapaAtual);
        etapa.classList.toggle("is-complete", numero < etapaAtual);
    });
}

function abrirFonteDiagnostico(origem) {
    const input = document.getElementById("inputFoto");
    if (!input) return;

    if (origem === "camera") input.setAttribute("capture", "environment");
    else input.removeAttribute("capture");

    input.click();
}

document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("inputFoto");
    const botao = document.getElementById("btnAnalisarDiagnostico");
    const resultado = document.getElementById("cardResultadoIA");

    if (input && botao) {
        input.addEventListener("change", () => {
            const possuiFoto = Boolean(input.files && input.files[0]);
            botao.disabled = !possuiFoto;
            atualizarEtapaDiagnostico(possuiFoto ? 2 : 1);
        });
    }

    if (resultado) {
        new MutationObserver(() => {
            if (resultado.style.display !== "none") atualizarEtapaDiagnostico(3);
        }).observe(resultado, { attributes: true, attributeFilter: ["style", "class"] });
    }
});

window.abrirFonteDiagnostico = abrirFonteDiagnostico;
window.atualizarEtapaDiagnostico = atualizarEtapaDiagnostico;
