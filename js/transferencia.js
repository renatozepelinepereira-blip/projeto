import { db } from "./api/firebase.js";
import { processarExcelVenda } from "./utils/excel.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html'; 

let produtosGlobais = []; 
let filiaisSalvas = [];

iniciarInterfaceGlobais();
document.getElementById('txtLoja').innerText = nomeLoja;

window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
    document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1)).classList.add('active'); 
    document.getElementById('content_' + cat).classList.add('active'); 
};

async function iniciar() {
    const uSnap = await getDocs(collection(db, "usuarios"));
    const listaNomes = document.getElementById('listaFiliais');
    uSnap.forEach(u => { 
        if(u.id !== 'admin' && u.id !== userId) {
            const f = u.data();
            filiaisSalvas.push(f);
            listaNomes.innerHTML += `<option value="${f.nomeLoja || u.id}">`; 
        }
    });

    document.getElementById('cliRazao').addEventListener('change', (e) => {
        const filial = filiaisSalvas.find(c => c.nomeLoja === e.target.value);
        if(filial) document.getElementById('cliCnpj').value = filial.cnpj || '';
    });

    const prodSnap = await getDocs(collection(db, "produtos"));
    let htmlBuffers = { sorvete: "", seco: "" };

    prodSnap.forEach(d => {
        const item = d.data(); 
        let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let cat = rawCat.includes('seco') ? 'seco' : 'sorvete'; 
        
        const idx = produtosGlobais.length;
        produtosGlobais.push({ ...item, catReal: cat, precoFinal: 0 });
        
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
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`); 
        if(!inputEng || !inputUni) return;
        
        let cxStr = inputEng.value;
        let cx = parseFloat(cxStr) || 0; 
        let un = parseFloat(inputUni.value) || 0;

        if (cxStr !== "" && (cx * 10) % 5 !== 0) { alert(`Apenas múltiplos de 0.5 nas caixas.`); inputEng.value = ""; cx = 0; }
        if (inputUni.value !== "" && un % 1 !== 0) { alert(`Apenas unidades inteiras.`); inputUni.value = ""; un = 0; }
        
        let cap = parseFloat(p.engradado) || 1; 
        let qtd = (cx * cap) + un; 
        
        p.calcTotalUnidades = qtd; 
        p.calcSubtotal = 0;
        
        let tr = document.getElementById(`tr_${i}`); 
        if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });
};

window.gerarExcelTransferencia = async () => {
    const razao = document.getElementById('cliRazao').value.trim();
    if(!razao) return alert("Selecione a Filial de Destino!");
    
    let itens = produtosGlobais.filter(p => p.calcTotalUnidades > 0);
    if (itens.length === 0) return alert("Preencha alguma quantidade!");

    const btn = document.querySelector('.btn-primario'); 
    btn.innerHTML = "⏳ GERANDO..."; btn.disabled = true;
    
    try { 
        await processarExcelVenda({ userId, nomeLoja, razao, cnpj: document.getElementById('cliCnpj').value, formaPagamento: 'Transferência', prazo: '-', totalV: 0, itens, isTransferencia: true }); 
        alert("✅ Transferência gerada com sucesso!");
    } catch (e) { alert("Falha: " + e.message); } 
    finally { btn.innerHTML = "<span style='font-size: 22px; margin-right: 10px;'>⬇️</span> Gerar Transferência Excel"; btn.disabled = false; }
};

iniciar();
