import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { getDocs, getDoc, doc, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let filiaisSalvas = [];
window.filialDestinoNomeReal = ""; 
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

function extrairFilial(cnpj) {
    if (!cnpj) return "";
    const match = cnpj.match(/\/(\d{4})/);
    return match ? parseInt(match[1], 10) : "";
}

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const dadosUsuario = userSnap.data() || {};
    if (dadosUsuario.planilhas?.venda === false && userId !== 'admin') {
        const btnVenda = document.getElementById('btnNavVenda');
        if (btnVenda) btnVenda.style.display = 'none';
    }

    const uSnap = await getDocs(collection(db, "usuarios"));
    const listaNomes = document.getElementById('listaFiliais');
    uSnap.forEach(u => { 
        if(u.id !== 'admin' && u.id !== userId) {
            const f = u.data();
            const num = extrairFilial(f.cnpj);
            f.textoBusca = `[Filial ${num}] ${f.nomeLoja || u.id} - ${f.cnpj || ''}`;
            filiaisSalvas.push(f);
            listaNomes.innerHTML += `<option value="${f.textoBusca}">`; 
        }
    });

    document.getElementById('cliRazao').addEventListener('change', (e) => {
        const filial = filiaisSalvas.find(c => c.textoBusca === e.target.value);
        if(filial) { document.getElementById('cliCnpj').value = filial.cnpj || ''; window.filialDestinoNomeReal = filial.nomeLoja || filial.id; }
    });

    const tabelas = dadosUsuario.tabelasPreco || {};
    const tabTransf = (tabelas.transferencia || 'tf').toLowerCase();

    const [snapTransf, prodSnap] = await Promise.all([ 
        getDoc(doc(db, "precos", tabTransf)), 
        getDocs(collection(db, "produtos")) 
    ]);
    const precosTF = snapTransf.exists() ? snapTransf.data() : {};

    let htmlBuffers = { sorvete: "", acai: "", seco: "" };

    prodSnap.forEach(d => {
        const item = d.data(); 
        let precoCru = precosTF[item.codigo];
        let precoSeguro = parseFloat(precoCru) || 0;
        
        let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let cat = 'sorvete'; 
        if (rawCat.includes('acai') || rawCat.includes('açaí')) cat = 'acai';
        else if (rawCat.includes('seco')) cat = 'seco'; 
        
        // Pula promo e balde na transferência, ou coloca em sorvete se preferir
        if (cat !== 'sorvete' && cat !== 'acai' && cat !== 'seco') cat = 'sorvete';

        const idx = produtosGlobais.length;
        produtosGlobais.push({ ...item, catReal: cat, precoFinal: precoSeguro });
        
        let imgHtml = item.imagem ? `<img src="${item.imagem}" class="img-produto" loading="lazy">` : `<div class="img-produto" style="display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-size:20px;">📦</div>`;
        
        htmlBuffers[cat] += `<tr id="tr_${idx}">
            <td style="text-align:center;">${imgHtml}</td>
            <td><b>${item.codigo}</b></td>
            <td>${item.descricao}</td>
            <td>${item.engradado}</td>
            <td><input type="number" id="eng_${idx}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
            <td><input type="number" id="uni_${idx}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td>
        </tr>`;
    });
    
    Object.keys(htmlBuffers).forEach(k => {
        const tbody = document.querySelector(`#tbl_${k} tbody`);
        if(tbody) tbody.innerHTML = htmlBuffers[k] || `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum produto.</td></tr>`;
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
        await processarExcelVenda({ 
            userId, nomeLoja, razao, cnpj: document.getElementById('cliCnpj').value, 
            formaPagamento: 'Transferência', prazo: '-', totalV: window.resumoGlobal.totalV, 
            itens, isTransferencia: true 
        }); 
        alert("✅ Transferência gerada com sucesso!"); window.location.reload(); 
    } catch (e) { alert("Falha: " + e.message); } finally { btn.innerHTML = "<span style='font-size: 16px;'>⬇️</span> Transferir"; btn.disabled = false; }
};

iniciar();
