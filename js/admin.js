import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

let historicoGlobal = {};

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'dashboard') carregarDashboard();
};
window.fecharModal = (id) => document.getElementById(id).style.display = 'none';

async function carregarDashboard() {
    try {
        const q = query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50));
        const snap = await getDocs(q);
        let tbody = document.querySelector('#tabelaHistorico tbody');
        tbody.innerHTML = ''; historicoGlobal = {};

        snap.forEach(d => {
            const data = d.data(); historicoGlobal[d.id] = data;
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : '---';
            
            let acoes = data.dadosPlanilha ? `
                <div class="acoes-group">
                    <button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')" title="Ver Detalhes">👁️</button>
                    <button class="btn-small btn-sucesso" onclick="window.regenerarPlanilha('${d.id}')" title="Baixar Excel">⬇️</button>
                </div>` : "-";

            tbody.innerHTML += `<tr><td>${dStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoes}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}

window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; if(!log) return;
    const d = JSON.parse(log.dadosPlanilha);
    let html = `<div style="line-height:1.8; font-size:15px; color:#444;">
        <p><b style="color:#e3000f">Tipo:</b> ${d.tipo.toUpperCase()}</p>
        <p><b>Destino:</b> ${d.razao || d.razaoDestino}</p>
        <p><b>CNPJ:</b> ${d.cnpj || d.cnpjDestino || 'Não Informado'}</p>`;
    
    if(d.tipo === 'venda') html += `<p><b>Pagamento:</b> ${d.formaPagamento || 'A vista'} ${d.prazo ? '- ' + d.prazo : ''}</p><p><b>Valor Líquido:</b> <span style="color:green; font-weight:bold;">R$ ${(d.totalV || 0).toFixed(2)}</span></p>`;
    else html += `<p><b>Valor Total:</b> <span style="color:#0056b3; font-weight:bold;">R$ ${(d.resumo?.valorTotal || 0).toFixed(2)}</span></p>`;
    
    html += `<hr style="margin:20px 0; border:1px solid #eee;"><table style="width:100%; font-size:13px;">
        <thead><tr style="text-align:left; border-bottom:2px solid #ddd;"><th>Cód</th><th>Produto</th><th style="text-align:center">Qtd</th></tr></thead><tbody>`;
    
    d.itens.forEach(i => html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td style="text-align:center; font-weight:bold">${i.calcTotalUnidades || i.qtd}</td></tr>`);
    
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</tbody></table></div>`;
    
    const btnM = document.getElementById('btnRegerarPlanilhaModal');
    btnM.className = "btn-sucesso"; btnM.style.width = "100%"; btnM.style.marginTop = "20px"; btnM.style.padding = "15px"; btnM.style.fontSize = "16px"; btnM.style.fontWeight = "bold"; btnM.style.borderRadius = "8px";
    btnM.innerHTML = "⬇️ Baixar Planilha Excel (.xlsx)";
    btnM.onclick = () => window.regenerarPlanilha(logId);
    
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId]; const d = JSON.parse(log.dadosPlanilha);
    try {
        const res = await fetch(d.tipo === 'venda' ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        const buf = await res.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
        const out = await wb.xlsx.writeBuffer();
        saveAs(new Blob([out]), `REGERADO_${(d.razao || d.razaoDestino).replace(/\s+/g, '_')}.xlsx`);
    } catch (e) { alert("Erro ao baixar template."); }
};

carregarDashboard();
