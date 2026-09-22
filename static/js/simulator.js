// ==========================================================
// FRU-TECH - SIMULADOR DE ADUBAÇÃO FOLIAR
//
// Lógica baseada na metodologia do TCC:
//
// 1. Diâmetro médio da copa
// 2. Altura útil da massa foliar
// 3. Volume geométrico da copa
// 4. TRV - Tree Row Volume
// 5. Recomendação N, P2O5 e K2O
// 6. Dose do produto comercial
// 7. Volume de calda de referência
// 8. Massa do micronutriente
// 9. Verificação da quantidade entregue
// 10. Salvamento no MySQL
// ==========================================================



// ==========================================================
// FONTES COMERCIAIS
// ==========================================================

const FONTES_COMERCIAIS = {

    N: [
        {
            nome: "Ureia Foliar (46% N)",
            concentracao: 46
        },
        {
            nome: "Nitrato de Amônio (33% N)",
            concentracao: 33
        }
    ],

    P: [
        {
            nome: "MAP Purificado (61% P₂O₅)",
            concentracao: 61
        },
        {
            nome: "Ácido Fosfórico (52% P₂O₅)",
            concentracao: 52
        }
    ],

    K: [
        {
            nome: "Nitrato de Potássio (44% K₂O)",
            concentracao: 44
        },
        {
            nome: "Sulfato de Potássio (50% K₂O)",
            concentracao: 50
        }
    ],

    Zn: [
        {
            nome: "Sulfato de Zinco (21% Zn)",
            concentracao: 21
        },
        {
            nome: "Zinco Quelatado EDTA (14% Zn)",
            concentracao: 14
        }
    ],

    Mn: [
        {
            nome: "Sulfato de Manganês (26% Mn)",
            concentracao: 26
        },
        {
            nome: "Manganês Quelatado (13% Mn)",
            concentracao: 13
        }
    ],

    B: [
        {
            nome: "Ácido Bórico (17% B)",
            concentracao: 17
        },
        {
            nome: "Octaborato de Sódio (20% B)",
            concentracao: 20
        }
    ],

    Cu: [
        { nome: "Oxicloreto de Cobre (50% Cu)", concentracao: 50 },
        { nome: "Sulfato de Cobre (25% Cu)", concentracao: 25 }
    ],

    Mg: [
        { nome: "Sulfato de Magnésio (9% Mg)", concentracao: 9 }
    ],

    S: [
        { nome: "Sulfato de Magnésio (13% S)", concentracao: 13 }
    ]
};



// ==========================================================
// ATUALIZA AS FONTES QUANDO O NUTRIENTE MUDA
// ==========================================================

function atualizarFontes() {

    const elemento =
        document.getElementById("selectElemento")?.value;

    const fonteSelect =
        document.getElementById("selectFonte");

    const inputConcentracao =
        document.getElementById("simConcentracao");


    if (!fonteSelect) {
        return;
    }


    fonteSelect.innerHTML = "";


    const fontes =
        FONTES_COMERCIAIS[elemento];


    if (!fontes) {

        const option =
            document.createElement("option");

        option.value = "";

        option.textContent =
            "Escolha o nutriente primeiro";

        fonteSelect.appendChild(option);

        return;
    }


    fontes.forEach((fonte) => {

        const option =
            document.createElement("option");

        option.value =
            fonte.nome;

        option.textContent =
            fonte.nome;

        option.dataset.concentracao =
            fonte.concentracao;

        fonteSelect.appendChild(option);
    });


    // Coloca automaticamente a concentração
    // da primeira fonte disponível.

    if (
        fontes.length > 0 &&
        inputConcentracao
    ) {

        inputConcentracao.value =
            fontes[0].concentracao;
    }
}



// ==========================================================
// ATUALIZA CONCENTRAÇÃO QUANDO MUDA A FONTE
// ==========================================================

function atualizarConcentracaoFonte() {

    const fonteSelect =
        document.getElementById("selectFonte");

    const inputConcentracao =
        document.getElementById("simConcentracao");


    if (
        !fonteSelect ||
        !inputConcentracao
    ) {
        return;
    }


    const option =
        fonteSelect.options[
            fonteSelect.selectedIndex
        ];


    if (
        option &&
        option.dataset.concentracao
    ) {

        inputConcentracao.value =
            option.dataset.concentracao;
    }
}



// ==========================================================
// USUÁRIO LOGADO
// ==========================================================

function obterUsuarioId() {

    const sessao =
        localStorage.getItem(
            "frutech_usuario"
        );


    if (!sessao) {
        return null;
    }


    try {

        const usuario =
            JSON.parse(sessao);


        if (
            !usuario ||
            !usuario.id
        ) {
            return null;
        }


        return usuario.id;


    } catch (erro) {

        console.error(
            "Erro ao ler usuário salvo:",
            erro
        );

        return null;
    }
}



// ==========================================================
// CONVERSÃO SEGURA PARA NÚMERO
// ==========================================================

function numero(id) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {
        return 0;
    }


    const valor =
        parseFloat(elemento.value);


    return Number.isFinite(valor)
        ? valor
        : 0;
}



// ==========================================================
// 1. DIÂMETRO MÉDIO DA COPA
//
// D = (D1 + D2) / 2
// ==========================================================

function calcularDiametroCopa(
    medida1,
    medida2
) {

    medida1 =
        Number(medida1);

    medida2 =
        Number(medida2);


    if (
        medida1 <= 0 ||
        medida2 <= 0
    ) {
        return 0;
    }


    return (
        medida1 +
        medida2
    ) / 2;
}



// ==========================================================
// 2. ALTURA ÚTIL DA MASSA FOLIAR
//
// H útil = H - Hc
// ==========================================================

function calcularAlturaUtil(
    alturaTotal,
    alturaCaule
) {

    alturaTotal =
        Number(alturaTotal);

    alturaCaule =
        Number(alturaCaule);


    if (
        alturaTotal <= 0 ||
        alturaCaule < 0 ||
        alturaCaule >= alturaTotal
    ) {
        return 0;
    }


    return (
        alturaTotal -
        alturaCaule
    );
}



