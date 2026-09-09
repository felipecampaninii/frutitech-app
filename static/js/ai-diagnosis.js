function exibirPreview(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('imgPreview').src = e.target.result;
            document.getElementById('previewContainer').style.display = 'block';
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Função auxiliar para converter a sintaxe **texto** em HTML <strong>texto</strong>
function formatarMarkdown(texto) {
    if (!texto) return '';
    return texto
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Transforma **texto** em negrito HTML
        .replace(/\n/g, '<br>');                         // Converte quebras de linha em <br>
}

async function enviarParaIA() {
    const inputFoto = document.getElementById('inputFoto');
    if (!inputFoto.files || inputFoto.files.length === 0) {
        alert("Por favor, selecione uma imagem da folha para analisar!");
        return;
    }

    const formData = new FormData();
    formData.append('imagem', inputFoto.files[0]);

    const cardResultado = document.getElementById('cardResultadoIA');
    const respostaBox = document.getElementById('respostaIA');
    
    cardResultado.style.display = 'block';
    respostaBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> A IA está analisando a folha... Aguarde alguns instantes.`;

    try {
        const response = await fetch(API_DIAGNOSTICO_URL, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // Usa .innerHTML com o conversor formatarMarkdown() em vez de .textContent
            respostaBox.innerHTML = formatarMarkdown(data.diagnostico);
        } else {
            respostaBox.innerHTML = `<span style="color: #ef4444;">Erro no diagnóstico: ${data.erro || "Falha ao processar a imagem."}</span>`;
        }
    } catch (error) {
        respostaBox.innerHTML = `<span style="color: #ef4444;">Falha de conexão com a API Python. Verifique se executou 'python app.py'!</span>`;
    }
}