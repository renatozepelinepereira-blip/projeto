import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { doc, getDoc, getDocs, setDoc, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let clientesSalvos = [];
window.categoriasGlobais = [];
window.categoriasPermitidas = [];
window.descontosMaxGlobais = {};
window.resumoGlobal = { totalV: 0, qtdTotal: 0, descontos: {} };

const DEFAULT_CATS = [
    { id: 'sorvete', nome: 'Sorvetes', icone: '🍦', abaVenda: 'SORVETE', abaTransf: 'PROD' },
    { id: 'acai', nome: 'Açaí', icone: '🍇', abaVenda: 'ACAI', abaTransf: 'ACAI' },
    { id: 'seco', nome: 'Secos', icone: '📦', abaVenda: 'SECO', abaTransf: 'SECO' },
    { id: 'balde', nome: 'Baldes', icone: '🪣', abaVenda: 'BALDE', abaTransf: 'PROD' },
    { id: 'promo', nome: 'Promoções', icone: '🌟', abaVenda: 'SORVETE', abaTransf: 'PROD' }
];

iniciarInterfaceGlobais();
document.getElementById('txtLoja').innerText = nomeLoja;

if (!document.getElementById('zoomOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'zoomOverlay';
    overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; pointer-events:none; background:rgba(255,255,255,0.9); align-items:center; justify-content:center;';
    overlay.innerHTML = '<img id="zoomImg" src="" style="width: 350px; max-width: 90vw; height: 350px; max-height: 90vh; object-fit: contain; background: white; padding: 15px; border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.3);">';
    document.body.appendChild(overlay);
}
window.mostrarZoom = (imgSrc) => { if(!imgSrc) return; document.getElementById('zoomImg').src = imgSrc; document.getElementById('zoomOverlay').style.display = 'flex'; };
window.esconderZoom = () => { document.getElementById('zoomOverlay').style.display = 'none'; };

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'number') {
        e.preventDefault();
        const inputs = Array.from(document.querySelectorAll('.tab-content.active input[type="number"]:not([disabled])'));
        const index = inputs.indexOf(e.target);
        if (index > -1 && index < inputs.length - 1) { inputs[index + 1].focus(); inputs[index + 1].select(); }
    }
});

window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
    document.getElementById('btnTab_' + cat).classList.add('active'); 
    document.getElementById('content_' + cat).classList.add('active'); 
};

document.getElementById('cliFormaPagamento').addEventListener('change', (e) => {
    const prazo = document.getElementById('cliPrazo');
    if(e.target.value === 'A vista') { prazo.value = ''; prazo.disabled = true; prazo.style.background = '#e2e8f0'; prazo.style.cursor = 'not-allowed'; } 
    else { prazo.disabled = false; prazo.style.background = '#f8fafc'; prazo.style.cursor = 'text'; }
});

window.salvarNovaSenhaObrigatoria = async () => {
    const senha = document.getElementById('novaSenhaForcada').value.trim();
    if(senha.length < 4) return alert("A senha deve ter no mínimo 4 caracteres.");
    
    const btn = document.querySelector('#modalForcarSenha button');
    btn.innerText = "⏳ Salvando..."; btn.disabled = true;
    
    try {
        await setDoc(doc(db, "usuarios", userId), { senha: senha, precisaTrocarSenha: false }, { merge: true });
        alert("✅ Senha atualizada com sucesso! Bem-vindo(a).");
        document.getElementById('modalForcarSenha').style.display = 'none';
    } catch(e) {
        alert("Erro ao salvar: " + e.message);
        btn.innerText = "💾 Salvar Senha e Acessar"; btn.disabled = false;
    }
};

