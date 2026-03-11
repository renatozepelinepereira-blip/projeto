import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

// Proteção de Rota
if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; 
let listaProdutosAdmin = [];
let listaLojasAdmin = [];
let carregandoDashboard = false;

iniciarInterfaceGlobais();

// Navegação entre abas
window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById('sec-' + id);
    const btn = document.getElementById('nav-' + id);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
    
    if(id === 'dashboard') carregarDashboard();
    if(id === 'produtos') carregarProdutos();
    if(id === 'precos') carregarTabelasPrecos();
    if(id === 'lojas') carregarLojas();
};

// --- DASHBOARD E HISTÓRICO ---
window.toggleTabelaHistorico = () => {
    const wrapper = document.getElementById('wrapperHistorico');
    const btn = document.getElementById('btnToggleHist');
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? 'block' : 'none';
    btn.innerHTML = isHidden ? '👁️ Esconder Histórico' : '👁️ Mostrar Histórico';
    btn.style.background = isHidden ? '#6c757d' : '#28a745';
};

window.carregarDashboard = async () => {
    if(carregandoDashboard) return;
    carregandoDashboard = true;
    try {
        const dInicio = document.getElementById('dataInicio')?.value || "";
        const dFim = document.getElementById('dataFim')?.value || "";
        
        const [snapLojas, snapProd, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "produtos")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(200))) 
        ]);
        
        document.getElementById('dashLojas').innerText = snapLojas.size > 0 ? snapLojas.size - 1 : 0;
        document.getElementById('dashProdutos').innerText = snapProd.size;
        
        const tbody = document.getElementById('corpoTabelaHistorico'); 
        if(!tbody) return;

        let htmlBuffer = ""; 
        historicoGlobal = {};
        let contPlanilhas = 0;

        snapHist.forEach(d => {
            const data = d.data();
            const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date(data.dataHora?.seconds * 1000);
            let mostrar = true;

            if(ts && !isNaN(ts)) {
                const dataComp = ts.toISOString().split('T')[0]; 
                if (dInicio && dataComp < dInicio) mostrar = false;
                if (dFim && dataComp > dFim) mostrar = false;
            }

            if (mostrar) {
                contPlanilhas++;
                historicoGlobal[d.id] = data;
                htmlBuffer += `<tr>
                    <td>${ts.toLocaleString('pt-BR')}</td>
                    <td><b>${data.nomeLoja || data.lojaId}</b></td>
                    <td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td class="acoes-group">
                        <button class="btn-small btn-edit" onclick="window.regerar('${d.id}')">⬇️</button>
                    </td>
                </tr>`;
            }
        });
        tbody.innerHTML = htmlBuffer || '<tr><td colspan="5" style="text-align:center;">Nenhum registro.</td></tr>';
        document.getElementById('dashPlanilhas').innerText = contPlanilhas;
    } catch (e) { console.error(e); } finally { carregandoDashboard = false; }
};

// --- PRODUTOS ---
async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    const tbody = document.getElementById('corpoTabelaProdutos');
    let htmlBuffer = "";
    listaProdutosAdmin = [];
    snap.forEach(d => {
        const p = { id: d.id, ...d.data() }; 
        listaProdutosAdmin.push(p);
        htmlBuffer += `<tr>
            <td><img src="${p.imagem || ''}" class="img-produto" onerror="this.src='https://placehold.co/45?text=📦'"></td>
            <td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>${p.categoria}</td>
            <td><button class="btn-small btn-edit" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button></td>
        </tr>`;
    });
    tbody.innerHTML = htmlBuffer;
}

window.abrirNovoProduto = () => {
    document.getElementById('prodEditCodigo').disabled = false;
    document.querySelectorAll('#modalProduto input:not([type=hidden])').forEach(i => i.value = '');
    document.getElementById('previewFoto').style.display = 'none';
    document.getElementById('modalProduto').style.display = 'flex';
};

window.abrirEdicaoProduto = (cod) => {
    const p = listaProdutosAdmin.find(x => x.codigo === cod);
    if(!p) return;
    document.getElementById('prodEditCodigo').value = p.codigo;
    document.getElementById('prodEditCodigo').disabled = true;
    document.getElementById('prodEditDescricao').value = p.descricao || '';
    document.getElementById('prodEditCategoria').value = p.categoria || '';
    document.getElementById('prodEditEngradado').value = p.engradado || '';
    document.getElementById('prodEditImagemUrl').value = p.imagem || '';
    const preview = document.getElementById('previewFoto');
    if(p.imagem) { preview.src = p.imagem; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
    document.getElementById('modalProduto').style.display = 'flex';
};

window.salvarProduto = async () => {
    const cod = document.getElementById('prodEditCodigo').value;
    const btn = document.getElementById('btnSalvarProd');
    const file = document.getElementById('prodEditImagemFile').files[0];
    btn.disabled = true; btn.innerText = "⏳...";
    try {
        let url = document.getElementById('prodEditImagemUrl').value;
        if(file) {
            const sRef = ref(storage, `produtos/${cod}`);
            await uploadBytes(sRef, file);
            url = await getDownloadURL(sRef);
        }
        await setDoc(doc(db, "produtos", cod), {
            codigo: cod, descricao: document.getElementById('prodEditDescricao').value,
            categoria: document.getElementById('prodEditCategoria').value,
            engradado: document.getElementById('prodEditEngradado').value,
            imagem: url
        }, { merge: true });
        window.fecharModal('modalProduto'); carregarProdutos();
    } catch (e) { alert(e.message); } finally { btn.disabled = false; btn.innerText = "Salvar"; }
};

// --- PREÇOS E VÍNCULOS ---
async function carregarTabelasPrecos() {
    const snapT = await getDocs(collection(db, "precos"));
    const selectT = document.getElementById('selectTabelaAssociar');
    selectT.innerHTML = '<option value="">Selecione a Tabela...</option>';
    snapT.forEach(d => selectT.innerHTML += `<option value="${d.id}">${d.id.toUpperCase()}</option>`);

    const snapL = await getDocs(collection(db, "usuarios"));
    const selectL = document.getElementById('selectLojaAssociar');
    selectL.innerHTML = '<option value="">Selecione a Loja...</option>';
    snapL.forEach(u => {
        if(u.id !== 'admin') selectL.innerHTML += `<option value="${u.id}">${u.data().nomeLoja || u.id}</option>`;
    });
}

window.importarTabelaPrecos = async () => {
    const nome = document.getElementById('nomeTabelaPreco').value.trim().toLowerCase();
    const file = document.getElementById('fileCsvPrecos').files[0];
    if(!nome || !file) return alert("Preencha o nome e selecione o arquivo!");
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type: 'array'});
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, {header: 1});
        let precos = {};
        for(let i = 1; i < json.length; i++) {
            if(json[i][0] && json[i][1]) precos[String(json[i][0]).trim()] = parseFloat(String(json[i][1]).replace(',', '.'));
        }
        await setDoc(doc(db, "precos", nome), precos, { merge: true });
        alert("Tabela Importada!");
    };
    reader.readAsArrayBuffer(file);
};

