import { db } from "./api/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const btnLogin = document.getElementById('btnLogin');
const inputUser = document.getElementById('user');
const inputPass = document.getElementById('pass');
const errorMsg = document.getElementById('errorMsg');

// Função central de login
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
        console.log("Tentando logar com:", user); // Para você debugar no F12

        // Acesso do Administrador
        if (user === 'admin' && pass === 'admin123') { 
            localStorage.setItem('user', 'admin');
            localStorage.setItem('tipo', 'admin');
            window.location.href = 'admin.html';
            return;
        }

        // Acesso das Lojas
        const docSnap = await getDoc(doc(db, "usuarios", user));
        
        if (docSnap.exists()) {
            if(docSnap.data().senha === pass) {
                console.log("Login de loja autorizado!");
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
        console.error("ERRO GRAVE NO FIREBASE:", e);
        errorMsg.innerText = "⚠️ Erro de conexão! Verifique sua internet ou AdBlock.";
        errorMsg.style.display = 'block';
    } finally {
        btnLogin.innerText = "Entrar no Sistema"; 
        btnLogin.disabled = false;
    }
}

// Escuta o clique no botão
btnLogin.addEventListener('click', realizarLogin);

// Escuta o "Enter" no campo de senha
inputPass.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        realizarLogin();
    }
});