// ==========================================================
// 3. VOLUME GEOMÉTRICO DA COPA
//
// Fórmula do elipsoide:
//
// V = 4/3 × PI ×
//     (D1/2) ×
//     (D2/2) ×
//     ((H-Hc)/2)
//
// Resultado = m³ por árvore
// ==========================================================

function calcularVolumeCopa(
    medida1,
    medida2,
    alturaTotal,
    alturaCaule
) {

    const alturaUtil =
        calcularAlturaUtil(
            alturaTotal,
            alturaCaule
        );


    if (
        medida1 <= 0 ||
        medida2 <= 0 ||
        alturaUtil <= 0
    ) {
        return 0;
    }


    const raio1 =
        Number(medida1) / 2;


    const raio2 =
        Number(medida2) / 2;


    const raioVertical =
        alturaUtil / 2;


    return (
        (4 / 3) *
        Math.PI *
        raio1 *
        raio2 *
        raioVertical
    );
}



// ==========================================================
// 4. TRV - TREE ROW VOLUME
//
// Fórmula do documento:
//
//              Altura × Largura × (Área × 10.000)
// TRV total = ------------------------------------
//                    Espaçamento entre linhas
//
// Área em hectares.
// Resultado em m³.
// ==========================================================

function calcularTRV(
    altura,
    largura,
    areaTalhao,
    espacamentoLinhas
) {

    altura =
        Number(altura);

    largura =
        Number(largura);

    areaTalhao =
        Number(areaTalhao);

    espacamentoLinhas =
        Number(espacamentoLinhas);


    if (
        altura <= 0 ||
        largura <= 0 ||
        areaTalhao <= 0 ||
        espacamentoLinhas <= 0
    ) {
        return 0;
    }


    const areaM2 =
        areaTalhao * 10000;


    return (
        altura *
        largura *
        areaM2
    )
    /
    espacamentoLinhas;
}

function calcularTRVPorHectare(altura, largura, espacamentoLinhas) {
    return calcularTRV(altura, largura, 1, espacamentoLinhas);
}


// ==========================================================
// LEITURA DOS DADOS CLIMÁTICOS DA HOME
// ==========================================================

function lerNumeroClima(id) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {
        return null;
    }


    const texto =
        elemento.textContent || "";


    const textoNormalizado =
        texto
            .replace(",", ".")
            .replace(
                /[^0-9.-]/g,
                ""
            );


    const valor =
        parseFloat(
            textoNormalizado
        );


    return Number.isFinite(valor)
        ? valor
        : null;
}



// ==========================================================
// AVALIAÇÃO DA JANELA CLIMÁTICA
//
// VERDE:
// Umidade > 55%
// Temperatura < 30 °C
// Vento entre 3 e 10 km/h
//
// AMARELO:
// Uma ou mais condições pouco fora do ideal,
// mas ainda sem atingir condição crítica.
//
// VERMELHO:
// Temperatura >= 35 °C
// Umidade <= 40%
// Vento < 1 km/h
// Vento > 15 km/h
// ==========================================================

function avaliarJanelaClimatica() {

    const temperatura =
        lerNumeroClima(
            "clima-temp"
        );


    const umidade =
        lerNumeroClima(
            "clima-umidade"
        );


    const vento =
        lerNumeroClima(
            "clima-vento"
        );


    // ======================================================
    // DADOS AINDA NÃO FORAM CARREGADOS
    // ======================================================

    if (
        temperatura === null ||
        umidade === null ||
        vento === null
    ) {

        return {

            nivel:
                "amarelo",

            recomendavel:
                false,

            titulo:
                "AGUARDANDO DADOS CLIMÁTICOS",

            resumo:
                "Ainda não é possível recomendar a pulverização.",

            mensagem:
                "Aguarde a atualização dos dados meteorológicos da cidade."
        };
    }



    // ======================================================
    // VERIFICA AS FAIXAS IDEAIS
    // ======================================================

    const temperaturaIdeal =
        temperatura < 30;


    const umidadeIdeal =
        umidade > 55;


    const ventoIdeal =
        vento >= 3 &&
        vento <= 10;



    // ======================================================
    // STATUS VERDE
    // TODAS AS CONDIÇÕES ESTÃO ADEQUADAS
    // ======================================================

    if (
        temperaturaIdeal &&
        umidadeIdeal &&
        ventoIdeal
    ) {

        return {

            nivel:
                "verde",

            recomendavel:
                true,

            titulo:
                "APTO PARA PULVERIZAÇÃO",

            resumo:
                "Momento recomendável para a adubação foliar.",

            mensagem:
                `Temperatura de ${temperatura} °C, ` +
                `umidade relativa de ${umidade}% e ` +
                `vento de ${vento} km/h dentro das ` +
                `faixas ideais.`
        };
    }



    // ======================================================
    // CONDIÇÕES CRÍTICAS
    // ======================================================

    const condicaoCritica =

        temperatura >= 35 ||

        umidade <= 40 ||

        vento < 1 ||

        vento > 15;



    // ======================================================
    // MONTA A LISTA DE PROBLEMAS ENCONTRADOS
    // ======================================================

    const problemas = [];


    if (!temperaturaIdeal) {

        problemas.push(

            `temperatura de ${temperatura} °C ` +
            `(ideal abaixo de 30 °C)`

        );
    }


    if (!umidadeIdeal) {

        problemas.push(

            `umidade de ${umidade}% ` +
            `(ideal acima de 55%)`

        );
    }


    if (!ventoIdeal) {

        problemas.push(

            `vento de ${vento} km/h ` +
            `(ideal entre 3 e 10 km/h)`

        );
    }



    // ======================================================
    // STATUS VERMELHO
    // CONDIÇÃO CLARAMENTE DESFAVORÁVEL
    // ======================================================

    if (condicaoCritica) {

        return {

            nivel:
                "vermelho",

            recomendavel:
                false,

            titulo:
                "NÃO APTO PARA PULVERIZAÇÃO",

            resumo:
                "Não é recomendável realizar a adubação foliar agora.",

            mensagem:
                "Condição climática desfavorável: " +
                problemas.join("; ") +
                ". Aguarde uma melhora antes da aplicação."
        };
    }



    // ======================================================
    // STATUS AMARELO
    // FORA DO IDEAL, MAS SEM CONDIÇÃO CRÍTICA
    // ======================================================

    return {

        nivel:
            "amarelo",

        recomendavel:
            false,

        titulo:
            "ATENÇÃO — AGUARDE MELHORA",

        resumo:
            "O momento ainda não é recomendável para a adubação foliar.",

        mensagem:
            "Condição fora da faixa ideal: " +
            problemas.join("; ") +
            ". Verifique novamente antes da aplicação."
    };
}



