// js/index.js - Autenticação e Login
import { db } from "./api/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

// Garante que qualquer sessão antiga seja apagada ao chegar na tela de login
localStorage.clear();

document.getElementById('loginForm').addEventListener('submit', async (e) => {
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
        // Busca o usuário no banco de dados do Firebase
        const docRef = doc(db, "usuarios", usuario);
        const docSnap = await getDoc(docRef);

        // Verifica se o usuário existe e se a senha confere
        if (docSnap.exists() && docSnap.data().senha === senha) {
            const dados = docSnap.data();
            
            // Salva os dados na sessão (LocalStorage)
            localStorage.setItem('user', docSnap.id);
            localStorage.setItem('nome', dados.nomeLoja || docSnap.id);
            
            // Verifica as permissões para redirecionar para a tela certa
            if (dados.admin === true || docSnap.id === 'admin') {
                localStorage.setItem('tipo', 'admin');
                window.location.href = 'admin.html';
            } else {
                localStorage.setItem('tipo', 'loja');
                
                // Se o usuário estiver bloqueado para Vendas, vai direto para Transferência
                if (dados.planilhas && dados.planilhas.venda === false) {
                    window.location.href = 'transferencia.html';
                } else {
                    window.location.href = 'loja.html';
                }
            }
        } else {
            // Falha na senha ou usuário não existe
            msgErro.innerText = "Usuário ou senha incorretos!";
            msgErro.style.display = 'block';
            btn.innerText = "ENTRAR";
            btn.disabled = false;
        }
    } catch (error) {
        console.error("Erro no login:", error);
        msgErro.innerText = "Erro de conexão com o servidor. Tente novamente.";
        msgErro.style.display = 'block';
        btn.innerText = "ENTRAR";
        btn.disabled = false;
    }
});
