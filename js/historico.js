import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";

const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let logsGlobais = [];

iniciarInterfaceGlobais();
document.getElementById('txtLoja').innerText = nomeLoja;

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
        
        // Cores para diferenciar Venda de Transferência
        const acaoStyle = data.acao.includes('Venda') ? 'color: #10b981; font-weight: 700;' : 'color: #3b82f6; font-weight: 700;';

        html += `<tr class="linha-hist" data-search="${dataStr} ${data.acao} ${data.destino || data.dadosPlanilha?.razao || ''}">
            <td style="font-weight: 500;">${dataStr}</td>
            <td style="${acaoStyle}">${data.acao}</td>
            <td><b>${data.destino || data.dadosPlanilha?.razao || '-'}</b></td>
            <td><button class="btn-sucesso" style="padding: 10px 20px; font-size: 14px; border-radius: 8px;" onclick="window.baixarNovamente('${d.id}')">⬇️ Baixar Excel</button></td>
        </tr>`;
    });

    tbody.innerHTML = html || `<tr><td colspan="4" style="text-align:center; padding: 30px; color: var(--text-muted);">Você ainda não possui nenhum histórico de pedido ou transferência.</td></tr>`;
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
        try { 
            await regenerarPlanilhaExcel(log); 
        } catch (e) { 
            alert("Erro ao recriar planilha: " + e.message); 
        }
    } else {
        alert("Dados da planilha não encontrados neste registro.");
    }
};

carregarHistorico();
