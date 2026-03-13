import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, getDoc, setDoc, getDocs, deleteDoc, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';
iniciarInterfaceGlobais();

let historicoGlobal = {}; 
window.listaProdutosAdmin = []; 
let listaLojasAdmin = []; 
let carregandoDash = false;
window.categoriasGlobais = [];

const DEFAULT_CATS = [
    { id: 'sorvete', nome: 'Sorvetes', icone: '🍦', abaVenda: 'SORVETE', abaTransf: 'PROD' },
    { id: 'acai', nome: 'Açaí', icone: '🍇', abaVenda: 'ACAI', abaTransf: 'ACAI' },
    { id: 'seco', nome: 'Secos', icone: '📦', abaVenda: 'SECO', abaTransf: 'SECO' },
    { id: 'balde', nome: 'Baldes', icone: '🪣', abaVenda: 'BALDE', abaTransf: 'PROD' },
    { id: 'promo', nome: 'Promoções', icone: '🌟', abaVenda: 'SORVETE', abaTransf: 'PROD' }
];

if (!document.getElementById('zoomOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'zoomOverlay';
    overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; pointer-events:none; background:rgba(255,255,255,0.9); align-items:center; justify-content:center;';
    overlay.innerHTML = '<img id="zoomImg" src="" style="width: 350px; max-width: 90vw; height: 350px; max-height: 90vh; object-fit: contain; background: white; padding: 15px; border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.3);">';
    document.body.appendChild(overlay);
}
window.mostrarZoom = (imgSrc) => { if(!imgSrc) return; document.getElementById('zoomImg').src = imgSrc; document.getElementById('zoomOverlay').style.display = 'flex'; };
window.esconderZoom = () => { document.getElementById('zoomOverlay').style.display = 'none'; };

function extrairFilial(cnpj) {
    const match = cnpj.match(/\/(\d{4})/); return match ? parseInt(match[1], 10) : "";
}

window.mudarSecao = async (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id)?.classList.add('active');
    
    if(id === 'dashboard') window.carregarDashboard();
    if(id === 'categorias') window.renderizarCategorias();
    if(id === 'produtos') { await window.carregarTabelasPrecos(); await window.carregarProdutos(); } 
    if(id === 'precos') window.carregarTabelasPrecos();
    if(id === 'lojas') window.carregarLojas();
};

window.toggleTabelaHistorico = () => { const w = document.getElementById('wrapperHistorico'); const b = document.getElementById('btnToggleHist'); const isH = w.style.display === 'none'; w.style.display = isH ? 'block' : 'none'; b.innerText = isH ? '👁️ Esconder' : '👁️ Mostrar'; };
window.filtrarLogDash = () => { const t = document.getElementById('pesquisaLogAdmin').value.toLowerCase(); document.querySelectorAll('.linha-hist-admin').forEach(i => { i.style.display = i.innerText.toLowerCase().includes(t) ? '' : 'none'; }); };

window.carregarCategoriasBase = async () => {
    try {
        const snap = await getDoc(doc(db, "usuarios", "admin"));
        if(snap.exists() && snap.data().categorias) {
            window.categoriasGlobais = snap.data().categorias;
        } else {
            window.categoriasGlobais = DEFAULT_CATS;
        }
    } catch(e) {
        window.categoriasGlobais = DEFAULT_CATS;
    }
    
    let tabsHtml = ''; let tablesHtml = ''; let selectHtml = '<option value="">Selecione...</option>';
    
    window.categoriasGlobais.forEach((c, idx) => {
        let act = idx === 0 ? 'active' : '';
        let dis = idx === 0 ? 'block' : 'none';
        
        tabsHtml += `<button class="admin-cat-tab ${act}" id="btnAdminTab_${c.id}" onclick="window.mudarAbaAdminCat('${c.id}')" style="padding: 10px 20px; border: none; background: ${idx===0?'white':'transparent'}; border-radius: 8px; cursor: pointer; font-weight: bold; color: ${idx===0?'var(--primary)':'#64748b'}; box-shadow: ${idx===0?'var(--shadow-sm)':'none'};">${c.icone} ${c.nome}</button>`;
        
        tablesHtml += `
        <div id="content_admin_${c.id}" class="admin-cat-content" style="display: ${dis};">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;"><tr><th style="width: 60px; text-align: center;">Foto</th><th style="width: 100px; text-align: left;">Cód</th><th style="text-align: left;">Descrição</th><th style="width: 80px; text-align: center;">Engr.</th><th class="thPrecoCat" style="display: none; color: var(--primary); text-align: center; width: 120px;">Preço</th><th style="width: 100px; text-align: center;">Ações</th></tr></thead>
                <tbody id="corpoAdmin_${c.id}"></tbody>
            </table>
        </div>`;
        
        selectHtml += `<option value="${c.id}">${c.icone} ${c.nome}</option>`;
    });
    
    if(document.getElementById('containerTabsAdmin')) document.getElementById('containerTabsAdmin').innerHTML = tabsHtml;
    if(document.getElementById('containerTabelasAdmin')) document.getElementById('containerTabelasAdmin').innerHTML = tablesHtml;
    if(document.getElementById('prodEditCategoria')) document.getElementById('prodEditCategoria').innerHTML = selectHtml;
};

