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

    if (anos <= 2) {

        return {
            classe: "stage-formacao",
            titulo: "Formação do Pomar",

            descricao:
                "Pomar jovem em fase de estabelecimento. " +
                "O foco principal está no desenvolvimento das raízes, " +
                "formação da copa e crescimento vegetativo equilibrado.",

            estrutura: Math.min(42, 22 + anos * 10),
            producao: Math.min(25, 8 + anos * 8)
        };

    }


    if (anos <= 5) {

        return {
            classe: "stage-transicao",
            titulo: "Entrada em Produção",

            descricao:
                "O pomar está entrando na fase produtiva, " +
                "com expansão da copa e aumento gradual da necessidade nutricional.",

            estrutura: 55 + ((anos - 3) * 9),
            producao: 42 + ((anos - 3) * 12)
        };

    }


    if (anos <= 12) {

        return {
            classe: "stage-producao",
            titulo: "Auge Produtivo",

            descricao:
                "Pomar adulto em fase de maior estabilidade produtiva, " +
                "com necessidade de acompanhamento da nutrição, " +
                "carga de frutos e uniformidade da copa.",

            estrutura: 88,
            producao: 90
        };

    }


    return {
        classe: "stage-maduro",
        titulo: "Pomar Maduro",

        descricao:
            "Pomar consolidado, onde o manejo deve priorizar a manutenção " +
            "do vigor, renovação de ramos e equilíbrio entre produção " +
            "e desenvolvimento vegetativo.",

        estrutura: 82,
        producao: 76
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

            <div class="orchard-visual ${estagio.classe}">

                <div class="orchard-sun"></div>

                <div class="orchard-cloud"></div>

                <div class="orchard-hills"></div>

                <div class="orchard-soil"></div>


                <div class="orchard-trees">

                    ${gerarArvore(
                        "side",
                        Math.max(0, frutos - 2)
                    )}

                    ${gerarArvore(
                        "main",
                        frutos
                    )}

                    ${gerarArvore(
                        "side",
                        Math.max(0, frutos - 1)
                    )}

                </div>

            </div>



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
// CARREGAR HISTÓRICO
// ========================================================

async function carregarHistorico() {

    const container =
        document.getElementById(
            "containerHistorico"
        );


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


        // ====================================================
        // CRIA CADA CARD DO HISTÓRICO
        // ====================================================

        container.innerHTML =
            historico
            .map(
                (item, indice) => `


                <article class="card history-card">


                    <!-- CABEÇALHO -->

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



                    <!-- NUTRIENTE PRINCIPAL -->

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
                            style="
                                color:#136a32;
                            "
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



                    <!-- DADOS -->

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



                    <!-- DESENVOLVIMENTO DO POMAR -->

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