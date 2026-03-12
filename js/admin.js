import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDocs, deleteDoc, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';
iniciarInterfaceGlobais();

let historicoGlobal = {}; let listaProdutosAdmin = []; let listaLojasAdmin = []; let carregandoDash = false;

function extrairFilial(cnpj) {
    if (!cnpj) return "";
    const match = cnpj.match(/\/(\d{4})/);
    return match ? parseInt(match[1], 10) : "";
}

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id)?.classList.add('active');
    if(id === 'dashboard') carregarDashboard();
    if(id === 'produtos') carregarProdutos();
    if(id === 'precos') carregarTabelasPrecos();
    if(id === 'lojas') carregarLojas();
};

window.toggleTabelaHistorico = () => { const w = document.getElementById('wrapperHistorico'); const b = document.getElementById('btnToggleHist'); const isH = w.style.display === 'none'; w.style.display = isH ? 'block' : 'none'; b.innerText = isH ? '👁️ Esconder' : '👁️ Mostrar'; };
window.filtrarLogDash = () => { const t = document.getElementById('pesquisaLogAdmin').value.toLowerCase(); document.querySelectorAll('.linha-hist-admin').forEach(i => { i.style.display = i.innerText.toLowerCase().includes(t) ? '' : 'none'; }); };

// --- DASHBOARD E HISTÓRICO ---
async function carregarDashboard() {
    if(carregandoDash) return; carregandoDash = true;
    try {
        const dI = document.getElementById('dataInicio').value; const dF = document.getElementById('dataFim').value;
        const [sL, sP, sH] = await Promise.all([getDocs(collection(db, "usuarios")), getDocs(collection(db, "produtos")), getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(200)))]);
        document.getElementById('dashLojas').innerText = sL.size - 1; document.getElementById('dashProdutos').innerText = sP.size;
        
        let html = ""; historicoGlobal = {}; let cont = 0;
        sH.forEach(d => {
            const data = d.data(); const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date(data.dataHora?.seconds * 1000);
            let ok = true; if(ts && !isNaN(ts)) { const s = ts.toISOString().split('T')[0]; if(dI && s < dI) ok = false; if(dF && s > dF) ok = false; }
            if(ok) { cont++; historicoGlobal[d.id] = data; html += `<tr class="linha-hist-admin"><td>${ts.toLocaleString('pt-BR')}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color:${data.acao.includes('Venda')?'#10b981':'#3b82f6'}; font-weight:600;">${data.acao}</td><td>${data.destino || '-'}</td><td style="display: flex; gap: 8px; justify-content: center;"><button class="btn-small" style="background:#f1f5f9; border: 1px solid #cbd5e1;" onclick="window.visualizarLog('${d.id}')">👁️</button><button class="btn-small" style="background:#10b981; color:white;" onclick="window.regerar('${d.id}')">⬇️</button></td></tr>`; }
        });
        document.getElementById('corpoTabelaHistorico').innerHTML = html; document.getElementById('dashPlanilhas').innerText = cont;
    } finally { carregandoDash = false; }
}

window.visualizarLog = (id) => {
    const log = historicoGlobal[id];
    if(!log) return;
    let html = `<div style="margin-bottom: 15px;"><b>Data:</b> ${log.dataHora?.toDate ? log.dataHora.toDate().toLocaleString('pt-BR') : 'N/A'}<br><b>Loja:</b> ${log.nomeLoja || log.lojaId}<br><b>Ação:</b> ${log.acao}<br><b>Destino:</b> ${log.destino || log.dadosPlanilha?.razao || '-'}</div>`;
    if(log.dadosPlanilha && log.dadosPlanilha.itens && log.dadosPlanilha.itens.length > 0) {
        html += `<table style="width:100%; border-collapse:collapse;"><thead style="background:#e2e8f0;"><tr><th style="padding:8px; text-align:left;">Cód</th><th style="padding:8px; text-align:left;">Desc</th><th style="padding:8px; text-align:center;">Qtd</th><th style="padding:8px; text-align:right;">Subtotal</th></tr></thead><tbody>`;
        log.dadosPlanilha.itens.forEach(i => { html += `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;">${i.codigo}</td><td style="padding:8px;">${i.descricao}</td><td style="padding:8px; text-align:center;">${i.calcTotalUnidades}</td><td style="padding:8px; text-align:right; color:var(--primary); font-weight:600;">R$ ${(i.calcSubtotal||0).toFixed(2)}</td></tr>`; });
        html += `</tbody></table>`;
        if(log.dadosPlanilha.totalV) html += `<div style="text-align:right; margin-top:15px; font-size:18px;">Total: <b style="color:var(--primary);">R$ ${log.dadosPlanilha.totalV.toFixed(2)}</b></div>`;
    } else { html += `<div style="padding:15px; background:#f1f5f9; text-align:center;">Sem itens detalhados.</div>`; }
    document.getElementById('conteudoDetalhesLog').innerHTML = html; document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regerar(id); document.getElementById('modalDetalhesLog').style.display = 'flex';
};

