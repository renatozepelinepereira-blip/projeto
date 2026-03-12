export function iniciarInterfaceGlobais() {
    // Menu Sanduíche (Mobile/Loja)
    window.toggleMenu = () => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.overlay');
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
    };

    // Fechar Modais
    window.fecharModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    };

    // Fechar ao clicar fora do modal
    window.onclick = (event) => {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.style.display = 'none';
        }
    };
}
