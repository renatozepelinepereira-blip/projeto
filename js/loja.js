import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = [];
let clientesSalvos = [];

window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
};

// Lógica de Pagamento
document.getElementById('cliFormaPagamento').addEventListener('change', (e) => {
    const prazo = document.getElementById('cliPrazo');
    if(e.target.value === 'A vista') {
        prazo.value = ''; prazo.disabled = true;
        prazo.style.backgroundColor = '#e9ecef'; prazo.placeholder = 'Bloqueado';
    } else {
        prazo.disabled = false; prazo.style.backgroundColor = '#fff'; prazo.placeholder = 'Ex: 15 dias';
    }
});

// A função gerarExcelPedido deve conter a gravação:
// await addDoc(collection(db, "historico"), { ..., dadosPlanilha: JSON.stringify(dadosBackup) });

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const p = userSnap.data().planilhas || { venda: true };
    if(p.venda === false) window.location.href = 'transferencia.html';
    // ... restante do carregamento de produtos
}
iniciar();
