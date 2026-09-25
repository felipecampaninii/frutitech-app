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

// Diferencia um resultado laboratorial ausente de um teor realmente igual a zero.
function numeroOpcional(id) {
    const elemento = document.getElementById(id);
    if (!elemento || String(elemento.value).trim() === "") return null;

    const valor = Number(String(elemento.value).replace(",", "."));
    return Number.isFinite(valor) ? valor : null;
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
    const temperatura = lerNumeroClima("clima-temp");
    const umidade = lerNumeroClima("clima-umidade");
    const vento = lerNumeroClima("clima-vento");
    const chuva = lerNumeroClima("clima-chuva");

    if ([temperatura, umidade, vento, chuva].some((valor) => valor === null)) {
        return {
            nivel: "amarelo",
            recomendavel: false,
            titulo: "AGUARDANDO DADOS METEOROLÓGICOS",
            resumo: "Ainda não é possível estimar a janela de aplicação.",
            mensagem: "Aguarde a atualização da previsão da cidade e confirme as condições no próprio talhão."
        };
    }

    const temperaturaIdeal = temperatura < 30;
    const umidadeIdeal = umidade > 55;
    const ventoIdeal = vento >= 3 && vento <= 10;
    const chuvaFavoravel = chuva < 40;

    if (temperaturaIdeal && umidadeIdeal && ventoIdeal && chuvaFavoravel) {
        return {
            nivel: "verde",
            recomendavel: true,
            titulo: "CONDIÇÕES ESTIMADAS FAVORÁVEIS",
            resumo: "A previsão indica uma possível janela para aplicação.",
            mensagem: `Temperatura de ${temperatura} °C, umidade de ${umidade}%, vento de ${vento} km/h e chuva de ${chuva}%. Confirme os dados no talhão e siga o rótulo do produto.`
        };
    }

    const problemas = [];
    if (!temperaturaIdeal) problemas.push(`temperatura de ${temperatura} °C (referência: abaixo de 30 °C)`);
    if (!umidadeIdeal) problemas.push(`umidade de ${umidade}% (referência: acima de 55%)`);
    if (!ventoIdeal) problemas.push(`vento de ${vento} km/h (referência: 3 a 10 km/h)`);
    if (!chuvaFavoravel) problemas.push(`probabilidade de chuva de ${chuva}% nas próximas horas`);

    const condicaoCritica = temperatura >= 35 || umidade <= 40 || vento < 1 || vento > 15 || chuva >= 70;

    return {
        nivel: condicaoCritica ? "vermelho" : "amarelo",
        recomendavel: false,
        titulo: condicaoCritica ? "CONDIÇÕES ESTIMADAS DESFAVORÁVEIS" : "CONDIÇÕES ESTIMADAS COM RESTRIÇÃO",
        resumo: condicaoCritica
            ? "A previsão não favorece a aplicação neste momento."
            : "Confirme as condições diretamente no talhão antes da aplicação.",
        mensagem: `${problemas.join("; ")}. A previsão da cidade é orientativa e não substitui medição local nem as instruções do rótulo.`
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
                "pH da água acima de 6,5. É apenas uma referência geral: confirme a faixa do produto e avalie o pH da calda final antes de qualquer correção."
        };
    }


    if (ph < 5.5) {

        return {

            status:
                "abaixo do ideal",

            mensagem:
                "pH da água abaixo de 5,5. Confirme a compatibilidade da fonte, o rótulo e o pH da calda final; não acidifique automaticamente."
        };
    }


    return {

        status:
            "adequado",

        mensagem:
            "pH da água dentro da referência geral de 5,5 a 6,5. Confirme também o intervalo indicado no rótulo e o pH da calda final."
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
    areaTalhao,
    volumePorHectare = 2000
) {

    areaTalhao =
        Number(areaTalhao);

    volumePorHectare = Number(volumePorHectare);


    if (
        areaTalhao <= 0 ||
        volumePorHectare <= 0
    ) {
        return 0;
    }


    return (
        areaTalhao *
        volumePorHectare
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

// Converte a massa de nutriente elementar na quantidade da fonte comercial.
// Ex.: 0,8 kg de Mn com fonte a 26% = 3,077 kg do produto no talhão.
function calcularMassaFonteComercial(massaNutriente, concentracaoFonte) {
    massaNutriente = Number(massaNutriente);
    concentracaoFonte = Number(concentracaoFonte);

    if (massaNutriente <= 0 || concentracaoFonte <= 0 || concentracaoFonte > 100) return 0;
    return (massaNutriente * 100) / concentracaoFonte;
}

// Converte a dose calculada para a leitura usual de preparo por 100 litros
// e a confronta com os limites informados pelo próprio usuário a partir do rótulo.
function auditarDoseAplicacao(doseKgHa, volumeLHa, doseMinKgHa, doseMaxKgHa) {
    const dose = Number(doseKgHa);
    const volume = Number(volumeLHa);
    const minimo = Number(doseMinKgHa);
    const maximo = Number(doseMaxKgHa);
    const por100L = volume > 0 ? (dose / volume) * 100 : 0;

    if (![dose, volume, minimo, maximo].every(Number.isFinite) || dose <= 0 || volume <= 0 || minimo < 0 || maximo <= 0) {
        return { status: "incompleto", aprovado: false, por100L, mensagem: "Preencha os limites do rótulo para conferir a dose." };
    }

    if (minimo > maximo) {
        return { status: "bloqueado", aprovado: false, por100L, mensagem: "A dose mínima não pode ser maior que a dose máxima." };
    }

    if (dose < minimo || dose > maximo) {
        return { status: "bloqueado", aprovado: false, por100L, mensagem: `Dose calculada de ${formatarNumero(dose, 3)} kg/ha fora do intervalo informado (${formatarNumero(minimo, 3)} a ${formatarNumero(maximo, 3)} kg/ha).` };
    }

    const margem = Math.min(dose - minimo, maximo - dose);
    const faixa = Math.max(maximo - minimo, 0.001);
    const proximoLimite = margem / faixa < 0.1;

    return {
        status: proximoLimite ? "atencao" : "conferido",
        aprovado: true,
        por100L,
        mensagem: proximoLimite
            ? "Dose dentro do intervalo, porém próxima de um dos limites informados."
            : "Dose dentro do intervalo informado a partir do rótulo."
    };
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
        massaProdutoTotal,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado,
        avaliacaoPh,
        condutividade,
        recomendacaoAdjuvante,
        estagioFoliar,
        janelaClimatica,
        auditoriaDose,
        produtoNome,
        produtoFabricante,
        produtoRegistro,
        doseMinRotulo,
        doseMaxRotulo

    } = resultados;



    let textoDose = "";


    if (["N", "P", "K"].includes(elemento)) {

        textoDose = `

            <li>
                <i class="fa-solid fa-weight-scale"></i>

                <strong>
                    Dose foliar da fonte comercial:
                </strong>

                ${formatarNumero(
                    doseProduto,
                    2
                )} kg/ha
            </li>


            <li>
                <i class="fa-solid fa-check-double"></i>

                <strong>
                    Nutriente elementar na aplicação foliar:
                </strong>

                ${formatarNumero(
                    nutrienteEntregue,
                    2
                )} kg/ha
            </li>

            <li><i class="fa-solid fa-circle-info"></i><strong> Separação agronômica:</strong> esta dose foliar foi calculada pela concentração desejada da calda e não substitui a recomendação anual de NPK.</li>

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
                    Massa do nutriente elementar no talhão:
                </strong>

                ${formatarNumero(
                    massaMicronutriente,
                    3
                )} kg
            </li>

            <li>
                <i class="fa-solid fa-weight-hanging"></i>
                <strong>Massa total da fonte comercial:</strong>
                ${formatarNumero(massaProdutoTotal, 3)} kg
                (${formatarNumero(doseProduto, 3)} kg/ha)
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

                Planejamento anual de adubação NPK

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

            <p class="result-hint">Valores destinados ao planejamento nutricional do pomar. Não correspondem à dose de pulverização foliar.</p>

        </div>



        <div class="recom-box">

            <div class="recom-title">

                <i class="fa-solid fa-droplet"></i>

                Aplicação Foliar

            </div>


            <div class="result-volume-grid">
                <div class="result-volume-item"><span>Volume calibrado informado</span><strong>${formatarNumero(volumeCaldaHa,0)} L/ha</strong></div>
                <div class="result-volume-item"><span>Volume total do talhão</span><strong>${formatarNumero(volumeCalda,0)} L</strong></div>
            </div>

            <div class="result-safety-level ${auditoriaDose.status}">
                <i class="fa-solid ${auditoriaDose.aprovado ? "fa-shield-circle-check" : "fa-triangle-exclamation"}"></i>
                <div><strong>${auditoriaDose.aprovado ? "DOSE CONFERIDA" : "APLICAÇÃO BLOQUEADA"}</strong><span>${auditoriaDose.mensagem}</span></div>
            </div>

            <div class="product-result-summary">
                <strong>${produtoNome}</strong>
                <span>${produtoFabricante} · identificação ${produtoRegistro}</span>
            </div>

            <p class="result-hint">O volume informado não é convertido automaticamente a partir do TRV. Confirme-o pela calibração do equipamento e orientação técnica.</p>

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

                <li><i class="fa-solid fa-scale-balanced"></i><strong> Dose por 100 L:</strong> ${formatarNumero(auditoriaDose.por100L, 3)} kg/100 L</li>
                <li><i class="fa-solid fa-book-open"></i><strong> Intervalo informado do rótulo:</strong> ${formatarNumero(doseMinRotulo, 3)} a ${formatarNumero(doseMaxRotulo, 3)} kg/ha</li>

                <li><i class="fa-solid fa-tags"></i><strong> Garantia e nutrientes acompanhantes:</strong> confirme no rótulo a composição completa da fonte. MAP, nitrato de potássio e sulfato de magnésio fornecem mais de um nutriente.</li>

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

    if ([dados.nFoliar, dados.pResina, dados.kTrocavel].some((valor) => valor === null)) {
        alert("Informe N foliar, P-resina e K trocável. Campo vazio não pode ser interpretado como deficiência.");
        return false;
    }

    if (dados.nFoliar < 0 || dados.pResina < 0 || dados.kTrocavel < 0) {
        alert("Os resultados das análises nutricionais não podem ser negativos.");
        return false;
    }

    if (dados.concentracaoFonte <= 0 || dados.concentracaoFonte > 100) {
        alert("Informe uma garantia da fonte comercial entre 0 e 100%.");
        return false;
    }

    if (dados.concentracaoMgL <= 0) {
        alert("Informe a concentração desejada do nutriente na calda em mg/L, conforme o rótulo ou orientação técnica.");
        return false;
    }

    if (dados.volumeCaldaHa <= 0) {
        alert("Informe o volume de calda obtido na calibração do equipamento.");
        return false;
    }

    if (!dados.produtoNome || !dados.produtoFabricante || !dados.produtoRegistro) {
        alert("Identifique o produto, o fabricante e o documento técnico consultado.");
        return false;
    }

    if (dados.doseMinRotulo < 0 || dados.doseMaxRotulo <= 0 || dados.doseMinRotulo > dados.doseMaxRotulo) {
        alert("Informe um intervalo válido de dose do rótulo em kg/ha.");
        return false;
    }

    if (![dados.confirmacaoRotulo, dados.confirmacaoDose, dados.confirmacaoMistura, dados.confirmacaoCalibracao].every(Boolean)) {
        alert("Conclua todas as verificações da aplicação antes de calcular e salvar.");
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
        numeroOpcional(
            "simNFoliar"
        );


    const pResina =
        numeroOpcional(
            "simPResina"
        );


    const kTrocavel =
        numeroOpcional(
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

    const volumeCaldaHaInformado = numero("simVolumeCaldaHa");

    const bFoliar = numero("simBFoliar");
    const znFoliar = numero("simZnFoliar");
    const mnFoliar = numero("simMnFoliar");
    const cuFoliar = numero("simCuFoliar");
    const phAgua = numero("simPhAgua");
    const condutividade = numero("simCondutividade");
    const estagioFoliar = document.getElementById("simEstagioFoliar")?.value || "maduras";
    const adjuvante = document.getElementById("simAdjuvante")?.value || "nao-informado";
    const confirmacaoRotulo = Boolean(document.getElementById("simConfirmacaoRotulo")?.checked);
    const confirmacaoDose = Boolean(document.getElementById("simConfirmacaoDose")?.checked);
    const confirmacaoMistura = Boolean(document.getElementById("simConfirmacaoMistura")?.checked);
    const confirmacaoCalibracao = Boolean(document.getElementById("simConfirmacaoCalibracao")?.checked);
    const produtoNome = document.getElementById("simProdutoNome")?.value.trim() || "";
    const produtoFabricante = document.getElementById("simProdutoFabricante")?.value.trim() || "";
    const produtoRegistro = document.getElementById("simProdutoRegistro")?.value.trim() || "";
    const doseMinRotulo = numero("simDoseMinRotulo");
    const doseMaxRotulo = numero("simDoseMaxRotulo");



    if (
        !elemento ||
        !fonte
    ) {

        alert(
            "Selecione o elemento e a fonte comercial."
        );

        return;
    }

    if (objetivo === "Correção") {
        const analisesPorElemento = {
            N: nFoliar,
            P: pResina,
            K: kTrocavel,
            B: numeroOpcional("simBFoliar"),
            Zn: numeroOpcional("simZnFoliar"),
            Mn: numeroOpcional("simMnFoliar"),
            Cu: numeroOpcional("simCuFoliar")
        };

        if (Object.prototype.hasOwnProperty.call(analisesPorElemento, elemento) && analisesPorElemento[elemento] === null) {
            alert(`Para correção de ${elemento}, informe primeiro o resultado correspondente da análise nutricional.`);
            return;
        }
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

        produtividadeTon,
        nFoliar,
        pResina,
        kTrocavel,
        concentracaoFonte,
        concentracaoMgL,
        volumeCaldaHa: volumeCaldaHaInformado,
        confirmacaoRotulo,
        confirmacaoDose,
        confirmacaoMistura,
        confirmacaoCalibracao,
        produtoNome,
        produtoFabricante,
        produtoRegistro,
        doseMinRotulo,
        doseMaxRotulo
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
            area,
            volumeCaldaHaInformado
        );

    const volumeCaldaHa = volumeCaldaHaInformado;
    const avaliacaoPh = avaliarPhAgua(phAgua);
    const recomendacaoAdjuvante = recomendarAdjuvante(estagioFoliar, adjuvante);
    const janelaClimatica = avaliarJanelaClimatica();



    // ======================================================
    // MASSA DO NUTRIENTE NA APLICAÇÃO FOLIAR
    // A concentração desejada (mg/L) é independente da recomendação anual NPK.
    // ======================================================

    let massaMicronutriente = 0;


    massaMicronutriente = calcularMassaMicronutriente(
        concentracaoMgL,
        volumeCalda
    );

    const massaProdutoTotal = calcularMassaFonteComercial(
        massaMicronutriente,
        concentracaoFonte
    );



    // ======================================================
    // DOSE FOLIAR DA FONTE COMERCIAL
    // Não utiliza os kg/ha da recomendação anual de NPK.
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


    doseProduto = area > 0 ? massaProdutoTotal / area : 0;
    nutrienteEntregue = area > 0 ? massaMicronutriente / area : 0;
    statusSelecionado = "aplicação foliar calculada separadamente do NPK anual";

    const auditoriaDose = auditarDoseAplicacao(
        doseProduto,
        volumeCaldaHa,
        doseMinRotulo,
        doseMaxRotulo
    );

    if (!auditoriaDose.aprovado) {
        atualizarPreviaAuditoriaDose(auditoriaDose);
        alert(auditoriaDose.mensagem + " A recomendação não será salva até a correção.");
        document.getElementById("simDoseMinRotulo")?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
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
        massaProdutoTotal,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado,
        avaliacaoPh,
        condutividade,
        recomendacaoAdjuvante,
        estagioFoliar,
        janelaClimatica,
        auditoriaDose,
        produtoNome,
        produtoFabricante,
        produtoRegistro,
        doseMinRotulo,
        doseMaxRotulo
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
        produto_nome: produtoNome,
        produto_fabricante: produtoFabricante,
        produto_identificacao: produtoRegistro,
        dose_min_rotulo: doseMinRotulo,
        dose_max_rotulo: doseMaxRotulo,
        dose_por_100l: auditoriaDose.por100L,
        validacao_dose: auditoriaDose.status,


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

function atualizarPreviaAuditoriaDose(auditoriaForcada = null) {
    const painel = document.getElementById("doseAuditPreview");
    if (!painel) return;

    const concentracaoMgL = numero("simConcentracaoMgL");
    const volumeLHa = numero("simVolumeCaldaHa");
    const garantia = numero("simConcentracao");
    const minimo = numero("simDoseMinRotulo");
    const maximo = numero("simDoseMaxRotulo");
    const nutrienteKgHa = (concentracaoMgL * volumeLHa) / 1000000;
    const doseKgHa = garantia > 0 ? nutrienteKgHa / (garantia / 100) : 0;
    const auditoria = auditoriaForcada || auditarDoseAplicacao(doseKgHa, volumeLHa, minimo, maximo);

    painel.classList.remove("is-ok", "is-warning", "is-blocked");
    painel.classList.add(auditoria.status === "conferido" ? "is-ok" : auditoria.status === "atencao" ? "is-warning" : auditoria.status === "bloqueado" ? "is-blocked" : "");
    painel.innerHTML = `
        <i class="fa-solid ${auditoria.aprovado ? "fa-shield-circle-check" : "fa-scale-balanced"}"></i>
        <div><strong>${doseKgHa > 0 ? `${formatarNumero(doseKgHa, 3)} kg/ha · ${formatarNumero(auditoria.por100L, 3)} kg/100 L` : "Conferência automática da dose"}</strong><span>${auditoria.mensagem}</span></div>
    `;
}

document.addEventListener(
    "DOMContentLoaded",
    function () {

        ["simConcentracaoMgL", "simVolumeCaldaHa", "simConcentracao", "simDoseMinRotulo", "simDoseMaxRotulo"].forEach((id) => {
            document.getElementById(id)?.addEventListener("input", () => atualizarPreviaAuditoriaDose());
        });
        atualizarPreviaAuditoriaDose();

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


// ==========================================================
// NAVEGAÇÃO VISUAL DO SIMULADOR EM QUATRO ETAPAS
// Esta camada apenas organiza a interface. As fórmulas acima,
// o salvamento e a geração das recomendações permanecem iguais.
// ==========================================================

(function configurarEtapasDoSimulador() {
    let etapaAtual = 1;

    function obterPaginaSimulador() {
        return document.getElementById("page-simulador");
    }

    function atualizarIndicadores(numero) {
        const pagina = obterPaginaSimulador();
        if (!pagina) return;

        pagina.querySelectorAll("[data-step-indicator]").forEach((indicador) => {
            const etapaIndicador = Number(indicador.dataset.stepIndicator);
            const concluida = etapaIndicador < numero;
            const ativa = etapaIndicador === numero;

            indicador.classList.toggle("is-active", ativa);
            indicador.classList.toggle("is-complete", concluida);

            const circulo = indicador.querySelector(".sim-step-number");
            if (circulo) {
                circulo.innerHTML = concluida
                    ? '<i class="fa-solid fa-check" aria-hidden="true"></i>'
                    : String(etapaIndicador);
            }
        });
    }

    function mostrarEtapaSimulador(numero) {
        const pagina = obterPaginaSimulador();
        if (!pagina) return;

        const destino = Math.max(1, Math.min(4, Number(numero) || 1));
        etapaAtual = destino;

        pagina.querySelectorAll("[data-sim-step]").forEach((painel) => {
            const ativo = Number(painel.dataset.simStep) === destino;
            painel.classList.toggle("is-active", ativo);
            painel.hidden = !ativo;
        });

        atualizarIndicadores(destino);
        pagina.dataset.etapaAtual = String(destino);

        if (typeof pagina.scrollTo === "function") {
            pagina.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            pagina.scrollTop = 0;
        }
    }

    function campoPreenchido(id) {
        const campo = document.getElementById(id);

        if (!campo || campo.disabled) return true;

        const valor = String(campo.value ?? "").trim();

        if (valor === "") return false;

        if (campo.matches('[type="number"]')) {
            return Number.isFinite(Number(valor)) && Number(valor) >= 0;
        }

        return true;
    }

    function validarEtapaSimulador(numero) {
        const camposObrigatorios = {
            1: [
                "simProducao",
                "simArea",
                "simArvores",
                "simIdade",
                "simEstagioFoliar"
            ],
            2: [
                "simMedida1",
                "simMedida2",
                "simAltura",
                "simAlturaCaule",
                "simEspacamento",
                "simEspacamentoPlantas"
            ],
            3: [
                "simFinalidade",
                "simProdutividadeTon",
                "simNFoliar",
                "simPResina",
                "simKTrocavel"
            ],
            4: [
                "simObjetivo",
                "selectElemento",
                "selectFonte",
                "simConcentracao",
                "simConcentracaoMgL",
                "simVolumeCaldaHa",
                "simProdutoNome",
                "simProdutoFabricante",
                "simProdutoRegistro",
                "simDoseMinRotulo",
                "simDoseMaxRotulo"
            ]
        };

        const campoAusente = (camposObrigatorios[numero] || [])
            .find((id) => !campoPreenchido(id));

        if (!campoAusente) {
            if (numero === 4) {
                const confirmacoes = ["simConfirmacaoRotulo", "simConfirmacaoDose", "simConfirmacaoMistura", "simConfirmacaoCalibracao"];
                const ausente = confirmacoes.find((id) => !document.getElementById(id)?.checked);
                if (ausente) {
                    alert("Conclua todas as verificações da aplicação para continuar.");
                    document.getElementById(ausente)?.focus();
                    return false;
                }
            }
            return true;
        }

        const campo = document.getElementById(campoAusente);

        if (campo) {
            campo.focus();
            campo.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        alert("Preencha os campos desta etapa antes de continuar.");
        return false;
    }

    function iniciarEtapasSimulador() {
        const pagina = obterPaginaSimulador();

        if (!pagina || pagina.dataset.etapasConfiguradas === "true") return;

        pagina.dataset.etapasConfiguradas = "true";

        pagina.addEventListener("click", (evento) => {
            const botaoAvancar = evento.target.closest("[data-sim-next]");
            const botaoVoltar = evento.target.closest("[data-sim-prev]");

            if (botaoAvancar) {
                evento.preventDefault();

                if (validarEtapaSimulador(etapaAtual)) {
                    mostrarEtapaSimulador(botaoAvancar.dataset.simNext);
                }
            }

            if (botaoVoltar) {
                evento.preventDefault();
                mostrarEtapaSimulador(botaoVoltar.dataset.simPrev);
            }
        });

        mostrarEtapaSimulador(1);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarEtapasSimulador);
    } else {
        iniciarEtapasSimulador();
    }

    window.mostrarEtapaSimulador = mostrarEtapaSimulador;
})();
