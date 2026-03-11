import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, getDoc, getDocs, collection, query, where, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};
iniciarInterfaceGlobais();

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    if (userSnap.data()?.planilhas?.venda === false && userId !== 'admin') { const linkVenda = document.getElementById('linkVendaSidebar'); if (linkVenda) linkVenda.style.display = 'none'; }
    carregarHistorico();
}

async function carregarHistorico() {
    try {
        const q = query(collection(db, "historico"), where("lojaId", "==", userId), limit(100));
        const snap = await getDocs(q); let logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
        logs.sort((a, b) => (b.dataHora?.seconds || 0) - (a.dataHora?.seconds || 0));

        let tbody = document.querySelector('#tabelaHistoricoLoja tbody'); tbody.innerHTML = ''; historicoGlobal = {};
        if(logs.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhuma planilha.</td></tr>'; return; }

        logs.forEach(data => {
            historicoGlobal[data.id] = data;
            let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : '---';
            let btn = data.dadosPlanilha ? `<div class="acoes-group"><button class="btn-small btn-edit" onclick="window.visualizarLog('${data.id}')">👁️</button><button class="btn-small btn-sucesso" onclick="window.regerar('${data.id}')">⬇️</button></div>` : "-";
            tbody.innerHTML += `<tr><td>${dStr}</td><td style="color: ${data.acao.includes('Venda') ? 'green' : '#0056b3'}; font-weight:bold;">${data.acao}</td><td>${data.destino || '-'}</td><td>${btn}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}

window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; if(!log || !log.dadosPlanilha) return;
    const d = JSON.parse(log.dadosPlanilha);
    let html = `<div style="line-height:1.8; font-size:15px;"><p><b style="color:#e3000f">Tipo:</b> ${d.tipo.toUpperCase()}</p><p><b>Destino:</b> ${d.razao || d.razaoDestino}</p>`;
    if(d.tipo === 'venda') { html += `<p><b>Pagamento:</b> ${d.formaPagamento || 'A vista'}</p><p><b>Total Líquido:</b> <span style="color:green; font-weight:bold;">R$ ${(d.totalV || 0).toFixed(2)}</span></p>`; } 
    else { html += `<p><b>Valor Total:</b> <span style="color:#0056b3; font-weight:bold;">R$ ${(d.resumo?.valorTotal || 0).toFixed(2)}</span></p>`; }
    html += `<hr><table style="width:100%;"><thead><tr style="text-align:left;"><th>Cód</th><th>Produto</th><th style="text-align:center">Qtd</th></tr></thead><tbody>`;
    d.itens.forEach(i => { html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td style="text-align:center; font-weight:bold">${i.calcTotalUnidades || i.qtd}</td></tr>`; });
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</tbody></table></div>`;
    
    const btnM = document.getElementById('btnRegerarPlanilhaModal'); btnM.innerHTML = "⬇️ Baixar Planilha Excel";
    btnM.onclick = () => window.regerar(logId); document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regerar = async (id) => {
    const btnM = document.getElementById('btnRegerarPlanilhaModal'); if(btnM) { btnM.innerText = "⏳ A processar..."; btnM.disabled = true; }
    try { await regenerarPlanilhaExcel(historicoGlobal[id]); } 
    catch(e) { alert(e.message); } 
    if(btnM) { btnM.innerText = "⬇️ Baixar Planilha Excel"; btnM.disabled = false; }
};

iniciar();
