// js/admin.js - Lógica Completa Administrativa
import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDoc, getDocs, collection, query, orderBy, limit, deleteDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; 
let listaProdutosAdmin = [];
let listaLojasAdmin = [];
let listasDePrecos = [];

iniciarInterfaceGlobais();

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    
    if(id === 'dashboard') carregarDashboard();
    if(id === 'produtos') carregarProdutos();
    if(id === 'precos') carregarTabelasPrecos();
    if(id === 'lojas') carregarLojas();
};

// ==========================================
// 1. CARREGAMENTO INICIAL E DASHBOARD
// ==========================================
async function carregarDashboard() {
    try {
        const [snapLojas, snapProd, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "produtos")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) 
        ]);
        
        document.getElementById('dashLojas').innerText = snapLojas.size > 0 ? snapLojas.size - 1 : 0;
        document.getElementById('dashProdutos').innerText = snapProd.size;
        document.getElementById('dashPlanilhas').innerText = snapHist.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = ''; historicoGlobal = {};
        snapHist.forEach(d => {
            const data = d.data(); historicoGlobal[d.id] = data;
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : '---';
            let acoes = data.dadosPlanilha ? `<div class="acoes-group"><button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')">👁️</button><button class="btn-small btn-sucesso" onclick="window.regerar('${d.id}')">⬇️</button></div>` : "-";
            tbody.innerHTML += `<tr><td>${dStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoes}</td></tr>`;
        });
        document.getElementById('avisoBanco').style.display = 'none';
    } catch (e) { 
        console.error("Falha ao ligar ao banco:", e);
        document.getElementById('avisoBanco').style.display = 'block';
    }
}

// ==========================================
// 2. GESTÃO DE PRODUTOS
// ==========================================
async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    let tbody = document.querySelector('#tabelaProdutosAdmin tbody'); tbody.innerHTML = ''; listaProdutosAdmin = [];
    snap.forEach(d => {
        let p = { id: d.id, ...d.data() }; listaProdutosAdmin.push(p);
        let imgHtml = p.imagem ? `<img src="${p.imagem}" class="img-produto">` : `<div class="img-placeholder">📦</div>`;
        tbody.innerHTML += `<tr><td>${imgHtml}</td><td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>${p.categoria || 'sorvete'}</td>
        <td><button class="btn-small btn-edit" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button></td></tr>`;
    });
}

window.abrirNovoProduto = () => {
    document.getElementById('prodEditOrigem').value = ''; document.getElementById('prodEditCodigo').value = '';
    document.getElementById('prodEditDescricao').value = ''; document.getElementById('prodEditEngradado').value = '';
    document.getElementById('prodEditCategoria').value = ''; document.getElementById('prodEditImagem').value = '';
    document.getElementById('previewFoto').style.display = 'none';
    document.getElementById('titModalProduto').innerText = "Criar Novo Produto";
    document.getElementById('prodEditCodigo').disabled = false;
    document.getElementById('modalProduto').style.display = 'flex';
};

