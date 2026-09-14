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

        alert(
            "As senhas digitadas não coincidem! " +
            "Por favor, repita a senha corretamente."
        );

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

            alert(
                "Conta criada com sucesso! " +
                "Faça login para continuar."
            );


            alternarAbaAuth('login');


            const loginInput =
                document.getElementById(
                    'loginUsername'
                );


            if (loginInput)
                loginInput.value = username;


        } else {

            alert(
                "Erro no cadastro: " +
                (
                    data.erro ||
                    "Falha ao registrar."
                )
            );
        }


    } catch (err) {

        console.error(err);

        alert(
            "Erro de conexão com o servidor Python. " +
            "Verifique se 'python app.py' está rodando."
        );
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

                alert(
                    `Olá, ${usuario.username}! ` +
                    `Selecione a Cidade e Estado do seu pomar.`
                );

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

            alert(
                "Falha no login: " +
                (
                    data.erro ||
                    "Verifique seu usuário e senha."
                )
            );
        }


    } catch (err) {

        console.error(err);

        alert(
            "Erro ao conectar com a API Python. " +
            "Verifique se 'python app.py' está rodando no terminal."
        );
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

            alert(
                "Selecione o estado e digite a cidade!"
            );

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


        alert(
            `Localização salva para o seu perfil: ${cidade} - ${estado}`
        );


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