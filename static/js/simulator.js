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

        recomendacao,

        volumeCalda,

        massaMicronutriente,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado

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
        ["Zn", "Mn", "B"]
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


            <ul class="recom-list">

                <li>

                    <strong>
                        Volume de calda de referência:
                    </strong>

                    ${formatarNumero(
                        volumeCalda,
                        0
                    )} L

                </li>


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



    // ======================================================
    // MASSA DO MICRONUTRIENTE
    // ======================================================

    let massaMicronutriente = 0;


    if (
        ["Zn", "Mn", "B"]
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

        recomendacao,

        volumeCalda,

        massaMicronutriente,

        doseProduto,

        elemento,

        concentracaoFonte,

        nutrienteEntregue,

        statusSelecionado
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


        // VOLUME / MICRO

        volume:
            volumeCalda,

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

                    setTimeout(
                        atualizarConcentracaoFonte,
                        0
                    );
                }
            );
        }



        // ==================================================
        // O HTML NOVO NÃO POSSUI MAIS A ILUSTRAÇÃO
        // DO POMAR DENTRO DO SIMULADOR.
        //
        // O DESENVOLVIMENTO AGORA É EXIBIDO
        // INDIVIDUALMENTE NO HISTÓRICO.
        // ==================================================

    }
);