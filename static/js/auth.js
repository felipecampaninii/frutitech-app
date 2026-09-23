
// =========================================================
// VISIBILIDADE DA SENHA
// Um clique mostra; outro clique esconde.
// =========================================================
function alternarVisibilidadeSenha(inputId, botao) {
    const input = document.getElementById(inputId);
    const icone = botao ? botao.querySelector("i") : null;

    if (!input) return;

    const vaiMostrar = input.type === "password";
    input.type = vaiMostrar ? "text" : "password";

    if (icone) {
        icone.classList.toggle("fa-eye", !vaiMostrar);
        icone.classList.toggle("fa-eye-slash", vaiMostrar);
    }

    if (botao) {
        const texto = vaiMostrar ? "Ocultar senha" : "Mostrar senha";
        botao.setAttribute("aria-label", texto);
        botao.setAttribute("title", texto);
    }
}

const API_LOGIN_URL = "/api/login";
const API_REGISTER_URL = "/api/register";
const API_USER_LOC_URL = "/api/usuario/localizacao";


function alternarAbaAuth(aba) {

    const tabLogin =
        document.getElementById('tabLogin');

    const tabRegister =
        document.getElementById('tabRegister');

    const formLogin =
        document.getElementById('formLogin');

    const formRegister =
        document.getElementById('formRegister');


    if (aba === 'login') {

        if (tabLogin)
            tabLogin.classList.add('active');

        if (tabRegister)
            tabRegister.classList.remove('active');

        if (formLogin)
            formLogin.style.display = 'block';

        if (formRegister)
            formRegister.style.display = 'none';

    } else {

        if (tabRegister)
            tabRegister.classList.add('active');

        if (tabLogin)
            tabLogin.classList.remove('active');

        if (formRegister)
            formRegister.style.display = 'block';

        if (formLogin)
            formLogin.style.display = 'none';
    }
}


// ==========================================================
// VERIFICA LOGIN EXISTENTE
// ==========================================================
function verificarSessaoUsuario() {

    const sessao =
        localStorage.getItem('frutech_usuario');

    const header =
        document.querySelector('.header');

    const navBottom =
        document.querySelector('.bottom-nav');


    if (!sessao) {

        if (header)
            header.style.display = 'none';

        if (navBottom)
            navBottom.style.display = 'none';

        navigate('login');

        return;
    }


    try {

        const usuario =
            JSON.parse(sessao);


        if (!usuario || !usuario.id) {

            localStorage.removeItem(
                'frutech_usuario'
            );

            navigate('login');

            return;
        }


        if (header)
            header.style.display = 'flex';

        if (navBottom)
            navBottom.style.display = 'flex';


        if (!usuario.cidade || !usuario.estado) {

            navigate('configuracoes');

        } else {

            if (
                typeof buscarClimaAPI === 'function'
            ) {

                buscarClimaAPI(
                    usuario.cidade,
                    usuario.estado
                );
            }

            navigate('inicio');
        }


    } catch (erro) {

        console.error(
            "Erro ao carregar sessão:",
            erro
        );

        localStorage.removeItem(
            'frutech_usuario'
        );

        navigate('login');
    }
}


// ==========================================================
// CADASTRO
// ==========================================================
async function executarCadastro(e) {

    e.preventDefault();


    const username =
        document
            .getElementById('regUsername')
            .value
            .trim();


    const pass =
        document
            .getElementById('regPassword')
            .value;


    const passConfirm =
        document
            .getElementById('regPasswordConfirm')
            .value;


    if (pass !== passConfirm) {

        mostrarMensagemApp(
            "As senhas digitadas não coincidem! " +
            "Por favor, repita a senha corretamente."
        , "error");

        return;
    }


    try {

        const response =
            await fetch(
                API_REGISTER_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        username: username,
                        password: pass
                    })
                }
            );


        const data =
            await response.json();


        if (response.ok) {

    mostrarMensagemApp(
        "Conta criada com sucesso!",
        "success"
    );

    alternarAbaAuth('login');

    const loginInput =
        document.getElementById('loginUsername');

    if (loginInput) {
        loginInput.value = username;
    }

} else {

    // Não exibe aviso flutuante.
    console.error(
        "Erro no cadastro:",
        data.erro || "Falha ao registrar."
    );
}


    } catch (err) {

        console.error(err);

        mostrarMensagemApp(
            "Erro de conexão com o servidor Python. " +
            "Verifique se 'python app.py' está rodando."
        , "error");
    }
}


