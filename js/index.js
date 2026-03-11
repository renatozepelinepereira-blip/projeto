// js/index.js - Autenticação Blindada
import { db } from "./api/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Limpa qualquer sessão que ficou presa
localStorage.clear();

const formLogin = document.getElementById('loginForm');

if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
        // ESSENCIAL: Impede a página de recarregar "piscando" a tela
        e.preventDefault();
        
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value.trim();
        const btn = document.getElementById('btnEntrar');
        const msgErro = document.getElementById('msgErro');

        if (!usuario || !senha) return;

        btn.innerText = "⏳ AUTENTICANDO...";
        btn.disabled = true;
        msgErro.style.display = 'none';

        try {
            // Busca os dados no Firebase
            const docRef = doc(db, "usuarios", usuario);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().senha === senha) {
                const dados = docSnap.data();
                
                // Grava os dados vitais no LocalStorage
                localStorage.setItem('user', docSnap.id);
                localStorage.setItem('nome', dados.nomeLoja || docSnap.id);
                
                // Redirecionamento
                if (dados.admin === true || docSnap.id === 'admin') {
                    localStorage.setItem('tipo', 'admin');
                    window.location.replace('admin.html');
                } else {
                    localStorage.setItem('tipo', 'loja');
                    if (dados.planilhas && dados.planilhas.venda === false) {
                        window.location.replace('transferencia.html');
                    } else {
                        window.location.replace('loja.html');
                    }
                }
            } else {
                msgErro.innerText = "⚠️ Usuário ou senha incorretos!";
                msgErro.style.display = 'block';
                btn.innerText = "ACESSAR SISTEMA";
                btn.disabled = false;
            }
        } catch (error) {
            console.error("Erro CRÍTICO no Login:", error);
            msgErro.innerText = "❌ Erro de conexão com o servidor Firebase.";
            msgErro.style.display = 'block';
            btn.innerText = "ACESSAR SISTEMA";
            btn.disabled = false;
        }
    });
}
