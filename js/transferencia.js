// js/transferencia.js - Módulo de Transferência (Preços Fixos TF)
import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { processarExcelTransferencia } from "./utils/excel.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = []; 
let filiaisSalvas = [];
window.lojaCnpj = "Não Cadastrado"; 
window.resumoTransferencia = { totalCaixas: 0, totalPecas: 0, valorTotal: 0 };

iniciarInterfaceGlobais();

window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => { c.classList.remove('active'); c.style.display = 'none'; }); 
    const btn = document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1));
    const content = document.getElementById('content_' + cat);
    if(btn) btn.classList.add('active'); if(content) { content.classList.add('active'); content.style.display = 'block'; }
};

document.getElementById('cliRazao').addEventListener('input', (e) => { const enc = filiaisSalvas.find(c => c.razao.toUpperCase() === e.target.value.toUpperCase()); if(enc) document.getElementById('cliCnpj').value = enc.cnpj; });
document.getElementById('cliCnpj').addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '');
    if (x.length <= 11) { x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } else { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x; const enc = filiaisSalvas.find(c => c.cnpj === x); if(enc) document.getElementById('cliRazao').value = enc.razao;
});

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const dadosUsuario = userSnap.data() || {};
    
    if (dadosUsuario.cnpj) window.lojaCnpj = dadosUsuario.cnpj;
    
    const planilhas = dadosUsuario.planilhas || { sorvete: true, seco: true, balde: true, venda: true };
    if (planilhas.venda === false && userId !== 'admin') { 
        let mVenda = document.getElementById('linkVendaSidebar'); 
        if(mVenda) mVenda.style.display = 'none'; 
    }

    const allUsers = await getDocs(collection(db, "usuarios"));
    allUsers.forEach(u => { 
        if(u.id !== 'admin' && u.id !== userId) { 
            let fData = { razao: u.data().nomeLoja, cnpj: u.data().cnpj || '' }; 
            if(fData.cnpj) { 
                filiaisSalvas.push(fData); 
                document.getElementById('listaLojasDestino').innerHTML += `<option value="${fData.razao}">`; 
                document.getElementById('listaCnpjDestino').innerHTML += `<option value="${fData.cnpj}">`; 
            } 
        } 
    });

    let primeiraAba = null;
    if(planilhas.sorvete !== false) { document.getElementById('btnTabSorvete').style.display = 'inline-block'; primeiraAba = primeiraAba || 'sorvete'; } else { document.getElementById('btnTabSorvete').style.display = 'none'; }
    if(planilhas.seco) { document.getElementById('btnTabSeco').style.display = 'inline-block'; primeiraAba = primeiraAba || 'seco'; } else { document.getElementById('btnTabSeco').style.display = 'none'; }
    if(planilhas.balde) { document.getElementById('btnTabBalde').style.display = 'inline-block'; primeiraAba = primeiraAba || 'balde'; } else { document.getElementById('btnTabBalde').style.display = 'none'; }
    if(primeiraAba) window.mudarAba(primeiraAba);

    // Na Transferência, a tabela é sempre a 'TF'
    const [precoTfSnap, prodSnap] = await Promise.all([ 
        getDoc(doc(db, "precos", "tf")), 
        getDocs(collection(db, "produtos")) 
    ]);
    
    const precosTF = precoTfSnap.exists() ? precoTfSnap.data() : {};

    prodSnap.forEach(d => {
        const item = d.data(); 
        const objTf = precosTF[item.codigo];
        
        if (objTf !== undefined && (typeof objTf === 'object' ? (objTf.visivel !== false) : true)) {
            let rawCat = (item.categoria || 'sorvete').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            let safeCat = 'sorvete'; 
            if (rawCat.includes('seco')) safeCat = 'seco'; 
            else if (rawCat.includes('balde')) safeCat = 'balde';
            
            produtosGlobais.push({ 
                ...item, 
                precoFinal: typeof objTf === 'object' ? objTf.preco : objTf, 
                catReal: safeCat 
            });
        }
    });
    
    renderizarTabelas();
}