window.associarTabelaLoja = async () => {
    const lojaId = document.getElementById('selectLojaAssociar').value;
    const tabela = document.getElementById('selectTabelaAssociar').value;
    if(!lojaId || !tabela) return alert("Selecione ambos!");
    await setDoc(doc(db, "usuarios", lojaId), { tabelaPreco: tabela }, { merge: true });
    alert("Loja vinculada!");
    carregarLojas();
};

// --- LOJAS ---
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    const tbody = document.getElementById('corpoTabelaLojas');
    let htmlBuffer = "";
    listaLojasAdmin = [];
    snap.forEach(d => {
        if(d.id === 'admin') return;
        const u = { id: d.id, ...d.data() };
        listaLojasAdmin.push(u);
        htmlBuffer += `<tr><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td>${u.tabelaPreco || '-'}</td>
        <td><button class="btn-small btn-edit" onclick="window.abrirEdicaoLoja('${u.id}')">✏️</button></td></tr>`;
    });
    tbody.innerHTML = htmlBuffer;
}

window.abrirNovaLoja = () => {
    document.getElementById('lojaEditId').disabled = false;
    document.getElementById('lojaEditIsNew').value = 'sim';
    document.querySelectorAll('#modalLoja input').forEach(i => i.value = '');
    document.getElementById('modalLoja').style.display = 'flex';
};

window.abrirEdicaoLoja = (id) => {
    const u = listaLojasAdmin.find(x => x.id === id);
    if(!u) return;
    document.getElementById('lojaEditId').value = u.id;
    document.getElementById('lojaEditId').disabled = true;
    document.getElementById('lojaEditIsNew').value = 'nao';
    document.getElementById('lojaEditNome').value = u.nomeLoja || '';
    document.getElementById('lojaEditCnpj').value = u.cnpj || '';
    document.getElementById('lojaEditSenha').value = ''; 
    document.getElementById('modalLoja').style.display = 'flex';
};

window.salvarLoja = async () => {
    const id = document.getElementById('lojaEditId').value.trim();
    if(!id) return;
    const data = {
        nomeLoja: document.getElementById('lojaEditNome').value,
        cnpj: document.getElementById('lojaEditCnpj').value
    };
    const senha = document.getElementById('lojaEditSenha').value.trim();
    if(senha) data.senha = senha;
    await setDoc(doc(db, "usuarios", id), data, { merge: true });
    alert("Loja salva!");
    window.fecharModal('modalLoja');
    carregarLojas();
};

// --- BACKUP ---
window.gerarBackupCompleto = async () => {
    const btn = document.getElementById('btnGerarBackup');
    btn.innerText = "⏳...";
    try {
        const zip = new JSZip();
        const cols = ["usuarios", "produtos", "precos", "clientes", "historico"];
        for(let c of cols) {
            const snap = await getDocs(collection(db, c));
            let d = []; snap.forEach(doc => d.push({id: doc.id, ...doc.data()}));
            zip.file(`${c}.json`, JSON.stringify(d));
        }
        const blob = await zip.generateAsync({type:"blob"});
        saveAs(blob, `BACKUP_SISTEMA_${new Date().toLocaleDateString().replace(/\//g, '-')}.zip`);
    } finally { btn.innerText = "⬇️ Baixar Backup"; }
};

window.restaurarBackupCompleto = async () => {
    const file = document.getElementById('fileRestoreZip').files[0];
    if(!file || !confirm("Restaurar backup agora?")) return;
    try {
        const zip = await JSZip.loadAsync(file);
        for(let nome in zip.files) {
            const col = nome.replace('.json', '');
            const content = await zip.files[nome].async("string");
            const lista = JSON.parse(content);
            for(let item of lista) {
                const id = item.id; delete item.id;
                await setDoc(doc(db, col, id), item, {merge: true});
            }
        }
        alert("Restaurado!"); location.reload();
    } catch(e) { alert(e.message); }
};

window.regerar = async (id) => { await regenerarPlanilhaExcel(historicoGlobal[id]); };

// Inicialização
document.addEventListener('DOMContentLoaded', () => carregarDashboard());
