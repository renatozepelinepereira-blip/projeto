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

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

document.getElementById('cliRazao').addEventListener('input', (e) => {
    const encontrado = filiaisSalvas.find(c => c.razao.toUpperCase() === e.target.value.toUpperCase());
    if(encontrado) document.getElementById('cliCnpj').value = encontrado.cnpj;
});

document.getElementById('cliCnpj').addEventListener('input', function (e) {
    let x = e.target.value.replace(/\D/g, '');
    if (x.length <= 11) { x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } 
    else { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x;
    const encontrado = filiaisSalvas.find(c => c.cnpj === x);
    if(encontrado) document.getElementById('cliRazao').value = encontrado.razao;
});

window.mudarAba = (cat) => { 
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); 
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); 
    document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1)).classList.add('active'); 
    document.getElementById('content_' + cat).classList.add('active'); 
};

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    if (userSnap.exists()) window.lojaCnpj = userSnap.data().cnpj || "CNPJ NÃO CADASTRADO";

    const planilhas = userSnap.exists() && userSnap.data().planilhas ? userSnap.data().planilhas : { sorvete: true, seco: false, balde: false, venda: true };
    
    if (planilhas.venda === false && userId !== 'admin') {
        let menuVenda = document.querySelector('a[href="loja.html"]');
        if(menuVenda) menuVenda.style.display = 'none';
    }

    const allUsers = await getDocs(collection(db, "usuarios"));
    let dlistaNomes = document.getElementById('listaLojasDestino'); 
    let dlistaCnpj = document.getElementById('listaCnpjDestino');
    
    allUsers.forEach(u => {
        if(u.id !== 'admin' && u.id !== userId) { 
            let fData = { razao: u.data().nomeLoja, cnpj: u.data().cnpj || '' };
            if(fData.cnpj) { filiaisSalvas.push(fData); dlistaNomes.innerHTML += `<option value="${fData.razao}">`; dlistaCnpj.innerHTML += `<option value="${fData.cnpj}">`; }
        }
    });

    let primeiraAba = null;
    if(planilhas.sorvete) { document.getElementById('btnTabSorvete').style.display = 'block'; primeiraAba = primeiraAba || 'sorvete'; }
    if(planilhas.seco) { document.getElementById('btnTabSeco').style.display = 'block'; primeiraAba = primeiraAba || 'seco'; }
    if(planilhas.balde) { document.getElementById('btnTabBalde').style.display = 'block'; primeiraAba = primeiraAba || 'balde'; }
    if(primeiraAba) window.mudarAba(primeiraAba);

    const [precoTfSnap, prodSnap] = await Promise.all([ getDoc(doc(db, "precos", "tf")), getDocs(collection(db, "produtos")) ]);
    const precosTF = precoTfSnap.exists() ? precoTfSnap.data() : {};

    prodSnap.forEach(d => {
        const item = d.data(); const objTf = precosTF[item.codigo];
        if (objTf !== undefined) {
            if((typeof objTf === 'object' ? (objTf.visivel !== false) : true)) {
                produtosGlobais.push({ ...item, precoFinal: typeof objTf === 'object' ? objTf.preco : objTf, catReal: (item.categoria || 'sorvete').toLowerCase().trim() });
            }
        }
    });
    renderizarTabelas();
}

function renderizarTabelas() {
    produtosGlobais.forEach((p, i) => {
        let cat = p.catReal; if(!['sorvete', 'seco', 'balde'].includes(cat)) cat = 'sorvete';
        const tbody = document.querySelector(`#tbl_${cat} tbody`);
        if(tbody) {
            tbody.innerHTML += `<tr id="tr_${i}"><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>R$ ${p.precoFinal.toFixed(2)}</td>
                <td><input type="number" id="eng_${i}" value="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
                <td><input type="number" id="uni_${i}" value="0" min="0" step="1" oninput="window.calcularTudo()"></td><td id="sub_${i}" style="font-weight:bold;">R$ 0.00</td></tr>`;
        }
    });
}

