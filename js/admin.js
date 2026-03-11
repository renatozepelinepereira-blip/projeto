import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

let historicoGlobal = {};

window.toggleMenu = () => { /* para mobile se houver */ };
window.fecharModal = (id) => { document.getElementById(id).style.display = 'none'; };

async function carregarDashboard() {
    try {
        const q = query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50));
        const snap = await getDocs(q);
        let tbody = document.querySelector('#tabelaHistorico tbody');
        tbody.innerHTML = '';
        historicoGlobal = {};

        snap.forEach(d => {
            const data = d.data();
            historicoGlobal[d.id] = data;
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : '---';
            
            let acoes = data.dadosPlanilha ? `
                <div style="display:flex; gap:5px;">
                    <button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')" title="Ver Detalhes">👁️</button>
                    <button class="btn-small btn-sucesso" onclick="window.regenerarPlanilha('${d.id}')" title="Baixar Excel">⬇️</button>
                </div>` : "-";

            tbody.innerHTML += `<tr>
                <td>${dStr}</td>
                <td><b>${data.nomeLoja || data.lojaId}</b></td>
                <td style="color:${data.acao.includes('Venda')?'green':'blue'}; font-weight:bold">${data.acao}</td>
                <td>${data.destino || '-'}</td>
                <td>${acoes}</td>
            </tr>`;
        });
    } catch (e) { console.error(e); }
}

window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId];
    const d = JSON.parse(log.dadosPlanilha);
    let html = `<p><b>Tipo:</b> ${d.tipo.toUpperCase()}</p><p><b>Cliente:</b> ${d.razao || d.razaoDestino}</p><hr>`;
    html += `<table style="width:100%; font-size:12px"><tr><th>Cód</th><th>Produto</th><th>Qtd</th></tr>`;
    d.itens.forEach(i => html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td>${i.calcTotalUnidades}</td></tr>`);
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</table>`;
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

// Pesquisa Log Admin
document.getElementById('pesquisaLogAdmin').addEventListener('input', (e) => {
    let f = e.target.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none');
});

carregarDashboard();
