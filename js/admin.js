import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; 
let usuariosData = {};

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'dashboard') carregarDashboard();
    if(id === 'lojas') carregarLojas();
};

window.fecharModal = (id) => { document.getElementById(id).style.display = 'none'; };

window.toggleLog = () => {
    const box = document.getElementById('containerTabelaHistorico');
    const btn = document.getElementById('btnToggleLog');
    box.style.display = box.style.display === 'none' ? 'block' : 'none';
    btn.innerText = box.style.display === 'none' ? '👁️ Mostrar Log' : '👁️ Ocultar Log';
};

// --- DASHBOARD E LOGS ---
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
    } catch (e) {
        console.error("Erro ao carregar log:", e);
        document.querySelector('#tabelaHistorico tbody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro técnico ao carregar.</td></tr>';
    }
}

// --- VISUALIZAR BACKUP ---
window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; 
    if(!log || !log.dadosPlanilha) return;
    const d = JSON.parse(log.dadosPlanilha);
    
    let html = `<p><b>Tipo:</b> ${d.tipo.toUpperCase()}</p>`;
    html += `<p><b>Cliente/Destino:</b> ${d.razao || d.razaoDestino}</p>`;
    if(d.formaPagamento) html += `<p><b>Pagamento:</b> ${d.formaPagamento} ${d.prazo ? '- ' + d.prazo : ''}</p>`;
    html += `<hr><table style="width:100%; font-size:12px"><tr><th>Cód</th><th>Produto</th><th style="text-align:center">Qtd</th></tr>`;
    d.itens.forEach(i => {
        html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td style="text-align:center">${i.calcTotalUnidades || i.qtd}</td></tr>`;
    });
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</table>`;
    document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regenerarPlanilha(logId);
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId];
    const d = JSON.parse(log.dadosPlanilha);
    const isVenda = d.tipo === 'venda';
    try {
        const res = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        const buf = await res.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
        const out = await wb.xlsx.writeBuffer();
        saveAs(new Blob([out]), `REGERADO_${d.razao || d.razaoDestino}.xlsx`);
    } catch (e) { alert("Erro ao baixar template."); }
};

// --- PESQUISAS ---
document.getElementById('pesquisaLogAdmin').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => {
        if (!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none';
    });
});

carregarDashboard();