// ==========================================================
// LOGIN
// ==========================================================
async function executarLogin(e) {

    e.preventDefault();


    const username =
        document
            .getElementById('loginUsername')
            .value
            .trim();


    const pass =
        document
            .getElementById('loginPassword')
            .value;


    try {

        const response =
            await fetch(
                API_LOGIN_URL,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body: JSON.stringify({
                        username: username,
                        password: pass
                    })
                }
            );


        const data =
            await response.json();


        if (response.ok) {

            const usuario =
                data.usuario;


            // ==================================================
            // IMPORTANTE
            // Salva ID, username, cidade e estado
            // ==================================================
            localStorage.setItem(
                'frutech_usuario',
                JSON.stringify(usuario)
            );


            console.log(
                "Usuário logado:",
                usuario
            );

            console.log(
                "ID do usuário:",
                usuario.id
            );


            const header =
                document.querySelector('.header');

            const navBottom =
                document.querySelector('.bottom-nav');


            if (header)
                header.style.display = 'flex';

            if (navBottom)
                navBottom.style.display = 'flex';


            if (
                !usuario.cidade ||
                !usuario.estado
            ) {

                mostrarMensagemApp(
                    `Olá, ${usuario.username}! ` +
                    `Selecione a Cidade e Estado do seu pomar.`
                , "error");

                navigate('configuracoes');

            } else {

                localStorage.setItem(
                    'frutech_localizacao',
                    JSON.stringify({
                        cidade: usuario.cidade,
                        estado: usuario.estado
                    })
                );


                if (
                    typeof buscarClimaAPI ===
                    'function'
                ) {

                    buscarClimaAPI(
                        usuario.cidade,
                        usuario.estado
                    );
                }


                navigate('inicio');
            }


        } else {

    mostrarMensagemApp(
        "Usuário ou senha incorretos.",
        "error"
    );
}


    } catch (err) {

        console.error(err);

        mostrarMensagemApp(
            "Erro ao conectar com a API Python. " +
            "Verifique se 'python app.py' está rodando no terminal."
        , "error");
    }
}


// ==========================================================
// SALVAR LOCALIZAÇÃO
// ==========================================================
window.salvarNovaLocalizacao =
    async function () {

        const estado =
            document
                .getElementById('cfg-estado')
                .value;


        const cidade =
            document
                .getElementById('cfg-cidade')
                .value
                .trim();


        const sessao =
            localStorage.getItem(
                'frutech_usuario'
            );


        if (!estado || !cidade) {

            mostrarMensagemApp(
                "Selecione o estado e digite a cidade!"
            , "error");

            return;
        }


        if (sessao) {

            const usuario =
                JSON.parse(sessao);


            usuario.cidade = cidade;
            usuario.estado = estado;


            localStorage.setItem(
                'frutech_usuario',
                JSON.stringify(usuario)
            );


            try {

                const response =
                    await fetch(
                        API_USER_LOC_URL,
                        {
                            method: 'POST',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body: JSON.stringify({
                                username:
                                    usuario.username,

                                cidade:
                                    cidade,

                                estado:
                                    estado
                            })
                        }
                    );


                const resultado =
                    await response.json();


                if (!response.ok) {

                    console.error(
                        "Erro ao salvar localização:",
                        resultado
                    );
                }


            } catch (err) {

                console.error(
                    "Erro ao sincronizar localização com MySQL:",
                    err
                );
            }
        }


        localStorage.setItem(
            'frutech_localizacao',
            JSON.stringify({
                cidade,
                estado
            })
        );


        if (
            typeof buscarClimaAPI ===
            'function'
        ) {

            buscarClimaAPI(
                cidade,
                estado
            );
        }


        mostrarMensagemApp(
            `Localização salva para o seu perfil: ${cidade} - ${estado}`
        , "error");


        navigate('inicio');
    };


// ==========================================================
// LOGOUT
// ==========================================================
function logoutUsuario() {

    if (
        confirm(
            "Deseja realmente sair da sua conta?"
        )
    ) {

        localStorage.removeItem(
            'frutech_usuario'
        );

        localStorage.removeItem(
            'frutech_localizacao'
        );

        location.reload();
    }
}


// ==========================================================
// INICIALIZAÇÃO
// ==========================================================
document.addEventListener(
    "DOMContentLoaded",
    function () {

        verificarSessaoUsuario();

    }
);

