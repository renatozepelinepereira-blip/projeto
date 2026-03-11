import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { 
    apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", 
    authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", 
    projectId: "sistema-pedidos-3f2c2", 
    storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", 
    messagingSenderId: "669786014126", 
    appId: "1:669786014126:web:d0da498633a145d56a883f" 
};

const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};

// === CONTROLO DO MENU SANDUÍCHE ===
window.toggleMenu = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
};

// === VERIFICAÇÃO DE PERMISSÕES (OCULTAR VENDA SE NECESSÁRIO) ===
async function verificarPermissoes() {
    try {
        const userSnap = await getDoc(doc(db, "usuarios", userId));
        const dados = userSnap.data();
        const planilhas = dados?.planilhas || { venda: true };

        if (planilhas.venda === false && userId !== 'admin') {
            const linkVenda = document.querySelector('a[href="loja.html"]');
            if (linkVenda) linkVenda.remove();
        }
    } catch (e) { console.error("Erro ao verificar permissões:", e); }
}

// === CARREGAR HISTÓRICO DA FILIAL ===
async function carregarHistorico() {
    try {
        const q = query(collection(db, "historico"), where("lojaId", "==", userId), limit(100));
        const snap = await getDocs(q);
        let logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));

        // Ordenação manual por data decrescente
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
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : '---';
            
            let btnAcoes = "-";
            if(data.dadosPlanilha) {
                btnAcoes = `
                    <div style="display: flex; gap: 5px; justify-content: flex-start;">
                        <button class="btn-small btn-edit" onclick="window.visualizarLog('${data.id}')" title="Ver detalhes da planilha">👁️</button>
                        <button class="btn-small btn-sucesso" onclick="window.regenerarPlanilha('${data.id}')" title="Baixar Excel novamente">⬇️</button>
                    </div>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td>${dStr}</td>
                    <td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td>${btnAcoes}</td>
                </tr>`;
        });
    } catch (e) {
        console.error("Erro ao carregar histórico:", e);
        document.querySelector('#tabelaHistoricoLoja tbody').innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Erro ao carregar dados.</td></tr>';
    }
}

// === BUSCA EM TEMPO REAL ===
document.getElementById('pesquisaLogLoja').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistoricoLoja tbody tr').forEach(r => {
        if (!r.querySelector('td[colspan]')) {
            r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none';
        }
    });
});

// === VISUALIZAR BACKUP (MODAL) ===
window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId];
    if(!log || !log.dadosPlanilha) return;
    const d = JSON.parse(log.dadosPlanilha);
    
    let html = `<div style="line-height: 1.6;">`;
    html += `<p><b>Tipo:</b> ${d.tipo.toUpperCase()}</p>`;
    
    if(d.tipo === 'venda') {
        let pag = d.formaPagamento || 'Não informado';
        if(d.prazo) pag += ` - ${d.prazo}`;
        html += `<p><b>Cliente:</b> ${d.razao}</p><p><b>Pagamento:</b> ${pag}</p><p><b>Total:</b> R$ ${(d.totalV || 0).toFixed(2)}</p>`;
    } else {
        html += `<p><b>Destino:</b> ${d.razaoDestino}</p><p><b>Total:</b> R$ ${(d.resumo?.valorTotal || 0).toFixed(2)}</p>`;
    }
    
    html += `<hr><table style="width:100%; font-size:12px; border-collapse: collapse;">
                <thead><tr style="text-align:left; border-bottom:1px solid #ddd;"><th>Cód</th><th>Produto</th><th style="text-align:center">Qtd</th></tr></thead>
                <tbody>`;
                
    d.itens.forEach(i => {
        html += `<tr style="border-bottom:1px solid #eee;">
                    <td>${i.codigo}</td><td>${i.descricao}</td><td style="text-align:center">${i.calcTotalUnidades || i.qtd}</td>
                </tr>`;
    });
    
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</tbody></table></div>`;
    document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regenerarPlanilha(logId);
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

// === REGENERAR EXCEL ===
window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId];
    if(!log) return;
    const d = JSON.parse(log.dadosPlanilha);
    const btn = document.getElementById('btnRegerarPlanilhaModal');
    const originalText = btn.innerText;

    btn.innerText = "⏳ A processar...";
    btn.disabled = true;

    try {
        const isVenda = d.tipo === 'venda';
        const response = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        if(!response.ok) throw new Error("Template não encontrado.");
        
        const buffer = await response.arrayBuffer();
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        // Preenchimento básico recuperado
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
        saveAs(new Blob([outBuffer]), `REGERADO_${(d.razao || d.razaoDestino).replace(/\s+/g, '_')}.xlsx`);
    } catch (e) { 
        console.error(e);
        alert("Erro ao recriar ficheiro. O template Excel pode estar em falta no servidor."); 
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// Inicialização
verificarPermissoes();
carregarHistorico();
