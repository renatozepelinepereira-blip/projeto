import { db } from "./api/firebase.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";

const userId = localStorage.getItem('user');
if(!userId) window.location.href = 'index.html'; 

let logsGlobais = [];

async function carregarHistorico() {
    const q = query(collection(db, "historico"), where("lojaId", "==", userId), orderBy("dataHora", "desc"));
    const snap = await getDocs(q);
    const tbody = document.getElementById('corpoHist');
    
    let html = "";
    logsGlobais = [];

    snap.forEach(d => {
        const data = d.data();
        logsGlobais.push({id: d.id, ...data});
        const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date();
        const dataStr = ts.toLocaleString('pt-BR');
        const acaoStyle = data.acao.includes('Venda') ? 'color: #10b981; font-weight: 600;' : 'color: #3b82f6; font-weight: 600;';

        html += `<tr class="linha-hist" data-search="${dataStr} ${data.acao} ${data.destino || ''}">
            <td>${dataStr}</td>
            <td style="${acaoStyle}">${data.acao}</td>
            <td><b>${data.destino || '-'}</b></td>
            <td><button class="btn-sucesso" style="padding: 8px 16px; font-size: 13px;" onclick="window.baixarNovamente('${d.id}')">⬇️ Baixar</button></td>
        </tr>`;
    });

    tbody.innerHTML = html || `<tr><td colspan="4" style="text-align:center; padding: 20px;">Nenhum histórico encontrado.</td></tr>`;
}

window.filtrar = () => {
    const termo = document.getElementById('filtroHist').value.toLowerCase();
    const linhas = document.querySelectorAll('.linha-hist');
    linhas.forEach(tr => {
        const texto = tr.getAttribute('data-search').toLowerCase();
        tr.style.display = texto.includes(termo) ? '' : 'none';
    });
};

window.baixarNovamente = async (id) => {
    const log = logsGlobais.find(l => l.id === id);
    if(log && log.dadosPlanilha) {
        try { await regenerarPlanilhaExcel(log); } 
        catch (e) { alert("Erro ao recriar planilha: " + e.message); }
    } else {
        alert("Dados da planilha não encontrados neste registro.");
    }
};

carregarHistorico();
