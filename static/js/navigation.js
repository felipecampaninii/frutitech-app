function navigate(pageId) {
    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    // Remove destaque dos botões do menu inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Ativa a página solicitada
    const targetPage = document.getElementById('page-' + pageId);

    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
    } else {
        if (typeof mostrarMensagemApp === 'function') {
            mostrarMensagemApp('Não foi possível abrir esta tela.', 'error');
        }
        return;
    }

    // Ativa o ícone do menu correspondente
    const activeNav = document.getElementById('nav-' + pageId);
    if (activeNav) {
        activeNav.classList.add('active');
    }

    // Ações específicas ao abrir telas
    if (pageId === 'historico' && typeof carregarHistorico === 'function') {
        carregarHistorico();
    }

    // Fecha o menu lateral caso esteja aberto
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) {
        sidebar.classList.remove('open');
    }

    if (overlay) {
        overlay.classList.remove('active');
    }

    // Rola o conteúdo para o topo
    const contentScroll = document.querySelector('.content-scroll');

    if (contentScroll) {
        contentScroll.scrollTop = 0;
    }

    window.scrollTo({
        top: 0,
        behavior: 'auto'
    });
}


// =========================================================
// CONTROLE DO MENU LATERAL
// =========================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar || !overlay) {
        return;
    }

    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}


// =========================================================
// NOTIFICAÇÕES
// =========================================================

function openNotifications() {
    if (typeof mostrarMensagemApp === 'function') {
        mostrarMensagemApp(
            'Você não possui novas notificações.',
            'info'
        );
    } else {
        console.log('Você não possui novas notificações.');
    }
}

