import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let clientesSalvos = [];
window.descontosMaxGlobais = { sorvete: 100, acai: 100, seco: 100, balde: 100, promo: 100 };
window.resumoGlobal = { totalV: 0, qtdTotal: 0, descontos: {} };

iniciarInterfaceGlobais();
document.getElementById('txtLoja').innerText = nomeLoja;

// ==========================================
// MOTOR DE ZOOM 100% CENTRO E À PROVA DE CORTE
// ==========================================
if (!document.getElementById('zoomOverlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'zoomOverlay';
    overlay.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:9999999; pointer-events:none; background:rgba(255,255,255,0.9); align-items:center; justify-content:center;';
    overlay.innerHTML = '<img id="zoomImg" src="" style="width: 350px; max-width: 90vw; height: 350px; max-height: 90vh; object-fit: contain; background: white; padding: 15px; border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.3);">';
    document.body.appendChild(overlay);
}
window.mostrarZoom = (imgSrc) => { if(!imgSrc) return; document.getElementById('zoomImg').src = imgSrc; document.getElementById('zoomOverlay').style.display = 'flex'; };
window.esconderZoom = () => { document.getElementById('zoomOverlay').style.display = 'none'; };
// ==========================================

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
    document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1)).classList.add('active'); 
    document.getElementById('content_' + cat).classList.add('active'); 
};

document.getElementById('cliFormaPagamento').addEventListener('change', (e) => {
    const prazo = document.getElementById('cliPrazo');
    if(e.target.value === 'A vista') { prazo.value = ''; prazo.disabled = true; prazo.style.background = '#e2e8f0'; prazo.style.cursor = 'not-allowed'; } 
    else { prazo.disabled = false; prazo.style.background = '#f8fafc'; prazo.style.cursor = 'text'; }
});

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId)); 
    const dadosUsuario = userSnap.data() || {};
    const isAdmin = userId === 'admin';
    
    if (dadosUsuario.planilhas?.venda === false && !isAdmin) { 
        window.location.replace('transferencia.html'); return; 
    }

    const getLimit = (val) => { if(val === undefined || val === null || val === "") return 100; return parseFloat(val); };
    
    const dmax = dadosUsuario.descontosMax || {};
    window.descontosMaxGlobais = { 
        sorvete: isAdmin ? 100 : getLimit(dmax.sorvete), 
        acai: isAdmin ? 100 : getLimit(dmax.acai), 
        seco: isAdmin ? 100 : getLimit(dmax.seco), 
        balde: isAdmin ? 100 : getLimit(dmax.balde), 
        promo: isAdmin ? 100 : getLimit(dmax.promo) 
    };
    
    Object.keys(window.descontosMaxGlobais).forEach(k => { 
        let el = document.getElementById('max_desc_' + k); 
        let maxVal = window.descontosMaxGlobais[k];
        if(el) {
            if(maxVal === 100) { 
                el.style.display = 'none'; // Sumiu a palavra livre
            } else { 
               el.style.color = '#ef4444'; 
                el.style.background = '#fee2e2'; 
            }
        }
    });

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

    const [snapVenda, snapPromo, snapBalde, prodSnap] = await Promise.all([ 
        getDoc(doc(db, "precos", tabVenda)), getDoc(doc(db, "precos", tabPromo)), getDoc(doc(db, "precos", tabBalde)), 
        getDocs(collection(db, "produtos")) 
    ]);
    
    const precosVenda = snapVenda.exists() ? snapVenda.data() : {};
    const precosPromo = snapPromo.exists() ? snapPromo.data() : {};
    const precosBalde = snapBalde.exists() ? snapBalde.data() : {};

    let htmlBuffers = { sorvete: "", acai: "", seco: "", balde: "", promo: "" };

    prodSnap.forEach(d => {
        const item = d.data(); 
        let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let cat = 'sorvete'; 
        if (rawCat.includes('acai') || rawCat.includes('açaí')) cat = 'acai';
        else if (rawCat.includes('seco')) cat = 'seco'; 
        else if (rawCat.includes('balde')) cat = 'balde'; 
        else if (rawCat.includes('promo')) cat = 'promo';
        
        let precoCru;
        if (cat === 'promo') precoCru = precosPromo[item.codigo];
        else if (cat === 'balde') precoCru = precosBalde[item.codigo];
        else precoCru = precosVenda[item.codigo]; 
        
        let precoSeguro = parseFloat(precoCru);
        if (isNaN(precoSeguro)) precoSeguro = 0;
        
        const idx = produtosGlobais.length;
        produtosGlobais.push({ ...item, precoFinal: precoSeguro, catReal: cat });
        
        // CONSTRUÇÃO BLINDADA CONTRA O CSS ANTIGO
        let hasImg = (item.imagem && item.imagem.trim() !== "");
        let imgHtml = hasImg 
            ? `<img src="${item.imagem}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; cursor: zoom-in;" loading="lazy" onmouseenter="window.mostrarZoom('${item.imagem}')" onmouseleave="window.esconderZoom()">`
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
    
    Object.keys(htmlBuffers).forEach(k => {
        const tbody = document.querySelector(`#tbl_${k} tbody`);
        if(tbody) tbody.innerHTML = htmlBuffers[k] || `<tr><td colspan="8" style="text-align:center; padding:20px;">Nenhum produto cadastrado nesta categoria.</td></tr>`;
    });
}

window.calcularTudo = () => {
    let totaisCat = { sorvete: 0, acai: 0, seco: 0, balde: 0, promo: 0 };
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
        totaisCat[p.catReal] += sub; qtdTotalGeral += qtd;
        
        let tr = document.getElementById(`tr_${i}`); 
        if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });

    let desc = {
        sorvete: parseFloat(document.getElementById('desc_sorvete').value) || 0,
        acai: parseFloat(document.getElementById('desc_acai').value) || 0,
        seco: parseFloat(document.getElementById('desc_seco').value) || 0,
        balde: parseFloat(document.getElementById('desc_balde').value) || 0,
        promo: parseFloat(document.getElementById('desc_promo').value) || 0
    };

    Object.keys(desc).forEach(k => {
        let max = window.descontosMaxGlobais[k];
        if (desc[k] > max) { 
            alert(`ATENÇÃO: O desconto máximo permitido para ${k.toUpperCase()} é ${max}%`); 
            desc[k] = max; 
            document.getElementById('desc_' + k).value = max; 
        }
    });
    
    let totalGeralDescontado = 0;
    Object.keys(totaisCat).forEach(k => { totalGeralDescontado += totaisCat[k] * (1 - desc[k] / 100); });

    document.getElementById('valComDesc').innerText = "R$ " + totalGeralDescontado.toFixed(2); 
    document.getElementById('qtdTotal').innerText = qtdTotalGeral;
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
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj, formaPagamento, prazo, totalV: window.resumoGlobal.totalV, itens, isTransferencia: false, descontos: window.resumoGlobal.descontos }); 
        alert("✅ Pedido gerado com sucesso! O Excel foi baixado."); window.location.reload();
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerHTML = "<span style='font-size: 14px;'>⬇️</span> Gerar Pedido"; btn.disabled = false; }
};

iniciar();