async function iniciar() {
    const isAdmin = userId === 'admin';
    const [userSnap, adminSnap] = await Promise.all([getDoc(doc(db, "usuarios", userId)), getDoc(doc(db, "usuarios", "admin"))]);
    
    const dadosUsuario = userSnap.data() || {};

    if(dadosUsuario.precisaTrocarSenha && !isAdmin) {
        document.getElementById('modalForcarSenha').style.display = 'flex';
    }
    
    if (dadosUsuario.planilhas?.venda === false && !isAdmin) { 
        window.location.replace('transferencia.html'); return; 
    }

    window.categoriasGlobais = adminSnap.exists() && adminSnap.data().categorias ? adminSnap.data().categorias : DEFAULT_CATS;

    window.categoriasPermitidas = window.categoriasGlobais.filter(c => {
        if(isAdmin) return true;
        return dadosUsuario.planilhas?.[c.id] !== false; 
    });

    if (window.categoriasPermitidas.length === 0) { 
        alert("Sua loja não tem permissão em nenhuma categoria.");
        window.location.replace('transferencia.html'); return; 
    }

    const dmax = dadosUsuario.descontosMax || {};
    const getLimit = (val) => { if(val === undefined || val === null || val === "") return 100; return parseFloat(val); };
    
    window.categoriasGlobais.forEach(c => {
        window.descontosMaxGlobais[c.id] = isAdmin ? 100 : getLimit(dmax[c.id]);
    });

    let tabsHtml = ''; let tablesHtml = '';
    window.categoriasPermitidas.forEach((c, idx) => {
        let isAct = idx === 0 ? 'active' : '';
        tabsHtml += `<button class="tab-btn ${isAct}" id="btnTab_${c.id}" onclick="window.mudarAba('${c.id}')">${c.icone} ${c.nome}</button>`;
        
        let tagMax = "";
        let displayMax = "none";
        let maxVal = window.descontosMaxGlobais[c.id];
        
        if(maxVal < 100) {
            displayMax = "inline-block";
            tagMax = `Máx: ${maxVal}%`;
        }

        tablesHtml += `
        <div id="content_${c.id}" class="tab-content ${isAct}">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #f8fafc; border-bottom: 2px solid var(--border); border-radius: 8px 8px 0 0;">
                <span style="color: var(--primary); font-weight: bold; font-size: 14px;">${c.icone} Catálogo de ${c.nome}</span>
                <div style="display: flex; align-items: center;">
                    <label style="margin: 0; font-weight: 900; color: var(--text-main); margin-right: 10px; font-size: 14px;">🎯 Desconto (%):</label>
                    <input type="number" id="desc_${c.id}" value="0" min="0" step="1" style="width: 80px; margin: 0; font-size: 16px; font-weight: bold; color: var(--primary); border: 2px solid var(--primary); border-radius: 6px; text-align: center;" onkeydown="if(['.', ',', '-', '+'].includes(event.key)) event.preventDefault();" oninput="this.value=this.value.replace(/[^0-9]/g,''); window.calcularTudo();">
                    <span id="max_desc_${c.id}" style="margin-left: 10px; font-size: 12px; font-weight: bold; background: #fee2e2; color: #ef4444; padding: 4px 8px; border-radius: 6px; display: ${displayMax};">${tagMax}</span>
                </div>
            </div>
            <table id="tbl_${c.id}"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody id="tbody_${c.id}"></tbody></table>
        </div>`;
    });

    document.getElementById('containerTabsLoja').innerHTML = tabsHtml;
    document.getElementById('containerTabelasLoja').innerHTML = tablesHtml;

    // DEFINIÇÃO DAS TABELAS VINCULADAS
    const tabelas = dadosUsuario.tabelasPreco || {};
    let tabVenda = (tabelas.venda || dadosUsuario.tabelaPreco || 'padrao').toLowerCase();
    let tabPromo = (tabelas.promocao || tabVenda).toLowerCase(); 
    let tabBalde = (tabelas.balde || tabVenda).toLowerCase(); 
    
    const cliSnap = await getDocs(collection(db, "clientes"));
    const listaNomes = document.getElementById('listaNomesClientes');
    cliSnap.forEach(c => { clientesSalvos.push(c.data()); listaNomes.innerHTML += `<option value="${c.data().razao}">`; });

    document.getElementById('cliRazao').addEventListener('change', (e) => {
        const cliente = clientesSalvos.find(c => c.razao === e.target.value);
        if(cliente) document.getElementById('cliCnpj').value = cliente.cnpj || '';
    });

    // CARREGA AS TRÊS TABELAS ESPECÍFICAS
    const [snapVenda, snapPromo, snapBalde, prodSnap] = await Promise.all([ 
        getDoc(doc(db, "precos", tabVenda)), 
        getDoc(doc(db, "precos", tabPromo)), 
        getDoc(doc(db, "precos", tabBalde)), 
        getDocs(collection(db, "produtos")) 
    ]);
    
    const precosVenda = snapVenda.exists() ? snapVenda.data() : {};
    const precosPromo = snapPromo.exists() ? snapPromo.data() : {};
    const precosBalde = snapBalde.exists() ? snapBalde.data() : {};

    let htmlBuffers = {};
    window.categoriasPermitidas.forEach(c => htmlBuffers[c.id] = '');

    prodSnap.forEach(d => {
        const item = d.data(); 
        let cat = (item.categoria || window.categoriasGlobais[0].id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if(htmlBuffers[cat] === undefined) {
            let existsGlobal = window.categoriasGlobais.find(x => x.id === cat);
            if(!existsGlobal) cat = window.categoriasGlobais[0].id;
            if(htmlBuffers[cat] === undefined) return; 
        }

        // ESCOLHE A TABELA CORRETA BASEADO NO ID DA CATEGORIA
        let precoCru;
        if (cat === 'promo' || cat.includes('promo')) {
            precoCru = precosPromo[item.codigo];
        } else if (cat === 'balde' || cat.includes('balde')) {
            precoCru = precosBalde[item.codigo];
        } else {
            precoCru = precosVenda[item.codigo]; 
        }
        
        let precoSeguro = parseFloat(precoCru);
        if (isNaN(precoSeguro)) precoSeguro = 0;
        
        const idx = produtosGlobais.length;
        produtosGlobais.push({ ...item, precoFinal: precoSeguro, catReal: cat });
        
        let hasImg = (item.imagem && item.imagem.trim() !== "");
        let imgHtml = hasImg 
            ? `<img src="${item.imagem}" class="img-produto" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; cursor: zoom-in;" loading="lazy" onmouseenter="window.mostrarZoom('${item.imagem}')" onmouseleave="window.esconderZoom()">`
            : `<div style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; font-size:20px; border-radius:6px; border: 1px solid #e2e8f0; cursor: default;">📦</div>`;

        let corPreco = precoSeguro > 0 ? '#10b981' : '#ef4444';

        htmlBuffers[cat] += `<tr id="tr_${idx}">
            <td style="text-align:center;">${imgHtml}</td>
            <td><b>${item.codigo}</b></td>
            <td>${item.descricao}</td>
            <td>${item.engradado}</td>
            <td style="color:${corPreco}; font-weight:600;">R$ ${precoSeguro.toFixed(2)}</td>
            <td><input type="number" id="eng_${idx}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
            <td><input type="number" id="uni_${idx}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td>
            <td id="sub_${idx}" style="font-weight:700; color:var(--text-muted);">R$ 0,00</td>
        </tr>`;
    });
    
    window.categoriasPermitidas.forEach(c => {
        const tbody = document.getElementById(`tbody_${c.id}`);
        if(tbody) tbody.innerHTML = htmlBuffers[c.id] || `<tr><td colspan="8" style="text-align:center; padding:20px;">Nenhum produto cadastrado nesta categoria.</td></tr>`;
    });
}

window.calcularTudo = () => {
    let totaisCat = {};
    window.categoriasPermitidas.forEach(c => totaisCat[c.id] = 0);
    let qtdTotalGeral = 0;
    
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`); 
        if(!inputEng || !inputUni) return;
        let cxStr = inputEng.value; let cx = parseFloat(cxStr) || 0; let un = parseFloat(inputUni.value) || 0;
        if (cxStr !== "" && (cx * 10) % 5 !== 0) { alert(`Apenas múltiplos de 0.5 nas caixas.`); inputEng.value = ""; cx = 0; }
        if (inputUni.value !== "" && un % 1 !== 0) { alert(`Apenas unidades inteiras.`); inputUni.value = ""; un = 0; }
        
        let cap = parseFloat(p.engradado) || 1; 
        let qtd = (cx * cap) + un; 
        let sub = qtd * p.precoFinal;
        
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcTotalUnidades = qtd; p.calcSubtotal = sub;
        
        if(totaisCat[p.catReal] !== undefined) totaisCat[p.catReal] += sub; 
        qtdTotalGeral += qtd;
        
        let tr = document.getElementById(`tr_${i}`); 
        if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });

    let desc = {};
    window.categoriasPermitidas.forEach(c => {
        let el = document.getElementById(`desc_${c.id}`);
        desc[c.id] = el && el.value !== "" ? parseInt(el.value) : 0;

        let max = window.descontosMaxGlobais[c.id];
        if (desc[c.id] > max) { 
            alert(`ATENÇÃO: O desconto máximo permitido para ${c.nome} é ${max}%`); 
            desc[c.id] = max; 
            if(el) el.value = max; 
        }
    });
    
    let totalGeralBruto = 0;
    let totalGeralDescontado = 0;
    Object.keys(totaisCat).forEach(k => { 
        totalGeralBruto += totaisCat[k]; 
        totalGeralDescontado += totaisCat[k] * (1 - desc[k] / 100); 
    });
    
    let valorEconomizado = totalGeralBruto - totalGeralDescontado;

    document.getElementById('valComDesc').innerText = "R$ " + totalGeralDescontado.toFixed(2); 
    document.getElementById('qtdTotal').innerText = qtdTotalGeral;
    
    let divBruto = document.getElementById('divResumoBruto');
    let divDesc = document.getElementById('divResumoDesconto');

    if(valorEconomizado > 0) {
        document.getElementById('valBruto').innerText = "R$ " + totalGeralBruto.toFixed(2);
        document.getElementById('valDesconto').innerText = "- R$ " + valorEconomizado.toFixed(2);
        divBruto.style.display = 'flex'; divDesc.style.display = 'flex';
    } else {
        divBruto.style.display = 'none'; divDesc.style.display = 'none';
    }

    window.resumoGlobal = { totalV: totalGeralDescontado, qtdTotal: qtdTotalGeral, descontos: desc };
};

window.gerarExcelPedido = async () => {
    const razao = document.getElementById('cliRazao').value.trim(); const cnpj = document.getElementById('cliCnpj').value.trim(); const formaPagamento = document.getElementById('cliFormaPagamento').value; const prazo = document.getElementById('cliPrazo').value.trim();
    if(!razao) return alert("Preencha a Razão Social do Cliente!");
    let itens = produtosGlobais.filter(p => p.calcTotalUnidades > 0);
    if (itens.length === 0) return alert("Preencha alguma quantidade!");
    if(!confirm("Deseja confirmar a geração, baixar a planilha e salvar este pedido no histórico?")) return;
    const btn = document.querySelector('.btn-sucesso'); btn.innerHTML = "⏳ GERANDO..."; btn.disabled = true;
    try { 
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj, formaPagamento, prazo, totalV: window.resumoGlobal.totalV, itens, isTransferencia: false, descontos: window.resumoGlobal.descontos, categorias: window.categoriasGlobais }); 
        alert("✅ Pedido gerado com sucesso! O Excel foi baixado."); window.location.reload();
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerHTML = "<span style='font-size: 14px;'>⬇️</span> Gerar Pedido"; btn.disabled = false; }
};

iniciar();
