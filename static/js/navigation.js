function navigate(pageId) {
    // Esconde todas as páginas
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none'; // Garante remoção de display
    });

    // Remove destaque dos botões do menu inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Ativa a página solicitada
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block'; // Força exibição do container
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

    // Rola o conteúdo para o topo
    const contentScroll = document.querySelector('.content-scroll');
    if (contentScroll) {
        contentScroll.scrollTop = 0;
    }
}

// Controle do Menu Lateral (Sidebar)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }
}

function openNotifications() {
    alert("Você não possui novas notificações.");
}