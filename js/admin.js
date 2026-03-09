import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, deleteField, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let usuariosData = {}; let editorItens = []; let itensExcluidos = []; let clientesData = {};
let historicoGlobal = {}; // Guarda os JSONs das planilhas para restaurar

window.mudarSecao = (secaoId) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + secaoId).classList.add('active');
    document.getElementById('nav-' + secaoId).classList.add('active');
    if(secaoId === 'dashboard') carregarDashboard();
    if(secaoId === 'lojas') carregarLojas();
    if(secaoId === 'clientes') carregarClientes();
};

window.fecharModal = (id) => { document.getElementById(id).style.display = 'none'; };

window.toggleLog = () => {
    const box = document.getElementById('containerTabelaHistorico');
    const btn = document.getElementById('btnToggleLog');
    if (box.style.display === 'none') {
        box.style.display = 'block'; btn.innerText = '👁️ Ocultar Log';
    } else {
        box.style.display = 'none'; btn.innerText = '👁️ Mostrar Log';
    }
};

const aplicaMascara = (e) => {
    let x = e.target.value.replace(/\D/g, '');
    if(x.length > 11) { x = x.replace(/^(\d{2})(\d)/, '$1.$2'); x = x.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3'); x = x.replace(/\.(\d{3})(\d)/, '.$1/$2'); x = x.replace(/(\d{4})(\d)/, '$1-$2'); }
    e.target.value = x;
};
document.getElementById('editCnpj').addEventListener('input', aplicaMascara);
document.getElementById('editCliCnpj').addEventListener('input', aplicaMascara);

function formatarNomeLogin(nomeRaw) {
    let nome = nomeRaw.toLowerCase();
    nome = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
    nome = nome.replace(/\([^)]*\)/g, " ");
    nome = nome.replace(/\/[a-z]{2}\b/g, " "); 
    nome = nome.replace(/\b(eskimo|eskimó|loja de fabrica|loja|fabrica|sorvetes|sorvete|de|atacadao|atacadão|cd)\b/g, " ");
    nome = nome.replace(/[^a-z0-9\s]/g, " "); 
    let palavras = nome.split(/\s+/).filter(p => p.length > 0);
    const romanos = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/;
    let loginStr = "";
    if (palavras.length > 0) {
        let ultima = palavras[palavras.length - 1];
        if (romanos.test(ultima)) { let base = palavras.slice(0, -1).join(""); loginStr = base + "." + ultima; } 
        else { loginStr = palavras.join(""); }
    }
    return loginStr ? "filial." + loginStr : "";
}

document.getElementById('editNome').addEventListener('input', (e) => {
    if(document.getElementById('editId').value === "NOVO") document.getElementById('editLogin').value = formatarNomeLogin(e.target.value);
});

window.apagarTodasLojas = async () => {
    if(!confirm("⚠️ ATENÇÃO EXTREMA: Isto vai apagar TODAS as lojas e tabelas de preços da base de dados (exceto o Admin)! Tem certeza que deseja prosseguir?")) return;
    if(!confirm("Atenção: Esta ação NÃO PODE ser desfeita. Deseja mesmo limpar tudo?")) return;
    const btn = document.getElementById('btnApagarTudo'); btn.innerText = "⏳ A limpar..."; btn.disabled = true;
    try {
        const snap = await getDocs(collection(db, "usuarios")); let count = 0;
        for(let d of snap.docs) { if(d.id !== 'admin') { await deleteDoc(doc(db, "usuarios", d.id)); await deleteDoc(doc(db, "precos", d.id)); count++; } }
        alert(`Limpeza concluída! ${count} lojas e seus preços foram apagados com sucesso.`);
    } catch (error) { console.error(error); alert("Erro ao tentar limpar o banco."); }
    btn.innerText = "🗑️ Limpar Banco de Lojas"; btn.disabled = false; carregarLojas(); carregarDashboard();
};

