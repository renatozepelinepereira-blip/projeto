import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let clientesSalvos = [];
window.resumoGlobal = { totalV: 0, qtdTotal: 0 };

iniciarInterfaceGlobais();
document.getElementById('txtLoja').innerText = nomeLoja;

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
    
    if (dadosUsuario.planilhas?.venda === false && userId !== 'admin') { 
        window.location.replace('transferencia.html'); return; 
    }

    // Leitura inteligente de Múltiplas Tabelas
    const tabelas = dadosUsuario.tabelasPreco || {};
    let tabVenda = (tabelas.venda || dadosUsuario.tabelaPreco || 'padrao').toLowerCase();
    let tabPromo = (tabelas.promocao || tabVenda).toLowerCase(); // Se não tiver promo, usa a de venda
    let tabBalde = (tabelas.balde || tabVenda).toLowerCase();   // Se não tiver balde, usa a de venda
    
    const cliSnap = await getDocs(collection(db, "clientes"));
    const listaNomes = document.getElementById('listaNomesClientes');
    cliSnap.forEach(c => { clientesSalvos.push(c.data()); listaNomes.innerHTML += `<option value="${c.data().razao}">`; });

    document.getElementById('cliRazao').addEventListener('change', (e) => {
        const cliente = clientesSalvos.find(c => c.razao === e.target.value);
        if(cliente) document.getElementById('cliCnpj').value = cliente.cnpj || '';
    });

    // Puxa as 3 planilhas + catálogo tudo junto
    const [snapVenda, snapPromo, snapBalde, prodSnap] = await Promise.all([ 
        getDoc(doc(db, "precos", tabVenda)), 
        getDoc(doc(db, "precos", tabPromo)), 
        getDoc(doc(db, "precos", tabBalde)), 
        getDocs(collection(db, "produtos")) 
    ]);
    
    const precosVenda = snapVenda.exists() ? snapVenda.data() : {};
    const precosPromo = snapPromo.exists() ? snapPromo.data() : {};
    const precosBalde = snapBalde.exists() ? snapBalde.data() : {};

    let htmlBuffers = { sorvete: "", seco: "", balde: "", promo: "" };

    prodSnap.forEach(d => {
        const item = d.data(); 
        let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let cat = 'sorvete'; 
        if (rawCat.includes('seco')) cat = 'seco'; else if (rawCat.includes('balde')) cat = 'balde'; else if (rawCat.includes('promo')) cat = 'promo';
        
        // Direciona o preço baseado na aba onde o produto vai aparecer
        let preco;
        if (cat === 'promo') preco = precosPromo[item.codigo];
        else if (cat === 'balde') preco = precosBalde[item.codigo];
        else preco = precosVenda[item.codigo]; // Sorvete e Seco usam a tabela de Venda
        
        if (preco !== undefined) {
            const idx = produtosGlobais.length;
            produtosGlobais.push({ ...item, precoFinal: preco, catReal: cat });
            
            let imgHtml = item.imagem ? `<img src="${item.imagem}" class="img-produto" loading="lazy">` : `<div class="img-produto" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:20px;">📦</div>`;
            
            htmlBuffers[cat] += `<tr id="tr_${idx}">
                <td style="text-align:center;">${imgHtml}</td>
                <td><b>${item.codigo}</b></td>
                <td>${item.descricao}</td>
                <td>${item.engradado}</td>
                <td style="color:#10b981; font-weight:600;">R$ ${parseFloat(preco).toFixed(2)}</td>
                <td><input type="number" id="eng_${idx}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
                <td><input type="number" id="uni_${idx}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td>
                <td id="sub_${idx}" style="font-weight:700; color:var(--primary);">R$ 0,00</td>
            </tr>`;
        }
    });
    
    Object.keys(htmlBuffers).forEach(k => {
        const tbody = document.querySelector(`#tbl_${k} tbody`);
        if(tbody) tbody.innerHTML = htmlBuffers[k] || `<tr><td colspan="8" style="text-align:center; padding:20px;">Nenhum produto cadastrado nesta categoria.</td></tr>`;
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
        let sub = qtd * parseFloat(p.precoFinal);
        
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcTotalUnidades = qtd; p.calcSubtotal = sub;
        
        totalGeral += sub; qtdTotalGeral += qtd;
        
        let tr = document.getElementById(`tr_${i}`); 
        if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });
    
    document.getElementById('valComDesc').innerText = "R$ " + totalGeral.toFixed(2); 
    document.getElementById('qtdTotal').innerText = qtdTotalGeral;
    window.resumoGlobal.totalV = totalGeral; window.resumoGlobal.qtdTotal = qtdTotalGeral;
};

window.gerarExcelPedido = async () => {
    const razao = document.getElementById('cliRazao').value.trim();
    const cnpj = document.getElementById('cliCnpj').value.trim();
    const formaPagamento = document.getElementById('cliFormaPagamento').value;
    const prazo = document.getElementById('cliPrazo').value.trim();
    
    if(!razao) return alert("Preencha a Razão Social do Cliente!");
    
    let itens = produtosGlobais.filter(p => p.calcTotalUnidades > 0);
    if (itens.length === 0) return alert("Preencha alguma quantidade!");

    const btn = document.querySelector('.btn-sucesso'); 
    btn.innerHTML = "⏳ GERANDO..."; btn.disabled = true;
    
    try { 
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj, formaPagamento, prazo, totalV: window.resumoGlobal.totalV, itens, isTransferencia: false }); 
        alert("✅ Pedido gerado com sucesso! O Excel foi baixado.");
        window.location.reload();
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerHTML = "<span style='font-size: 22px;'>⬇️</span> Gerar Pedido Excel"; btn.disabled = false; }
};

iniciar();
