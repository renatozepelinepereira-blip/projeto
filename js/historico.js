import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
const userId = localStorage.getItem('user');
const nomeLoja = localStorage.getItem('nome') || userId;
if(!userId) window.location.href = 'index.html';
document.getElementById('txtLoja').innerText = nomeLoja;

let historicoGlobal = {};

window.toggleMenu = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('overlay').classList.toggle('show'); };

async function iniciar() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const planilhas = userSnap.exists() && userSnap.data().planilhas ? userSnap.data().planilhas : { venda: true };
    
    // Oculta Venda se desativado
    if (planilhas.venda === false && userId !== 'admin') {
        let menuVenda = document.querySelector('a[href="loja.html"]');
        if(menuVenda) menuVenda.style.display = 'none';
    }

    // Busca APENAS os logs desta filial
    const q = query(collection(db, "historico"), where("lojaId", "==", userId));
    const snap = await getDocs(q);
    
    let logs = [];
    snap.forEach(d => { logs.push({ id: d.id, ...d.data() }); });
    
    // Ordena do mais recente para o mais antigo (Feito via JavaScript para não exigir Index no Firebase)
    logs.sort((a, b) => {
        let timeA = a.dataHora ? (a.dataHora.seconds || 0) : 0;
        let timeB = b.dataHora ? (b.dataHora.seconds || 0) : 0;
        return timeB - timeA;
    });

    let tbody = document.querySelector('#tabelaHistoricoLoja tbody');
    tbody.innerHTML = '';
    if(logs.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Nenhuma planilha foi gerada ainda.</td></tr>'; return; }

    logs.forEach(data => {
        historicoGlobal[data.id] = data;
        let dataStr = 'Data Indisponível';
        if(data.dataHora) { 
            if(typeof data.dataHora.toDate === 'function') dataStr = data.dataHora.toDate().toLocaleString('pt-BR'); 
            else if(data.dataHora.seconds) dataStr = new Date(data.dataHora.seconds * 1000).toLocaleString('pt-BR'); 
        }
        
        let acoesBtn = "-";
        if(data.dadosPlanilha) {
            acoesBtn = `<button style="padding:6px 10px; font-size:12px; border:none; border-radius:4px; cursor:pointer; color:white; margin-right:5px; font-weight:bold; background:#007bff;" onclick="window.visualizarLog('${data.id}')">👁️ Ver</button>
                        <button style="padding:6px 10px; font-size:12px; border:none; border-radius:4px; cursor:pointer; color:white; font-weight:bold; background:#28a745;" onclick="window.regenerarPlanilha('${data.id}')">⬇️ Baixar</button>`;
        }

        tbody.innerHTML += `<tr>
            <td style="padding:10px; border-bottom:1px solid #eee;">${dataStr}</td>
            <td style="padding:10px; border-bottom:1px solid #eee; color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
            <td style="padding:10px; border-bottom:1px solid #eee;">${data.destino || '-'}</td>
            <td style="padding:10px; border-bottom:1px solid #eee;">${acoesBtn}</td>
        </tr>`;
    });
}

// === BARRA DE PESQUISA DO LOJISTA ===
document.getElementById('pesquisaLogLoja').addEventListener('input', function() {
    let filtro = this.value.toLowerCase();
    let linhas = document.querySelectorAll('#tabelaHistoricoLoja tbody tr');
    linhas.forEach(linha => {
        if (linha.querySelector('td[colspan]')) return;
        let textoLinha = linha.textContent.toLowerCase();
        linha.style.display = textoLinha.includes(filtro) ? '' : 'none';
    });
});

// === LÓGICA DE RECRIAÇÃO DA PLANILHA (VIA ESQUELETO JSON) ===
window.visualizarLog = (logId) => {
    const log = historicoGlobal[logId];
    if(!log || !log.dadosPlanilha) return;
    
    const dados = JSON.parse(log.dadosPlanilha);
    let html = `<p><b>Tipo:</b> ${dados.tipo.toUpperCase()}</p>`;
    
    if(dados.tipo === 'venda') {
        html += `<p><b>Cliente:</b> ${dados.razao} | <b>CNPJ:</b> ${dados.cnpj}</p>
                 <p><b>Total Unidades:</b> ${dados.totalU} un | <b>Valor Líquido:</b> R$ ${dados.totalV.toFixed(2)}</p><hr>`;
    } else {
        html += `<p><b>Destino:</b> ${dados.razaoDestino} | <b>CNPJ Destino:</b> ${dados.cnpjDestino}</p>
                 <p><b>Total Caixas:</b> ${dados.resumo.totalCaixas} cx | <b>Total Peças:</b> ${dados.resumo.totalPecas} un</p><hr>`;
    }
    
    html += `<table style="width:100%; text-align:left; font-size:12px;"><tr><th style="padding-bottom:5px;">Cód</th><th style="padding-bottom:5px;">Produto</th><th style="padding-bottom:5px;">Qtd Cx</th><th style="padding-bottom:5px;">Qtd Un</th></tr>`;
    dados.itens.forEach(i => {
        html += `<tr><td style="padding:4px 0; border-bottom:1px solid #eee;">${i.codigo}</td><td style="border-bottom:1px solid #eee;">${i.descricao}</td><td style="border-bottom:1px solid #eee;">${i.calcQtdCx}</td><td style="border-bottom:1px solid #eee;">${i.calcQtdUn}</td></tr>`;
    });
    html += `</table>`;

    document.getElementById('conteudoDetalhesLog').innerHTML = html;
    document.getElementById('btnRegerarPlanilhaModal').onclick = () => window.regenerarPlanilha(logId);
    document.getElementById('modalDetalhesLog').style.display = 'flex';
};