async function carregarDashboard() {
    const [snapLojas, snapCli, snapHist] = await Promise.all([ getDocs(collection(db, "usuarios")), getDocs(collection(db, "clientes")), getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) ]);
    document.getElementById('dashTotLojas').innerText = (snapLojas.size > 0 ? snapLojas.size - 1 : 0);
    document.getElementById('dashTotClientes').innerText = snapCli.size;
    document.getElementById('dashTotAcoes').innerText = snapHist.size;
    let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = '';
    if(snapHist.size === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma atividade registada ainda.</td></tr>'; return; }
    
    historicoGlobal = {};
    snapHist.forEach(d => {
        let data = d.data(); let dataStr = 'Data Indisponível';
        historicoGlobal[d.id] = data;
        if(data.dataHora) { if(typeof data.dataHora.toDate === 'function') dataStr = data.dataHora.toDate().toLocaleString('pt-BR'); else if(data.dataHora.seconds) dataStr = new Date(data.dataHora.seconds * 1000).toLocaleString('pt-BR'); }
        
        let acoesBtn = "-";
        if(data.dadosPlanilha) {
            acoesBtn = `<button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')">👁️ Ver</button>
                        <button class="btn-small btn-sucesso" style="margin:0;" onclick="window.regenerarPlanilha('${d.id}')">⬇️ Baixar</button>`;
        }

        tbody.innerHTML += `<tr><td>${dataStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoesBtn}</td></tr>`;
    });
}

