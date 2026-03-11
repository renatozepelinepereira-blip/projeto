import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { processarExcelVenda } from "./utils/excel.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = []; let clientesSalvos = [];
window.resumoGlobal = { sorvete: {vLiq:0}, seco: {vLiq:0}, balde: {vLiq:0}, promo: {vLiq:0}, totalV: 0 };

iniciarInterfaceGlobais();

window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; }); 
    const btn = document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1));
    const content = document.getElementById('content_' + cat);
    if(btn) btn.classList.add('active'); if(content) { content.classList.add('active'); content.style.display = 'block'; }
};

document.getElementById('cliFormaPagamento').addEventListener('change', (e) => {
    const prazo = document.getElementById('cliPrazo');
    if(e.target.value === 'A vista') { prazo.value = ''; prazo.disabled = true; prazo.style.backgroundColor = '#f0f0f0'; prazo.placeholder = 'Bloqueado'; } 
    else { prazo.disabled = false; prazo.style.backgroundColor = '#fff'; prazo.placeholder = 'Ex: 15 dias'; }
});

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const planilhas = userSnap.data()?.planilhas || { venda: true };
    if (planilhas.venda === false && userId !== 'admin') { window.location.href = 'transferencia.html'; return; }

    const cliSnap = await getDocs(collection(db, "clientes"));
    cliSnap.forEach(c => { clientesSalvos.push(c.data()); document.getElementById('listaNomesClientes').innerHTML += `<option value="${c.data().razao}">`; document.getElementById('listaCnpjClientes').innerHTML += `<option value="${c.data().cnpj}">`; });

    const [precoSnap, prodSnap] = await Promise.all([ getDoc(doc(db, "precos", userId)), getDocs(collection(db, "produtos")) ]);
    const precosLoja = precoSnap.exists() ? precoSnap.data() : {};

    prodSnap.forEach(d => {
        const item = d.data(); const objPreco = precosLoja[item.codigo];
        if (objPreco !== undefined && (typeof objPreco === 'object' ? (objPreco.visivel !== false) : true)) {
            let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let safeCat = 'sorvete'; if (rawCat.includes('seco')) safeCat = 'seco'; else if (rawCat.includes('balde')) safeCat = 'balde'; else if (rawCat.includes('promo')) safeCat = 'promo';
            produtosGlobais.push({ ...item, precoFinal: typeof objPreco === 'object' ? objPreco.preco : objPreco, catReal: safeCat });
        }
    });
    renderizarTabelas();
}

function renderizarTabelas() {
    produtosGlobais.forEach((p, i) => {
        const tbody = document.querySelector(`#tbl_${p.catReal} tbody`);
        if(tbody) {
            let imgHtml = p.imagem ? `<img src="${p.imagem}" class="img-produto">` : `<div class="img-placeholder">🍨</div>`;
            tbody.innerHTML += `<tr id="tr_${i}"><td style="text-align: center;">${imgHtml}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>R$ ${p.precoFinal.toFixed(2)}</td>
                <td><input type="number" id="eng_${i}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
                <td><input type="number" id="uni_${i}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td><td id="sub_${i}" style="font-weight:bold;">R$ 0.00</td></tr>`;
        }
    });
}

window.calcularTudo = () => {
    let totCategorias = { sorvete: 0, seco: 0, balde: 0, promo: 0 }; let totalGeral = 0;
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`);
        if(!inputEng || !inputUni) return;
        let cxStr = inputEng.value; let unStr = inputUni.value;
        let cx = parseFloat(cxStr) || 0; let un = parseFloat(unStr) || 0;
        
        if (cxStr !== "" && (cx * 10) % 5 !== 0) { alert(`⚠️ ERRO em "${p.descricao}". Apenas múltiplos de 0.5.`); inputEng.value = ""; cx = 0; }
        if (unStr !== "" && un % 1 !== 0) { alert(`⚠️ ERRO: Unidades devem ser inteiras.`); inputUni.value = ""; un = 0; }

        let cap = parseFloat(p.engradado) || 1;
        let qtd = (cx * cap) + un; let sub = qtd * p.precoFinal;
        
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcQtdCx = cx; p.calcQtdUn = un; p.calcTotalUnidades = qtd; p.calcSubtotal = sub;
        
        totCategorias[p.catReal] += sub; totalGeral += sub;
        let tr = document.getElementById(`tr_${i}`); if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });
    
    document.getElementById('resValSorvete').innerText = "R$ " + totCategorias.sorvete.toFixed(2); document.getElementById('resValSeco').innerText = "R$ " + totCategorias.seco.toFixed(2);
    document.getElementById('resValBalde').innerText = "R$ " + totCategorias.balde.toFixed(2); document.getElementById('resValPromo').innerText = "R$ " + totCategorias.promo.toFixed(2);
    document.getElementById('valComDesc').innerText = "R$ " + totalGeral.toFixed(2);
    window.resumoGlobal.totalV = totalGeral;
};

window.gerarExcelPedido = async () => {
    const razao = document.getElementById('cliRazao').value.trim(); const cnpj = document.getElementById('cliCnpj').value.trim();
    const formaPagamento = document.getElementById('cliFormaPagamento').value; const prazo = document.getElementById('cliPrazo').value.trim();
    if(!razao) return alert("Preencha a Razão Social do Cliente!");
    
    let itensSelecionados = produtosGlobais.filter(p => p.calcTotalUnidades > 0).map(p => ({ codigo: p.codigo, descricao: p.descricao, precoFinal: p.precoFinal, calcTotalUnidades: p.calcTotalUnidades }));
    if (itensSelecionados.length === 0) return alert("Preencha alguma quantidade!");

    const btn = document.querySelector('.btn-primario'); btn.innerText = "⏳ A GERAR PLANILHA..."; btn.disabled = true;

    try {
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj, formaPagamento, prazo, totalV: window.resumoGlobal.totalV, itens: itensSelecionados });
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerText = "⬇️ GERAR PEDIDO EM EXCEL"; btn.disabled = false; }
};

iniciar();