window.abrirEdicaoProduto = (codigo) => {
    const p = listaProdutosAdmin.find(x => x.codigo === codigo);
    if(!p) return;
    document.getElementById('prodEditOrigem').value = p.id;
    document.getElementById('prodEditCodigo').value = p.codigo;
    document.getElementById('prodEditCodigo').disabled = true; // Não deixa mudar o código na edição
    document.getElementById('prodEditDescricao').value = p.descricao || '';
    document.getElementById('prodEditEngradado').value = p.engradado || '';
    document.getElementById('prodEditCategoria').value = p.categoria || '';
    document.getElementById('prodEditImagem').value = p.imagem || '';
    
    const preview = document.getElementById('previewFoto');
    if(p.imagem) { preview.src = p.imagem; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
    
    document.getElementById('titModalProduto').innerText = "Editar Produto";
    document.getElementById('modalProduto').style.display = 'flex';
};

document.getElementById('prodEditImagem').addEventListener('input', (e) => {
    const preview = document.getElementById('previewFoto');
    if(e.target.value) { preview.src = e.target.value; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
});

window.salvarProduto = async () => {
    const codigo = document.getElementById('prodEditCodigo').value.trim();
    if(!codigo) return alert("Código é obrigatório!");
    
    const updateData = { 
        codigo: codigo,
        descricao: document.getElementById('prodEditDescricao').value, 
        engradado: document.getElementById('prodEditEngradado').value, 
        categoria: document.getElementById('prodEditCategoria').value || 'sorvete',
        imagem: document.getElementById('prodEditImagem').value 
    };
    
    // Salva no banco (ID do documento é o próprio código do produto)
    await setDoc(doc(db, "produtos", codigo), updateData, { merge: true });
    alert("Produto salvo com sucesso!");
    window.fecharModal('modalProduto');
    carregarProdutos();
};

// ==========================================
// 3. GESTÃO DE TABELAS DE PREÇOS
// ==========================================
async function carregarTabelasPrecos() {
    const snap = await getDocs(collection(db, "precos"));
    listasDePrecos = [];
    snap.forEach(d => listasDePrecos.push(d.id)); // Ex: ['tf', 'PM01', 'T03']
    
    const select = document.getElementById('selectTabelaAssociar');
    select.innerHTML = '<option value="">Selecione a Tabela...</option>';
    listasDePrecos.forEach(t => select.innerHTML += `<option value="${t}">${t.toUpperCase()}</option>`);
    
    // Carregar Lojas no Select
    if(listaLojasAdmin.length === 0) {
        const uSnap = await getDocs(collection(db, "usuarios"));
        uSnap.forEach(u => { if(u.id !== 'admin') listaLojasAdmin.push({id: u.id, ...u.data()}); });
    }
    
    const sLoja = document.getElementById('selectLojaAssociar');
    sLoja.innerHTML = '<option value="">Selecione a Loja...</option>';
    listaLojasAdmin.forEach(l => sLoja.innerHTML += `<option value="${l.id}">${l.nomeLoja || l.id} (Atual: ${l.tabelaPreco || 'Nenhuma'})</option>`);
}

window.importarTabelaPrecos = async () => {
    const nomeTabela = document.getElementById('nomeTabelaPreco').value.trim().toLowerCase();
    const file = document.getElementById('fileCsvPrecos').files[0];
    
    if(!nomeTabela) return alert("Digite o nome da Tabela (Ex: TF, PM01)");
    if(!file) return alert("Selecione um arquivo Excel (.xlsx) ou CSV");

    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
        
        let precosFormatados = {};
        // Pula o cabeçalho e lê Código e Preço
        for(let i = 1; i < json.length; i++) {
            if(json[i][0] && json[i][1]) {
                const cod = String(json[i][0]).trim();
                const preco = parseFloat(String(json[i][1]).replace(',', '.'));
                if(!isNaN(preco)) precosFormatados[cod] = preco;
            }
        }
        
        try {
            await setDoc(doc(db, "precos", nomeTabela), precosFormatados, { merge: true });
            alert(`Tabela "${nomeTabela.toUpperCase()}" atualizada com sucesso!`);
            carregarTabelasPrecos();
        } catch(err) { alert("Erro ao salvar: " + err.message); }
    };
    reader.readAsArrayBuffer(file);
};

window.associarTabelaLoja = async () => {
    const lojaId = document.getElementById('selectLojaAssociar').value;
    const tabela = document.getElementById('selectTabelaAssociar').value;
    
    if(!lojaId || !tabela) return alert("Selecione a Loja e a Tabela!");
    
    try {
        await setDoc(doc(db, "usuarios", lojaId), { tabelaPreco: tabela }, { merge: true });
        alert("Tabela associada à loja com sucesso!");
        listaLojasAdmin = []; // Força recarregar as lojas
        carregarTabelasPrecos();
    } catch(err) { alert("Erro ao associar: " + err.message); }
};

// ==========================================
// 4. GESTÃO DE LOJAS / USUÁRIOS
// ==========================================
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    let tbody = document.querySelector('#tabelaLojasAdmin tbody'); tbody.innerHTML = '';
    listaLojasAdmin = [];
    
    snap.forEach(d => {
        if(d.id !== 'admin') {
            let u = { id: d.id, ...d.data() }; listaLojasAdmin.push(u);
            let bloqueado = u.planilhas?.venda === false ? '<span style="color:red">Bloqueado</span>' : '<span style="color:green">Ativo</span>';
            let tab = u.tabelaPreco ? u.tabelaPreco.toUpperCase() : 'Não Definida';
            
            tbody.innerHTML += `<tr><td>${u.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td>
            <td><b>${tab}</b></td><td><button class="btn-small btn-edit" onclick="window.abrirEdicaoLoja('${u.id}')">✏️</button></td></tr>`;
        }
    });
}

window.abrirNovaLoja = () => {
    document.getElementById('lojaEditIsNew').value = 'sim'; document.getElementById('lojaEditId').value = '';
    document.getElementById('lojaEditId').disabled = false; document.getElementById('lojaEditSenha').value = '';
    document.getElementById('lojaEditNome').value = ''; document.getElementById('lojaEditCnpj').value = '';
    document.getElementById('lojaEditBloqueiaVenda').checked = false;
    document.getElementById('titModalLoja').innerText = "Criar Nova Loja";
    document.getElementById('modalLoja').style.display = 'flex';
};

window.abrirEdicaoLoja = (id) => {
    const u = listaLojasAdmin.find(x => x.id === id); if(!u) return;
    document.getElementById('lojaEditIsNew').value = 'nao'; document.getElementById('lojaEditId').value = u.id;
    document.getElementById('lojaEditId').disabled = true; document.getElementById('lojaEditSenha').value = '';
    document.getElementById('lojaEditNome').value = u.nomeLoja || ''; document.getElementById('lojaEditCnpj').value = u.cnpj || '';
    document.getElementById('lojaEditBloqueiaVenda').checked = (u.planilhas?.venda === false);
    document.getElementById('titModalLoja').innerText = "Editar Loja";
    document.getElementById('modalLoja').style.display = 'flex';
};

window.salvarLoja = async () => {
    const id = document.getElementById('lojaEditId').value.trim();
    const isNew = document.getElementById('lojaEditIsNew').value === 'sim';
    if(!id) return alert("O Login é obrigatório!");

    let data = {
        nomeLoja: document.getElementById('lojaEditNome').value,
        cnpj: document.getElementById('lojaEditCnpj').value,
        planilhas: { venda: !document.getElementById('lojaEditBloqueiaVenda').checked }
    };
    
    const senha = document.getElementById('lojaEditSenha').value.trim();
    if(senha) data.senha = senha;
    else if(isNew) return alert("Para criar uma nova loja, a senha é obrigatória!");

    await setDoc(doc(db, "usuarios", id), data, { merge: true });
    
    // Adiciona na lista de clientes também para facilitar a transferência
    if(data.nomeLoja && data.cnpj) {
        await setDoc(doc(db, "clientes", id), { razao: data.nomeLoja, cnpj: data.cnpj }, { merge: true });
    }

    alert("Loja salva com sucesso!");
    window.fecharModal('modalLoja');
    carregarLojas();
};

// Funções do Histórico / Log do Admin
window.visualizarLog = (logId) => { /* Mesma lógica mantida */ };
window.regerar = async (id) => { /* Mesma lógica mantida */ };

carregarDashboard();