// === LÓGICA DE BACKUP DE PLANILHAS (VISUALIZAÇÃO E DOWNLOAD) ===
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
    
    html += `<table style="width:100%; text-align:left; font-size:12px;"><tr><th>Cód</th><th>Produto</th><th>Qtd Cx</th><th>Qtd Un</th></tr>`;
    dados.itens.forEach(i => {
        html += `<tr><td>${i.codigo}</td><td>${i.descricao}</td><td>${i.calcQtdCx}</td><td>${i.calcQtdUn}</td></tr>`;
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
        if(!response.ok) throw new Error("Ficheiro template não encontrado no servidor.");
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

// === LOJAS E CRIAÇÃO ===
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    const tbody = document.querySelector('#tabelaLojas tbody'); tbody.innerHTML = ''; usuariosData = {};
    tbody.innerHTML += `<tr style="background:#e6f2ff;"><td><b>TABELA TF</b></td><td>Tabela de Transferência Base</td><td style="color:#666;">-</td>
        <td><button class="btn-small btn-preco" onclick="window.abrirPrecos('tf')">💲 Preços TF</button></td></tr>`;
    snap.forEach(d => {
        usuariosData[d.id] = d.data(); const u = d.data();
        if(d.id !== 'admin') {
            tbody.innerHTML += `<tr><td><b>${d.id}</b></td><td>${u.nomeLoja}</td><td style="color:#666;">${u.cnpj||'Não informado'}</td>
                <td><button class="btn-small btn-preco" onclick="window.abrirPrecos('${d.id}')">💲 Preços</button><button class="btn-small btn-edit" onclick="window.editarLoja('${d.id}')">✏️ Editar</button><button class="btn-small btn-del" onclick="window.excluirLoja('${d.id}')">❌</button></td></tr>`;
        }
    });
}

window.abrirNovoUsuario = () => { 
    document.getElementById('modalEditar').style.display='flex'; document.getElementById('tituloForm').innerText = "Cadastro de Loja"; document.getElementById('editId').value="NOVO"; document.getElementById('editLogin').value=""; document.getElementById('editLogin').disabled=false; document.getElementById('editCnpj').value=""; document.getElementById('editNome').value=""; 
    document.getElementById('chkAdmin').checked = false; document.getElementById('chkVenda').checked = true; // Venda padrão ativo
    document.getElementById('chkBalde').checked = false; document.getElementById('chkPromo').checked = false; document.getElementById('btnResetSenha').style.display = 'none'; document.getElementById('dicaSenhaMsg').style.display = 'block'; document.getElementById('alertaMigracao').style.display = 'none';
};

window.editarLoja = (id) => { 
    const u = usuariosData[id]; const plan = u.planilhas || {};
    document.getElementById('tituloForm').innerText = "Editar Loja"; document.getElementById('editId').value = id; document.getElementById('editLogin').value = id; document.getElementById('editLogin').disabled = false; document.getElementById('editNome').value = u.nomeLoja||""; document.getElementById('editCnpj').value = u.cnpj||""; 
    document.getElementById('chkAdmin').checked = u.tipo === 'admin'; 
    document.getElementById('chkVenda').checked = plan.venda !== false; 
    document.getElementById('chkBalde').checked = plan.balde||false; document.getElementById('chkPromo').checked = plan.promo||false; document.getElementById('btnResetSenha').style.display = 'block'; document.getElementById('dicaSenhaMsg').style.display = 'none'; document.getElementById('alertaMigracao').style.display = 'block'; document.getElementById('modalEditar').style.display = 'flex';
};

window.excluirLoja = async (id) => { if(confirm("Atenção: Excluir loja "+id+"? O histórico de preços dela será perdido!")){ await deleteDoc(doc(db, "usuarios", id)); carregarLojas(); carregarDashboard(); } };

window.resetarSenha = async () => {
    const id = document.getElementById('editId').value; if (id === "NOVO") return;
    if (confirm(`Tem a certeza que deseja repor a senha de ${id} para 'eskimo'?`)) { await setDoc(doc(db, "usuarios", id), { senha: "eskimo" }, { merge: true }); alert("Senha redefinida com sucesso! No próximo login a loja deverá criar uma nova senha."); }
};

document.getElementById('btnSalvarEdicao').onclick = async () => {
    const novoLogin = document.getElementById('editLogin').value.toLowerCase().trim(); const oldLogin = document.getElementById('editId').value;
    if(!novoLogin) return alert("O Login não pode estar vazio!");
    document.getElementById('btnSalvarEdicao').innerText = "A processar..."; const isNovo = (oldLogin === "NOVO");
    let dados = { nomeLoja: document.getElementById('editNome').value, cnpj: document.getElementById('editCnpj').value, tipo: document.getElementById('chkAdmin').checked ? "admin" : "loja", 
        planilhas: { venda: document.getElementById('chkVenda').checked, sorvete: true, seco: true, balde: document.getElementById('chkBalde').checked, promo: document.getElementById('chkPromo').checked } 
    };

    if(isNovo) {
        dados.senha = 'eskimo'; await setDoc(doc(db, "usuarios", novoLogin), dados, { merge: true }); 
    } else {
        if (oldLogin !== novoLogin) {
            const userRefOld = doc(db, "usuarios", oldLogin); const userSnapOld = await getDoc(userRefOld);
            if (userSnapOld.exists()) {
                dados.senha = userSnapOld.data().senha; await setDoc(doc(db, "usuarios", novoLogin), dados, { merge: true });
                const precoRefOld = doc(db, "precos", oldLogin); const precoSnapOld = await getDoc(precoRefOld);
                if (precoSnapOld.exists()) { await setDoc(doc(db, "precos", novoLogin), precoSnapOld.data()); await deleteDoc(precoRefOld); }
                const qClientes = query(collection(db, "clientes"), where("lojaId", "==", oldLogin)); const cliSnapOld = await getDocs(qClientes);
                for (let cli of cliSnapOld.docs) { await setDoc(doc(db, "clientes", cli.id), { lojaId: novoLogin }, { merge: true }); }
                await deleteDoc(userRefOld); alert(`Login alterado com sucesso! A loja ${oldLogin} agora chama-se ${novoLogin}. Todos os preços e clientes foram migrados.`);
            }
        } else { await setDoc(doc(db, "usuarios", oldLogin), dados, { merge: true }); }
    }
    document.getElementById('btnSalvarEdicao').innerText = "Salvar Loja"; window.fecharModal('modalEditar'); carregarLojas(); carregarDashboard();
};

document.getElementById('btnUploadUsuarios').onclick = async () => {
    const fileInput = document.getElementById('fileUsuarios'); if(fileInput.files.length === 0) return alert("Selecione a planilha de lojas!");
    const btn = document.getElementById('btnUploadUsuarios'); btn.innerText = "⏳ Criando Lojas..."; btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
            let count = 0;
            for(let row of rawData) {
                let cleanRow = {}; for(let key in row) cleanRow[key.toString().trim().toUpperCase()] = row[key];
                let nome = (cleanRow['NOME'] || cleanRow['RAZÃO SOCIAL'] || '').toString().trim();
                if(nome) {
                    let login = (cleanRow['LOGIN'] || '').toString().toLowerCase().trim();
                    if (!login) { login = formatarNomeLogin(nome); }
                    if (login) { 
                        await setDoc(doc(db, "usuarios", login), { senha: 'eskimo', nomeLoja: nome, cnpj: (cleanRow['CNPJ']||'').toString().trim(), tipo: 'loja', planilhas: { venda: true, sorvete: true, seco: true, balde: false, promo: false } }, { merge: true }); count++; 
                    }
                }
            }
            alert(`SUCESSO! ${count} lojas cadastradas/atualizadas na base.`); carregarLojas(); carregarDashboard();
        } catch (err) { console.error("ERRO DE IMPORTAÇÃO:", err); alert(`Erro ao processar planilha: ${err.message}\nVerifique se o nome das colunas são 'NOME' e 'CNPJ' na Linha 1.`); }
        btn.innerText = "⚡ Importar Lojas"; btn.disabled = false; fileInput.value = "";
    }; reader.readAsArrayBuffer(fileInput.files[0]);
};

