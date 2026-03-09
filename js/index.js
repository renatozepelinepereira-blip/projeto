import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

document.addEventListener('keypress', (e) => { if(e.key === 'Enter') { if(document.getElementById('modalFirstLogin').style.display === 'flex') document.getElementById('btnSaveNewPass').click(); else document.getElementById('btnLogin').click(); } });

document.getElementById('btnLogin').onclick = async () => {
    const u = document.getElementById('user').value.toLowerCase().trim(); const p = document.getElementById('pass').value;
    const msg = document.getElementById('msg'); const btn = document.getElementById('btnLogin');
    if(!u || !p) return alert("Preencha tudo."); btn.innerText = "Aguarde..."; btn.disabled = true;
    try {
        const snap = await getDoc(doc(db, "usuarios", u));
        if(snap.exists() && snap.data().senha === p) {
            const d = snap.data(); let plan = d.planilhas || {};
            let red = d.tipo === "admin" ? "admin.html" : (plan.venda !== false ? "loja.html" : "transferencia.html");
            if (p === 'eskimo' && u !== 'admin') {
                document.getElementById('modalFirstLogin').style.display = 'flex';
                document.getElementById('btnSaveNewPass').onclick = async () => {
                    const np = document.getElementById('newPass').value;
                    if (np !== document.getElementById('confirmPass').value || !np || np === 'eskimo') return alert("Senha inválida.");
                    await setDoc(doc(db, "usuarios", u), { senha: np }, { merge: true });
                    localStorage.setItem('user', u); localStorage.setItem('nome', d.nomeLoja); localStorage.setItem('tipo', d.tipo); window.location.href = red;
                }; return;
            }
            localStorage.setItem('user', u); localStorage.setItem('nome', d.nomeLoja); localStorage.setItem('tipo', d.tipo); window.location.href = red;
        } else { alert("Usuário/Senha incorretos."); btn.innerText = "Entrar"; btn.disabled = false; }
    } catch (e) { alert("Erro de conexão."); btn.innerText = "Entrar"; btn.disabled = false; }
};
