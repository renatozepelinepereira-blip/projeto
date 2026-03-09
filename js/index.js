  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        if(document.getElementById('modalFirstLogin').style.display === 'flex') document.getElementById('btnSaveNewPass').click();
        else document.getElementById('btnLogin').click();
    }
});

document.getElementById('btnLogin').onclick = async (e) => {
    e.preventDefault(); 
    const u = document.getElementById('user').value.toLowerCase().trim();
    const p = document.getElementById('pass').value;
    const msg = document.getElementById('msg');
    const btn = document.getElementById('btnLogin');

    if(!u || !p) { msg.style.display = 'block'; msg.innerText = "Preencha o usuário e a senha."; return; }
    btn.innerText = "Aguarde..."; btn.disabled = true; msg.style.display = 'none';

    try {
        if(u === 'admin' && p === 'admin') await setDoc(doc(db, "usuarios", "admin"), { senha: "admin", nomeLoja: "Matriz", tipo: "admin" }, { merge: true });
        const snap = await getDoc(doc(db, "usuarios", u));
        
        if(snap.exists() && snap.data().senha === p) {
            const dados = snap.data();
            if (p === 'eskimo' && u !== 'admin') {
                document.getElementById('modalFirstLogin').style.display = 'flex';
                document.getElementById('btnSaveNewPass').onclick = async () => {
                    const np = document.getElementById('newPass').value; const cp = document.getElementById('confirmPass').value; const msgFirst = document.getElementById('msgFirst');
                    if (!np || !cp) { msgFirst.innerText = "Preencha os dois campos!"; msgFirst.style.display = 'block'; return; }
                    if (np !== cp) { msgFirst.innerText = "As senhas não coincidem!"; msgFirst.style.display = 'block'; return; }
                    if (np === 'eskimo') { msgFirst.innerText = "A nova senha não pode ser 'eskimo'."; msgFirst.style.display = 'block'; return; }
                    document.getElementById('btnSaveNewPass').innerText = "A guardar..."; document.getElementById('btnSaveNewPass').disabled = true;
                    await setDoc(doc(db, "usuarios", u), { senha: np }, { merge: true });
                    localStorage.setItem('user', u); localStorage.setItem('nome', dados.nomeLoja); localStorage.setItem('tipo', dados.tipo); 
                    window.location.href = dados.tipo === "admin" ? "admin.html" : "loja.html";
                };
                return; 
            }
            localStorage.setItem('user', u); localStorage.setItem('nome', dados.nomeLoja); localStorage.setItem('tipo', dados.tipo); 
            window.location.href = dados.tipo === "admin" ? "admin.html" : "loja.html";
        } else {
            msg.style.display = 'block'; msg.innerText = "Usuário ou senha incorretos."; btn.innerText = "Entrar"; btn.disabled = false;
        }
    } catch (error) { msg.style.display = 'block'; msg.innerText = "Erro de conexão."; btn.innerText = "Entrar"; btn.disabled = false; }
};
