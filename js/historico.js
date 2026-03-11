import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};

// Controle do Menu e Modais
window.toggleMenu = () => {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
};

window.fecharModal = (id) => { 
    document.getElementById(id).style.display = 'none'; 
};

// Verificação de Acesso (esconde menu Venda se bloqueado)
async function verificarPermissoes() {
    try {
        const userSnap = await getDoc(doc(db, "usuarios", userId));
        const planilhas = userSnap.data()?.planilhas || { venda: true };
        if (planilhas.venda === false && userId !== 'admin') {
            const linkVenda = document.getElementById('linkVendaSidebar');
            if (linkVenda) linkVenda.style.display = 'none';
        }
    } catch (e) { console.error("Erro ao verificar permissões:", e); }
}

// Carregar Dados da Tabela
async function carregarHistorico() {
    try {
        const q = query(collection(db, "historico"), where("lojaId", "==", userId), limit(100));
        const snap = await getDocs(q);
        let logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
        
        // Ordena da mais recente para a mais antiga
        logs.sort((a, b) => (b.dataHora?.seconds || 0) - (a.dataHora?.seconds || 0));

        let tbody = document.querySelector('#tabelaHistoricoLoja tbody');
        tbody.innerHTML = '';
        historicoGlobal = {};

        if(logs.length === 0) { 
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma planilha gerada ainda.</td></tr>'; 
            return; 
        }

        logs.forEach(data => {
            historicoGlobal[data.id] = data;
            let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : '---';
            
            let btn = "-";
            if(data.dadosPlanilha) {
                btn = `
                <div class="acoes-group">
                    <button class="btn-small btn-edit" onclick="window.visualizarLog('${data.id}')" title="Ver detalhes">👁️</button>
                    <button class="btn-small btn-sucesso" onclick="window.regenerarPlanilha('${data.id}')" title="Baixar Excel">⬇️</button>
                </div>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${dStr}</td>
                    <td style="color: ${data.acao.includes('Venda') ? 'green' : '#0056b3'}; font-weight:bold;">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td>${btn}</td>
                </tr>`;
        });
    } catch (e) { 
        console.error(e);
        document.querySelector('#tabelaHistoricoLoja tbody').innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erro ao carregar log.</td></tr>';
    }
}

// Filtro de Pesquisa
document.getElementById('pesquisaLogLoja').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistoricoLoja tbody tr').forEach(r => {
        if (!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none';
    });
});

// ABRIR O MODAL DE VISUALIZAÇÃO
window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; 
    if(!log || !log.dadosPlanilha) return;
    
    const d = JSON.parse(log.dadosPlanilha);
    
    let html = `<div style="line-height:1.8; font-size:15px; color:#444;">
        <p><b style="color:#e3000f">Tipo:</b> ${d.tipo.toUpperCase()}</p>
        <p><b>Destino:</b> ${d.razao || d.razaoDestino}</p>
        <p><b>CNPJ:</b> ${d.cnpj || d.cnpjDestino || 'Não Informado'}</p>`;
    
    if(d.tipo === 'venda') {
        html += `<p><b>Pagamento:</b> ${d.formaPagamento || 'A vista'} ${d.prazo ? '- ' + d.prazo : ''}</p>
                 <p><b>Valor Líquido:</b> <span style="color:green; font-weight:bold;">R$ ${(d.totalV || 0).toFixed(2)}</span></p>`;
    } else {
        html += `<p><b>Valor Total:</b> <span style="color:#0056b3; font-weight:bold;">R$ ${(d.resumo?.valorTotal || 0).toFixed(2)}</span></p>`;
    }
    
    html += `<hr style="margin:20px 0; border:1px solid #ddd;"><table style="width:100%; font-size:13px; border-collapse: collapse;">
        <thead><tr style="text-align:left; border-bottom:2px solid #ddd;">
            <th style="padding:8px">Cód</th>
            <th style="padding:8px">Produto</th>
            <th style="padding:8px; text-align:center">Qtd</th>
        </tr></thead><tbody>`;
    
    d.itens.forEach(i => {
        html += `<tr style="border-bottom:1px solid #eee;">
            <td style="padding:8px">${i.codigo}</td>
            <td style="padding:8px">${i.descricao}</td>
            <td style="padding:8px; text-align:center; font-weight:bold">${i.calcTotalUnidades || i.qtd}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
    
    document.getElementById('conteudoDetalhesLog').innerHTML = html;
    
    const btnM = document.getElementById('btnRegerarPlanilhaModal');
    btnM.innerHTML = "<i>⬇️</i> Baixar Planilha Excel (.xlsx)";
    btnM.onclick = () => window.regenerarPlanilha(logId);
    
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

// BAIXAR O EXCEL NOVAMENTE
window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId]; 
    if(!log) return;
    
    const d = JSON.parse(log.dadosPlanilha);
    const isVenda = d.tipo === 'venda';
    
    // Feedback visual
    const btnRegerar = document.getElementById('btnRegerarPlanilhaModal');
    const textoOriginal = btnRegerar ? btnRegerar.innerHTML : '';
    if (btnRegerar) {
        btnRegerar.innerText = "⏳ A processar...";
        btnRegerar.disabled = true;
    }

    try {
        const response = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        if(!response.ok) throw new Error("Template não encontrado.");
        
        const buffer = await response.arrayBuffer(); 
        const wb = new ExcelJS.Workbook(); 
        await wb.xlsx.load(buffer);

        const sheet = wb.worksheets[0];
        if(sheet) {
            if(isVenda) {
                sheet.getCell('E6').value = d.razao;
                sheet.getCell('J6').value = d.cnpj;
                sheet.getCell('L7').value = d.totalV;
                let pagStr = d.formaPagamento || "";
                if(d.prazo) pagStr += " - " + d.prazo;
                sheet.getCell('F8').value = pagStr;
            } else {
                sheet.getCell('K7').value = d.razaoDestino;
                sheet.getCell('L8').value = d.resumo?.valorTotal || 0;
            }
        }

        const outBuffer = await wb.xlsx.writeBuffer(); 
        const fileName = `RECORDACO_${(d.razao || d.razaoDestino || 'PLANILHA').replace(/\s+/g, '_')}.xlsx`;
        saveAs(new Blob([outBuffer]), fileName);
        
    } catch (e) { 
        console.error(e);
        alert("Erro ao recriar ficheiro. O template Excel pode estar em falta no servidor."); 
    } finally {
        if (btnRegerar) {
            btnRegerar.innerHTML = textoOriginal;
            btnRegerar.disabled = false;
        }
    }
};

// Execução inicial
verificarPermissoes();
carregarHistorico();