// ==========================================================
// AVALIAÇÃO DO pH DA ÁGUA
// ==========================================================

function avaliarPhAgua(ph) {

    ph =
        Number(ph);


    if (
        !Number.isFinite(ph) ||
        ph <= 0
    ) {

        return {

            status:
                "não informado",

            mensagem:
                "Informe o pH para avaliar o condicionamento da água."
        };
    }


    if (ph > 6.5) {

        return {

            status:
                "acima do ideal",

            mensagem:
                "pH acima de 6,5. Avalie a correção com um acidificante compatível antes de preparar a calda."
        };
    }


    if (ph < 5.5) {

        return {

            status:
                "abaixo do ideal",

            mensagem:
                "pH abaixo de 5,5. Confirme a compatibilidade da fonte e evite acidificar ainda mais a calda."
        };
    }


    return {

        status:
            "adequado",

        mensagem:
            "pH dentro da faixa de referência de 5,5 a 6,5."
    };
}



// ==========================================================
// RECOMENDAÇÃO DE ADJUVANTE
// ==========================================================

function recomendarAdjuvante(
    estagioFoliar,
    escolha
) {

    if (
        escolha &&
        escolha !== "nao-informado"
    ) {

        return escolha.replaceAll(
            "-",
            " "
        );
    }


    if (
        estagioFoliar ===
        "jovens"
    ) {

        return (
            "priorizar espalhante não iônico em dose de rótulo; " +
            "folhas jovens apresentam maior sensibilidade"
        );
    }


    return (
        "selecionar espalhante compatível com a fonte " +
        "e seguir as orientações presentes no rótulo"
    );
}



// ==========================================================
// ALTERA AS CORES E OS TEXTOS DOS INDICADORES
// ==========================================================

function atualizarIndicadorClimatico(
    painel,
    clima
) {

    if (!painel) {
        return;
    }


    const configuracoes = {

        verde: {

            fundo:
                "#dcfce7",

            texto:
                "#166534",

            borda:
                "#22c55e",

            ponto:
                "#22c55e",

            icone:
                "fa-circle-check"
        },


        amarelo: {

            fundo:
                "#fef3c7",

            texto:
                "#854d0e",

            borda:
                "#eab308",

            ponto:
                "#eab308",

            icone:
                "fa-triangle-exclamation"
        },


        vermelho: {

            fundo:
                "#fee2e2",

            texto:
                "#991b1b",

            borda:
                "#ef4444",

            ponto:
                "#ef4444",

            icone:
                "fa-circle-xmark"
        }

    };


    const configuracao =
        configuracoes[
            clima.nivel
        ];


    painel.style.background =
        configuracao.fundo;


    painel.style.color =
        configuracao.texto;


    painel.style.border =
        `1px solid ${configuracao.borda}`;


    const ponto =
        painel.querySelector(
            ".spray-dot"
        );


    if (ponto) {

        ponto.style.background =
            configuracao.ponto;


        ponto.style.boxShadow =
            `0 0 0 4px ${configuracao.ponto}26`;
    }


    const icone =
        painel.querySelector(
            ".spray-status-icon"
        );


    if (icone) {

        icone.className =
            `fa-solid ${configuracao.icone} spray-status-icon`;
    }


    const titulo =
        painel.querySelector(
            ".spray-status-title"
        );


    if (titulo) {

        titulo.textContent =
            clima.titulo;
    }


    const resumo =
        painel.querySelector(
            ".spray-status-summary"
        );


    if (resumo) {

        resumo.textContent =
            clima.resumo;
    }


    const detalhe =
        painel.querySelector(
            ".spray-status-detail"
        );


    if (detalhe) {

        detalhe.textContent =
            clima.mensagem;
    }


    painel.dataset.nivel =
        clima.nivel;


    painel.dataset.recomendavel =
        String(
            clima.recomendavel
        );
}



// ==========================================================
// ATUALIZA OS PAINÉIS DE CLIMA E pH
// ==========================================================

function atualizarAlertasAplicacao() {

    // ======================================================
    // ALERTA DE pH
    // ======================================================

    const alertaPh =
        document.getElementById(
            "alertaPhAgua"
        );


    const ph =
        numero(
            "simPhAgua"
        );


    if (alertaPh) {

        const avaliacaoPh =
            avaliarPhAgua(
                ph
            );


        alertaPh.style.display =
            ph > 0
                ? "block"
                : "none";


        alertaPh.textContent =
            avaliacaoPh.mensagem;


        if (
            avaliacaoPh.status ===
            "adequado"
        ) {

            alertaPh.style.background =
                "#dcfce7";


            alertaPh.style.color =
                "#166534";


            alertaPh.style.borderColor =
                "#86efac";

        } else {

            alertaPh.style.background =
                "#fff7ed";


            alertaPh.style.color =
                "#9a3412";


            alertaPh.style.borderColor =
                "#fdba74";
        }
    }



    // ======================================================
    // AVALIAÇÃO DOS DADOS DO CLIMA
    // ======================================================

    const clima =
        avaliarJanelaClimatica();



    // ======================================================
    // INDICADOR DA TELA DO SIMULADOR
    // ======================================================

    const painelSimulador =
        document.getElementById(
            "statusPulverizacao"
        );


    atualizarIndicadorClimatico(
        painelSimulador,
        clima
    );



    // ======================================================
    // INDICADOR DA TELA INICIAL
    // ======================================================

    const painelHome =
        document.getElementById(
            "clima-pulverizacao-status"
        );


    atualizarIndicadorClimatico(
        painelHome,
        clima
    );


    return clima;
}