// --- PRODUTOS & UPLOAD ---
window.previewImagemLocal = (event) => {
    const file = event.target.files[0];
    const pv = document.getElementById('previewFoto');
    if(file) { pv.src = URL.createObjectURL(file); pv.style.display = 'block'; }
};

async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    let html = ""; listaProdutosAdmin = [];
    snap.forEach(d => {
        const p = { id: d.id, ...d.data() }; listaProdutosAdmin.push(p);
        html += `<tr><td><img src="${p.imagem || ''}" class="img-produto" onerror="this.src='https://placehold.co/40?text=📦'"></td><td><b>${p.codigo}</b></td><td>${p.descricao}</td><td>${p.engradado}</td><td>${p.categoria}</td><td style="display: flex; gap: 8px; justify-content: center;"><button class="btn-small" style="background:#3b82f6; color:white;" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button><button class="btn-small" style="background:#ef4444; color:white;" onclick="window.excluirProduto('${p.codigo}')">🗑️</button></td></tr>`;
    });
    document.getElementById('corpoTabelaProdutos').innerHTML = html;
}

window.salvarProduto = async () => {
    const cod = document.getElementById('prodEditCodigo').value.trim();
    if(!cod) return alert("Código obrigatório!");
    const btn = document.getElementById('btnSalvarProd');
    const file = document.getElementById('prodEditImagemFile').files[0];
    btn.disabled = true; btn.innerText = "⏳ Salvando...";
    try {
        let url = document.getElementById('prodEditImagemUrl').value;
        if(file) { 
            const sRef = ref(storage, `produtos/${cod}`); 
            await uploadBytes(sRef, file); 
            url = await getDownloadURL(sRef); 
        }
        await setDoc(doc(db, "produtos", cod), { codigo: cod, descricao: document.getElementById('prodEditDescricao').value, categoria: document.getElementById('prodEditCategoria').value, engradado: document.getElementById('prodEditEngradado').value, imagem: url }, { merge: true });
        window.fecharModal('modalProduto'); carregarProdutos();
    } catch (e) {
        console.error("Erro no upload:", e);
        alert("Erro ao salvar o produto ou enviar a imagem. Tente uma foto menor.");
    } finally { btn.disabled = false; btn.innerText = "Salvar Produto"; }
};

window.excluirProduto = async (cod) => { if(confirm(`ATENÇÃO: Excluir permanentemente o produto ${cod}?`)) { try { await deleteDoc(doc(db, "produtos", cod)); carregarProdutos(); } catch(e) { alert("Erro ao excluir."); } } };
window.abrirNovoProduto = () => { document.getElementById('prodEditCodigo').disabled = false; document.querySelectorAll('#modalProduto input:not([type=hidden])').forEach(i => i.value = ''); document.getElementById('previewFoto').style.display = 'none'; document.getElementById('modalProduto').style.display = 'flex'; };
window.abrirEdicaoProduto = (cod) => { const p = listaProdutosAdmin.find(x => x.codigo === cod); if(!p) return; document.getElementById('prodEditCodigo').value = p.codigo; document.getElementById('prodEditCodigo').disabled = true; document.getElementById('prodEditDescricao').value = p.descricao || ''; document.getElementById('prodEditCategoria').value = p.categoria || ''; document.getElementById('prodEditEngradado').value = p.engradado || ''; document.getElementById('prodEditImagemUrl').value = p.imagem || ''; const pv = document.getElementById('previewFoto'); if(p.imagem) { pv.src = p.imagem; pv.style.display = 'block'; } else { pv.style.display = 'none'; } document.getElementById('modalProduto').style.display = 'flex'; };

