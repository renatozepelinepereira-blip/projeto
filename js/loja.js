import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user'); const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = []; let clientesSalvos = []; window.resumoGlobal = { sorvete: {u:0, vBruto:0, vLiq:0}, seco: {u:0, vBruto:0, vLiq:0}, balde: {u:0, vBruto:0, vLiq:0}, promo: {u:0, vBruto:0, vLiq:0}, totalU:0, totalV:0, dSorv:0, dSeco:0, dBald:0, dProm:0 };

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

// Habilitar/Desabilitar Prazo
document.getElementById('cliFormaPagamento').addEventListener('change', (e) => {
    let p = document.getElementById('cliPrazo');
    if(e.target.value === 'A vista') { p.value = ''; p.disabled = true; p.style.backgroundColor = '#e9ecef'; p.placeholder = 'Bloqueado'; }
    else { p.disabled = false; p.style.backgroundColor = '#fff'; p.placeholder = 'Ex: 15 dias'; }
});

// Lógica de Venda e Preenchimento Automático segue a estrutura anterior...
// Lembre-se que o gerarExcelPedido agora grava o JSON no campo "dadosPlanilha" da coleção "historico".

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const p = userSnap.data().planilhas || { venda: true };
    if(p.venda === false) { window.location.href = 'transferencia.html'; return; }
    // ... Restante da lógica de carregamento igual ao js/loja.js da conversa anterior
}

iniciar();