async function carregarClientes() {
    const snap = await getDocs(collection(db, "clientes"));
    const tbody = document.querySelector('#tabelaClientes tbody'); tbody.innerHTML = ''; clientesData = {};
    snap.forEach(d => {
        clientesData[d.id] = d.data(); const c = d.data();
        let badge = c.tipo === 'venda' ? '<span class="badge bg-venda">VENDA</span>' : '<span class="badge bg-tf">TRANSFERÊNCIA</span>';
        tbody.innerHTML += `<tr><td>${badge}</td><td><b>${c.razao}</b></td><td>${c.cnpj||'-'}</td><td>${c.prazo||'-'}</td><td>${c.lojaId}</td>
            <td><button class="btn-small btn-edit" onclick="window.editarCliente('${d.id}')">Editar</button><button class="btn-small btn-del" onclick="window.excluirCliente('${d.id}')">X</button></td></tr>`;
    });
}
window.editarCliente = (id) => {
    const c = clientesData[id]; document.getElementById('editCliId').value = id; document.getElementById('editCliRazao').value = c.razao||""; document.getElementById('editCliCnpj').value = c.cnpj||""; document.getElementById('editCliPrazo').value = c.prazo||""; document.getElementById('editCliTipo').value = c.tipo||"venda"; document.getElementById('modalEditarCliente').style.display = 'flex';
};
window.excluirCliente = async (id) => { if(confirm("Excluir este cliente da base?")){ await deleteDoc(doc(db, "clientes", id)); carregarClientes(); carregarDashboard(); } };
document.getElementById('btnSalvarCliente').onclick = async () => {
    const id = document.getElementById('editCliId').value; const dados = { razao: document.getElementById('editCliRazao').value, cnpj: document.getElementById('editCliCnpj').value, prazo: document.getElementById('editCliPrazo').value, tipo: document.getElementById('editCliTipo').value };
    await setDoc(doc(db, "clientes", id), dados, { merge: true }); window.fecharModal('modalEditarCliente'); carregarClientes();
};

window.abrirPrecos = async (tabelaId) => {
    document.getElementById('txtNomeTabelaAtual').innerText = tabelaId.toUpperCase(); document.getElementById('editTabelaId').value = tabelaId; document.getElementById('listaEdicaoPrecos').innerHTML = '<p>A carregar preços...</p>'; document.getElementById('modalPrecos').style.display = 'flex'; editorItens = []; itensExcluidos = [];
    try {
        const [prodSnap, precoSnap] = await Promise.all([getDocs(collection(db, "produtos")), getDoc(doc(db, "precos", tabelaId))]); const precosAtuais = precoSnap.exists() ? precoSnap.data() : {};
        prodSnap.forEach(p => {
            const cod = p.id;
            if(precosAtuais[cod] !== undefined) {
                let pData = precosAtuais[cod]; let val = typeof pData === 'object' ? pData.preco : pData; let vis = typeof pData === 'object' ? (pData.visivel !== false) : true;
                editorItens.push({ cod: cod, desc: p.data().descricao, cat: p.data().categoria, eng: p.data().engradado, preco: val, visivel: vis });
            }
        });
        renderEditor();
    } catch (e) { document.getElementById('listaEdicaoPrecos').innerHTML = '<p style="color:red;">Erro ao carregar.</p>'; }
};

function renderEditor() {
    let html = `<table><tr><th style="width:10%">Cód</th><th>Produto</th><th style="width:20%">Preço R$</th><th style="width:10%">Visível</th><th style="width:10%">Ação</th></tr>`;
    editorItens.forEach((item, i) => {
        html += `<tr><td style="font-size:12px;">${item.cod}</td><td style="font-size:12px;">${item.desc}</td>
            <td><input type="number" step="0.01" value="${item.preco}" onchange="editorItens[${i}].preco = parseFloat(this.value)" style="padding:4px; margin:0;"></td>
            <td style="text-align:center;"><input type="checkbox" ${item.visivel ? 'checked' : ''} onchange="editorItens[${i}].visivel = this.checked"></td>
            <td><button class="btn-del btn-small" onclick="window.removerItemEditor(${i})">X</button></td></tr>`;
    });
    document.getElementById('listaEdicaoPrecos').innerHTML = html + '</table>';
}
window.removerItemEditor = (index) => { itensExcluidos.push(editorItens[index].cod); editorItens.splice(index, 1); renderEditor(); };
window.adicionarItemEditor = () => {
    const cod = prompt("Código do Produto:"); if(!cod || editorItens.find(i => i.cod === cod)) return alert("Código inválido/existente.");
    const desc = prompt("Descrição (Nome):"); const cat = prompt("Categoria (SORVETE, SECO ou BALDE):", "SORVETE"); const eng = parseFloat(prompt("Quantidade no Engradado/Caixa:", "1")) || 1; const preco = parseFloat(prompt("Preço R$:", "0.00")) || 0;
    editorItens.unshift({ cod, desc, cat, eng, preco, visivel: true }); renderEditor();
};

