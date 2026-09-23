function exibirPreview(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const imgPreview = document.getElementById('imgPreview');
            const previewContainer = document.getElementById('previewContainer');

            if (imgPreview) {
                imgPreview.src = e.target.result;
            }

            if (previewContainer) {
                previewContainer.style.display = 'block';
            }
        };

        reader.readAsDataURL(input.files[0]);
    }
}


// =========================================================
// FORMATAÇÃO DO TEXTO DA IA
// =========================================================

function formatarMarkdown(texto) {
    if (!texto) return '';

    return texto
        // Remove separadores Markdown que eventualmente venham da IA.
        .replace(/\\?---+/g, '')
        .replace(/\\?\*\*\*+/g, '')

        // Corrige hífens escapados.
        .replace(/\\-/g, '-')

        // **texto** -> negrito.
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

        // Quebras de linha.
        .replace(/\n/g, '<br>');
}


// =========================================================
// DIAGNÓSTICO COM IA
// =========================================================

async function enviarParaIA() {
    const inputFoto = document.getElementById('inputFoto');

    if (!inputFoto || !inputFoto.files || inputFoto.files.length === 0) {
        if (typeof mostrarMensagemApp === 'function') {
            mostrarMensagemApp(
                'Selecione uma imagem de uma planta Citrus para realizar o diagnóstico.',
                'warning'
            );
        }

        return;
    }

    const arquivo = inputFoto.files[0];

    // Garante que o usuário realmente selecionou uma imagem.
    if (!arquivo.type || !arquivo.type.startsWith('image/')) {
        if (typeof mostrarMensagemApp === 'function') {
            mostrarMensagemApp(
                'O arquivo selecionado não é uma imagem válida.',
                'warning'
            );
        }

        return;
    }

    const formData = new FormData();
    formData.append('imagem', arquivo);

    const cardResultado = document.getElementById('cardResultadoIA');
    const respostaBox = document.getElementById('respostaIA');

    if (!cardResultado || !respostaBox) {
        if (typeof mostrarMensagemApp === 'function') {
            mostrarMensagemApp(
                'Não foi possível abrir a área de diagnóstico.',
                'error'
            );
        }

        return;
    }

    cardResultado.style.display = 'block';

    respostaBox.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        A IA está analisando a imagem... Aguarde alguns instantes.
    `;

    // Leva o usuário até o resultado, principalmente no celular.
    setTimeout(() => {
        cardResultado.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }, 100);

    try {
        const response = await fetch(API_DIAGNOSTICO_URL, {
            method: 'POST',
            body: formData
        });

        let data;

        try {
            data = await response.json();
        } catch (erroJson) {
            throw new Error(
                `A API retornou uma resposta inválida. HTTP ${response.status}`
            );
        }

        if (response.ok) {
            const diagnostico = data.diagnostico || '';

            if (!diagnostico.trim()) {
                respostaBox.innerHTML = `
                    <span style="color:#b45309;">
                        A análise foi concluída, mas não houve diagnóstico para exibir.
                    </span>
                `;

                if (typeof mostrarMensagemApp === 'function') {
                    mostrarMensagemApp(
                        'A análise terminou sem um diagnóstico válido.',
                        'warning'
                    );
                }

                return;
            }

            respostaBox.innerHTML = formatarMarkdown(diagnostico);

            if (typeof mostrarMensagemApp === 'function') {
                mostrarMensagemApp(
                    'Diagnóstico concluído com sucesso.',
                    'success'
                );
            }

        } else {
            const mensagemErro =
                data.erro ||
                data.detalhes ||
                'Falha ao processar a imagem.';

            respostaBox.innerHTML = `
                <span style="color:#b91c1c;">
                    <strong>Erro no diagnóstico:</strong>
                    ${formatarMarkdown(String(mensagemErro))}
                </span>
            `;

            if (typeof mostrarMensagemApp === 'function') {
                mostrarMensagemApp(
                    `Erro no diagnóstico: ${mensagemErro}`,
                    'error',
                    5000
                );
            }
        }

    } catch (error) {
        console.error('Erro ao enviar imagem para diagnóstico:', error);

        respostaBox.innerHTML = `
            <span style="color:#b91c1c;">
                <strong>Falha de conexão.</strong>
                Não foi possível comunicar com o servidor de diagnóstico.
            </span>
        `;

        if (typeof mostrarMensagemApp === 'function') {
            mostrarMensagemApp(
                'Não foi possível conectar ao servidor de diagnóstico.',
                'error',
                5000
            );
        }
    }
}