// --- PREÇOS E VÍNCULOS (AUTO-CHECK) ---
async function carregarTabelasPrecos() {
    const sT = await getDocs(collection(db, "precos"));
    const selT = document.getElementById('selectTabelaAssociar');
    selT.innerHTML = '<option value="">Selecione a Tabela...</option>';
    sT.forEach(d => selT.innerHTML += `<option value="${d.id}">${d.id.toUpperCase()}</option>`);

    const sL = await getDocs(collection(db, "usuarios"));
    const cont = document.getElementById('listaLojasChecklist');
    cont.innerHTML = '';
    sL.forEach(u => {
        if(u.id === 'admin') return;
        const d = u.data(); const fil = extrairFilial(d.cnpj);
        const txt = `[FILIAL ${fil}] ${d.nomeLoja || u.id} - ${d.cnpj || ""}`.toUpperCase();
        const tabAtual = d.tabelaPreco || '';
        
        cont.innerHTML += `<div class="loja-check-item" style="display:flex; gap:10px; padding:10px; border-bottom:1px solid #f1f5f9; align-items: center;">
            <input type="checkbox" class="chk-loja" value="${u.id}" data-search="${txt}" data-tabela="${tabAtual}" style="width:18px; height:18px; margin:0; cursor:pointer;">
            <label style="font-size:13px; margin:0; cursor:pointer; flex-grow:1;">
                <b>${fil?`Filial ${fil}`:''}</b> ${d.nomeLoja || u.id} 
                <span style="color:var(--primary); font-size:11px; float:right; background:#fef2f2; padding:2px 6px; border-radius:4px;">${tabAtual ? tabAtual.toUpperCase() : 'Sem tabela'}</span>
            </label>
        </div>`;
    });
}

// Essa função marca automaticamente os checkboxes quando você escolhe uma tabela
window.aoSelecionarTabela = () => {
    const tabelaSelecionada = document.getElementById('selectTabelaAssociar').value;
    const checks = document.querySelectorAll('.chk-loja');
    checks.forEach(c => {
        c.checked = (c.getAttribute('data-tabela') === tabelaSelecionada && tabelaSelecionada !== "");
    });
};

window.vincularTabelaEmMassa = async () => {
    const tab = document.getElementById('selectTabelaAssociar').value;
    const ids = Array.from(document.querySelectorAll('.chk-loja:checked')).map(c => c.value);
    if(!tab || !ids.length) return alert("Selecione a tabela e marque as lojas na lista!");
    const btn = document.querySelector('#sec-precos .btn-sucesso'); btn.innerText = "⏳ Aplicando...";
    try {
        await Promise.all(ids.map(id => setDoc(doc(db, "usuarios", id), { tabelaPreco: tab }, { merge: true })));
        alert("Vínculo aplicado com sucesso!"); 
        carregarLojas();
        carregarTabelasPrecos(); // Atualiza a lista para o Auto-Check funcionar certo depois
    } finally { btn.innerText = "💾 Aplicar Tabela Selecionada"; document.getElementById('selectTabelaAssociar').value = ""; }
};

window.filtrarLojasChecklist = () => { const t = document.getElementById('buscaFilialVinculo').value.toUpperCase(); document.querySelectorAll('.loja-check-item').forEach(i => { i.style.display = i.querySelector('input').getAttribute('data-search').includes(t) ? 'flex' : 'none'; }); };
window.marcarTodosLojas = (v) => document.querySelectorAll('.chk-loja').forEach(c => { if(c.parentElement.style.display !== 'none') c.checked = v; });
window.importarTabelaPrecos = async () => { const nome = document.getElementById('nomeTabelaPreco').value.trim().toLowerCase(); const file = document.getElementById('fileCsvPrecos').files[0]; if(!nome || !file) return alert("Preencha o nome e selecione o arquivo!"); const reader = new FileReader(); reader.onload = async (e) => { const data = new Uint8Array(e.target.result); const wb = XLSX.read(data, {type: 'array'}); const sheet = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); let precos = {}; for(let i = 1; i < json.length; i++) { if(json[i][0] && json[i][1]) precos[String(json[i][0]).trim()] = parseFloat(String(json[i][1]).replace(',', '.')); } await setDoc(doc(db, "precos", nome), precos, { merge: true }); alert("Tabela Importada!"); carregarTabelasPrecos(); }; reader.readAsArrayBuffer(file); };

