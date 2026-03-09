import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

async function carregarHistorico() {
    try {
        const q = query(collection(db, "historico"), where("lojaId", "==", userId), limit(100));
        const snap = await getDocs(q);
        let logs = [];
        snap.forEach(d => logs.push({ id: d.id, ...d.data() }));

        // Ordenar por data mais recente manualmente para evitar a necessidade de criar índices no Firebase
        logs.sort((a, b) => (b.dataHora?.seconds || 0) - (a.dataHora?.seconds || 0));

        let tbody = document.querySelector('#tabelaHistoricoLoja tbody');
        tbody.innerHTML = '';
        historicoGlobal = {};

        if(logs.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma planilha gerada ainda.</td></tr>'; return; }

        logs.forEach(data => {
            historicoGlobal[data.id] = data;
            let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : 'Sem data';
            let btn = data.dadosPlanilha ? `<button style="padding:6px 10px; font-size:12px; border:none; border-radius:4px; cursor:pointer; color:white; margin-right:5px; font-weight:bold; background:#007bff;" onclick="window.visualizarLog('${data.id}')">👁️ Ver</button>
                        <button style="padding:6px 10px; font-size:12px; border:none; border-radius:4px; cursor:pointer; color:white; font-weight:bold; background:#28a745;" onclick="window.regenerarPlanilha('${data.id}')">⬇️ Baixar</button>` : "-";

            tbody.innerHTML += `<tr>
                <td>${dStr}</td>
                <td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
                <td>${data.destino || '-'}</td>
                <td>${btn}</td>
            </tr>`;
        });
    } catch (e) { console.error(e); }
}

document.getElementById('pesquisaLogLoja').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistoricoLoja tbody tr').forEach(r => {
        if (!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none';
    });
});

window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; if(!log || !log.dadosPlanilha) return;
    const d = JSON.parse(log.dadosPlanilha);
    let html = `<p><b>Tipo:</b> ${d.tipo.toUpperCase()}</p>`;
    if(d.tipo === 'venda') {
        let pag = d.formaPagamento || 'Não informado'; if(d.prazo) pag += ` - ${d.prazo}`;
        html += `<p><b>Cliente:</b> ${d.razao} | <b>Pagamento:</b> ${pag}</p><p><b>Total:</b> ${d.totalU} un | R$ ${d.totalV.toFixed(2)}</p><hr>`;
    } else {
        html += `<p><b>Destino:</b> ${d.razaoDestino}</p><p><b>Total:</b> ${d.resumo.totalPecas} un | R$ ${d.resumo.valorTotal.toFixed(2)}</p><hr>`;
    }
    html += `<table style="width:100%; font-size:12px;"><tr><th>Cód</th><th>Produto</th><th>Qtd Cx</th><th>Qtd Un</th></tr>`;
    d.itens.forEach(i => { html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td>${i.calcQtdCx}</td><td>${i.calcQtdUn}</td></tr>`; });
    html += `</table>`;
    document.getElementById('conteudoDetalhesLog').innerHTML = html;
    document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regenerarPlanilha(logId);
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId]; if(!log) return;
    const d = JSON.parse(log.dadosPlanilha);
    const btn = document.getElementById('btnRegerarPlanilhaModal'); btn.innerText = "⏳ A Gerar..."; btn.disabled = true;

    try {
        const isVenda = d.tipo === 'venda';
        const response = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

        const preencherAba = (nomeAba, filtro, tipoAba) => {
            const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
            let selecionados = d.itens.filter(filtro); if(selecionados.length === 0) return;
            if(isVenda) {
                sheet.getCell('E6').value = d.razao; sheet.getCell('J6').value = d.cnpj; sheet.getCell('F7').value = d.totalU; sheet.getCell('L7').value = d.totalV;
                let pagStr = d.formaPagamento || ""; if(d.prazo) pagStr += ` - ${d.prazo}`; sheet.getCell('F8').value = pagStr;
                let linha = 10; let metade = Math.ceil(selecionados.length / 2);
                for(let i = 0; i < metade; i++) {
                    let esq = selecionados[i]; let dir = selecionados[i + metade];
                    sheet.getCell(`C${linha}`).value = esq.codigo; sheet.getCell(`D${linha}`).value = esq.calcQtdCx; sheet.getCell(`E${linha}`).value = esq.calcTotalUnidades; sheet.getCell(`F${linha}`).value = esq.descricao; sheet.getCell(`G${linha}`).value = esq.precoFinal;
                    if(dir) { sheet.getCell(`I${linha}`).value = dir.codigo; sheet.getCell(`J${linha}`).value = dir.calcQtdCx; sheet.getCell(`K${linha}`).value = dir.calcTotalUnidades; sheet.getCell(`L${linha}`).value = dir.descricao; sheet.getCell(`M${linha}`).value = dir.precoFinal; }
                    linha++;
                }
            } else {
                if(tipoAba === 'FATURAMENTO') { sheet.getCell('D7').value = d.cnpjOrigem; sheet.getCell('I7').value = d.cnpjDestino; } 
                else { sheet.getCell('E7').value = d.cnpjOrigem; sheet.getCell('K7').value = d.razaoDestino; sheet.getCell('L8').value = d.resumo.valorTotal; }
                let linha = 10; selecionados.forEach(i => { sheet.getCell(`C${linha}`).value = i.codigo; sheet.getCell(`D${linha}`).value = i.calcTotalUnidades; sheet.getCell(`E${linha}`).value = i.descricao; linha++; });
            }
        };

        if(isVenda) {
            preencherAba("ROMANEIO SORVETE", p => p.catReal === 'sorvete', "VENDA");
            preencherAba("ROMANEIO SECO", p => p.catReal === 'seco', "VENDA");
            preencherAba("ROMANEIO BALDE", p => p.catReal === 'balde', "VENDA");
        } else {
            preencherAba("ROMANEIO", p => true, "ROMANEIO");
        }
        const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `REGERADO_${d.razao || d.razaoDestino}.xlsx`);
    } catch (e) { alert("Erro ao regerar."); }
    btn.innerText = "⬇️ Baixar Novamente"; btn.disabled = false;
};

carregarHistorico();
