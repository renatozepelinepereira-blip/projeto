import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';
iniciarInterfaceGlobais();

let historicoGlobal = {}; 
window.listaProdutosAdmin = []; 
let listaLojasAdmin = []; 
let carregandoDash = false;

function extrairFilial(cnpj) {
    if (!cnpj) return "";
    const match = cnpj.match(/\/(\d{4})/);
    return match ? parseInt(match[1], 10) : "";
}

window.mudarSecao = async (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id)?.classList.add('active');
    
    if(id === 'dashboard') window.carregarDashboard();
    if(id === 'produtos') { await window.carregarTabelasPrecos(); await window.carregarProdutos(); } 
    if(id === 'precos') window.carregarTabelasPrecos();
    if(id === 'lojas') window.carregarLojas();
};

window.toggleTabelaHistorico = () => { const w = document.getElementById('wrapperHistorico'); const b = document.getElementById('btnToggleHist'); const isH = w.style.display === 'none'; w.style.display = isH ? 'block' : 'none'; b.innerText = isH ? '👁️ Esconder' : '👁️ Mostrar'; };
window.filtrarLogDash = () => { const t = document.getElementById('pesquisaLogAdmin').value.toLowerCase(); document.querySelectorAll('.linha-hist-admin').forEach(i => { i.style.display = i.innerText.toLowerCase().includes(t) ? '' : 'none'; }); };

window.carregarDashboard = async () => {
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
};

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

// --- NAVEGAÇÃO DAS ABAS DO CATÁLOGO ---
window.mudarAbaAdminCat = (cat) => {
    document.querySelectorAll('.admin-cat-tab').forEach(b => { b.style.background = 'transparent'; b.style.color = '#64748b'; b.style.boxShadow = 'none'; });
    document.querySelectorAll('.admin-cat-content').forEach(c => c.style.display = 'none');
    
    const btn = document.getElementById('btnAdminTab' + cat.charAt(0).toUpperCase() + cat.slice(1));
    if(btn) { btn.style.background = 'white'; btn.style.color = 'var(--primary)'; btn.style.boxShadow = 'var(--shadow-sm)'; }
    
    const content = document.getElementById('content_admin_' + cat);
    if(content) content.style.display = 'block';
};

window.previewImagemLocal = (event) => { const file = event.target.files[0]; const pv = document.getElementById('previewFoto'); if(file) { pv.src = URL.createObjectURL(file); pv.style.display = 'block'; } };

