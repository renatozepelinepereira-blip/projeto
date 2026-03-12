import { db } from "./api/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const btnLogin = document.getElementById('btnLogin');
const inputUser = document.getElementById('user');
const inputPass = document.getElementById('pass');
const errorMsg = document.getElementById('errorMsg');

async function realizarLogin() {
    const user = inputUser.value.trim();
    const pass = inputPass.value.trim();

    if (!user || !pass) { 
        errorMsg.innerText = "⚠️ Preencha usuário e senha!"; 
        errorMsg.style.display = 'block'; 
        return; 
    }

    btnLogin.innerText = "⏳ Verificando..."; 
    btnLogin.disabled = true; 
    errorMsg.style.display = 'none';

    try {
        console.log("Tentando logar com:", user);

        // Busca o usuário no banco de dados
        const docSnap = await getDoc(doc(db, "usuarios", user));

        // ==========================================
        // 1. REGRA ESTRITA DO ADMINISTRADOR
        // ==========================================
        if (user.toLowerCase() === 'admin') {
            let senhaValida = false;
            
            // Aceita a senha padrão OU a senha que estiver salva no Firebase
            if (pass === 'admin123') {
                senhaValida = true;
            } else if (docSnap.exists() && docSnap.data().senha === pass) {
                senhaValida = true;
            }

            if (senhaValida) {
                console.log("Acesso de Administrador Autorizado!");
                localStorage.setItem('user', 'admin');
                localStorage.setItem('tipo', 'admin');
                window.location.href = 'admin.html'; // Garante que vai para o Painel Admin
                return; 
            } else {
                errorMsg.innerText = "⚠️ Senha do administrador incorreta!";
                errorMsg.style.display = 'block';
                return;
            }
        }

        // ==========================================
        // 2. REGRA DAS LOJAS E FILIAIS
        // ==========================================
        if (docSnap.exists()) {
            if(docSnap.data().senha === pass) {
                console.log("Acesso de Loja Autorizado!");
                localStorage.setItem('user', user);
                localStorage.setItem('tipo', 'loja');
                localStorage.setItem('nome', docSnap.data().nomeLoja || user);
                window.location.href = 'loja.html';
            } else {
                errorMsg.innerText = "⚠️ Senha incorreta!";
                errorMsg.style.display = 'block';
            }
        } else {
            errorMsg.innerText = "⚠️ Usuário não encontrado!";
            errorMsg.style.display = 'block';
        }

    } catch (e) {
        console.error("Erro no Firebase:", e);
        errorMsg.innerText = "⚠️ Erro de conexão com o servidor!";
        errorMsg.style.display = 'block';
    } finally {
        btnLogin.innerText = "Entrar no Sistema"; 
        btnLogin.disabled = false;
    }
}

// Escuta o clique no botão
btnLogin.addEventListener('click', realizarLogin);

// Permite logar apertando a tecla "Enter" no teclado
inputPass.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        realizarLogin();
    }
});
