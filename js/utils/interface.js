
// js/utils/interface.js - Controles Visuais Globais

export function iniciarInterfaceGlobais() {
    // Menu Sanduíche
    window.toggleMenu = () => { 
        document.getElementById('sidebar').classList.toggle('open'); 
        document.getElementById('overlay').classList.toggle('show'); 
    };

    // Fechar qualquer janela Modal
    window.fecharModal = (id) => { 
        document.getElementById(id).style.display = 'none'; 
    };

    // O Atalho do "Enter" Fluido
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'number') {
            e.preventDefault();
            // Pega apenas os inputs visíveis na tela
            const inputs = Array.from(document.querySelectorAll('input[type="number"]')).filter(el => el.offsetParent !== null);
            const index = inputs.indexOf(e.target);
            if (index > -1 && index < inputs.length - 1) { 
                inputs[index + 1].focus(); 
                inputs[index + 1].select(); 
            }
        }
    });
}