// ==========================================================
// OBSERVA A ATUALIZAÇÃO DA API DE CLIMA
//
// O weather.js busca os dados de forma assíncrona.
// Por isso, o indicador precisa observar quando o conteúdo
// dos elementos de temperatura, umidade e vento é alterado.
// ==========================================================

function observarAtualizacaoClima() {

    const idsClimaticos = [

        "clima-temp",

        "clima-umidade",

        "clima-vento"

    ];


    const observador =
        new MutationObserver(
            function () {

                atualizarAlertasAplicacao();

            }
        );


    idsClimaticos.forEach(
        function (idCampo) {

            const campo =
                document.getElementById(
                    idCampo
                );


            if (campo) {

                observador.observe(
                    campo,
                    {

                        childList:
                            true,

                        characterData:
                            true,

                        subtree:
                            true

                    }
                );
            }
        }
    );


    atualizarAlertasAplicacao();
}



// ==========================================================
// DISPONIBILIZA AS FUNÇÕES GLOBALMENTE
// ==========================================================

window.avaliarJanelaClimatica =
    avaliarJanelaClimatica;


window.atualizarAlertasAplicacao =
    atualizarAlertasAplicacao;


window.observarAtualizacaoClima =
    observarAtualizacaoClima;


// ==========================================================
// IDENTIFICA FAIXA DE N FOLIAR
//
// < 25
// 25 - 30
// > 30
// ==========================================================

function faixaN(nFoliar) {

    if (nFoliar < 25) {
        return 0;
    }

    if (nFoliar <= 30) {
        return 1;
    }

    return 2;
}



// ==========================================================
// IDENTIFICA FAIXA DE P-RESINA
//
// < 16
// 16 - 40
// > 40
// ==========================================================

function faixaP(pResina) {

    if (pResina < 16) {
        return 0;
    }

    if (pResina <= 40) {
        return 1;
    }

    return 2;
}



// ==========================================================
// IDENTIFICA FAIXA DE K TROCÁVEL
//
// < 1.6
// 1.6 - 3.0
// > 3.0
// ==========================================================

function faixaK(kTrocavel) {

    if (kTrocavel < 1.6) {
        return 0;
    }

    if (kTrocavel <= 3.0) {
        return 1;
    }

    return 2;
}



// ==========================================================
// TABELA 1
// LARANJA PARA INDÚSTRIA
//
// Cada linha possui:
//
// produtividade
// N = [<25, 25-30, >30]
// P = [<16, 16-40, >40]
// K = [<1.6, 1.6-3.0, >3.0]
// ==========================================================

const TABELA_INDUSTRIA = [

    {
        max: 30,

        N: [
            160,
            140,
            90
        ],

        P: [
            80,
            60,
            30
        ],

        K: [
            100,
            80,
            60
        ]
    },


    {
        max: 40,

        N: [
            180,
            160,
            120
        ],

        P: [
            100,
            80,
            40
        ],

        K: [
            120,
            100,
            80
        ]
    },


    {
        max: 50,

        N: [
            200,
            180,
            160
        ],

        P: [
            120,
            100,
            50
        ],

        K: [
            160,
            140,
            100
        ]
    },


    {
        max: 60,

        N: [
            220,
            200,
            180
        ],

        P: [
            140,
            120,
            60
        ],

        K: [
            180,
            160,
            120
        ]
    },


    {
        max: Infinity,

        N: [
            260,
            220,
            200
        ],

        P: [
            160,
            140,
            70
        ],

        K: [
            200,
            180,
            140
        ]
    }

];



// ==========================================================
// TABELA 2
// CONSUMO IN NATURA / TANGERINA / MURCOTT
// ==========================================================

const TABELA_IN_NATURA = [

    {
        max: 30,

        N: [
            120,
            100,
            80
        ],

        P: [
            80,
            60,
            30
        ],

        K: [
            120,
            100,
            80
        ]
    },


    {
        max: 40,

        N: [
            140,
            120,
            100
        ],

        P: [
            100,
            80,
            40
        ],

        K: [
            160,
            140,
            100
        ]
    },


    {
        max: 50,

        N: [
            180,
            160,
            120
        ],

        P: [
            120,
            100,
            50
        ],

        K: [
            200,
            180,
            140
        ]
    },


    {
        max: Infinity,

        N: [
            200,
            180,
            160
        ],

        P: [
            140,
            120,
            60
        ],

        K: [
            220,
            200,
            160
        ]
    }

];



// ==========================================================
// LOCALIZA A LINHA DA PRODUTIVIDADE
// ==========================================================

function obterLinhaProdutividade(
    tabela,
    produtividade
) {

    produtividade =
        Number(produtividade);


    for (
        const linha of tabela
    ) {

        if (
            produtividade <=
            linha.max
        ) {

            return linha;
        }
    }


    return tabela[
        tabela.length - 1
    ];
}



// ==========================================================
// 5. CALCULA RECOMENDAÇÃO NPK
//
// Retorno em kg/ha:
// N
// P2O5
// K2O
// ==========================================================

function calcularRecomendacaoNPK(
    finalidade,
    produtividade,
    nFoliar,
    pResina,
    kTrocavel
) {

    const tabela =
        finalidade === "in-natura"
            ? TABELA_IN_NATURA
            : TABELA_INDUSTRIA;


    const linha =
        obterLinhaProdutividade(
            tabela,
            produtividade
        );


    let n =
        linha.N[
            faixaN(nFoliar)
        ];


    let p =
        linha.P[
            faixaP(pResina)
        ];


    let k =
        linha.K[
            faixaK(kTrocavel)
        ];


    // ======================================================
    // OBSERVAÇÃO PRESENTE NA TABELA DO DOCUMENTO:
    //
    // Para teores muito altos de P e K,
    // não aplicar os respectivos nutrientes,
    // evitando desequilíbrio.
    // ======================================================

    if (pResina > 80) {
        p = 0;
    }


    if (kTrocavel > 6.0) {
        k = 0;
    }


    return {

        N: n,

        P: p,

        K: k
    };
}