document.getElementById('btnSalvarPrecos').onclick = async () => {
    const tabelaId = document.getElementById('editTabelaId').value; document.getElementById('btnSalvarPrecos').innerText = "A guardar..."; let updates = {}; let batchProdutos = [];
    editorItens.forEach(i => { if(i.preco > 0) { updates[i.cod] = { preco: i.preco, visivel: i.visivel }; batchProdutos.push(i); } });
    itensExcluidos.forEach(cod => { updates[cod] = deleteField(); });
    for(let item of batchProdutos) await setDoc(doc(db, "produtos", item.cod), { codigo: item.cod, descricao: item.desc, engradado: item.eng, categoria: item.cat }, { merge: true });
    await setDoc(doc(db, "precos", tabelaId), updates, { merge: true }); alert("Preços atualizados com sucesso!"); window.fecharModal('modalPrecos'); document.getElementById('btnSalvarPrecos').innerText = "💾 Salvar Alterações Manuais";
};

document.getElementById('btnUploadModal').onclick = async () => {
    const fileInput = document.getElementById('fileCsvModal'); if(fileInput.files.length === 0) return alert("Selecione uma planilha!");
    const tabelaId = document.getElementById('editTabelaId').value; const btn = document.getElementById('btnUploadModal'); btn.innerText = "⏳ Processando..."; btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
            let precos = {}; let count = 0;
            for(let row of rawData) {
                let cleanRow = {}; for(let key in row) cleanRow[key.toString().trim().toUpperCase()] = row[key];
                let cod = cleanRow['CODIGO'] || cleanRow['CÓDIGO']; let prod = cleanRow['PRODUTO']; let eng = parseFloat(cleanRow['ENGRADADO']) || 1; let cat = cleanRow['CATEGORIA'] ? String(cleanRow['CATEGORIA']).toUpperCase().trim() : 'SORVETE';
                let precoVal = cleanRow['PRECO'] || cleanRow['PREÇO'] || 0; let preco = typeof precoVal === 'number' ? precoVal : parseFloat(String(precoVal).replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
                if(cod && prod && preco > 0) {
                    precos[cod.toString()] = { preco: preco, visivel: true }; 
                    if(!tabelaId.includes('_promo')) await setDoc(doc(db, "produtos", cod.toString()), { codigo: cod.toString(), descricao: prod, engradado: eng, categoria: cat }, { merge: true });
                    count++;
                }
            }
            if(count > 0) { await setDoc(doc(db, "precos", tabelaId), precos); alert(`SUCESSO! ${count} produtos salvos diretamente na tabela "${tabelaId}".`); window.abrirPrecos(tabelaId); } 
            else { alert("⚠️ ERRO: Nenhum produto lido. Verifique se as colunas estão corretas."); }
        } catch (err) { alert("Erro ao processar planilha."); }
        btn.innerText = "⬆️ Importar"; btn.disabled = false; fileInput.value = ""; 
    }; reader.readAsArrayBuffer(fileInput.files[0]);
};

