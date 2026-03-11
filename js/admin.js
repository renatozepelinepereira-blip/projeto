import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; 
let listaProdutosAdmin = [];
let listaLojasAdmin = [];

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

// --- CONTROLE DE VISIBILIDADE DO HISTÓRICO ---
window.toggleTabelaHistorico = () => {
    const wrapper = document.getElementById('wrapperHistorico');
    const btn = document.getElementById('btnToggleHist');
    if (wrapper.style.display === 'none') {
        wrapper.style.display = 'block';
        btn.innerHTML = '👁️ Esconder Histórico';
        btn.style.background = '#6c757d';
    } else {
        wrapper.style.display = 'none';
        btn.innerHTML = '👁️ Mostrar Histórico';
        btn.style.background = '#28a745';
    }
};

// --- DASHBOARD COM FILTRO DE INTERVALO ---
async function carregarDashboard() {
    try {
        const dInicio = document.getElementById('dataInicio').value;
        const dFim = document.getElementById('dataFim').value;
        
        const [snapLojas, snapProd, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "produtos")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"))) 
        ]);
        
        document.getElementById('dashLojas').innerText = snapLojas.size - 1;
        document.getElementById('dashProdutos').innerText = snapProd.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); 
        tbody.innerHTML = ''; 
        historicoGlobal = {};
        let contPlanilhas = 0;

        snapHist.forEach(d => {
            const data = d.data();
            const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date(data.dataHora?.seconds * 1000);
            
            let mostrar = true;
            if(ts) {
                const dataComparacao = ts.toISOString().split('T')[0]; 
                if (dInicio && dataComparacao < dInicio) mostrar = false;
                if (dFim && dataComparacao > dFim) mostrar = false;
            }

            if (mostrar) {
                contPlanilhas++;
                historicoGlobal[d.id] = data;
                tbody.innerHTML += `<tr>
                    <td>${ts.toLocaleString('pt-BR')}</td>
                    <td><b>${data.nomeLoja || data.lojaId}</b></td>
                    <td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td><button class="btn-small" style="background:#28a745" onclick="window.regerar('${d.id}')">⬇️</button></td>
                </tr>`;
            }
        });
        document.getElementById('dashPlanilhas').innerText = contPlanilhas;
    } catch (e) { console.error(e); }
}

// --- PRODUTOS E UPLOAD ---
async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    let tbody = document.querySelector('#tabelaProdutosAdmin tbody'); tbody.innerHTML = '';
    listaProdutosAdmin = [];
    snap.forEach(d => {
        const p = { id: d.id, ...d.data() }; listaProdutosAdmin.push(p);
        tbody.innerHTML += `<tr>
            <td><img src="${p.imagem || ''}" class="img-produto" onerror="this.src='https://placehold.co/40?text=📦'"></td>
            <td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>${p.categoria}</td>
            <td><button class="btn-small" style="background:#007bff" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button></td>
        </tr>`;
    });
}

window.abrirNovoProduto = () => {
    document.getElementById('prodEditCodigo').disabled = false;
    document.querySelectorAll('#modalProduto input:not([type=hidden])').forEach(i => i.value = '');
    document.getElementById('previewFoto').style.display = 'none';
    document.getElementById('modalProduto').style.display = 'flex';
};

window.abrirEdicaoProduto = (cod) => {
    const p = listaProdutosAdmin.find(x => x.codigo === cod);
    document.getElementById('prodEditCodigo').value = p.codigo;
    document.getElementById('prodEditCodigo').disabled = true;
    document.getElementById('prodEditDescricao').value = p.descricao || '';
    document.getElementById('prodEditCategoria').value = p.categoria || '';
    document.getElementById('prodEditEngradado').value = p.engradado || '';
    document.getElementById('prodEditImagemUrl').value = p.imagem || '';
    if(p.imagem) { document.getElementById('previewFoto').src = p.imagem; document.getElementById('previewFoto').style.display = 'inline-block'; }
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
    } catch (e) { alert(e.message); }
    finally { btn.disabled = false; btn.innerText = "Salvar"; }
};

// --- BACKUP E RESTORE ---
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
        saveAs(blob, `BACKUP_${new Date().toLocaleDateString()}.zip`);
    } finally { btn.innerText = "⬇️ Baixar Backup"; }
};

window.restaurarBackupCompleto = async () => {
    const file = document.getElementById('fileRestoreZip').files[0];
    if(!file || !confirm("Isso sobrescreverá os dados. Continuar?")) return;
    const btn = document.getElementById('btnRestaurarBackup');
    btn.innerText = "⏳...";
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

// --- LOJAS E PREÇOS (BASE) ---
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    let tbody = document.querySelector('#tabelaLojasAdmin tbody'); tbody.innerHTML = '';
    snap.forEach(d => {
        if(d.id === 'admin') return;
        const u = d.data();
        tbody.innerHTML += `<tr><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td>${u.tabelaPreco || '-'}</td><td>✏️</td></tr>`;
    });
}

async function carregarTabelasPrecos() {
    const snap = await getDocs(collection(db, "precos"));
    const select = document.getElementById('selectTabelaAssociar');
    select.innerHTML = '<option value="">Tabela...</option>';
    snap.forEach(d => select.innerHTML += `<option value="${d.id}">${d.id.toUpperCase()}</option>`);
    
    const uSnap = await getDocs(collection(db, "usuarios"));
    const sLoja = document.getElementById('selectLojaAssociar');
    sLoja.innerHTML = '<option value="">Loja...</option>';
    uSnap.forEach(u => { if(u.id !== 'admin') sLoja.innerHTML += `<option value="${u.id}">${u.data().nomeLoja || u.id}</option>`; });
}

window.associarTabelaLoja = async () => {
    const lojaId = document.getElementById('selectLojaAssociar').value;
    const tabela = document.getElementById('selectTabelaAssociar').value;
    if(!lojaId || !tabela) return;
    await setDoc(doc(db, "usuarios", lojaId), { tabelaPreco: tabela }, { merge: true });
    alert("Vinculado!");
};

window.regerar = async (id) => { await regenerarPlanilhaExcel(historicoGlobal[id]); };

carregarDashboard();
