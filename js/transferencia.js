import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { getDocs, getDoc, doc, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let filiaisSalvas = [];
window.categoriasGlobais = [];
window.categoriasPermitidas = [];
window.filialDestinoNomeReal = ""; 
window.resumoGlobal = { totalV: 0, qtdTotal: 0 };

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

function extrairFilial(cnpj) {
    const match = cnpj.match(/\/(\d{4})/); return match ? parseInt(match[1], 10) : "";
}

async function iniciar() {
    const isAdmin = userId === 'admin';
    const [userSnap, configSnap] = await Promise.all([getDoc(doc(db, "usuarios", userId)), getDoc(doc(db, "configuracoes", "categorias"))]);
    const dadosUsuario = userSnap.data() || {};
    
    if (dadosUsuario.planilhas?.venda === false && !isAdmin) {
        const btnVenda = document.getElementById('btnNavVenda'); if (btnVenda) btnVenda.style.display = 'none';
    }

    window.categoriasGlobais = configSnap.exists() && configSnap.data().lista ? configSnap.data().lista : DEFAULT_CATS;
    window.categoriasPermitidas = window.categoriasGlobais.filter(c => {
        if(isAdmin) return true; return dadosUsuario.planilhas?.[c.id] !== false;
    });

    let tabsHtml = ''; let tablesHtml = '';
    window.categoriasPermitidas.forEach((c, idx) => {
        let isAct = idx === 0 ? 'active' : '';
        tabsHtml += `<button class="tab-btn ${isAct}" id="btnTab_${c.id}" onclick="window.mudarAba('${c.id}')">${c.icone} ${c.nome}</button>`;
        tablesHtml += `
        <div id="content_${c.id}" class="tab-content ${isAct}">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #f8fafc; border-bottom: 2px solid var(--border); border-radius: 8px 8px 0 0;">
                <span style="color: var(--primary); font-weight: bold; font-size: 14px;">${c.icone} Transferência: ${c.nome}</span>
            </div>
            <table id="tbl_${c.id}"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Caixas</th><th>Unid.</th></tr></thead><tbody id="tbody_${c.id}"></tbody></table>
        </div>`;
    });
    document.getElementById('containerTabsTransf').innerHTML = tabsHtml;
    document.getElementById('containerTabelasTransf').innerHTML = tablesHtml;

    const uSnap = await getDocs(collection(db, "usuarios"));
    const listaNomes = document.getElementById('listaFiliais');
    uSnap.forEach(u => { 
        if(u.id !== 'admin' && u.id !== userId) {
            const f = u.data(); const num = extrairFilial(f.cnpj);
            f.textoBusca = `[Filial ${num}] ${f.nomeLoja || u.id} - ${f.cnpj || ''}`;
            filiaisSalvas.push(f); listaNomes.innerHTML += `<option value="${f.textoBusca}">`; 
        }
    });

    document.getElementById('cliRazao').addEventListener('change', (e) => {
        const filial = filiaisSalvas.find(c => c.textoBusca === e.target.value);
        if(filial) { document.getElementById('cliCnpj').value = filial.cnpj || ''; window.filialDestinoNomeReal = filial.nomeLoja || filial.id; }
    });

    const tabelas = dadosUsuario.tabelasPreco || {};
    const tabTransf = (tabelas.transferencia || 'tf').toLowerCase();
    const [snapTransf, prodSnap] = await Promise.all([ getDoc(doc(db, "precos", tabTransf)), getDocs(collection(db, "produtos")) ]);
    const precosTF = snapTransf.exists() ? snapTransf.data() : {};

    let htmlBuffers = {};
    window.categoriasPermitidas.forEach(c => htmlBuffers[c.id] = '');

    prodSnap.forEach(d => {
        const item = d.data(); 
        let cat = (item.categoria || window.categoriasGlobais[0].id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if(htmlBuffers[cat] === undefined) return;

        let precoCru = precosTF[item.codigo];
        let precoSeguro = parseFloat(precoCru) || 0;
        const idx = produtosGlobais.length;
        produtosGlobais.push({ ...item, catReal: cat, precoFinal: precoSeguro });
        
        let hasImg = (item.imagem && item.imagem.trim() !== "");
        let imgHtml = hasImg 
            ? `<img src="${item.imagem}" class="img-produto" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; cursor: zoom-in;" loading="lazy" onmouseenter="window.mostrarZoom('${item.imagem}')" onmouseleave="window.esconderZoom()">`
            : `<div style="width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; font-size:20px; border-radius:6px; border: 1px solid #e2e8f0; cursor: default;">📦</div>`;
        
        htmlBuffers[cat] += `<tr id="tr_${idx}">
            <td style="text-align:center;">${imgHtml}</td>
            <td><b>${item.codigo}</b></td>
            <td>${item.descricao}</td>
            <td>${item.engradado}</td>
            <td><input type="number" id="eng_${idx}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
            <td><input type="number" id="uni_${idx}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td>
        </tr>`;
    });
    
    window.categoriasPermitidas.forEach(c => {
        const tbody = document.getElementById(`tbody_${c.id}`);
        if(tbody) tbody.innerHTML = htmlBuffers[c.id] || `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum produto.</td></tr>`;
    });
}

window.calcularTudo = () => {
    let totalGeral = 0; let qtdTotalGeral = 0;
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`); 
        if(!inputEng || !inputUni) return;
        let cxStr = inputEng.value; let cx = parseFloat(cxStr) || 0; let un = parseFloat(inputUni.value) || 0;
        if (cxStr !== "" && (cx * 10) % 5 !== 0) { alert(`Apenas múltiplos de 0.5 nas caixas.`); inputEng.value = ""; cx = 0; }
        if (inputUni.value !== "" && un % 1 !== 0) { alert(`Apenas unidades inteiras.`); inputUni.value = ""; un = 0; }
        
        let cap = parseFloat(p.engradado) || 1; 
        let qtd = (cx * cap) + un; 
        let sub = qtd * p.precoFinal; 
        
        p.calcTotalUnidades = qtd; p.calcSubtotal = sub;
        totalGeral += sub; qtdTotalGeral += qtd;

        let tr = document.getElementById(`tr_${i}`); 
        if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });

    document.getElementById('valComDesc').innerText = "R$ " + totalGeral.toFixed(2);
    document.getElementById('qtdTotal').innerText = qtdTotalGeral;
    window.resumoGlobal = { totalV: totalGeral, qtdTotal: qtdTotalGeral };
};

window.gerarExcelTransferencia = async () => {
    const razao = window.filialDestinoNomeReal || document.getElementById('cliRazao').value.trim();
    if(!razao) return alert("Selecione a Filial de Destino!");
    let itens = produtosGlobais.filter(p => p.calcTotalUnidades > 0);
    if (itens.length === 0) return alert("Preencha alguma quantidade!");

    if(!confirm("Deseja confirmar a geração, baixar a planilha e salvar a transferência no histórico?")) return;

    const btn = document.querySelector('.btn-primario'); btn.innerHTML = "⏳..."; btn.disabled = true;
    try { 
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj: document.getElementById('cliCnpj').value, formaPagamento: 'Transferência', prazo: '-', totalV: window.resumoGlobal.totalV, itens, isTransferencia: true, categorias: window.categoriasGlobais }); 
        alert("✅ Transferência gerada com sucesso!"); window.location.reload(); 
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerHTML = "<span style='font-size: 14px;'>⬇️</span> Transferir"; btn.disabled = false; }
};

iniciar();
