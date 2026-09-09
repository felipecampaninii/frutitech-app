const API_SIMULACOES_URL = "/api/simulacoes";
const API_DIAGNOSTICO_URL = "/api/diagnostico";


// ==========================================================
// OBTÉM USUÁRIO LOGADO
// ==========================================================
function obterUsuarioLogado() {

    const sessao =
        localStorage.getItem(
            'frutech_usuario'
        );


    if (!sessao) {
        return null;
    }


    try {

        const usuario =
            JSON.parse(sessao);


        if (!usuario || !usuario.id) {
            return null;
        }


        return usuario;


    } catch (erro) {

        console.error(
            "Erro ao recuperar usuário:",
            erro
        );

        return null;
    }
}


// ==========================================================
// BUSCA APENAS O HISTÓRICO DO USUÁRIO LOGADO
// ==========================================================
async function carregarHistorico() {

    const container =
        document.getElementById(
            'containerHistorico'
        );


    if (!container) return;


    const usuario =
        obterUsuarioLogado();


    if (!usuario) {

        container.innerHTML = `
            <article class="card">
                <p style="
                    font-size:13px;
                    color:#ef4444;
                    text-align:center;
                ">
                    Usuário não identificado.
                    Faça login novamente.
                </p>
            </article>
        `;

        return;
    }


    container.innerHTML = `
        <p style="
            font-size:12px;
            color:#6b7280;
            text-align:center;
        ">
            Buscando histórico no MySQL...
        </p>
    `;


    try {

        const url =
            API_SIMULACOES_URL +
            "?usuario_id=" +
            encodeURIComponent(usuario.id);


        const response =
            await fetch(url);


        const historico =
            await response.json();


        if (!response.ok) {

            console.error(
                "Erro ao buscar histórico:",
                historico
            );


            container.innerHTML = `
                <article class="card">
                    <p style="
                        font-size:13px;
                        color:#ef4444;
                        text-align:center;
                    ">
                        ${
                            historico.erro ||
                            "Erro ao carregar histórico."
                        }
                    </p>
                </article>
            `;

            return;
        }


        if (
            !historico ||
            historico.length === 0
        ) {

            container.innerHTML = `
                <article class="card">
                    <p style="
                        font-size:13px;
                        color:#6b7280;
                        text-align:center;
                    ">
                        Nenhum cálculo registrado ainda.
                        <br>
                        Faça uma simulação para começar!
                    </p>
                </article>
            `;

            return;
        }


        container.innerHTML =
            historico
                .map(item => `

                    <article class="card history-card">

                        <div class="history-header-info">

                            <span class="history-date">

                                <i class="fa-regular fa-calendar-check"></i>

                                ${item.data_registro}

                            </span>

                            <span class="history-tag">
                                ${item.objetivo}
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
                                class="fa-solid fa-vial-circle-check"
                                style="color:#136a32;"
                            ></i>

                            ${item.elemento}
                            -
                            ${item.fonte}

                        </div>


                        <div class="history-grid-data">

                            <div class="history-data-item">
                                <span>
                                    Área do Talhão:
                                </span>

                                <strong>
                                    ${item.area} ha
                                </strong>
                            </div>


                            <div class="history-data-item">
                                <span>
                                    Volume Calda:
                                </span>

                                <strong>
                                    ${item.volume} L/ha
                                </strong>
                            </div>


                            <div class="history-data-item">
                                <span>
                                    Nº de Árvores:
                                </span>

                                <strong>
                                    ${item.arvores} un
                                </strong>
                            </div>


                            <div class="history-data-item">
                                <span>
                                    Concentração:
                                </span>

                                <strong>
                                    ${item.concentracao}%
                                </strong>
                            </div>

                        </div>

                    </article>

                `)
                .join('');


    } catch (error) {

        console.error(
            "Erro de conexão:",
            error
        );


        container.innerHTML = `
            <article class="card">

                <p style="
                    font-size:13px;
                    color:#ef4444;
                    text-align:center;
                ">

                    Não foi possível conectar
                    à API Python.

                </p>

            </article>
        `;
    }
}


// ==========================================================
// LIMPA SOMENTE O HISTÓRICO DO USUÁRIO LOGADO
// ==========================================================
async function limparHistorico() {

    const usuario =
        obterUsuarioLogado();


    if (!usuario) {

        alert(
            "Usuário não identificado. Faça login novamente."
        );

        return;
    }


    if (
        !confirm(
            "Tem certeza que deseja apagar os registros do seu histórico?"
        )
    ) {

        return;
    }


    try {

        const url =
            API_SIMULACOES_URL +
            "?usuario_id=" +
            encodeURIComponent(usuario.id);


        const response =
            await fetch(
                url,
                {
                    method: 'DELETE'
                }
            );


        const resultado =
            await response.json();


        if (response.ok) {

            alert(
                "Seu histórico foi apagado com sucesso!"
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


    } catch (error) {

        console.error(error);

        alert(
            "Erro ao limpar dados no banco."
        );
    }
}