// --- LOJAS ---
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    let html = ""; listaLojasAdmin = [];
    snap.forEach(d => {
        if(d.id === 'admin') return;
        const u = { id: d.id, ...d.data() }; listaLojasAdmin.push(u);
        html += `<tr><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td><span style="background:#fef2f2; color:var(--primary); padding:4px 8px; border-radius:6px; font-weight:700;">${(u.tabelaPreco || 'Sem Tabela').toUpperCase()}</span></td><td style="text-align: center;"><button class="btn-small" style="background:#3b82f6; color:white;" onclick="window.abrirEdicaoLoja('${u.id}')">✏️</button></td></tr>`;
    });
    document.getElementById('corpoTabelaLojas').innerHTML = html;
}

window.abrirNovaLoja = () => { document.getElementById('lojaEditId').disabled = false; document.getElementById('lojaEditIsNew').value = 'sim'; document.querySelectorAll('#modalLoja input').forEach(i => i.value = ''); document.getElementById('modalLoja').style.display = 'flex'; };
window.abrirEdicaoLoja = (id) => { const u = listaLojasAdmin.find(x => x.id === id); if(!u) return; document.getElementById('lojaEditId').value = u.id; document.getElementById('lojaEditId').disabled = true; document.getElementById('lojaEditIsNew').value = 'nao'; document.getElementById('lojaEditNome').value = u.nomeLoja || ''; document.getElementById('lojaEditCnpj').value = u.cnpj || ''; document.getElementById('lojaEditSenha').value = ''; document.getElementById('modalLoja').style.display = 'flex'; };
window.salvarLoja = async () => { const id = document.getElementById('lojaEditId').value.trim(); const d = { nomeLoja: document.getElementById('lojaEditNome').value, cnpj: document.getElementById('lojaEditCnpj').value }; const s = document.getElementById('lojaEditSenha').value.trim(); if(s) d.senha = s; await setDoc(doc(db, "usuarios", id), d, { merge: true }); alert("Loja Salva!"); window.fecharModal('modalLoja'); carregarLojas(); carregarTabelasPrecos(); };

// --- BACKUP E INICIALIZAÇÃO ---
window.gerarBackupCompleto = async () => { const btn = document.getElementById('btnGerarBackup'); btn.innerText = "⏳ Compactando..."; try { const zip = new JSZip(); const cols = ["usuarios", "produtos", "precos", "clientes", "historico"]; for(let c of cols) { const s = await getDocs(collection(db, c)); let d = []; s.forEach(doc => d.push({id: doc.id, ...doc.data()})); zip.file(`${c}.json`, JSON.stringify(d)); } const blob = await zip.generateAsync({type:"blob"}); saveAs(blob, `BACKUP_ESKIMO_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`); } catch(e) { alert(e.message); } finally { btn.innerText = "⬇️ Baixar Backup (.zip)"; } };
window.restaurarBackupCompleto = async () => { const f = document.getElementById('fileRestoreZip').files[0]; if(!f || !confirm("Isso apagará/sobrescreverá os dados atuais. Continuar?")) return; const btn = document.getElementById('btnRestaurarBackup'); btn.innerText = "⏳ Restaurando..."; try { const zip = await JSZip.loadAsync(f); for(let n in zip.files) { const c = n.replace('.json', ''); const cont = await zip.files[n].async("string"); const l = JSON.parse(cont); for(let i of l) { const id = i.id; delete i.id; await setDoc(doc(db, c, id), i, {merge: true}); } } alert("Restaurado com sucesso!"); location.reload(); } catch(e) { alert(e.message); btn.innerText = "⚡ Restaurar Dados"; } };

window.regerar = async (id) => { await regenerarPlanilhaExcel(historicoGlobal[id]); };
document.addEventListener('DOMContentLoaded', () => carregarDashboard());