document.getElementById('btnUpload').onclick = async () => {
    const files = document.getElementById('fileCsv').files; if(files.length === 0) return alert("Selecione os arquivos de preço!");
    const btn = document.getElementById('btnUpload'); btn.innerText = "⏳ Processando... Aguarde"; btn.disabled = true;
    setTimeout(async () => {
        let filesProcessed = 0;
        for(let f of files) {
            const lojaId = f.name.replace(/\.[^/.]+$/, "").toLowerCase().trim(); const reader = new FileReader();
            reader.onload = async (e) => {
                const wb = XLSX.read(new Uint8Array(e.target.result), {type: 'array'}); const rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
                let precos = {}; let count = 0;
                for(let row of rawData) {
                    let cleanRow = {}; for(let key in row) cleanRow[key.toString().trim().toUpperCase()] = row[key];
                    let cod = cleanRow['CODIGO'] || cleanRow['CÓDIGO']; let prod = cleanRow['PRODUTO']; let eng = parseFloat(cleanRow['ENGRADADO']) || 1; let cat = cleanRow['CATEGORIA'] ? String(cleanRow['CATEGORIA']).toUpperCase().trim() : 'SORVETE';
                    let precoVal = cleanRow['PRECO'] || cleanRow['PREÇO'] || 0; let preco = typeof precoVal === 'number' ? precoVal : parseFloat(String(precoVal).replace(/R\$/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
                    if(cod && prod && preco > 0) {
                        precos[cod.toString()] = { preco: preco, visivel: true }; 
                        if(!lojaId.includes('_promo')) await setDoc(doc(db, "produtos", cod.toString()), { codigo: cod.toString(), descricao: prod, engradado: eng, categoria: cat }, { merge: true });
                        count++;
                    }
                }
                if(count > 0) { await setDoc(doc(db, "precos", lojaId), precos); alert(`SUCESSO! ${count} produtos na tabela "${lojaId}".`); }
                filesProcessed++; if(filesProcessed === files.length) { btn.innerText = "Subir Tabelas para o Banco"; btn.disabled = false; }
            }; reader.readAsArrayBuffer(f);
        }
    }, 50);
};

window.gerarBackup = async () => {
    const btn = document.getElementById('btnGerarBackup'); btn.innerText = "⏳ A gerar ficheiro de backup..."; btn.disabled = true;
    try {
        const collectionsToBackup = ['usuarios', 'produtos', 'precos', 'clientes', 'historico']; let backupData = {};
        for (let col of collectionsToBackup) {
            const snap = await getDocs(collection(db, col)); backupData[col] = {}; snap.forEach(doc => { backupData[col][doc.id] = doc.data(); });
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr);
        const dataAtual = new Date().toISOString().replace(/[:.]/g, '-'); downloadAnchorNode.setAttribute("download", "backup_eskimo_" + dataAtual + ".json");
        document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    } catch (e) { console.error(e); alert("Erro ao gerar backup."); }
    btn.innerText = "⬇️ Fazer Download do Backup"; btn.disabled = false;
};

window.restaurarBackup = async () => {
    const fileInput = document.getElementById('fileBackup'); if(fileInput.files.length === 0) return alert("Selecione um ficheiro de backup (.json)!");
    if(!confirm("⚠️ ATENÇÃO EXTREMA: A restauração irá SOBRESCREVER os dados atuais do sistema com os dados do arquivo. Tem a certeza absoluta?")) return;
    const btn = document.getElementById('btnRestaurarBackup'); btn.innerText = "⏳ A restaurar o sistema..."; btn.disabled = true;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target.result); let totalRestaurado = 0;
            for (let col in backupData) {
                const docs = backupData[col];
                for (let docId in docs) { await setDoc(doc(db, col, docId), docs[docId], { merge: true }); totalRestaurado++; }
            }
            alert(`Restauração concluída com sucesso! ${totalRestaurado} registos recuperados.`); window.location.reload(); 
        } catch (err) { console.error(err); alert("Erro ao ler o ficheiro de backup. Certifique-se que é um ficheiro .json válido."); }
        btn.innerText = "⬆️ Restaurar Sistema"; btn.disabled = false;
    }; reader.readAsText(fileInput.files[0]);
};

document.getElementById('pesquisaLoja').addEventListener('input', function() {
    let filtro = this.value.toLowerCase();
    let linhas = document.querySelectorAll('#tabelaLojas tbody tr');
    linhas.forEach(linha => {
        let textoLinha = linha.textContent.toLowerCase();
        if (textoLinha.includes(filtro)) { linha.style.display = ''; } else { linha.style.display = 'none'; }
    });
});
// === PESQUISA DO LOG ADMIN ===
document.getElementById('pesquisaLogAdmin').addEventListener('input', function() {
    let filtro = this.value.toLowerCase();
    let linhas = document.querySelectorAll('#tabelaHistorico tbody tr');
    linhas.forEach(linha => {
        if (linha.querySelector('td[colspan]')) return; // Ignora linha de carregamento
        let textoLinha = linha.textContent.toLowerCase();
        linha.style.display = textoLinha.includes(filtro) ? '' : 'none';
    });
});

carregarDashboard();