function renderizarTabelas() {
    produtosGlobais.forEach((p, i) => {
        const tbody = document.querySelector(`#tbl_${p.catReal} tbody`);
        if(tbody) {
            let imgHtml = p.imagem ? `<img src="${p.imagem}" class="img-produto">` : `<div class="img-placeholder">📷</div>`;
            tbody.innerHTML += `<tr id="tr_${i}"><td style="text-align: center;">${imgHtml}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>R$ ${p.precoFinal.toFixed(2)}</td>
                <td><input type="number" id="eng_${i}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
                <td><input type="number" id="uni_${i}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()"></td><td id="sub_${i}" style="font-weight:bold;">R$ 0.00</td></tr>`;
        }
    });
}

window.calcularTudo = () => {
    let totalCaixas = 0; let totalPecas = 0; let valorTotal = 0;
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`);
        if(!inputEng || !inputUni) return;
        
        let cxStr = inputEng.value; let unStr = inputUni.value;
        let cx = parseFloat(cxStr) || 0; let un = parseFloat(unStr) || 0;
        
        if (cxStr !== "" && (cx * 10) % 5 !== 0) { alert(`⚠️ ERRO em "${p.descricao}". Apenas múltiplos de 0.5.`); inputEng.value = ""; cx = 0; }
        if (unStr !== "" && un % 1 !== 0) { alert(`⚠️ ERRO: Unidades devem ser inteiras.`); inputUni.value = ""; un = 0; }

        let capacidadeEngradado = parseFloat(p.engradado) || 1;
        let qtdTotalPecas = (cx * capacidadeEngradado) + un; let sub = qtdTotalPecas * p.precoFinal;
        
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcQtdCx = cx; p.calcQtdUn = un; p.calcTotalUnidades = qtdTotalPecas; p.calcSubtotal = sub;
        totalCaixas += cx; totalPecas += qtdTotalPecas; valorTotal += sub;
        
        let tr = document.getElementById(`tr_${i}`); if (tr) { if (qtdTotalPecas > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });
    document.getElementById('resTotalEngradados').innerText = totalCaixas + " cx"; document.getElementById('resTotalUnidades').innerText = totalPecas + " un"; document.getElementById('resValorTotal').innerText = "R$ " + valorTotal.toFixed(2);
    window.resumoTransferencia = { totalCaixas, totalPecas, valorTotal };
};

window.gerarExcelTransferencia = async () => {
    const razaoDestino = document.getElementById('cliRazao').value.trim(); 
    const cnpjDestino = document.getElementById('cliCnpj').value.trim(); 
    
    if(!razaoDestino || !cnpjDestino) return alert("Preencha a Filial e CNPJ!");
    
    const cnpjLimpo = cnpjDestino.replace(/\D/g, '');
    const lojaValida = filiaisSalvas.find(f => f.cnpj.replace(/\D/g, '') === cnpjLimpo);
    if(!lojaValida) return alert("⛔ Só é permitido transferir para lojas da rede cadastradas.");

    let itensSelecionados = produtosGlobais.filter(p => p.calcTotalUnidades > 0);
    if (itensSelecionados.length === 0) return alert("Nenhuma quantidade preenchida!");

    const btn = document.querySelector('.btn-primario'); 
    btn.innerText = "⏳ A GERAR PLANILHA..."; 
    btn.disabled = true;

    try {
        let itensMapeados = itensSelecionados.map(p => ({ codigo: p.codigo, descricao: p.descricao, precoFinal: p.precoFinal, engradado: p.engradado, calcQtdCx: p.calcQtdCx || 0, calcQtdUn: p.calcQtdUn || 0, calcTotalUnidades: p.calcTotalUnidades || 0, catReal: p.catReal }));
        
        await processarExcelTransferencia({
            userId, nomeLoja, razaoDestino, cnpjDestino, cnpjOrigem: window.lojaCnpj, 
            resumo: window.resumoTransferencia, itens: itensMapeados
        });
        
    } catch (e) { 
        alert("Falha: " + e.message); 
    } finally { 
        btn.innerText = "⬇️ GERAR PLANILHA DE TRANSFERÊNCIA"; 
        btn.disabled = false; 
    }
};

iniciar();
