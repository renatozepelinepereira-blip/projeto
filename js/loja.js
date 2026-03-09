import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where, setDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let produtosGlobais = [];
let clientesSalvos = [];
window.resumoGlobal = { sorvete: {u:0, vBruto:0, vLiq:0}, seco: {u:0, vBruto:0, vLiq:0}, balde: {u:0, vBruto:0, vLiq:0}, promo: {u:0, vBruto:0, vLiq:0}, totalU: 0, totalV: 0 };

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

document.getElementById('cliRazao').addEventListener('input', (e) => {
    const encontrado = clientesSalvos.find(c => c.razao.toUpperCase() === e.target.value.toUpperCase());
    if(encontrado) { document.getElementById('cliCnpj').value = encontrado.cnpj; document.getElementById('cliPrazo').value = encontrado.prazo || ''; }
});
document.getElementById('cliCnpj').addEventListener('input', (e) => {
    let x = e.target.value.replace(/\D/g, '');
    if (x.length <= 11) { x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d)/, '$1.$2'); x = x.replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } 
    else { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x;
    const encontrado = clientesSalvos.find(c => c.cnpj === x);
    if(encontrado) { document.getElementById('cliRazao').value = encontrado.razao; document.getElementById('cliPrazo').value = encontrado.prazo || ''; }
});

window.mudarAba = (cat) => { document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active')); document.getElementById('btnTab' + cat.charAt(0).toUpperCase() + cat.slice(1)).classList.add('active'); document.getElementById('content_' + cat).classList.add('active'); };

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const planilhas = userSnap.exists() && userSnap.data().planilhas ? userSnap.data().planilhas : { sorvete: true, seco: false, balde: false, promo: false, padrao: false, venda: true };
    
    if (planilhas.venda === false && userId !== 'admin') {
        window.location.href = 'transferencia.html';
        return;
    }

    const qClientes = query(collection(db, "clientes"), where("lojaId", "==", userId), where("tipo", "==", "venda"));
    const cliSnap = await getDocs(qClientes);
    let dlistaNomes = document.getElementById('listaNomesClientes'); let dlistaCnpj = document.getElementById('listaCnpjClientes');
    cliSnap.forEach(d => { clientesSalvos.push(d.data()); dlistaNomes.innerHTML += `<option value="${d.data().razao}">`; dlistaCnpj.innerHTML += `<option value="${d.data().cnpj}">`; });
    
    let primeiraAba = null;
    if(planilhas.sorvete) { document.getElementById('btnTabSorvete').style.display = 'block'; primeiraAba = primeiraAba || 'sorvete'; }
    if(planilhas.seco) { document.getElementById('btnTabSeco').style.display = 'block'; primeiraAba = primeiraAba || 'seco'; }
    if(planilhas.balde) { document.getElementById('btnTabBalde').style.display = 'block'; primeiraAba = primeiraAba || 'balde'; }
    if(planilhas.promo) { document.getElementById('btnTabPromo').style.display = 'block'; primeiraAba = primeiraAba || 'promo'; }
    if(primeiraAba) window.mudarAba(primeiraAba);

    const tabelaId = planilhas.padrao ? 'padrao' : userId; 
    const [precoSnap, promoSnap, prodSnap] = await Promise.all([ getDoc(doc(db, "precos", tabelaId)), planilhas.promo ? getDoc(doc(db, "precos", userId + "_promo")) : Promise.resolve({ exists: () => false }), getDocs(collection(db, "produtos")) ]);

    const meusPrecos = precoSnap.exists() ? precoSnap.data() : {}; const precosPromo = promoSnap.exists() ? promoSnap.data() : {};

    prodSnap.forEach(d => {
        const item = d.data(); const objPromo = precosPromo[item.codigo]; const objNormal = meusPrecos[item.codigo];
        if(planilhas.promo && objPromo !== undefined) {
            if((typeof objPromo === 'object' ? (objPromo.visivel !== false) : true)) produtosGlobais.push({ ...item, precoFinal: typeof objPromo === 'object' ? objPromo.preco : objPromo, isPromo: true, catReal: 'promo' });
        } else if (objNormal !== undefined) {
            if((typeof objNormal === 'object' ? (objNormal.visivel !== false) : true)) produtosGlobais.push({ ...item, precoFinal: typeof objNormal === 'object' ? objNormal.preco : objNormal, isPromo: false, catReal: (item.categoria || 'sorvete').toLowerCase().trim() });
        }
    });
    renderizarTabelas();
}