// ==========================================================
// 6. DOSE DO PRODUTO COMERCIAL
//
// Fórmula:
//
// dose = recomendado × 100
//        ----------------
//        concentração
//
// É a aplicação da fórmula da dose da mistura
// para a fonte selecionada.
// ==========================================================

function calcularDoseProduto(
    quantidadeRecomendada,
    concentracaoFonte
) {

    quantidadeRecomendada =
        Number(
            quantidadeRecomendada
        );


    concentracaoFonte =
        Number(
            concentracaoFonte
        );


    if (
        quantidadeRecomendada <= 0 ||
        concentracaoFonte <= 0
    ) {
        return 0;
    }


    return (
        quantidadeRecomendada *
        100
    )
    /
    concentracaoFonte;
}



// ==========================================================
// FUNÇÃO GENÉRICA DA DOSE DA MISTURA
//
// Fórmula do TCC:
//
// Dose =
// Σ nutrientes recomendados × 100
// -------------------------------
// Σ teores da formulação
//
// Mantida para permitir uso futuro de fórmulas NPK
// como 5-30-15.
// ==========================================================

function calcularDoseMistura(
    nutrientesRecomendados,
    teoresFormula
) {

    const somaRecomendados =
        nutrientesRecomendados.reduce(
            (total, valor) =>
                total +
                Number(valor || 0),
            0
        );


    const somaFormula =
        teoresFormula.reduce(
            (total, valor) =>
                total +
                Number(valor || 0),
            0
        );


    if (
        somaRecomendados <= 0 ||
        somaFormula <= 0
    ) {
        return 0;
    }


    return (
        somaRecomendados *
        100
    )
    /
    somaFormula;
}



// ==========================================================
// 7. NUTRIENTE ENTREGUE
//
// entregue = dose × (% nutriente / 100)
// ==========================================================

function calcularNutrienteEntregue(
    dose,
    percentual
) {

    dose =
        Number(dose);


    percentual =
        Number(percentual);


    if (
        dose <= 0 ||
        percentual <= 0
    ) {
        return 0;
    }


    return (
        dose *
        percentual
    ) / 100;
}



// ==========================================================
// STATUS DE ENTREGA
// ==========================================================

function verificarEntrega(
    recomendado,
    entregue
) {

    recomendado =
        Number(recomendado);

    entregue =
        Number(entregue);


    if (
        recomendado <= 0
    ) {

        return "não necessário";
    }


    const diferenca =
        entregue -
        recomendado;


    // Pequena tolerância apenas para
    // evitar erro de arredondamento.

    if (
        Math.abs(diferenca) <
        0.01
    ) {

        return "adequado";
    }


    if (
        diferenca > 0
    ) {

        return "excesso";
    }


    return "déficit";
}



// ==========================================================
// 8. VOLUME DE CALDA DE REFERÊNCIA
//
// No documento:
// 2000 L/ha para pomar adulto em plena produção.
//
// ATENÇÃO:
// O documento apresenta o TRV para caracterizar o volume
// vegetal, mas não fornece uma constante explícita para
// transformar diretamente TRV em litros.
//
// Portanto NÃO inventamos um fator de conversão.
// ==========================================================

function calcularVolumeCaldaReferencia(
    areaTalhao
) {

    areaTalhao =
        Number(areaTalhao);


    if (
        areaTalhao <= 0
    ) {
        return 0;
    }


    return (
        areaTalhao *
        2000
    );
}



// ==========================================================
// 9. MASSA DO MICRONUTRIENTE
//
// massa kg =
// concentração mg/L × volume L
// ---------------------------
// 1.000.000
// ==========================================================

function calcularMassaMicronutriente(
    concentracaoMgL,
    volumeTotal
) {

    concentracaoMgL =
        Number(
            concentracaoMgL
        );


    volumeTotal =
        Number(
            volumeTotal
        );


    if (
        concentracaoMgL <= 0 ||
        volumeTotal <= 0
    ) {

        return 0;
    }


    return (
        concentracaoMgL *
        volumeTotal
    )
    /
    1000000;
}



// ==========================================================
// RETORNA O NUTRIENTE RECOMENDADO DO ELEMENTO ESCOLHIDO
// ==========================================================

function obterRecomendacaoElemento(
    elemento,
    recomendacao
) {

    if (elemento === "N") {

        return recomendacao.N;
    }


    if (elemento === "P") {

        return recomendacao.P;
    }


    if (elemento === "K") {

        return recomendacao.K;
    }


    return 0;
}



// ==========================================================
// FORMATA NÚMEROS
// ==========================================================

function formatarNumero(
    numeroValor,
    casas = 2
) {

    const valor =
        Number(numeroValor);


    if (
        !Number.isFinite(valor)
    ) {

        return "0";
    }


    return valor.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits:
                casas,

            maximumFractionDigits:
                casas
        }
    );
}



// ==========================================================
// MOSTRA OS RESULTADOS NA TELA
// ==========================================================

