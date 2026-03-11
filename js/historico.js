import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};

window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
};

async function carregarHistorico() {
    try {
        const q = query(collection(db, "historico"), where("lojaId", "==", userId), limit(100));
        const snap = await getDocs(q);
        let logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
        logs.sort((a, b) => (b.dataHora?.seconds || 0) - (a.dataHora?.seconds || 0));

        let tbody = document.querySelector('#tabelaHistoricoLoja tbody');
        tbody.innerHTML = '';
        historicoGlobal = {};

        if(logs.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma planilha gerada ainda.</td></tr>'; return; }

        logs.forEach(data => {
            historicoGlobal[data.id] = data;
            let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : '---';
            
            let btn = data.dadosPlanilha ? `
                <div style="display: flex; gap: 5px;">
                    <button class="btn-small btn-edit" onclick="window.visualizarLog('${data.id}')" title="Ver detalhes">👁️</button>
                    <button class="btn-small btn-sucesso" onclick="window.regenerarPlanilha('${data.id}')" title="Baixar Excel">⬇️</button>
                </div>` : "-";

            tbody.innerHTML += `<tr>
                <td>${dStr}</td>
                <td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
                <td>${data.destino || '-'}</td>
                <td>${btn}</td>
            </tr>`;
        });
    } catch (e) { console.error(e); }
}

// Funções visualizarLog e regenerarPlanilha (idênticas às do admin.js)
// ...

carregarHistorico();