function renderizarTabelas() {
    produtosGlobais.forEach((p, i) => {
        let cat = p.isPromo ? 'promo' : p.catReal; if(!['sorvete', 'seco', 'balde', 'promo'].includes(cat)) cat = 'sorvete';
        const tbody = document.querySelector(`#tbl_${cat} tbody`);
        if(tbody) {
            tbody.innerHTML += `<tr id="tr_${i}"><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td style="${p.isPromo?'color:orange;font-weight:bold;':''}">R$ ${p.precoFinal.toFixed(2)}</td>
                <td><input type="number" id="eng_${i}" value="0" min="0" step="0.5" oninput="window.calcularTudo()"></td>
                <td><input type="number" id="uni_${i}" value="0" min="0" step="1" oninput="window.calcularTudo()"></td><td id="sub_${i}" style="font-weight:bold;">R$ 0.00</td></tr>`;
        }
    });
}

window.calcularTudo = () => {
    let dSorv = parseFloat(document.getElementById('desc_sorvete').value) || 0; let dSeco = parseFloat(document.getElementById('desc_seco').value) || 0; let dBald = parseFloat(document.getElementById('desc_balde').value) || 0; let dProm = parseFloat(document.getElementById('desc_promo').value) || 0;
    let resumo = { sorvete: { u: 0, vBruto: 0, vLiq: 0 }, seco: { u: 0, vBruto: 0, vLiq: 0 }, balde: { u: 0, vBruto: 0, vLiq: 0 }, promo: { u: 0, vBruto: 0, vLiq: 0 } };

    produtosGlobais.forEach((p, i) => {
        let inputEng = document.getElementById(`eng_${i}`); let inputUni = document.getElementById(`uni_${i}`);
        if(!inputEng || !inputUni) return;
        
        let cx = parseFloat(inputEng.value) || 0; let un = parseFloat(inputUni.value) || 0;
        if ((cx * 10) % 5 !== 0) { alert(`⚠️ ERRO NO ENGRADADO: Apenas múltiplos de meio em meio (Ex: 0.5, 1, 1.5).`); inputEng.value = ""; cx = 0; }
        if (un % 1 !== 0) { alert(`⚠️ ERRO NA UNIDADE: Apenas valores inteiros.`); inputUni.value = ""; un = 0; }

        let qtd = (cx * p.engradado) + un; let sub = qtd * p.precoFinal;
        document.getElementById(`sub_${i}`).innerText = `R$ ${sub.toFixed(2)}`;
        p.calcQtdCx = cx; p.calcQtdUn = un; p.calcTotalUnidades = qtd; p.calcSubtotal = sub;

        let cat = p.isPromo ? 'promo' : p.catReal; if(!['sorvete', 'seco', 'balde', 'promo'].includes(cat)) cat = 'sorvete';
        resumo[cat].u += qtd; resumo[cat].vBruto += sub;
        let tr = document.getElementById(`tr_${i}`); if (tr) { if (qtd > 0) tr.classList.add('linha-destaque'); else tr.classList.remove('linha-destaque'); }
    });

    resumo.sorvete.vLiq = resumo.sorvete.vBruto - (resumo.sorvete.vBruto * (dSorv / 100)); resumo.seco.vLiq = resumo.seco.vBruto - (resumo.seco.vBruto * (dSeco / 100)); resumo.balde.vLiq = resumo.balde.vBruto - (resumo.balde.vBruto * (dBald / 100)); resumo.promo.vLiq = resumo.promo.vBruto - (resumo.promo.vBruto * (dProm / 100));

    document.getElementById('resQtdSorvete').innerText = resumo.sorvete.u + " un"; document.getElementById('resValSorvete').innerText = "R$ " + resumo.sorvete.vLiq.toFixed(2);
    document.getElementById('resQtdSeco').innerText = resumo.seco.u + " un"; document.getElementById('resValSeco').innerText = "R$ " + resumo.seco.vLiq.toFixed(2);
    document.getElementById('resQtdBalde').innerText = resumo.balde.u + " un"; document.getElementById('resValBalde').innerText = "R$ " + resumo.balde.vLiq.toFixed(2);
    document.getElementById('resQtdPromo').innerText = resumo.promo.u + " un"; document.getElementById('resValPromo').innerText = "R$ " + resumo.promo.vLiq.toFixed(2);
    
    let totalUn = resumo.sorvete.u + resumo.seco.u + resumo.balde.u + resumo.promo.u; let valBrutoFinal = resumo.sorvete.vBruto + resumo.seco.vBruto + resumo.balde.vBruto + resumo.promo.vBruto; let valLiqFinal = resumo.sorvete.vLiq + resumo.seco.vLiq + resumo.balde.vLiq + resumo.promo.vLiq;
    document.getElementById('resQtdTotal').innerText = totalUn + " un"; document.getElementById('valComDesc').innerText = "R$ " + valLiqFinal.toFixed(2);

    const divSemDesc = document.getElementById('divSemDesc');
    if (valBrutoFinal > valLiqFinal) { document.getElementById('valSemDesc').innerText = "R$ " + valBrutoFinal.toFixed(2); divSemDesc.style.display = 'block'; } else { divSemDesc.style.display = 'none'; }
    window.resumoGlobal = { ...resumo, totalU: totalUn, totalV: valLiqFinal, dSorv, dSeco, dBald, dProm };
};