function mostrarResultados(
    resultados
) {

    const container =
        document.getElementById(
            "resultadoCalculos"
        );


    if (!container) {

        console.warn(
            "Elemento #resultadoCalculos não encontrado."
        );

        return;
    }


    const {

        diametroMedio,
        alturaUtil,
        volumeCopa,
        volumeCopasTalhao,
        trv,
        trvPorHectare,

        recomendacao,

        volumeCalda,
        volumeCaldaHa,

        massaMicronutriente,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado,
        avaliacaoPh,
        condutividade,
        recomendacaoAdjuvante,
        estagioFoliar,
        janelaClimatica

    } = resultados;



    let textoDose = "";


    if (
        ["N", "P", "K"]
            .includes(elemento)
    ) {

        textoDose = `

            <li>
                <i class="fa-solid fa-weight-scale"></i>

                <strong>
                    Dose da fonte comercial:
                </strong>

                ${formatarNumero(
                    doseProduto,
                    2
                )} kg/ha
            </li>


            <li>
                <i class="fa-solid fa-check-double"></i>

                <strong>
                    Nutriente entregue:
                </strong>

                ${formatarNumero(
                    nutrienteEntregue,
                    2
                )} kg/ha

                (${statusSelecionado})
            </li>

        `;
    }



    let textoMicro = "";


    if (
        ["Zn", "Mn", "B", "Cu", "Mg", "S"]
            .includes(elemento)
    ) {

        textoMicro = `

            <li>
                <i class="fa-solid fa-flask"></i>

                <strong>
                    Massa do micronutriente:
                </strong>

                ${formatarNumero(
                    massaMicronutriente,
                    3
                )} kg
            </li>

        `;
    }



    container.style.display =
        "block";


    container.innerHTML = `

        <div class="recom-box">

            <div class="recom-title">

                <i class="fa-solid fa-tree"></i>

                Modelagem Matemática do Talhão

            </div>


            <ul class="recom-list">

                <li>

                    <i class="fa-solid fa-ruler-horizontal"></i>

                    <strong>
                        Diâmetro médio da copa:
                    </strong>

                    ${formatarNumero(
                        diametroMedio
                    )} m

                </li>


                <li>

                    <i class="fa-solid fa-ruler-vertical"></i>

                    <strong>
                        Altura útil da copa:
                    </strong>

                    ${formatarNumero(
                        alturaUtil
                    )} m

                </li>


                <li>

                    <i class="fa-solid fa-cube"></i>

                    <strong>
                        Volume da copa:
                    </strong>

                    ${formatarNumero(
                        volumeCopa
                    )} m³/árvore

                </li>


                <li>

                    <i class="fa-solid fa-cubes"></i>

                    <strong>
                        Volume estimado das copas:
                    </strong>

                    ${formatarNumero(
                        volumeCopasTalhao
                    )} m³

                </li>


                <li>

                    <i class="fa-solid fa-tree-city"></i>

                    <strong>
                        TRV total:
                    </strong>

                    ${formatarNumero(
                        trv
                    )} m³

                </li>

                <li><i class="fa-solid fa-chart-area"></i><strong> TRV por hectare:</strong> ${formatarNumero(trvPorHectare)} m³/ha</li>

            </ul>

        </div>



        <div class="recom-box">

            <div class="recom-title">

                <i class="fa-solid fa-seedling"></i>

                Recomendação NPK

            </div>


            <ul class="recom-list">

                <li>

                    <strong>N:</strong>

                    ${formatarNumero(
                        recomendacao.N,
                        0
                    )} kg/ha

                </li>


                <li>

                    <strong>P₂O₅:</strong>

                    ${formatarNumero(
                        recomendacao.P,
                        0
                    )} kg/ha

                </li>


                <li>

                    <strong>K₂O:</strong>

                    ${formatarNumero(
                        recomendacao.K,
                        0
                    )} kg/ha

                </li>

            </ul>

        </div>



        <div class="recom-box">

            <div class="recom-title">

                <i class="fa-solid fa-droplet"></i>

                Aplicação Foliar

            </div>


            <div class="result-volume-grid">
                <div class="result-volume-item"><span>Volume por hectare</span><strong>${formatarNumero(volumeCaldaHa,0)} L/ha</strong></div>
                <div class="result-volume-item"><span>Volume total do talhão</span><strong>${formatarNumero(volumeCalda,0)} L</strong></div>
            </div>

            <ul class="recom-list">


                <li>

                    <strong>
                        Concentração da fonte:
                    </strong>

                    ${formatarNumero(
                        concentracaoFonte,
                        2
                    )}%

                </li>


                ${textoDose}

                ${textoMicro}

                <li><i class="fa-solid fa-vial"></i><strong> Qualidade da água:</strong> ${avaliacaoPh.mensagem} CE: ${condutividade > 0 ? formatarNumero(condutividade,2) + " dS/m" : "não informada"}.</li>
                <li><i class="fa-solid fa-leaf"></i><strong> Estágio foliar:</strong> ${estagioFoliar === "jovens" ? "folhas jovens" : "folhas maduras"}. Adjuvante: ${recomendacaoAdjuvante}.</li>
                <li><i class="fa-solid fa-wind"></i><strong> ${janelaClimatica.titulo}:</strong> ${janelaClimatica.mensagem}</li>

            </ul>

        </div>

    `;
}



// ==========================================================
// VALIDAÇÃO DOS DADOS
// ==========================================================

function validarDadosSimulacao(
    dados
) {

    if (
        dados.area <= 0
    ) {

        alert(
            "Informe uma área de talhão válida."
        );

        return false;
    }


    if (
        dados.arvores <= 0
    ) {

        alert(
            "Informe a quantidade de árvores."
        );

        return false;
    }


    if (
        dados.medida1 <= 0 ||
        dados.medida2 <= 0
    ) {

        alert(
            "Informe as duas medidas da copa."
        );

        return false;
    }


    if (
        dados.alturaTotal <= 0
    ) {

        alert(
            "Informe a altura total da planta."
        );

        return false;
    }


    if (
        dados.alturaCaule < 0 ||
        dados.alturaCaule >=
            dados.alturaTotal
    ) {

        alert(
            "A altura das primeiras ramificações deve ser menor que a altura total da planta."
        );

        return false;
    }


    if (
        dados.espacamento <= 0
    ) {

        alert(
            "Informe o espaçamento entre linhas."
        );

        return false;
    }

    if (dados.espacamentoPlantas <= 0) {
        alert("Informe o espaçamento entre plantas na linha.");
        return false;
    }


    if (
        dados.produtividadeTon <= 0
    ) {

        alert(
            "Informe a produtividade esperada em t/ha."
        );

        return false;
    }


    return true;
}



