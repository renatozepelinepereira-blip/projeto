import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;

if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = [];
let filiaisSalvas = [];
window.lojaCnpj = "Não Cadastrado"; 
window.resumoTransferencia = { totalCaixas: 0, totalPecas: 0, valorTotal: 0 };

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

// === MUDANÇA DE ABAS (CORRIGIDO) ===
window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
    
    const btn = document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1));
    const content = document.getElementById('content_' + cat);
    
    if(btn) btn.classList.add('active'); 
    if(content) content.classList.add('active'); 
};

// === ATALHO DO ENTER (PULA APENAS NOS CAMPOS VISÍVEIS) ===
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type === 'number') {
        e.preventDefault();
        // Procura todos os inputs apenas dentro da aba que está visível no momento
        const inputs = Array.from(document.querySelectorAll('.tab-content.active td input[type="number"]'));
        const index = inputs.indexOf(e.target);
        if (index > -1 && index < inputs.length - 1) { 
            inputs[index + 1].focus(); 
            inputs[index + 1].select(); // Seleciona o texto atual para facilitar a edição
        }
    }
});

// Auto-preenchimento
document.getElementById('cliRazao').addEventListener('input', (e) => { const enc = filiaisSalvas.find(c => c.razao.toUpperCase() === e.target.value.toUpperCase()); if(enc) document.getElementById('cliCnpj').value = enc.cnpj; });
document.getElementById('cliCnpj').addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '');
    if (x.length <= 11) { x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } else { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x;
    const enc = filiaisSalvas.find(c => c.cnpj === x); if(enc) document.getElementById('cliRazao').value = enc.razao;
});

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    if (userSnap.exists()) window.lojaCnpj = userSnap.data().cnpj || "CNPJ NÃO CADASTRADO";
    const planilhas = userSnap.data()?.planilhas || { sorvete: true, seco: true, balde: true, venda: true };
    
    if (planilhas.venda === false && userId !== 'admin') { 
        let mVenda = document.getElementById('linkVendaSidebar'); 
        if(mVenda) mVenda.style.display = 'none'; 
    }

    const allUsers = await getDocs(collection(db, "usuarios"));
    let dlistaNomes = document.getElementById('listaLojasDestino'); let dlistaCnpj = document.getElementById('listaCnpjDestino');
    allUsers.forEach(u => { if(u.id !== 'admin' && u.id !== userId) { let fData = { razao: u.data().nomeLoja, cnpj: u.data().cnpj || '' }; if(fData.cnpj) { filiaisSalvas.push(fData); dlistaNomes.innerHTML += `<option value="${fData.razao}">`; dlistaCnpj.innerHTML += `<option value="${fData.cnpj}">`; } } });

    // Lógica para esconder abas bloqueadas e selecionar a primeira disponível
    let primeiraAba = null;
    if(planilhas.sorvete !== false) { document.getElementById('btnTabSorvete').style.display = 'inline-block'; primeiraAba = primeiraAba || 'sorvete'; } else { document.getElementById('btnTabSorvete').style.display = 'none'; }
    if(planilhas.seco) { document.getElementById('btnTabSeco').style.display = 'inline-block'; primeiraAba = primeiraAba || 'seco'; } else { document.getElementById('btnTabSeco').style.display = 'none'; }
    if(planilhas.balde) { document.getElementById('btnTabBalde').style.display = 'inline-block'; primeiraAba = primeiraAba || 'balde'; } else { document.getElementById('btnTabBalde').style.display = 'none'; }
    
    if(primeiraAba) window.mudarAba(primeiraAba);

    const [precoTfSnap, prodSnap] = await Promise.all([ getDoc(doc(db, "precos", "tf")), getDocs(collection(db, "produtos")) ]);
    const precosTF = precoTfSnap.exists() ? precoTfSnap.data() : {};

    prodSnap.forEach(d => {
        const item = d.data(); const objTf = precosTF[item.codigo];
        if (objTf !== undefined && (typeof objTf === 'object' ? (objTf.visivel !== false) : true)) {
            produtosGlobais.push({ ...item, precoFinal: typeof objTf === 'object' ? objTf.preco : objTf, catReal: (item.categoria || 'sorvete').toLowerCase().trim() });
        }
    });
    renderizarTabelas();
}

function renderizarTabelas() {
    produtosGlobais.forEach((p, i) => {
        let cat = p.catReal; if(!['sorvete', 'seco', 'balde'].includes(cat)) cat = 'sorvete';
        const tbody = document.querySelector(`#tbl_${cat} tbody`);
        if(tbody) {
            // CORREÇÃO DO "01": value="" foi retirado e substituído por placeholder="0"
            tbody.innerHTML += `<tr id="tr_${i}"><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>R$ ${p.precoFinal.toFixed(2)}</td>
                <td><input type="number" id="eng_${i}" placeholder="0" min="0" step="0.5" oninput="window.calcularTudo()" onfocus="this.select()"></td>
                <td><input type="number" id="uni_${i}" placeholder="0" min="0" step="1" oninput="window.calcularTudo()" onfocus="this.select()"></td><td id="sub_${i}" style="font-weight:bold;">R$ 0.00</td></tr>`;
        }
    });
}

window.calcularTudo = () => {
    let totalCaixas = 0; let totalPecas = 0; let valorTotal = 0;
    
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`);
        if(!inputEng || !inputUni) return;
        
        let cxStr = inputEng.value;
        let unStr = inputUni.value;

        let cx = parseFloat(cxStr) || 0; 
        let un = parseFloat(unStr) || 0;
        
        // --- TRAVAS DE SEGURANÇA SEVERAS ---
        if (cxStr !== "" && (cx * 10) % 5 !== 0) { 
            alert(`⚠️ ERRO: Quantidade de Engradados inválida em "${p.descricao}". Apenas múltiplos de 0.5 (Ex: 0.5, 1, 1.5).`); 
            inputEng.value = ""; cx = 0; 
        }
        if (unStr !== "" && un % 1 !== 0) { 
            alert(`⚠️ ERRO: Unidades devem ser valores inteiros.`); 
            inputUni.value = ""; un = 0; 
        }

        let capacidadeEngradado = parseFloat(p.engradado) || 1;
        let qtdTotalPecas = (cx * capacidadeEngradado) + un; 
        let sub = qtdTotalPecas * p.precoFinal;
        
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcQtdCx = cx; p.calcQtdUn = un; p.calcTotalUnidades = qtdTotalPecas; p.calcSubtotal = sub;
        
        totalCaixas += cx; totalPecas += qtdTotalPecas; valorTotal += sub;
        let tr = document.getElementById(`tr_${i}`); if (tr) { if (qtdTotalPecas > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });
    
    document.getElementById('resTotalEngradados').innerText = totalCaixas + " cx"; 
    document.getElementById('resTotalUnidades').innerText = totalPecas + " un"; 
    document.getElementById('resValorTotal').innerText = "R$ " + valorTotal.toFixed(2);
    window.resumoTransferencia = { totalCaixas, totalPecas, valorTotal };
};

window.gerarExcelTransferencia = async () => {
    // A função original que enviei antes. Mantenha ela igual, sem alterações.
    // Ela começa com: const razaoDestino = document.getElementById('cliRazao').value.trim(); ...
};

iniciar();
