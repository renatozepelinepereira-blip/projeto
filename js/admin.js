import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; let listaProdutosAdmin = [];
iniciarInterfaceGlobais();

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'dashboard') carregarDashboard();
    if(id === 'produtos') carregarProdutos();
};

async function carregarDashboard() {
    try {
        const [snapLojas, snapCli, snapHist] = await Promise.all([ getDocs(collection(db, "usuarios")), getDocs(collection(db, "clientes")), getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) ]);
        document.getElementById('dashLojas').innerText = (snapLojas.size > 0 ? snapLojas.size - 1 : 0);
        document.getElementById('dashProdutos').innerText = snapCli.size; // Ou crie contagem de produtos real
        document.getElementById('dashPlanilhas').innerText = snapHist.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = ''; historicoGlobal = {};
        snapHist.forEach(d => {
            const data = d.data(); historicoGlobal[d.id] = data;
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : '---';
            let acoes = data.dadosPlanilha ? `<div class="acoes-group"><button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')">👁️</button><button class="btn-small btn-sucesso" onclick="window.regerar('${d.id}')">⬇️</button></div>` : "-";
            tbody.innerHTML += `<tr><td>${dStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoes}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}

async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    let tbody = document.querySelector('#tabelaProdutosAdmin tbody'); tbody.innerHTML = ''; listaProdutosAdmin = [];
    snap.forEach(d => {
        let p = { id: d.id, ...d.data() }; listaProdutosAdmin.push(p);
        let imgHtml = p.imagem ? `<img src="${p.imagem}" class="img-produto">` : `<div class="img-placeholder">📷</div>`;
        tbody.innerHTML += `<tr><td>${imgHtml}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td><button class="btn-small btn-edit" onclick="window.abrirEdicaoProduto('${p.id}')">✏️</button></td></tr>`;
    });
}

window.abrirEdicaoProduto = (id) => {
    const p = listaProdutosAdmin.find(x => x.id === id);
    document.getElementById('prodEditId').value = p.id; document.getElementById('prodEditCodigo').value = p.codigo;
    document.getElementById('prodEditDescricao').value = p.descricao; document.getElementById('prodEditEngradado').value = p.engradado || '';
    document.getElementById('prodEditImagem').value = p.imagem || '';
    const preview = document.getElementById('previewFoto');
    if(p.imagem) { preview.src = p.imagem; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
    document.getElementById('modalEditarProduto').style.display = 'flex';
};

document.getElementById('prodEditImagem').addEventListener('input', (e) => {
    const preview = document.getElementById('previewFoto');
    if(e.target.value) { preview.src = e.target.value; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
});

window.salvarProdutoIndividual = async () => {
    const id = document.getElementById('prodEditId').value;
    const updateData = { descricao: document.getElementById('prodEditDescricao').value, engradado: document.getElementById('prodEditEngradado').value, imagem: document.getElementById('prodEditImagem').value };
    await setDoc(doc(db, "produtos", id), updateData, { merge: true });
    window.fecharModal('modalEditarProduto'); carregarProdutos();
};

window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId]; if(!log) return; const d = JSON.parse(log.dadosPlanilha);
    let html = `<div style="line-height:1.8; font-size:15px;"><p><b style="color:#e3000f">Tipo:</b> ${d.tipo.toUpperCase()}</p><p><b>Destino:</b> ${d.razao || d.razaoDestino}</p>`;
    if(d.tipo === 'venda') html += `<p><b>Valor:</b> R$ ${(d.totalV || 0).toFixed(2)}</p>`; else html += `<p><b>Valor:</b> R$ ${(d.resumo?.valorTotal || 0).toFixed(2)}</p>`;
    html += `<hr><table style="width:100%;"><thead><tr style="text-align:left;"><th>Cód</th><th>Produto</th><th style="text-align:center">Qtd</th></tr></thead><tbody>`;
    d.itens.forEach(i => html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td style="text-align:center; font-weight:bold">${i.calcTotalUnidades || i.qtd}</td></tr>`);
    document.getElementById('conteudoDetalhesLog').innerHTML = html + `</tbody></table></div>`;
    const btnM = document.getElementById('btnRegerarPlanilhaModal'); btnM.innerHTML = "⬇️ Baixar Planilha Excel";
    btnM.onclick = () => window.regerar(logId); document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regerar = async (id) => {
    const btnM = document.getElementById('btnRegerarPlanilhaModal'); if(btnM) { btnM.innerText = "⏳ A processar..."; btnM.disabled = true; }
    try { await regenerarPlanilhaExcel(historicoGlobal[id]); } catch(e) { alert(e.message); } 
    if(btnM) { btnM.innerText = "⬇️ Baixar Planilha Excel"; btnM.disabled = false; }
};

carregarDashboard();