// ==========================================================
// FUNÇÃO PRINCIPAL
// CALCULA + EXIBE + SALVA
// ==========================================================

async function salvarECalcular() {

    const usuarioId =
        obterUsuarioId();


    if (!usuarioId) {

        alert(
            "Sua sessão não foi identificada. Faça login novamente."
        );

        navigate("login");

        return;
    }



    // ======================================================
    // DADOS BÁSICOS
    // ======================================================

    const producao =
        numero("simProducao");


    const area =
        numero("simArea");


    const arvores =
        numero("simArvores");


    const idade =
        numero("simIdade");



    // ======================================================
    // GEOMETRIA DA COPA
    // ======================================================

    const medida1 =
        numero("simMedida1");


    const medida2 =
        numero("simMedida2");


    const alturaTotal =
        numero("simAltura");


    const alturaCaule =
        numero("simAlturaCaule");


    const espacamento =
        numero("simEspacamento");

    const espacamentoPlantas =
        numero("simEspacamentoPlantas");



    // ======================================================
    // DADOS DE SOLO / FOLHA
    // ======================================================

    const finalidade =
        document.getElementById(
            "simFinalidade"
        )?.value || "industria";


    const produtividadeTon =
        numero(
            "simProdutividadeTon"
        );


    const nFoliar =
        numero(
            "simNFoliar"
        );


    const pResina =
        numero(
            "simPResina"
        );


    const kTrocavel =
        numero(
            "simKTrocavel"
        );



    // ======================================================
    // APLICAÇÃO
    // ======================================================

    const objetivo =
        document.getElementById(
            "simObjetivo"
        )?.value || "Manutenção";


    const elemento =
        document.getElementById(
            "selectElemento"
        )?.value || "";


    const fonte =
        document.getElementById(
            "selectFonte"
        )?.value || "";


    const concentracaoFonte =
        numero(
            "simConcentracao"
        );


    const concentracaoMgL =
        numero(
            "simConcentracaoMgL"
        );

    const bFoliar = numero("simBFoliar");
    const znFoliar = numero("simZnFoliar");
    const mnFoliar = numero("simMnFoliar");
    const cuFoliar = numero("simCuFoliar");
    const phAgua = numero("simPhAgua");
    const condutividade = numero("simCondutividade");
    const estagioFoliar = document.getElementById("simEstagioFoliar")?.value || "maduras";
    const adjuvante = document.getElementById("simAdjuvante")?.value || "nao-informado";



    if (
        !elemento ||
        !fonte
    ) {

        alert(
            "Selecione o elemento e a fonte comercial."
        );

        return;
    }



    const dadosValidacao = {

        area,
        arvores,

        medida1,
        medida2,

        alturaTotal,
        alturaCaule,

        espacamento,
        espacamentoPlantas,

        produtividadeTon
    };


    if (
        !validarDadosSimulacao(
            dadosValidacao
        )
    ) {

        return;
    }



    // ======================================================
    // CÁLCULOS GEOMÉTRICOS
    // ======================================================

    const diametroMedio =
        calcularDiametroCopa(
            medida1,
            medida2
        );


    const alturaUtil =
        calcularAlturaUtil(
            alturaTotal,
            alturaCaule
        );


    const volumeCopa =
        calcularVolumeCopa(
            medida1,
            medida2,
            alturaTotal,
            alturaCaule
        );


    const volumeCopasTalhao =
        volumeCopa *
        arvores;



    // ======================================================
    // TRV
    //
    // Utiliza:
    // altura útil
    // largura média
    // área
    // espaçamento
    // ======================================================

    const trv =
        calcularTRV(
            alturaUtil,
            diametroMedio,
            area,
            espacamento
        );

    const trvPorHectare =
        calcularTRVPorHectare(alturaUtil, diametroMedio, espacamento);



    // ======================================================
    // RECOMENDAÇÃO NPK
    // ======================================================

    const recomendacao =
        calcularRecomendacaoNPK(
            finalidade,
            produtividadeTon,
            nFoliar,
            pResina,
            kTrocavel
        );



    // ======================================================
    // VOLUME DE CALDA
    // ======================================================

    const volumeCalda =
        calcularVolumeCaldaReferencia(
            area
        );

    const volumeCaldaHa = 2000;
    const avaliacaoPh = avaliarPhAgua(phAgua);
    const recomendacaoAdjuvante = recomendarAdjuvante(estagioFoliar, adjuvante);
    const janelaClimatica = avaliarJanelaClimatica();



    // ======================================================
    // MASSA DO MICRONUTRIENTE
    // ======================================================

    let massaMicronutriente = 0;


    if (
        ["Zn", "Mn", "B", "Cu", "Mg", "S"]
            .includes(elemento)
    ) {

        massaMicronutriente =
            calcularMassaMicronutriente(
                concentracaoMgL,
                volumeCalda
            );
    }



    // ======================================================
    // DOSE DO PRODUTO PARA N, P OU K
    // ======================================================

    const recomendadoElemento =
        obterRecomendacaoElemento(
            elemento,
            recomendacao
        );


    let doseProduto = 0;

    let nutrienteEntregue = 0;

    let statusSelecionado =
        "não avaliado";


    if (
        ["N", "P", "K"]
            .includes(elemento)
    ) {

        doseProduto =
            calcularDoseProduto(
                recomendadoElemento,
                concentracaoFonte
            );


        nutrienteEntregue =
            calcularNutrienteEntregue(
                doseProduto,
                concentracaoFonte
            );


        statusSelecionado =
            verificarEntrega(
                recomendadoElemento,
                nutrienteEntregue
            );
    }



    // ======================================================
    // CAMPOS DE ENTREGA NPK
    // ======================================================

    let nEntregue = 0;

    let pEntregue = 0;

    let kEntregue = 0;


    let statusN =
        "não avaliado";

    let statusP =
        "não avaliado";

    let statusK =
        "não avaliado";


    if (
        elemento === "N"
    ) {

        nEntregue =
            nutrienteEntregue;

        statusN =
            statusSelecionado;
    }


    if (
        elemento === "P"
    ) {

        pEntregue =
            nutrienteEntregue;

        statusP =
            statusSelecionado;
    }


    if (
        elemento === "K"
    ) {

        kEntregue =
            nutrienteEntregue;

        statusK =
            statusSelecionado;
    }



    // ======================================================
    // EXIBE O RESULTADO ANTES DE SALVAR
    // ======================================================

    mostrarResultados({

        diametroMedio,
        alturaUtil,

        volumeCopa,
        volumeCopasTalhao,

        trv,
        trvPorHectare,

        recomendacao,

        volumeCalda,
        volumeCaldaHa,

        massaMicronutriente,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado,
        avaliacaoPh,
        condutividade,
        recomendacaoAdjuvante,
        estagioFoliar,
        janelaClimatica
    });



    // ======================================================
    // PAYLOAD PARA app.py
    // ======================================================

    const payload = {

        usuario_id:
            usuarioId,


        data:
            new Date()
                .toLocaleDateString(
                    "pt-BR"
                )
            +
            " às "
            +
            new Date()
                .toLocaleTimeString(
                    "pt-BR",
                    {
                        hour:
                            "2-digit",

                        minute:
                            "2-digit"
                    }
                ),


        // DADOS DO TALHÃO

        producao:
            Math.round(
                producao
            ),

        area:
            area,

        arvores:
            Math.round(
                arvores
            ),

        idade:
            idade,


        // GEOMETRIA

        medida1:
            medida1,

        medida2:
            medida2,

        altura_total:
            alturaTotal,

        altura_caule:
            alturaCaule,

        espacamento_linhas:
            espacamento,

        espacamento_plantas:
            espacamentoPlantas,

        diametro_medio:
            diametroMedio,

        altura_util:
            alturaUtil,

        volume_copa:
            volumeCopa,

        volume_copas_talhao:
            volumeCopasTalhao,

        trv:
            trv,

        trv_por_hectare:
            trvPorHectare,


        // ANÁLISE NUTRICIONAL

        finalidade:
            finalidade,

        produtividade_ton:
            produtividadeTon,

        n_foliar:
            nFoliar,

        p_resina:
            pResina,

        k_trocavel:
            kTrocavel,

        b_foliar: bFoliar,
        zn_foliar: znFoliar,
        mn_foliar: mnFoliar,
        cu_foliar: cuFoliar,


        // APLICAÇÃO

        objetivo:
            objetivo,

        elemento:
            elemento,

        fonte:
            fonte,

        concentracao:
            concentracaoFonte,

        concentracao_mg_l:
            concentracaoMgL,

        ph_agua: phAgua,
        condutividade_eletrica: condutividade,
        estagio_foliar: estagioFoliar,
        adjuvante: adjuvante,
        status_pulverizacao: janelaClimatica.titulo,


        // VOLUME / MICRO

        volume:
            volumeCalda,

        volume_por_hectare:
            volumeCaldaHa,

        massa_micronutriente:
            massaMicronutriente,


        // NPK RECOMENDADO

        n_recomendado:
            recomendacao.N,

        p2o5_recomendado:
            recomendacao.P,

        k2o_recomendado:
            recomendacao.K,


        // DOSE DA FONTE ESCOLHIDA

        dose_mistura:
            doseProduto,


        // ENTREGUE

        n_entregue:
            nEntregue,

        p2o5_entregue:
            pEntregue,

        k2o_entregue:
            kEntregue,


        // STATUS

        status_n:
            statusN,

        status_p:
            statusP,

        status_k:
            statusK
    };



    console.log(
        "=============================="
    );

    console.log(
        "RESULTADO DA SIMULAÇÃO"
    );

    console.log(
        payload
    );

    console.log(
        "=============================="
    );



    // ======================================================
    // ENVIO PARA O FLASK
    // ======================================================

    try {

        const response =
            await fetch(
                API_SIMULACOES_URL,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );


        const resposta =
            await response.json();



        if (
            response.ok
        ) {

            alert(
                "Simulação calculada e salva com sucesso!"
            );


            // Aguarda um pouco para permitir
            // visualização do resultado antes
            // de abrir o histórico.

            setTimeout(
                function () {

                    navigate(
                        "historico"
                    );

                },
                400
            );


        } else {

            console.error(
                "Erro do servidor:",
                resposta
            );


            alert(
                "Erro ao salvar: "
                +
                (
                    resposta.erro ||
                    "Erro desconhecido."
                )
            );
        }


    } catch (erro) {

        console.error(
            "Erro na comunicação:",
            erro
        );


        alert(
            "Não foi possível conectar com a API do Fru-tech."
        );
    }
}



// ==========================================================
// EVENTOS DA PÁGINA
// ==========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        // ==================================================
        // ALTERAÇÃO DA FONTE
        // ==================================================

        const fonte =
            document.getElementById(
                "selectFonte"
            );


        if (fonte) {

            fonte.addEventListener(
                "change",
                atualizarConcentracaoFonte
            );
        }



        // ==================================================
        // ALTERAÇÃO DO ELEMENTO
        // ==================================================

        const elemento =
            document.getElementById(
                "selectElemento"
            );


        if (elemento) {

            elemento.addEventListener(
                "change",
                function () {

                    atualizarFontes();

                    setTimeout(
                        atualizarConcentracaoFonte,
                        0
                    );
                }
            );
        }



        // ==================================================
        // ALTERAÇÃO DO pH
        // ==================================================

        const phAgua =
            document.getElementById(
                "simPhAgua"
            );


        if (phAgua) {

            phAgua.addEventListener(
                "input",
                atualizarAlertasAplicacao
            );
        }



        // ==================================================
        // MONITORAMENTO AUTOMÁTICO DO CLIMA
        // ==================================================

        observarAtualizacaoClima();

    }
);