window.gerarExcelPedido = async () => {
    const razao = document.getElementById('cliRazao').value.trim(); const cnpj = document.getElementById('cliCnpj').value.trim(); const prazo = document.getElementById('cliPrazo').value.trim();
    if(!razao || !cnpj || !prazo) return alert("⚠️ ATENÇÃO: Os campos Razão Social, CPF/CNPJ e Prazo não podem ficar em branco!");

    document.querySelector('.btn-gerar').innerText = "⏳ GERANDO PEDIDO E SALVANDO CLIENTE...";

    try {
        const cnpjLimpo = cnpj.replace(/\D/g, ''); const idCliente = `${userId}_${cnpjLimpo}`;
        await setDoc(doc(db, "clientes", idCliente), { lojaId: userId, razao: razao, cnpj: cnpj, prazo: prazo, tipo: "venda" }, { merge: true });
        
        // === CRIA O BACKUP LEVE DA PLANILHA ===
        let itensSelecionados = produtosGlobais.filter(p => p.calcTotalUnidades > 0).map(p => ({
            codigo: p.codigo, descricao: p.descricao, precoFinal: p.precoFinal, engradado: p.engradado,
            calcQtdCx: p.calcQtdCx, calcQtdUn: p.calcQtdUn, calcTotalUnidades: p.calcTotalUnidades,
            catReal: p.catReal, isPromo: p.isPromo
        }));
        
        let dadosBackup = {
            tipo: 'venda', razao: razao, cnpj: cnpj, prazo: prazo,
            totalU: window.resumoGlobal.totalU, totalV: window.resumoGlobal.totalV,
            descontos: { sorvete: window.resumoGlobal.dSorv, seco: window.resumoGlobal.dSeco, balde: window.resumoGlobal.dBald, promo: window.resumoGlobal.dProm },
            itens: itensSelecionados
        };

        await addDoc(collection(db, "historico"), { lojaId: userId, nomeLoja: nomeLoja, acao: "Gerou Pedido de Venda", destino: razao, dataHora: serverTimestamp(), dadosPlanilha: JSON.stringify(dadosBackup) });
        // ======================================

        const response = await fetch('./PEDIDO.xlsx');
        if(!response.ok) { alert("⚠️ Erro: 'PEDIDO.xlsx' não encontrado."); document.querySelector('.btn-gerar').innerText = "⬇️ GERAR PEDIDO EM EXCEL"; return; }
        const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

        const preencherAba = (nomeAba, tipoCategoria) => {
            const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
            let selecionados = produtosGlobais.filter(p => (tipoCategoria === 'promo' ? p.isPromo : (p.catReal === tipoCategoria && !p.isPromo)) && p.calcTotalUnidades > 0);
            if(selecionados.length === 0) return;

            sheet.getCell('E6').value = razao; sheet.getCell('J6').value = cnpj; sheet.getCell('F7').value = window.resumoGlobal.totalU; sheet.getCell('L7').value = window.resumoGlobal.totalV; 
            let descKey = 'd' + tipoCategoria.charAt(0).toUpperCase() + tipoCategoria.slice(1);
            if(tipoCategoria==='sorvete') descKey='dSorv'; else if(tipoCategoria==='seco') descKey='dSeco'; else if(tipoCategoria==='balde') descKey='dBald'; else if(tipoCategoria==='promo') descKey='dProm';
            sheet.getCell('D8').value = (window.resumoGlobal[descKey] || 0) + "%"; sheet.getCell('F8').value = prazo;

            let linhaAtual = 10; let metade = Math.ceil(selecionados.length / 2);
            for(let i = 0; i < metade; i++) {
                let esq = selecionados[i]; let dir = selecionados[i + metade];
                sheet.getCell(`C${linhaAtual}`).value = esq.codigo; sheet.getCell(`D${linhaAtual}`).value = esq.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = esq.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = esq.descricao; sheet.getCell(`G${linhaAtual}`).value = esq.precoFinal; 
                if(dir) { sheet.getCell(`I${linhaAtual}`).value = dir.codigo; sheet.getCell(`J${linhaAtual}`).value = dir.calcQtdCx; sheet.getCell(`K${linhaAtual}`).value = dir.calcTotalUnidades; sheet.getCell(`L${linhaAtual}`).value = dir.descricao; sheet.getCell(`M${linhaAtual}`).value = dir.precoFinal; }
                linhaAtual++;
            }
        };

        preencherAba("ROMANEIO SORVETE", "sorvete"); preencherAba("ROMANEIO SECO", "seco"); preencherAba("ROMANEIO BALDE", "balde");
        const outBuffer = await wb.xlsx.writeBuffer();
        saveAs(new Blob([outBuffer]), `PEDIDO_${razao.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
    } catch (error) { console.error(error); alert("Erro ao gerar a planilha."); }
    document.querySelector('.btn-gerar').innerText = "⬇️ GERAR PEDIDO EM EXCEL";
};

iniciar();