window.regenerarPlanilha = async (logId) => {
    const log = historicoGlobal[logId];
    if(!log || !log.dadosPlanilha) return alert("Dados corrompidos ou não encontrados.");
    
    const dados = JSON.parse(log.dadosPlanilha);
    const isVenda = dados.tipo === 'venda';
    const btn = document.getElementById('btnRegerarPlanilhaModal');
    let textoOriginal = btn.innerText;
    btn.innerText = "⏳ Gerando Planilha..."; btn.disabled = true;

    try {
        const templateName = isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx';
        const response = await fetch(templateName);
        if(!response.ok) throw new Error("Arquivo modelo não encontrado no servidor.");
        const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

        const preencherAba = (nomeAba, funcFiltro, tipoAba) => {
            const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
            let selecionados = dados.itens.filter(funcFiltro);
            if(selecionados.length === 0) return;

            if(isVenda) {
                sheet.getCell('E6').value = dados.razao; sheet.getCell('J6').value = dados.cnpj; sheet.getCell('F7').value = dados.totalU; sheet.getCell('L7').value = dados.totalV; 
                let catName = nomeAba.split(' ')[1].toLowerCase();
                let descKey = catName==='sorvete'?'sorvete':catName==='seco'?'seco':'balde';
                sheet.getCell('D8').value = (dados.descontos[descKey] || 0) + "%"; sheet.getCell('F8').value = dados.prazo;
                
                let linhaAtual = 10; let metade = Math.ceil(selecionados.length / 2);
                for(let i = 0; i < metade; i++) {
                    let esq = selecionados[i]; let dir = selecionados[i + metade];
                    sheet.getCell(`C${linhaAtual}`).value = esq.codigo; sheet.getCell(`D${linhaAtual}`).value = esq.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = esq.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = esq.descricao; sheet.getCell(`G${linhaAtual}`).value = esq.precoFinal; 
                    if(dir) { sheet.getCell(`I${linhaAtual}`).value = dir.codigo; sheet.getCell(`J${linhaAtual}`).value = dir.calcQtdCx; sheet.getCell(`K${linhaAtual}`).value = dir.calcTotalUnidades; sheet.getCell(`L${linhaAtual}`).value = dir.descricao; sheet.getCell(`M${linhaAtual}`).value = dir.precoFinal; }
                    linhaAtual++;
                }
            } else {
                let qtdTotalUnidadeAba = 0; let valorTotalAba = 0;
                selecionados.forEach(p => { qtdTotalUnidadeAba += p.calcTotalUnidades; valorTotalAba += p.calcSubtotal; });

                if (tipoAba === 'FATURAMENTO') { sheet.getCell('D7').value = dados.cnpjOrigem; sheet.getCell('I7').value = dados.cnpjDestino; sheet.getCell('E8').value = qtdTotalUnidadeAba; sheet.getCell('J8').value = valorTotalAba; 
                } else if (tipoAba === 'ROMANEIO') { sheet.getCell('E7').value = dados.cnpjOrigem; sheet.getCell('K7').value = dados.razaoDestino.replace(/_/g, ' '); sheet.getCell('D8').value = dados.resumo.totalCaixas; sheet.getCell('G8').value = dados.resumo.totalPecas; sheet.getCell('L8').value = dados.resumo.valorTotal; }

                let linhaAtual = 10; 
                for(let i = 0; i < selecionados.length; i++) {
                    let item = selecionados[i]; sheet.getCell(`C${linhaAtual}`).value = item.codigo;
                    if (tipoAba === 'FATURAMENTO') { sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; 
                    } else if (tipoAba === 'ROMANEIO') { sheet.getCell(`D${linhaAtual}`).value = item.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = item.descricao; }
                    linhaAtual++;
                }
            }
        };

        if(isVenda) {
            preencherAba("ROMANEIO SORVETE", p => (p.catReal === 'sorvete' && !p.isPromo) || (p.isPromo && p.catReal === 'promo'));
            preencherAba("ROMANEIO SECO", p => p.catReal === 'seco' && !p.isPromo);
            preencherAba("ROMANEIO BALDE", p => p.catReal === 'balde' && !p.isPromo);
            const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `REGERADO_PEDIDO_${dados.razao.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
        } else {
            preencherAba("FATURAMENTO - PROD", p => ['sorvete', 'balde'].includes(p.catReal), "FATURAMENTO"); 
            preencherAba("FATURAMENTO - SECO", p => p.catReal === 'seco', "FATURAMENTO"); 
            preencherAba("ROMANEIO", p => ['sorvete', 'seco', 'balde'].includes(p.catReal), "ROMANEIO");
            const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `REGERADO_TRANSFERENCIA_${dados.razaoDestino.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
        }

    } catch (e) { console.error(e); alert("Erro ao recriar a planilha a partir do backup."); }
    btn.innerText = textoOriginal; btn.disabled = false;
};

iniciar();