window.calcularTudo = () => {
    let totalCaixas = 0; let totalPecas = 0; let valorTotal = 0;
    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`);
        if(!inputEng || !inputUni) return;
        let cx = parseFloat(inputEng.value) || 0; let un = parseFloat(inputUni.value) || 0;
        let qtdTotalPecas = (cx * p.engradado) + un; let sub = qtdTotalPecas * p.precoFinal;
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
    const razaoDestino = document.getElementById('cliRazao').value.trim(); 
    const cnpjDestino = document.getElementById('cliCnpj').value.trim(); 
    const cnpjOrigem = window.lojaCnpj || "CNPJ NÃO CADASTRADO";
    const btn = document.querySelector('.btn-gerar');
    
    if(!razaoDestino || !cnpjDestino) return alert("⚠️ ATENÇÃO: Os campos Filial de Entrada e CNPJ da Filial não podem ficar em branco!");

    const cnpjLimpo = cnpjDestino.replace(/\D/g, '');
    const lojaValida = filiaisSalvas.find(f => f.cnpj.replace(/\D/g, '') === cnpjLimpo);
    if(!lojaValida) return alert("⛔ OPERAÇÃO BLOQUEADA!\nSó é permitido transferir para lojas da rede cadastradas.");

    btn.innerText = "⏳ A GERAR...";

    try {
        // BACKUP LEVE
        let itensSelecionados = produtosGlobais.filter(p => p.calcTotalUnidades > 0).map(p => ({
            codigo: p.codigo, descricao: p.descricao, precoFinal: p.precoFinal, engradado: p.engradado,
            calcQtdCx: p.calcQtdCx, calcQtdUn: p.calcQtdUn, calcTotalUnidades: p.calcTotalUnidades, catReal: p.catReal
        }));
        
        let dadosBackup = {
            tipo: 'transferencia', razaoDestino, cnpjDestino, cnpjOrigem,
            resumo: window.resumoTransferencia, itens: itensSelecionados
        };

        await addDoc(collection(db, "historico"), { 
            lojaId: userId, nomeLoja: nomeLoja, acao: "Gerou Transferência", destino: razaoDestino, 
            dataHora: serverTimestamp(), dadosPlanilha: JSON.stringify(dadosBackup) 
        });

        const response = await fetch('./TRANSFERENCIA.xlsx');
        const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

        const preencherAba = (nomeAba, categoriasPermitidas, tipoAba) => {
            const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
            let selecionados = produtosGlobais.filter(p => categoriasPermitidas.includes(p.catReal) && p.calcTotalUnidades > 0);
            if(selecionados.length === 0) return;
            let qtdTotalUnidadeAba = 0; let valorTotalAba = 0;
            selecionados.forEach(p => { qtdTotalUnidadeAba += p.calcTotalUnidades; valorTotalAba += p.calcSubtotal; });

            if (tipoAba === 'FATURAMENTO') { sheet.getCell('D7').value = cnpjOrigem; sheet.getCell('I7').value = cnpjDestino; sheet.getCell('E8').value = qtdTotalUnidadeAba; sheet.getCell('J8').value = valorTotalAba; } 
            else { sheet.getCell('E7').value = cnpjOrigem; sheet.getCell('K7').value = razaoDestino; sheet.getCell('D8').value = window.resumoTransferencia.totalCaixas; sheet.getCell('G8').value = window.resumoTransferencia.totalPecas; sheet.getCell('L8').value = window.resumoTransferencia.valorTotal; }

            let linhaAtual = 10; 
            selecionados.forEach(item => {
                sheet.getCell(`C${linhaAtual}`).value = item.codigo;
                if (tipoAba === 'FATURAMENTO') { sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; } 
                else { sheet.getCell(`D${linhaAtual}`).value = item.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = item.descricao; }
                linhaAtual++;
            });
        };

        preencherAba("FATURAMENTO - PROD", ["sorvete", "balde"], "FATURAMENTO"); 
        preencherAba("FATURAMENTO - SECO", ["seco"], "FATURAMENTO"); 
        preencherAba("ROMANEIO", ["sorvete", "seco", "balde"], "ROMANEIO");
        
        const outBuffer = await wb.xlsx.writeBuffer(); 
        saveAs(new Blob([outBuffer]), `TRANSFERENCIA_${razaoDestino.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
    } catch (e) { alert("Erro ao processar."); }
    btn.innerText = "⬇️ GERAR PLANILHA TRANSFERÊNCIA";
};

iniciar();
