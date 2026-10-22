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

// =========================================================
// GERAÇÃO DO PDF DO DIAGNÓSTICO NUTRICIONAL
// =========================================================
function gerarPDFDiagnostico() {

    const respostaBox = document.getElementById('respostaIA');
    const inputFoto = document.getElementById('inputFoto');

    if (!respostaBox || !respostaBox.innerText.trim()) {
        mostrarMensagemApp(
            'Não há diagnóstico para gerar o PDF.',
            'warning'
        );
        return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    const diagnostico = respostaBox.innerText.trim();
    const data = new Date().toLocaleDateString('pt-BR');

    // Título do documento
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text('Fru-Tech', 20, 20);

    pdf.setFontSize(14);
    pdf.text(
        'Diagnóstico de Deficiência Nutricional',
        20,
        32
    );

    pdf.setFont(undefined, 'normal');

    // Data
    pdf.setFontSize(10);
    pdf.text(`Data: ${data}`, 20, 42);

    pdf.line(20, 48, 190, 48);

    // ---------------------------------------------------------
    // FOTO DA PLANTA
    // ---------------------------------------------------------

    if (inputFoto && inputFoto.files && inputFoto.files[0]) {

        const arquivo = inputFoto.files[0];
        const leitor = new FileReader();

        leitor.onload = function (evento) {

            const imagem = evento.target.result;

            // Adiciona a foto ao PDF
            pdf.addImage(
                imagem,
                'JPEG',
                20,
                55,
                80,
                60
            );

            // -------------------------------------------------
            // DIAGNÓSTICO
            // -------------------------------------------------

            pdf.setFontSize(11);
            pdf.setFont(undefined, 'bold');
            pdf.text('Diagnóstico:', 20, 130);

            pdf.setFont(undefined, 'normal');

            const linhas = pdf.splitTextToSize(
                diagnostico,
                170
            );

            let y = 140;

            linhas.forEach((linha) => {

                if (y > 275) {
                    pdf.addPage();
                    y = 20;
                }

                pdf.text(linha, 20, y);
                y += 7;
            });

            pdf.save('diagnostico-nutricional-frutech.pdf');
        };

        leitor.readAsDataURL(arquivo);

    } else {

        // Caso não exista foto, gera o PDF normalmente
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text('Diagnóstico:', 20, 60);

        pdf.setFont(undefined, 'normal');

        const linhas = pdf.splitTextToSize(
            diagnostico,
            170
        );

        let y = 70;

        linhas.forEach((linha) => {

            if (y > 275) {
                pdf.addPage();
                y = 20;
            }

            pdf.text(linha, 20, y);
            y += 7;
        });

        pdf.save('diagnostico-nutricional-frutech.pdf');
    }
}

// =========================================================
// INICIAR UM NOVO DIAGNÓSTICO
// =========================================================
function novoDiagnostico() {

    // Localiza os elementos utilizados no diagnóstico
    const inputFoto = document.getElementById('inputFoto');
    const imgPreview = document.getElementById('imgPreview');
    const previewContainer = document.getElementById('previewContainer');
    const respostaBox = document.getElementById('respostaIA');
    const cardResultado = document.getElementById('cardResultadoIA');

    // Limpa a imagem selecionada
    if (inputFoto) {
        inputFoto.value = '';
    }

    // Limpa a imagem exibida na pré-visualização
    if (imgPreview) {
        imgPreview.src = '';
    }

    // Esconde a pré-visualização
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    // Limpa o diagnóstico anterior
    if (respostaBox) {
        respostaBox.innerHTML = '';
    }

    // Esconde o resultado anterior
    if (cardResultado) {
        cardResultado.style.display = 'none';
    }
}