// === A FUNÇÃO GLOBAL QUE ATUALIZA A TABELA QUANDO VOCÊ SELECIONA NO MENU ===
window.carregarProdutos = async () => {
    const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
    
    document.querySelectorAll('.thPrecoCat').forEach(th => {
        if (tabelaSelecionada) {
            th.innerText = `Preço (${tabelaSelecionada.toUpperCase()})`;
            th.style.display = 'table-cell';
        } else {
            th.style.display = 'none';
        }
    });

    let precosTabela = {};
    if (tabelaSelecionada) {
        const snapPrecos = await getDoc(doc(db, "precos", tabelaSelecionada));
        if (snapPrecos.exists()) precosTabela = snapPrecos.data();
    }

    const snap = await getDocs(collection(db, "produtos"));
    let htmlBuffers = { sorvete: "", seco: "", balde: "", promo: "" };
    window.listaProdutosAdmin = [];
    
    snap.forEach(d => {
        const p = { id: d.id, ...d.data() }; 
        if (tabelaSelecionada) p.precoAtual = precosTabela[p.codigo] !== undefined ? precosTabela[p.codigo] : null;
        window.listaProdutosAdmin.push(p);
        
        let rawCat = (p.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let cat = 'sorvete'; 
        if (rawCat.includes('seco')) cat = 'seco'; else if (rawCat.includes('balde')) cat = 'balde'; else if (rawCat.includes('promo')) cat = 'promo';

        let htmlPreco = '';
        if (tabelaSelecionada) {
            const val = p.precoAtual !== null ? `R$ ${parseFloat(p.precoAtual).toFixed(2)}` : '<span style="color:#ef4444;font-size:12px;">Sem Preço</span>';
            htmlPreco = `<td style="font-weight:900; color:var(--primary); font-size:15px;">${val}</td>`;
        }
        
        htmlBuffers[cat] += `<tr>
            <td><img src="${p.imagem || ''}" class="img-produto" onerror="this.src='https://placehold.co/40?text=📦'"></td>
            <td><b>${p.codigo}</b></td>
            <td>${p.descricao}</td>
            <td>${p.engradado}</td>
            ${htmlPreco}
            <td style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-small" style="background:#3b82f6; color:white;" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button>
                <button class="btn-small" style="background:#ef4444; color:white;" onclick="window.excluirProduto('${p.codigo}')">🗑️</button>
            </td>
        </tr>`;
    });

    // Atualiza as abas separadamente
    if (document.getElementById('corpoAdminSorvete')) document.getElementById('corpoAdminSorvete').innerHTML = htmlBuffers.sorvete || '<tr><td colspan="6" style="text-align:center;">Nenhum produto.</td></tr>';
    if (document.getElementById('corpoAdminSeco')) document.getElementById('corpoAdminSeco').innerHTML = htmlBuffers.seco || '<tr><td colspan="6" style="text-align:center;">Nenhum produto.</td></tr>';
    if (document.getElementById('corpoAdminBalde')) document.getElementById('corpoAdminBalde').innerHTML = htmlBuffers.balde || '<tr><td colspan="6" style="text-align:center;">Nenhum produto.</td></tr>';
    if (document.getElementById('corpoAdminPromo')) document.getElementById('corpoAdminPromo').innerHTML = htmlBuffers.promo || '<tr><td colspan="6" style="text-align:center;">Nenhum produto.</td></tr>';
};

window.abrirEdicaoProduto = (cod) => { 
    const p = window.listaProdutosAdmin.find(x => x.codigo === cod); if(!p) return; 
    document.getElementById('prodEditCodigo').value = p.codigo; document.getElementById('prodEditCodigo').disabled = true; document.getElementById('prodEditDescricao').value = p.descricao || ''; document.getElementById('prodEditCategoria').value = p.categoria || ''; document.getElementById('prodEditEngradado').value = p.engradado || ''; document.getElementById('prodEditImagemUrl').value = p.imagem || ''; 
    const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
    const divPreco = document.getElementById('divPrecoEdit');
    if (tabelaSelecionada) { document.getElementById('lblNomeTabelaEdit').innerText = tabelaSelecionada.toUpperCase(); document.getElementById('prodEditPreco').value = p.precoAtual !== null ? p.precoAtual : ''; divPreco.style.display = 'block'; } else { divPreco.style.display = 'none'; document.getElementById('prodEditPreco').value = ''; }
    const pv = document.getElementById('previewFoto'); if(p.imagem) { pv.src = p.imagem; pv.style.display = 'block'; } else { pv.style.display = 'none'; } 
    document.getElementById('modalProduto').style.display = 'flex'; 
};

window.abrirNovoProduto = () => { 
    document.getElementById('prodEditCodigo').disabled = false; document.querySelectorAll('#modalProduto input[type="text"], #modalProduto input[type="number"]').forEach(i => i.value = ''); 
    const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
    const divPreco = document.getElementById('divPrecoEdit');
    if (tabelaSelecionada) { document.getElementById('lblNomeTabelaEdit').innerText = tabelaSelecionada.toUpperCase(); divPreco.style.display = 'block'; } else { divPreco.style.display = 'none'; }
    document.getElementById('previewFoto').style.display = 'none'; document.getElementById('modalProduto').style.display = 'flex'; 
};

window.salvarProduto = async () => {
    const cod = document.getElementById('prodEditCodigo').value.trim();
    if(!cod) return alert("Código obrigatório!");
    const btn = document.getElementById('btnSalvarProd');
    const file = document.getElementById('prodEditImagemFile').files[0];
    btn.disabled = true; btn.innerText = "⏳ Salvando...";
    try {
        let url = document.getElementById('prodEditImagemUrl').value;
        if(file) { const sRef = ref(storage, `produtos/${cod}`); await uploadBytes(sRef, file); url = await getDownloadURL(sRef); }
        await setDoc(doc(db, "produtos", cod), { codigo: cod, descricao: document.getElementById('prodEditDescricao').value, categoria: document.getElementById('prodEditCategoria').value, engradado: document.getElementById('prodEditEngradado').value, imagem: url }, { merge: true });
        const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
        if (tabelaSelecionada) {
            const precoVal = document.getElementById('prodEditPreco').value;
            if (precoVal !== "") await setDoc(doc(db, "precos", tabelaSelecionada), { [cod]: parseFloat(precoVal) }, { merge: true });
        }
        window.fecharModal('modalProduto'); window.carregarProdutos();
    } catch (e) { alert("Erro ao salvar."); } finally { btn.disabled = false; btn.innerText = "Salvar Produto"; }
};

window.excluirProduto = async (cod) => { if(confirm(`ATENÇÃO: Excluir permanentemente o produto ${cod}?`)) { try { await deleteDoc(doc(db, "produtos", cod)); window.carregarProdutos(); } catch(e) { alert("Erro ao excluir."); } } };

window.importarTabelaPrecos = async () => { 
    const nome = document.getElementById('nomeTabelaPreco').value.trim().toLowerCase(); 
    const file = document.getElementById('fileCsvPrecos').files[0]; 
    if(!nome || !file) return alert("Preencha o nome e selecione o arquivo!"); 
    
    const btn = document.querySelector('#sec-precos .btn-primario');
    btn.innerText = "⏳ Importando Catálogo...";
    
    const reader = new FileReader(); 
    reader.onload = async (e) => { 
        try {
            const data = new Uint8Array(e.target.result); 
            const wb = XLSX.read(data, {type: 'array'}); 
            const sheet = wb.Sheets[wb.SheetNames[0]]; 
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            
            let precos = {}; 
            let importados = 0;
            const promessasProdutos = [];
            
            for(let i = 1; i < json.length; i++) { 
                if(!json[i] || json[i].length === 0) continue;
                
                let rawCod = json[i][0];   let rawDesc = json[i][1];  let rawEng = json[i][2];   let rawPreco = json[i][3]; let rawCat = json[i][4];   
                if(rawCod === undefined || rawPreco === undefined) continue;
                
                let cod = String(rawCod).trim(); 
                let precoStr = String(rawPreco).replace(/[R$\s]/g, '').replace(',', '.');
                let precoVal = parseFloat(precoStr);
                
                if(cod && !isNaN(precoVal)) {
                    precos[cod] = precoVal;
                    let dadosProduto = { codigo: cod };
                    if (rawDesc !== undefined) dadosProduto.descricao = String(rawDesc).trim();
                    if (rawEng !== undefined) dadosProduto.engradado = String(rawEng).trim();
                    if (rawCat !== undefined) dadosProduto.categoria = String(rawCat).trim().toLowerCase();
                    promessasProdutos.push(setDoc(doc(db, "produtos", cod), dadosProduto, { merge: true }));
                    importados++;
                }
            } 
            
            if(importados === 0) { alert("Nenhum item válido. Cheque se as colunas são: A=Cód, B=Desc, C=Engrad, D=Preço, E=Cat."); return; }
            
            await setDoc(doc(db, "precos", nome), precos, { merge: true }); 
            await Promise.all(promessasProdutos);
            alert(`🚀 INCRÍVEL! ${importados} produtos processados.\nTabela ${nome.toUpperCase()} salva e Catálogo Atualizado!`); 
            
            await window.carregarTabelasPrecos(); 
            const selCat = document.getElementById('selectFiltroTabelaCat');
            if (selCat) { selCat.value = nome; window.carregarProdutos(); }
            
        } catch(err) { alert("Erro ao ler o Excel."); } finally { btn.innerText = "⚡ Importar Tabela"; document.getElementById('nomeTabelaPreco').value = ""; document.getElementById('fileCsvPrecos').value = ""; }
    }; 
    reader.readAsArrayBuffer(file); 
};

window.carregarTabelasPrecos = async () => {
    const sT = await getDocs(collection(db, "precos"));
    const selVincular = document.getElementById('selectTabelaAssociar');
    const selExcluir = document.getElementById('selectTabelaExcluir');
    const selCat = document.getElementById('selectFiltroTabelaCat');
    
    const valAtualCat = selCat ? selCat.value : "";

    if(selVincular) selVincular.innerHTML = '<option value="">Selecione a Tabela...</option>';
    if(selExcluir) selExcluir.innerHTML = '<option value="">Selecione a Tabela para EXCLUIR...</option>';
    if(selCat) selCat.innerHTML = '<option value="">📋 Apenas Catálogo (Sem Preço)</option>';
    let optionsHtml = '<option value="">(Nenhuma)</option>';

    sT.forEach(d => { 
        const opt = `<option value="${d.id}">${d.id.toUpperCase()}</option>`;
        if(selVincular) selVincular.innerHTML += opt; 
        if(selExcluir) selExcluir.innerHTML += opt;
        if(selCat) selCat.innerHTML += opt;
        optionsHtml += opt; 
    });

    if(selCat) selCat.value = valAtualCat; 
    document.querySelectorAll('.sel-tabelas-loja').forEach(sel => sel.innerHTML = optionsHtml);

    const sL = await getDocs(collection(db, "usuarios"));
    const cont = document.getElementById('listaLojasChecklist');
    if(!cont) return;
    
    cont.innerHTML = '';
    let divsLojas = [];
    sL.forEach(u => {
        if(u.id === 'admin') return;
        const d = u.data(); const fil = extrairFilial(d.cnpj);
        const txt = `[FILIAL ${fil}] ${d.nomeLoja || u.id} - ${d.cnpj || ""}`.toUpperCase();
        const tp = d.tabelasPreco || {};
        const vVenda = (tp.venda || d.tabelaPreco || '').toLowerCase();
        const vTransf = (tp.transferencia || 'tf').toLowerCase();
        const vPromo = (tp.promocao || '').toLowerCase();
        const vBalde = (tp.balde || '').toLowerCase();
        
        const div = document.createElement('div');
        div.className = 'loja-check-item';
        div.style.cssText = 'display:flex; gap:10px; padding:10px; border-bottom:1px solid #f1f5f9; align-items: center;';
        div.innerHTML = `
            <input type="checkbox" class="chk-loja" value="${u.id}" data-search="${txt}" data-tab-venda="${vVenda}" data-tab-transferencia="${vTransf}" data-tab-promocao="${vPromo}" data-tab-balde="${vBalde}" style="width:18px; height:18px; margin:0; cursor:pointer;">
            <label style="font-size:13px; margin:0; cursor:pointer; flex-grow:1; display:flex; flex-direction:column;">
                <span><b>${fil?`Filial ${fil}`:''}</b> ${d.nomeLoja || u.id}</span>
                <span style="color:var(--text-muted); font-size:11px; margin-top:4px;">
                    Venda: <b style="color:var(--primary)">${(vVenda||'N/A').toUpperCase()}</b> | Transf: <b>${(vTransf||'N/A').toUpperCase()}</b> | Promo: <b>${(vPromo||'N/A').toUpperCase()}</b> | Balde: <b>${(vBalde||'N/A').toUpperCase()}</b>
                </span>
            </label>
        `;
        divsLojas.push(div);
    });
    divsLojas.sort((a, b) => a.querySelector('input').getAttribute('data-search').localeCompare(b.querySelector('input').getAttribute('data-search')));
    divsLojas.forEach(div => cont.appendChild(div));
};

window.excluirTabelaPreco = async () => {
    const tab = document.getElementById('selectTabelaExcluir').value;
    if(!tab) return alert("Selecione uma tabela para excluir!");
    if(confirm(`🚨 ATENÇÃO: Deseja excluir a tabela ${tab.toUpperCase()}?\n\nIsso apagará todos os preços nela contidos.`)) {
        try {
            await deleteDoc(doc(db, "precos", tab));
            alert("Tabela excluída com sucesso!");
            const selCat = document.getElementById('selectFiltroTabelaCat');
            if(selCat && selCat.value === tab) selCat.value = ""; 
            await window.carregarTabelasPrecos();
            window.carregarProdutos();
        } catch(e) { alert("Erro ao excluir: " + e.message); }
    }
};

window.aoSelecionarTabela = () => {
    const tab = document.getElementById('selectTabelaAssociar').value.toLowerCase();
    const tipo = document.getElementById('tipoVinculoTabela').value; 
    const container = document.getElementById('listaLojasChecklist');
    const itens = Array.from(container.querySelectorAll('.loja-check-item'));
    itens.forEach(item => { const chk = item.querySelector('.chk-loja'); chk.checked = (chk.getAttribute(`data-tab-${tipo}`) === tab && tab !== ""); });
    itens.sort((a, b) => {
        const chkA = a.querySelector('.chk-loja'); const chkB = b.querySelector('.chk-loja');
        const aVinc = (chkA.getAttribute(`data-tab-${tipo}`) === tab && tab !== "");
        const bVinc = (chkB.getAttribute(`data-tab-${tipo}`) === tab && tab !== "");
        if (aVinc && !bVinc) return -1; if (!aVinc && bVinc) return 1;
        return chkA.getAttribute('data-search').localeCompare(chkB.getAttribute('data-search'));
    });
    itens.forEach(item => container.appendChild(item));
};

window.vincularTabelaEmMassa = async () => {
    const tab = document.getElementById('selectTabelaAssociar').value.toLowerCase();
    const tipo = document.getElementById('tipoVinculoTabela').value;
    const ids = Array.from(document.querySelectorAll('.chk-loja:checked')).map(c => c.value);
    if(!tab || !ids.length) return alert("Selecione a tabela e marque as lojas na lista!");
    const btn = document.querySelector('#sec-precos .btn-sucesso'); btn.innerText = "⏳ Aplicando...";
    try { await Promise.all(ids.map(id => setDoc(doc(db, "usuarios", id), { tabelasPreco: { [tipo]: tab } }, { merge: true }))); alert("Vínculo aplicado com sucesso!"); window.carregarLojas(); window.carregarTabelasPrecos(); } 
    finally { btn.innerText = "💾 Aplicar Tabela Selecionada"; document.getElementById('selectTabelaAssociar').value = ""; }
};

window.filtrarLojasChecklist = () => { const t = document.getElementById('buscaFilialVinculo').value.toUpperCase(); document.querySelectorAll('.loja-check-item').forEach(i => { i.style.display = i.querySelector('input').getAttribute('data-search').includes(t) ? 'flex' : 'none'; }); };
window.marcarTodosLojas = (v) => document.querySelectorAll('.chk-loja').forEach(c => { if(c.parentElement.style.display !== 'none') c.checked = v; });

window.carregarLojas = async () => {
    const snap = await getDocs(collection(db, "usuarios"));
    let html = ""; listaLojasAdmin = [];
    snap.forEach(d => {
        if(d.id === 'admin') return;
        const u = { id: d.id, ...d.data() }; listaLojasAdmin.push(u);
        const tp = u.tabelasPreco || {}; const vVenda = tp.venda || u.tabelaPreco || '-'; const vTransf = tp.transferencia || 'tf'; const vPromo = tp.promocao || '-'; const vBalde = tp.balde || '-';
        html += `<tr><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td><div style="font-size:11px; color:var(--text-muted); line-height: 1.4;">Venda: <b style="color:var(--primary)">${vVenda.toUpperCase()}</b> | Transf: <b>${vTransf.toUpperCase()}</b><br>Promo: <b>${vPromo.toUpperCase()}</b> | Balde: <b>${vBalde.toUpperCase()}</b></div></td><td style="text-align: center;"><button class="btn-small" style="background:#3b82f6; color:white;" onclick="window.abrirEdicaoLoja('${u.id}')">✏️</button></td></tr>`;
    });
    document.getElementById('corpoTabelaLojas').innerHTML = html;
};

window.abrirNovaLoja = () => { document.getElementById('lojaEditId').disabled = false; document.getElementById('lojaEditIsNew').value = 'sim'; document.querySelectorAll('#modalLoja input[type="text"], #modalLoja input[type="password"]').forEach(i => i.value = ''); document.getElementById('permVenda').checked = true; document.getElementById('permTransf').checked = true; document.getElementById('permPromo').checked = true; document.getElementById('permBalde').checked = true; document.querySelectorAll('.sel-tabelas-loja').forEach(sel => sel.value = ''); document.getElementById('modalLoja').style.display = 'flex'; };
window.abrirEdicaoLoja = (id) => { const u = listaLojasAdmin.find(x => x.id === id); if(!u) return; document.getElementById('lojaEditId').value = u.id; document.getElementById('lojaEditId').disabled = true; document.getElementById('lojaEditIsNew').value = 'nao'; document.getElementById('lojaEditNome').value = u.nomeLoja || ''; document.getElementById('lojaEditCnpj').value = u.cnpj || ''; document.getElementById('lojaEditSenha').value = ''; const p = u.planilhas || {}; document.getElementById('permVenda').checked = p.venda !== false; document.getElementById('permTransf').checked = p.transferencia !== false; document.getElementById('permPromo').checked = p.promocao !== false; document.getElementById('permBalde').checked = p.balde !== false; const tp = u.tabelasPreco || {}; document.getElementById('lojaEditTabVenda').value = tp.venda || u.tabelaPreco || ''; document.getElementById('lojaEditTabTransf').value = tp.transferencia || ''; document.getElementById('lojaEditTabPromo').value = tp.promocao || ''; document.getElementById('lojaEditTabBalde').value = tp.balde || ''; document.getElementById('modalLoja').style.display = 'flex'; };
window.salvarLoja = async () => { const id = document.getElementById('lojaEditId').value.trim(); if(!id) return alert("Preencha o Login!"); const d = { nomeLoja: document.getElementById('lojaEditNome').value, cnpj: document.getElementById('lojaEditCnpj').value, planilhas: { venda: document.getElementById('permVenda').checked, transferencia: document.getElementById('permTransf').checked, promocao: document.getElementById('permPromo').checked, balde: document.getElementById('permBalde').checked }, tabelasPreco: { venda: document.getElementById('lojaEditTabVenda').value, transferencia: document.getElementById('lojaEditTabTransf').value, promocao: document.getElementById('lojaEditTabPromo').value, balde: document.getElementById('lojaEditTabBalde').value } }; const s = document.getElementById('lojaEditSenha').value.trim(); if(s) d.senha = s; await setDoc(doc(db, "usuarios", id), d, { merge: true }); alert("Loja Salva com Sucesso!"); window.fecharModal('modalLoja'); window.carregarLojas(); window.carregarTabelasPrecos(); };
window.resetarSenhaPadrao = () => { document.getElementById('lojaEditSenha').value = '123456'; alert("Senha definida para '123456'. Clique em 'Salvar Loja' para aplicar."); };

window.gerarBackupCompleto = async () => { const btn = document.getElementById('btnGerarBackup'); btn.innerText = "⏳ Compactando..."; try { const zip = new JSZip(); const cols = ["usuarios", "produtos", "precos", "clientes", "historico"]; for(let c of cols) { const s = await getDocs(collection(db, c)); let d = []; s.forEach(doc => d.push({id: doc.id, ...doc.data()})); zip.file(`${c}.json`, JSON.stringify(d)); } const blob = await zip.generateAsync({type:"blob"}); saveAs(blob, `BACKUP_ESKIMO_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`); } catch(e) { alert(e.message); } finally { btn.innerText = "⬇️ Baixar Backup (.zip)"; } };
window.restaurarBackupCompleto = async () => { const f = document.getElementById('fileRestoreZip').files[0]; if(!f || !confirm("Isso apagará/sobrescreverá os dados atuais. Continuar?")) return; const btn = document.getElementById('btnRestaurarBackup'); btn.innerText = "⏳ Restaurando..."; try { const zip = await JSZip.loadAsync(f); for(let n in zip.files) { const c = n.replace('.json', ''); const cont = await zip.files[n].async("string"); const l = JSON.parse(cont); for(let i of l) { const id = i.id; delete i.id; await setDoc(doc(db, c, id), i, {merge: true}); } } alert("Restaurado com sucesso!"); location.reload(); } catch(e) { alert(e.message); btn.innerText = "⚡ Restaurar Dados"; } };
window.regerar = async (id) => { await regenerarPlanilhaExcel(historicoGlobal[id]); };
document.addEventListener('DOMContentLoaded', () => window.carregarDashboard());
