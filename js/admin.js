import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, deleteField, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let usuariosData = {}; 
let editorItens = []; 
let itensExcluidos = []; 
let clientesData = {};
let historicoGlobal = {}; 

window.mudarSecao = (secaoId) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + secaoId).classList.add('active');
    document.getElementById('nav-' + secaoId).classList.add('active');
    if(secaoId === 'dashboard') carregarDashboard();
    if(secaoId === 'lojas') carregarLojas();
    if(secaoId === 'clientes') carregarClientes();
};

window.fecharModal = (id) => { document.getElementById(id).style.display = 'none'; };

window.toggleLog = () => {
    const box = document.getElementById('containerTabelaHistorico');
    const btn = document.getElementById('btnToggleLog');
    if (box.style.display === 'none') {
        box.style.display = 'block'; btn.innerText = '👁️ Ocultar Log';
    } else {
        box.style.display = 'none'; btn.innerText = '👁️ Mostrar Log';
    }
};

const aplicaMascara = (e) => {
    let x = e.target.value.replace(/\D/g, '');
    if(x.length > 11) { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x;
};

function formatarNomeLogin(nomeRaw) {
    let nome = nomeRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
    nome = nome.replace(/\([^)]*\)/g, " ").replace(/\/[a-z]{2}\b/g, " ");
    nome = nome.replace(/\b(eskimo|eskimó|loja de fabrica|loja|fabrica|sorvetes|sorvete|de|atacadao|atacadão|cd)\b/g, " ");
    nome = nome.replace(/[^a-z0-9\s]/g, " "); 
    let palavras = nome.split(/\s+/).filter(p => p.length > 0);
    const romanos = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/;
    if (palavras.length > 0) {
        let ultima = palavras[palavras.length - 1];
        if (romanos.test(ultima)) return "filial." + palavras.slice(0, -1).join("") + "." + ultima;
        return "filial." + palavras.join("");
    }
    return "";
}

// === DASHBOARD E LOGS ===
async function carregarDashboard() {
    try {
        const [snapLojas, snapCli, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "clientes")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) 
        ]);
        
        document.getElementById('dashTotLojas').innerText = (snapLojas.size > 0 ? snapLojas.size - 1 : 0);
        document.getElementById('dashTotClientes').innerText = snapCli.size;
        document.getElementById('dashTotAcoes').innerText = snapHist.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); 
        tbody.innerHTML = '';
        if(snapHist.size === 0) { 
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma atividade registada ainda.</td></tr>'; 
            return; 
        }
        
        historicoGlobal = {};
        snapHist.forEach(d => {
            let data = d.data(); 
            historicoGlobal[d.id] = data;
            let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : 'Data Indisponível';
            
            let acoesBtn = "-";
            if(data.dadosPlanilha) {
                acoesBtn = `
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')" title="Ver detalhes">👁️</button>
                        <button class="btn-small btn-sucesso" style="margin:0;" onclick="window.regenerarPlanilha('${d.id}')" title="Baixar Excel">⬇️</button>
                    </div>`;
            }

            tbody.innerHTML += `<tr>
                <td>${dStr}</td>
                <td><b>${data.nomeLoja || data.lojaId}</b></td>
                <td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
                <td>${data.destino || '-'}</td>
                <td>${acoesBtn}</td>
            </tr>`;
        });
    } catch (e) {
        console.error(e);
        document.querySelector('#tabelaHistorico tbody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Erro ao carregar log.</td></tr>';
    }
}

// === VISUALIZAÇÃO E REGENERAÇÃO ===
window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; if(!log || !log.dadosPlanilha) return;
    const d = JSON.parse(log.dadosPlanilha);
    let html = `<p><b>Tipo:</b> ${d.tipo.toUpperCase()}</p>`;
    if(d.tipo === 'venda') {
        let pag = d.formaPagamento || 'Não informado'; if(d.prazo) pag += ` - ${d.prazo}`;
        html += `<p><b>Cliente:</b> ${d.razao}</p><p><b>Pagamento:</b> ${pag}</p><p><b>Total:</b> R$ ${d.totalV.toFixed(2)}</p><hr>`;
    } else {
        html += `<p><b>Destino:</b> ${d.razaoDestino}</p><p><b>Valor:</b> R$ ${d.resumo.valorTotal.toFixed(2)}</p><hr>`;
    }
    html += `<table style="width:100%; font-size:12px;"><tr><th>Cód</th><th>Produto</th><th>Qtd</th></tr>`;
    d.itens.forEach(i => { html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td>${i.calcTotalUnidades}</td></tr>`; });
    html += `</table>`;
    document.getElementById('conteudoDetalhesLog').innerHTML = html;
    document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regenerarPlanilha(logId);
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId]; if(!log) return;
    const d = JSON.parse(log.dadosPlanilha);
    const btn = document.getElementById('btnRegerarPlanilhaModal'); btn.innerText = "⏳ A Gerar...";
    try {
        const isVenda = d.tipo === 'venda';
        const response = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
        const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);
        const sheet = wb.getWorksheet(isVenda ? "ROMANEIO SORVETE" : "ROMANEIO"); // Simplificado para Admin
        if(sheet) {
           if(isVenda) { sheet.getCell('E6').value = d.razao; sheet.getCell('J6').value = d.cnpj; sheet.getCell('L7').value = d.totalV; }
           else { sheet.getCell('K7').value = d.razaoDestino; sheet.getCell('L8').value = d.resumo.valorTotal; }
        }
        const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `REGERADO_${d.razao || d.razaoDestino}.xlsx`);
    } catch (e) { alert("Erro ao regerar."); }
    btn.innerText = "⬇️ Baixar Novamente";
};

// === PESQUISAS ===
document.getElementById('pesquisaLogAdmin').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => {
        if (!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none';
    });
});

document.getElementById('pesquisaLoja').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaLojas tbody tr').forEach(r => { r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none'; });
});

// === OUTRAS FUNÇÕES (LOJAS, PREÇOS, BACKUP) ===
// (Mantenha as suas funções de apagarTodasLojas, abrirPrecos, etc. aqui abaixo)

carregarDashboard();