window.renderizarCategorias = () => {
    let html = "";
    window.categoriasGlobais.forEach(c => {
        html += `<tr>
            <td style="text-align:center; font-size:20px;">${c.icone}</td>
            <td><b>${c.nome}</b></td>
            <td>${c.abaVenda}</td>
            <td>${c.abaTransf}</td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                    <button class="btn-small" style="background:#3b82f6; color:white; margin:0;" onclick="window.abrirEdicaoCategoria('${c.id}')">✏️</button>
                    <button class="btn-small" style="background:#ef4444; color:white; margin:0;" onclick="window.excluirCategoria('${c.id}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    });
    document.getElementById('corpoTabelaCategorias').innerHTML = html;
};

window.abrirNovaCategoria = () => {
    document.getElementById('catEditId').value = '';
    document.getElementById('catEditNome').value = '';
    document.getElementById('catEditIcone').value = '';
    document.getElementById('catEditVenda').value = '';
    document.getElementById('catEditTransf').value = '';
    document.getElementById('modalCategoria').style.display = 'flex';
};

window.abrirEdicaoCategoria = (id) => {
    const c = window.categoriasGlobais.find(x => x.id === id); if(!c) return;
    document.getElementById('catEditId').value = c.id;
    document.getElementById('catEditNome').value = c.nome;
    document.getElementById('catEditIcone').value = c.icone;
    document.getElementById('catEditVenda').value = c.abaVenda;
    document.getElementById('catEditTransf').value = c.abaTransf;
    document.getElementById('modalCategoria').style.display = 'flex';
};

window.salvarCategoria = async () => {
    let id = document.getElementById('catEditId').value.trim();
    let nome = document.getElementById('catEditNome').value.trim();
    let icone = document.getElementById('catEditIcone').value.trim() || '📦';
    let abaVenda = document.getElementById('catEditVenda').value.trim().toUpperCase();
    let abaTransf = document.getElementById('catEditTransf').value.trim().toUpperCase();

    if(!nome || !abaVenda) return alert("Nome e Aba Venda são obrigatórios.");
    if(!id) id = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    let novaLista = [...window.categoriasGlobais];
    let idx = novaLista.findIndex(c => c.id === id);
    let obj = { id, nome, icone, abaVenda, abaTransf };
    
    if(idx >= 0) novaLista[idx] = obj; else novaLista.push(obj);

    try {
        const btn = document.getElementById('btnSalvarCat');
        if(btn) btn.innerText = "⏳...";
        await setDoc(doc(db, "usuarios", "admin"), { categorias: novaLista }, { merge: true });
        alert("Categoria salva com sucesso!");
        location.reload(); 
    } catch(e) { 
        alert("Erro: " + e.message); 
        const btn = document.getElementById('btnSalvarCat');
        if(btn) btn.innerText = "💾 Salvar Categoria"; 
    }
};

window.excluirCategoria = async (id) => {
    if(confirm("🚨 ATENÇÃO: Excluir esta categoria fará com que os produtos vinculados a ela não apareçam nas telas de vendas até serem movidos. Confirmar?")) {
        let novaLista = window.categoriasGlobais.filter(c => c.id !== id);
        await setDoc(doc(db, "usuarios", "admin"), { categorias: novaLista }, { merge: true });
        location.reload();
    }
};

window.mudarAbaAdminCat = (idCat) => {
    document.querySelectorAll('.admin-cat-tab').forEach(b => { b.style.background = 'transparent'; b.style.color = '#64748b'; b.style.boxShadow = 'none'; b.classList.remove('active'); });
    document.querySelectorAll('.admin-cat-content').forEach(c => c.style.display = 'none');
    const btn = document.getElementById('btnAdminTab_' + idCat);
    if(btn) { btn.style.background = 'white'; btn.style.color = 'var(--primary)'; btn.style.boxShadow = 'var(--shadow-sm)'; btn.classList.add('active');}
    const content = document.getElementById('content_admin_' + idCat);
    if(content) content.style.display = 'block';
    
    document.getElementById('buscaCatalogoAdmin').value = "";
    window.filtrarCatalogo();
};

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
            if(ok) { 
                cont++; historicoGlobal[d.id] = data; 
                html += `<tr class="linha-hist-admin">
                    <td>${ts.toLocaleString('pt-BR')}</td>
                    <td><b>${data.nomeLoja || data.lojaId}</b></td>
                    <td style="color:${data.acao.includes('Venda')?'#10b981':'#3b82f6'}; font-weight:600;">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td style="display: flex; gap: 8px; justify-content: center;">
                        <button class="btn-small" style="background:#f1f5f9; border: 1px solid #cbd5e1;" onclick="window.visualizarLog('${d.id}')" title="Visualizar">👁️</button>
                        <button class="btn-small" style="background:#10b981; color:white;" onclick="window.regerar('${d.id}')" title="Baixar Excel">⬇️</button>
                        <button class="btn-small" style="background:#ef4444; color:white;" onclick="window.excluirHistorico('${d.id}')" title="Excluir Histórico">🗑️</button>
                    </td>
                </tr>`; 
            }
        });
        document.getElementById('corpoTabelaHistorico').innerHTML = html; document.getElementById('dashPlanilhas').innerText = cont;
    } finally { carregandoDash = false; }
};

window.visualizarLog = (id) => {
    const log = historicoGlobal[id]; if(!log) return;
    let html = `<div style="margin-bottom: 15px;"><b>Data:</b> ${log.dataHora?.toDate ? log.dataHora.toDate().toLocaleString('pt-BR') : 'N/A'}<br><b>Loja:</b> ${log.nomeLoja || log.lojaId}<br><b>Ação:</b> ${log.acao}<br><b>Destino:</b> ${log.destino || log.dadosPlanilha?.razao || '-'}</div>`;
    if(log.dadosPlanilha && log.dadosPlanilha.itens && log.dadosPlanilha.itens.length > 0) {
        html += `<table style="width:100%; border-collapse:collapse;"><thead style="background:#e2e8f0;"><tr><th style="padding:8px; text-align:left;">Cód</th><th style="padding:8px; text-align:left;">Desc</th><th style="padding:8px; text-align:center;">Qtd</th><th style="padding:8px; text-align:right;">Subtotal</th></tr></thead><tbody>`;
        log.dadosPlanilha.itens.forEach(i => { html += `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:8px;">${i.codigo}</td><td style="padding:8px;">${i.descricao}</td><td style="padding:8px; text-align:center;">${i.calcTotalUnidades}</td><td style="padding:8px; text-align:right; color:var(--primary); font-weight:600;">R$ ${(i.calcSubtotal||0).toFixed(2)}</td></tr>`; });
        html += `</tbody></table>`;
        if(log.dadosPlanilha.totalV) html += `<div style="text-align:right; margin-top:15px; font-size:18px;">Total Líquido: <b style="color:var(--primary);">R$ ${log.dadosPlanilha.totalV.toFixed(2)}</b></div>`;
    } else { html += `<div style="padding:15px; background:#f1f5f9; text-align:center;">Sem itens detalhados.</div>`; }
    document.getElementById('conteudoDetalhesLog').innerHTML = html; document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regerar(id); document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.previewImagemURL = () => {
    const url = document.getElementById('prodEditImagemUrl').value.trim();
    const pv = document.getElementById('previewFoto');
    if (url) { pv.src = url; pv.style.display = 'block'; } else { pv.style.display = 'none'; }
};

window.filtrarCatalogo = () => {
    const termo = document.getElementById('buscaCatalogoAdmin').value.toLowerCase();
    document.querySelectorAll('.linha-produto-admin').forEach(tr => {
        const busca = tr.getAttribute('data-search') || '';
        if(busca.includes(termo)) { tr.style.display = ''; } else { tr.style.display = 'none'; }
    });
};

window.carregarProdutos = async () => {
    const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
    document.querySelectorAll('.thPrecoCat').forEach(th => {
        if (tabelaSelecionada) { th.innerText = `Preço (${tabelaSelecionada.toUpperCase()})`; th.style.display = 'table-cell'; } 
        else { th.style.display = 'none'; }
    });

    const [snapPrecos, snapProd] = await Promise.all([
        tabelaSelecionada ? getDoc(doc(db, "precos", tabelaSelecionada)) : Promise.resolve({exists:()=>false}),
        getDocs(collection(db, "produtos"))
    ]);

    let precosTabela = snapPrecos.exists() ? snapPrecos.data() : {};
    
    let htmlBuffers = {};
    window.categoriasGlobais.forEach(c => htmlBuffers[c.id] = '');
    
    window.listaProdutosAdmin = [];
    
    snapProd.forEach(d => {
        const p = { id: d.id, ...d.data() }; 
        if (tabelaSelecionada) p.precoAtual = precosTabela[p.codigo] !== undefined ? precosTabela[p.codigo] : null;
        window.listaProdutosAdmin.push(p);
        
        let cat = p.categoria || window.categoriasGlobais[0].id;
        if(htmlBuffers[cat] === undefined) cat = window.categoriasGlobais[0].id;

        let htmlPreco = '';
        if (tabelaSelecionada) {
            const val = p.precoAtual !== null ? `R$ ${parseFloat(p.precoAtual).toFixed(2)}` : '<span style="color:#ef4444;font-size:12px;">Sem Preço</span>';
            htmlPreco = `<td style="font-weight:900; color:var(--primary); font-size:15px; text-align: center;">${val}</td>`;
        }
        
        let hasImg = (p.imagem && p.imagem.trim() !== "");
        let imgHtml = hasImg 
            ? `<img src="${p.imagem}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; cursor: zoom-in;" loading="lazy" onmouseenter="window.mostrarZoom('${p.imagem}')" onmouseleave="window.esconderZoom()">`
            : `<div style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; font-size:20px; border-radius:6px; border: 1px solid #e2e8f0; cursor: default;">📦</div>`;

        htmlBuffers[cat] += `<tr class="linha-produto-admin" data-search="${String(p.codigo).toLowerCase()} ${String(p.descricao).toLowerCase()}">
            <td style="text-align: center;">${imgHtml}</td>
            <td><b>${p.codigo}</b></td>
            <td>${p.descricao}</td>
            <td style="text-align: center;">${p.engradado}</td>
            ${htmlPreco}
            <td>
                <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
                    <button class="btn-small" style="background:#3b82f6; color:white; margin:0;" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button>
                    <button class="btn-small" style="background:#ef4444; color:white; margin:0;" onclick="window.excluirProduto('${p.codigo}')">🗑️</button>
                </div>
            </td>
        </tr>`;
    });

    window.categoriasGlobais.forEach(c => {
        let el = document.getElementById('corpoAdmin_' + c.id);
        if(el) el.innerHTML = htmlBuffers[c.id] || '<tr><td colspan="6" style="text-align:center;">Nenhum produto nesta categoria.</td></tr>';
    });
    
    window.filtrarCatalogo();
};

window.abrirEdicaoProduto = (cod) => { 
    const p = window.listaProdutosAdmin.find(x => x.codigo === cod); if(!p) return; 
    document.getElementById('prodEditCodigo').value = p.codigo; document.getElementById('prodEditCodigo').disabled = true; document.getElementById('prodEditDescricao').value = p.descricao || ''; document.getElementById('prodEditCategoria').value = p.categoria || window.categoriasGlobais[0].id; document.getElementById('prodEditEngradado').value = p.engradado || ''; document.getElementById('prodEditImagemUrl').value = p.imagem || ''; 
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
    document.getElementById('previewFoto').style.display = 'none'; document.getElementById('prodEditImagemUrl').value = ''; document.getElementById('modalProduto').style.display = 'flex'; 
};

window.salvarProduto = async () => {
    const cod = document.getElementById('prodEditCodigo').value.trim(); if(!cod) return alert("Código obrigatório!");
    const btn = document.getElementById('btnSalvarProd'); btn.disabled = true; btn.innerText = "⏳ Salvando...";
    try {
        let url = document.getElementById('prodEditImagemUrl').value.trim();
        await setDoc(doc(db, "produtos", cod), { codigo: cod, descricao: document.getElementById('prodEditDescricao').value, categoria: document.getElementById('prodEditCategoria').value, engradado: document.getElementById('prodEditEngradado').value, imagem: url }, { merge: true });
        const tabelaSelecionada = document.getElementById('selectFiltroTabelaCat').value;
        if (tabelaSelecionada) { const precoVal = document.getElementById('prodEditPreco').value; if (precoVal !== "") await setDoc(doc(db, "precos", tabelaSelecionada), { [cod]: parseFloat(precoVal) }, { merge: true }); }
        window.fecharModal('modalProduto'); window.carregarProdutos();
    } catch (e) { alert("Erro ao salvar: " + e.message); } finally { btn.disabled = false; btn.innerText = "Salvar Produto"; }
};

window.excluirProduto = async (cod) => { if(confirm(`ATENÇÃO: Excluir permanentemente o produto ${cod}?`)) { try { await deleteDoc(doc(db, "produtos", cod)); window.carregarProdutos(); } catch(e) { alert("Erro ao excluir."); } } };

window.importarTabelaPrecos = async () => { 
    const nome = document.getElementById('nomeTabelaPreco').value.trim().toLowerCase(); const file = document.getElementById('fileCsvPrecos').files[0]; 
    if(!nome || !file) return alert("Preencha o nome e selecione o arquivo!"); 
    const btn = document.querySelector('#sec-precos .btn-primario'); btn.innerText = "⏳ Importando Catálogo...";
    const reader = new FileReader(); 
    reader.onload = async (e) => { 
        try {
            const data = new Uint8Array(e.target.result); const wb = XLSX.read(data, {type: 'array'}); const sheet = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json(sheet, {header: 1}); 
            let precos = {}; let importados = 0; const promessasProdutos = [];
            
            for(let i = 1; i < json.length; i++) { 
                if(!json[i] || json[i].length === 0) continue;
                let rawCod = json[i][0]; let rawDesc = json[i][1]; let rawEng = json[i][2]; let rawPreco = json[i][3]; let rawCat = json[i][4];   
                
                if(rawCod === undefined || rawPreco === undefined) continue;
                
                let cod = String(rawCod).trim(); 
                let precoStr = String(rawPreco).replace(/[R$\s]/g, '').replace(',', '.'); 
                let precoVal = parseFloat(precoStr);
                
                if(cod && !isNaN(precoVal)) {
                    precos[cod] = precoVal;
                    
                    let dadosProduto = { codigo: cod };
                    let atualizarProd = false;

                    if (rawDesc !== undefined && String(rawDesc).trim() !== "") { dadosProduto.descricao = String(rawDesc).trim(); atualizarProd = true; }
                    if (rawEng !== undefined && String(rawEng).trim() !== "") { dadosProduto.engradado = String(rawEng).trim(); atualizarProd = true; }
                    if (rawCat !== undefined && String(rawCat).trim() !== "") { dadosProduto.categoria = String(rawCat).trim().toLowerCase(); atualizarProd = true; }
                    
                    if(atualizarProd) {
                        promessasProdutos.push(setDoc(doc(db, "produtos", cod), dadosProduto, { merge: true }));
                    }
                    importados++;
                }
            } 
            if(importados === 0) { alert("Nenhum item válido. Cheque se as colunas são: A=Cód, B=Desc, C=Engrad, D=Preço, E=Cat."); return; }
            await setDoc(doc(db, "precos", nome), precos, { merge: true }); 
            if(promessasProdutos.length > 0) await Promise.all(promessasProdutos);
            
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
    sT.forEach(d => { const opt = `<option value="${d.id}">${d.id.toUpperCase()}</option>`; if(selVincular) selVincular.innerHTML += opt; if(selExcluir) selExcluir.innerHTML += opt; if(selCat) selCat.innerHTML += opt; optionsHtml += opt; });
    if(selCat) selCat.value = valAtualCat; document.querySelectorAll('.sel-tabelas-loja').forEach(sel => sel.innerHTML = optionsHtml);
    const sL = await getDocs(collection(db, "usuarios")); const cont = document.getElementById('listaLojasChecklist'); if(!cont) return;
    cont.innerHTML = ''; let divsLojas = [];
    sL.forEach(u => {
        if(u.id === 'admin') return; const d = u.data(); const fil = extrairFilial(d.cnpj); const txt = `[FILIAL ${fil}] ${d.nomeLoja || u.id} - ${d.cnpj || ""}`.toUpperCase(); const tp = d.tabelasPreco || {}; const vVenda = (tp.venda || d.tabelaPreco || '').toLowerCase(); const vTransf = (tp.transferencia || 'tf').toLowerCase(); const vPromo = (tp.promocao || '').toLowerCase(); const vBalde = (tp.balde || '').toLowerCase();
        const div = document.createElement('div'); div.className = 'loja-check-item'; div.style.cssText = 'display:flex; gap:10px; padding:10px; border-bottom:1px solid #f1f5f9; align-items: center;';
        div.innerHTML = `<input type="checkbox" class="chk-loja" value="${u.id}" data-search="${txt}" data-tab-venda="${vVenda}" data-tab-transferencia="${vTransf}" data-tab-promocao="${vPromo}" data-tab-balde="${vBalde}" style="width:18px; height:18px; margin:0; cursor:pointer;"><label style="font-size:13px; margin:0; cursor:pointer; flex-grow:1; display:flex; flex-direction:column;"><span><b>${fil?`Filial ${fil}`:''}</b> ${d.nomeLoja || u.id}</span><span style="color:var(--text-muted); font-size:11px; margin-top:4px;">Venda: <b style="color:var(--primary)">${(vVenda||'N/A').toUpperCase()}</b> | Transf: <b>${(vTransf||'N/A').toUpperCase()}</b> | Promo: <b>${(vPromo||'N/A').toUpperCase()}</b> | Balde: <b>${(vBalde||'N/A').toUpperCase()}</b></span></label>`;
        divsLojas.push(div);
    });
    divsLojas.sort((a, b) => a.querySelector('input').getAttribute('data-search').localeCompare(b.querySelector('input').getAttribute('data-search')));
    divsLojas.forEach(div => cont.appendChild(div));
};

window.excluirTabelaPreco = async () => {
    const tab = document.getElementById('selectTabelaExcluir').value; if(!tab) return alert("Selecione uma tabela para excluir!");
    if(confirm(`🚨 ATENÇÃO: Deseja excluir a tabela ${tab.toUpperCase()}?\n\nIsso apagará todos os preços nela contidos.`)) { try { await deleteDoc(doc(db, "precos", tab)); alert("Tabela excluída com sucesso!"); const selCat = document.getElementById('selectFiltroTabelaCat'); if(selCat && selCat.value === tab) selCat.value = ""; await window.carregarTabelasPrecos(); window.carregarProdutos(); } catch(e) { alert("Erro ao excluir: " + e.message); } }
};

window.aoSelecionarTabela = () => { const tab = document.getElementById('selectTabelaAssociar').value.toLowerCase(); const tipo = document.getElementById('tipoVinculoTabela').value; const container = document.getElementById('listaLojasChecklist'); const itens = Array.from(container.querySelectorAll('.loja-check-item')); itens.forEach(item => { const chk = item.querySelector('.chk-loja'); chk.checked = (chk.getAttribute(`data-tab-${tipo}`) === tab && tab !== ""); }); itens.sort((a, b) => { const chkA = a.querySelector('.chk-loja'); const chkB = b.querySelector('.chk-loja'); const aVinc = (chkA.getAttribute(`data-tab-${tipo}`) === tab && tab !== ""); const bVinc = (chkB.getAttribute(`data-tab-${tipo}`) === tab && tab !== ""); if (aVinc && !bVinc) return -1; if (!aVinc && bVinc) return 1; return chkA.getAttribute('data-search').localeCompare(chkB.getAttribute('data-search')); }); itens.forEach(item => container.appendChild(item)); };

window.vincularTabelaEmMassa = async () => { const tab = document.getElementById('selectTabelaAssociar').value.toLowerCase(); const tipo = document.getElementById('tipoVinculoTabela').value; const ids = Array.from(document.querySelectorAll('.chk-loja:checked')).map(c => c.value); if(!tab || !ids.length) return alert("Selecione a tabela e marque as lojas na lista!"); const btn = document.querySelector('#sec-precos .btn-sucesso'); btn.innerText = "⏳ Aplicando..."; try { await Promise.all(ids.map(id => setDoc(doc(db, "usuarios", id), { tabelasPreco: { [tipo]: tab } }, { merge: true }))); alert("Vínculo aplicado com sucesso!"); window.carregarLojas(); window.carregarTabelasPrecos(); } finally { btn.innerText = "💾 Aplicar Tabela Selecionada"; document.getElementById('selectTabelaAssociar').value = ""; } };
window.filtrarLojasChecklist = () => { const t = document.getElementById('buscaFilialVinculo').value.toUpperCase(); document.querySelectorAll('.loja-check-item').forEach(i => { i.style.display = i.querySelector('input').getAttribute('data-search').includes(t) ? 'flex' : 'none'; }); };
window.marcarTodosLojas = (v) => document.querySelectorAll('.chk-loja').forEach(c => { if(c.parentElement.style.display !== 'none') c.checked = v; });

window.filtrarGestaoLojas = () => { const t = document.getElementById('buscaGestaoLojas').value.toLowerCase(); document.querySelectorAll('.linha-gestao-loja').forEach(i => { i.style.display = i.getAttribute('data-search').includes(t) ? '' : 'none'; }); };

window.carregarLojas = async () => {
    const snap = await getDocs(collection(db, "usuarios")); let html = ""; listaLojasAdmin = [];
    snap.forEach(d => {
        if(d.id === 'admin') return; const u = { id: d.id, ...d.data() }; listaLojasAdmin.push(u); const tp = u.tabelasPreco || {}; const vVenda = tp.venda || u.tabelaPreco || '-'; const vTransf = tp.transferencia || 'tf'; const vPromo = tp.promocao || '-'; const vBalde = tp.balde || '-'; const fil = extrairFilial(u.cnpj);
        html += `<tr class="linha-gestao-loja" data-search="${d.id.toLowerCase()} filial ${fil} ${(u.nomeLoja||'').toLowerCase()} ${(u.cnpj||'').toLowerCase()}"><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td><div style="font-size:11px; color:var(--text-muted); line-height: 1.4;">Venda: <b style="color:var(--primary)">${vVenda.toUpperCase()}</b> | Transf: <b>${vTransf.toUpperCase()}</b><br>Promo: <b>${vPromo.toUpperCase()}</b> | Balde: <b>${vBalde.toUpperCase()}</b></div></td><td style="text-align: center;"><button class="btn-small" style="background:#3b82f6; color:white;" onclick="window.abrirEdicaoLoja('${u.id}')">✏️</button></td></tr>`;
    });
    document.getElementById('corpoTabelaLojas').innerHTML = html;
};

// ==========================================
// RENAME LOGIN FUNCTIONALITY (O Truque da Troca de ID)
// ==========================================
window.abrirNovaLoja = () => { 
    document.getElementById('lojaEditId').disabled = false; 
    document.getElementById('lojaEditIsNew').value = 'sim'; 
    document.getElementById('lojaEditOriginalId').value = ''; 
    document.querySelectorAll('#modalLoja input[type="text"], #modalLoja input[type="password"], #modalLoja input[type="number"]').forEach(i => i.value = ''); 
    
    let descHtml = ''; let permHtml = '';
    window.categoriasGlobais.forEach(c => {
        descHtml += `<div><label style="color:#b91c1c;">${c.nome} (%)</label><input type="number" id="descMax_${c.id}" placeholder="Livre"></div>`;
        permHtml += `<label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" id="perm_${c.id}" style="width:18px;height:18px;margin:0;" checked> ${c.nome}</label>`;
    });
    document.getElementById('containerLojaDescontos').innerHTML = descHtml;
    document.getElementById('containerLojaPermissoes').innerHTML = permHtml;
    document.querySelectorAll('.sel-tabelas-loja').forEach(sel => sel.value = ''); 
    document.getElementById('modalLoja').style.display = 'flex'; 
};

window.abrirEdicaoLoja = (id) => { 
    const u = listaLojasAdmin.find(x => x.id === id); if(!u) return; 
    document.getElementById('lojaEditId').value = u.id; 
    document.getElementById('lojaEditId').disabled = false; // Agora permite editar o Login!
    document.getElementById('lojaEditOriginalId').value = u.id; // Salva o ID original escondido
    document.getElementById('lojaEditIsNew').value = 'nao'; 
    document.getElementById('lojaEditNome').value = u.nomeLoja || ''; 
    document.getElementById('lojaEditCnpj').value = u.cnpj || ''; 
    document.getElementById('lojaEditSenha').value = ''; 
    
    const p = u.planilhas || {}; 
    const dmax = u.descontosMax || {}; 
    
    let descHtml = ''; let permHtml = '';
    window.categoriasGlobais.forEach(c => {
        let vDesc = dmax[c.id] !== undefined ? dmax[c.id] : '';
        descHtml += `<div><label style="color:#b91c1c;">${c.nome} (%)</label><input type="number" id="descMax_${c.id}" placeholder="Livre" value="${vDesc}"></div>`;
        let isChecked = p[c.id] !== false ? 'checked' : '';
        permHtml += `<label style="display:flex; align-items:center; gap:10px;"><input type="checkbox" id="perm_${c.id}" style="width:18px;height:18px;margin:0;" ${isChecked}> ${c.nome}</label>`;
    });
    document.getElementById('containerLojaDescontos').innerHTML = descHtml;
    document.getElementById('containerLojaPermissoes').innerHTML = permHtml;

    const tp = u.tabelasPreco || {}; document.getElementById('lojaEditTabVenda').value = tp.venda || u.tabelaPreco || ''; document.getElementById('lojaEditTabTransf').value = tp.transferencia || ''; document.getElementById('lojaEditTabPromo').value = tp.promocao || ''; document.getElementById('lojaEditTabBalde').value = tp.balde || ''; 
    
    document.getElementById('modalLoja').style.display = 'flex'; 
};

window.salvarLoja = async () => { 
    const novoId = document.getElementById('lojaEditId').value.trim().toLowerCase(); 
    const idOriginal = document.getElementById('lojaEditOriginalId').value;
    
    if(!novoId) return alert("Preencha o Login!"); 
    if(novoId === 'admin') return alert("Você não pode usar o login 'admin'.");
    
    let planilhas = {}; let descontosMax = {};
    window.categoriasGlobais.forEach(c => {
        let permCheck = document.getElementById('perm_' + c.id);
        if(permCheck) planilhas[c.id] = permCheck.checked;
        
        let descVal = document.getElementById('descMax_' + c.id).value;
        descontosMax[c.id] = descVal === "" ? "" : parseFloat(descVal);
    });

    const d = { 
        nomeLoja: document.getElementById('lojaEditNome').value, 
        cnpj: document.getElementById('lojaEditCnpj').value, 
        planilhas: planilhas, 
        tabelasPreco: { venda: document.getElementById('lojaEditTabVenda').value, transferencia: document.getElementById('lojaEditTabTransf').value, promocao: document.getElementById('lojaEditTabPromo').value, balde: document.getElementById('lojaEditTabBalde').value },
        descontosMax: descontosMax
    }; 
    
    const s = document.getElementById('lojaEditSenha').value.trim(); 
    if(s) { 
        d.senha = s; 
        if(s === '123456') d.precisaTrocarSenha = true; 
    } else if (idOriginal && idOriginal !== novoId) {
        // Se mudou o login mas não digitou senha, temos que puxar a senha antiga para o login novo não ficar sem senha!
        const dadosAntigos = listaLojasAdmin.find(x => x.id === idOriginal);
        if (dadosAntigos && dadosAntigos.senha) d.senha = dadosAntigos.senha;
        if (dadosAntigos && dadosAntigos.precisaTrocarSenha !== undefined) d.precisaTrocarSenha = dadosAntigos.precisaTrocarSenha;
    }
    
    const btn = document.getElementById('btnSalvarLoj');
    btn.innerText = "⏳..."; btn.disabled = true;

    try {
        if (idOriginal && idOriginal !== novoId) {
            // VERIFICA SE O NOVO NOME JÁ ESTÁ EM USO POR OUTRA LOJA
            const check = await getDoc(doc(db, "usuarios", novoId));
            if (check.exists()) {
                alert("Este login já está sendo usado por outra loja!");
                btn.innerText = "💾 Salvar Loja"; btn.disabled = false;
                return;
            }
            
            // O TRUQUE: Salva com o novo ID e deleta o antigo
            await setDoc(doc(db, "usuarios", novoId), d, { merge: true }); 
            await deleteDoc(doc(db, "usuarios", idOriginal));
        } else {
            // Apenas atualizando ou criando uma loja nova normalmente
            await setDoc(doc(db, "usuarios", novoId), d, { merge: true }); 
        }

        alert("Loja Salva com Sucesso!"); 
        window.fecharModal('modalLoja'); 
        window.carregarLojas(); 
        window.carregarTabelasPrecos(); 
    } catch (e) {
        alert("Erro ao salvar: " + e.message);
    } finally {
        btn.innerText = "💾 Salvar Loja"; btn.disabled = false;
    }
};

window.resetarSenhaPadrao = () => { document.getElementById('lojaEditSenha').value = '123456'; alert("Senha definida para '123456'. Clique em 'Salvar Loja' para aplicar."); };

window.importarLojasMassa = async () => {
    const file = document.getElementById('fileCsvLojas').files[0];
    if(!file) return alert("Selecione um arquivo Excel ou CSV!");
    const btn = document.getElementById('btnImportarLojas');
    btn.innerText = "⏳ Importando...";
    btn.disabled = true;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, {header: 1});

            let importados = 0;
            const promessasLojas = [];

            let defaultPerms = {};
            let defaultDescontos = {};
            window.categoriasGlobais.forEach(c => {
                defaultPerms[c.id] = true;
                defaultDescontos[c.id] = ""; 
            });

            for(let i = 1; i < json.length; i++) { 
                if(!json[i] || json[i].length === 0) continue;
                let rawNome = json[i][0];
                let rawCnpj = json[i][1];

                if(rawNome === undefined || String(rawNome).trim() === "") continue;

                let nomeLoja = String(rawNome).trim();
                
                let baseName = nomeLoja.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                baseName = baseName.replace(/\b(eskimo|atacado|sorvetes|sorvete|distribuidora|loja|de|do|da|e|-)\b/g, " ");
                let id = baseName.replace(/[^a-z0-9]/g, ""); 
                if(!id) id = "loja" + Math.floor(Math.random() * 10000);

                let cnpj = rawCnpj !== undefined ? String(rawCnpj).trim() : "";

                let dadosLoja = {
                    nomeLoja: nomeLoja,
                    cnpj: cnpj,
                    senha: "123456",
                    precisaTrocarSenha: true,
                    planilhas: defaultPerms,
                    tabelasPreco: { venda: "", transferencia: "", promocao: "", balde: "" },
                    descontosMax: defaultDescontos
                };

                promessasLojas.push(setDoc(doc(db, "usuarios", id), dadosLoja, { merge: true }));
                importados++;
            }

            if(importados === 0) {
                alert("Nenhuma loja válida encontrada. Verifique se a Coluna A é o Nome e a B é o CNPJ.");
                return;
            }

            await Promise.all(promessasLojas);
            alert(`✅ Sucesso! ${importados} lojas criadas com senha 123456 e bloqueio de primeiro acesso ativado.`);
            document.getElementById('fileCsvLojas').value = "";
            window.carregarLojas();

        } catch(err) {
            alert("Erro ao ler o arquivo: " + err.message);
        } finally {
            btn.innerText = "📥 Enviar Lojas";
            btn.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
};

window.gerarBackupCompleto = async () => { const btn = document.getElementById('btnGerarBackup'); btn.innerText = "⏳ Compactando..."; try { const zip = new JSZip(); const cols = ["usuarios", "produtos", "precos", "clientes", "historico", "configuracoes"]; for(let c of cols) { const s = await getDocs(collection(db, c)); let d = []; s.forEach(doc => d.push({id: doc.id, ...doc.data()})); zip.file(`${c}.json`, JSON.stringify(d)); } const blob = await zip.generateAsync({type:"blob"}); saveAs(blob, `BACKUP_ESKIMO_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`); } catch(e) { alert(e.message); } finally { btn.innerText = "⬇️ Baixar Backup (.zip)"; } };
window.restaurarBackupCompleto = async () => { const f = document.getElementById('fileRestoreZip').files[0]; if(!f || !confirm("Isso apagará/sobrescreverá os dados atuais. Continuar?")) return; const btn = document.getElementById('btnRestaurarBackup'); btn.innerText = "⏳ Restaurando..."; try { const zip = await JSZip.loadAsync(f); for(let n in zip.files) { const c = n.replace('.json', ''); const cont = await zip.files[n].async("string"); const l = JSON.parse(cont); for(let i of l) { const id = i.id; delete i.id; await setDoc(doc(db, c, id), i, {merge: true}); } } alert("Restaurado com sucesso!"); location.reload(); } catch(e) { alert(e.message); btn.innerText = "⚡ Restaurar Dados"; } };
window.regerar = async (id) => { await regenerarPlanilhaExcel(historicoGlobal[id]); };

window.carregarTudoAdmin = async () => {
    await window.carregarCategoriasBase();
    window.carregarDashboard();
};
document.addEventListener('DOMContentLoaded', () => window.carregarTudoAdmin());
