import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

// Bloqueio de acesso
if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; 
let listaProdutosAdmin = [];
let listaLojasAdmin = [];
let carregandoDashboard = false;

iniciarInterfaceGlobais();

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    
    const target = document.getElementById('sec-' + id);
    const btn = document.getElementById('nav-' + id);
    if(target) target.classList.add('active');
    if(btn) btn.classList.add('active');
    
    // Otimização: Carregar dados apenas quando necessário
    if(id === 'dashboard') carregarDashboard();
    if(id === 'produtos') carregarProdutos();
    if(id === 'precos') carregarTabelasPrecos();
    if(id === 'lojas') carregarLojas();
};

window.toggleTabelaHistorico = () => {
    const wrapper = document.getElementById('wrapperHistorico');
    const btn = document.getElementById('btnToggleHist');
    const isHidden = wrapper.style.display === 'none';
    wrapper.style.display = isHidden ? 'block' : 'none';
    btn.innerHTML = isHidden ? '👁️ Esconder Histórico' : '👁️ Mostrar Histórico';
    btn.style.background = isHidden ? '#6c757d' : '#28a745';
};

// --- DASHBOARD OTIMIZADO ---
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

        // PERFORMANCE: Usar String Buffer em vez de múltiplos innerHTML
        let htmlBuffer = ""; 
        historicoGlobal = {};
        let contPlanilhas = 0;

        snapHist.forEach(d => {
            const data = d.data();
            const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date(data.dataHora?.seconds * 1000);
            let mostrar = true;

            if(ts && !isNaN(ts)) {
                const dataComparacao = ts.toISOString().split('T')[0]; 
                if (dInicio && dataComparacao < dInicio) mostrar = false;
                if (dFim && dataComparacao > dFim) mostrar = false;
            }

            if (mostrar) {
                contPlanilhas++;
                historicoGlobal[d.id] = data;
                htmlBuffer += `<tr>
                    <td>${ts.toLocaleString('pt-BR')}</td>
                    <td><b>${data.nomeLoja || data.lojaId}</b></td>
                    <td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td>
                    <td>${data.destino || '-'}</td>
                    <td><button class="btn-small" style="background:#28a745; border:none; color:white; cursor:pointer;" onclick="window.regerar('${d.id}')">⬇️</button></td>
                </tr>`;
            }
        });

        tbody.innerHTML = htmlBuffer || '<tr><td colspan="5" style="text-align:center;">Nenhum registro encontrado.</td></tr>';
        document.getElementById('dashPlanilhas').innerText = contPlanilhas;
    } catch (e) { console.error(e); } finally { carregandoDashboard = false; }
};

// --- PRODUTOS OTIMIZADOS ---
async function carregarProdutos() {
    const snap = await getDocs(collection(db, "produtos"));
    const tbody = document.getElementById('corpoTabelaProdutos');
    if(!tbody) return;
    
    let htmlBuffer = "";
    listaProdutosAdmin = [];
    snap.forEach(d => {
        const p = { id: d.id, ...d.data() }; 
        listaProdutosAdmin.push(p);
        htmlBuffer += `<tr>
            <td><img src="${p.imagem || ''}" class="img-produto" loading="lazy" onerror="this.src='https://placehold.co/40?text=📦'"></td>
            <td>${p.codigo}</td><td>${p.descricao}</td><td>${p.engradado}</td><td>${p.categoria}</td>
            <td><button class="btn-small" style="background:#007bff; border:none; color:white; cursor:pointer;" onclick="window.abrirEdicaoProduto('${p.codigo}')">✏️</button></td>
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
    if(p.imagem) { preview.src = p.imagem; preview.style.display = 'inline-block'; }
    else { preview.style.display = 'none'; }
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

// --- LOJAS OTIMIZADAS ---
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    const tbody = document.getElementById('corpoTabelaLojas');
    if(!tbody) return;
    
    let htmlBuffer = "";
    listaLojasAdmin = [];
    snap.forEach(d => {
        if(d.id === 'admin') return;
        const u = { id: d.id, ...d.data() };
        listaLojasAdmin.push(u);
        htmlBuffer += `<tr><td>${d.id}</td><td>${u.nomeLoja || '-'}</td><td>${u.cnpj || '-'}</td><td>${u.tabelaPreco || '-'}</td><td>✏️</td></tr>`;
    });
    tbody.innerHTML = htmlBuffer;
}

// --- BACKUP E RESTAURAÇÃO (JSZip) ---
window.gerarBackupCompleto = async () => {
    const btn = document.getElementById('btnGerarBackup');
    btn.innerText = "⏳ Criando ZIP...";
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
    if(!file || !confirm("Isso apagará/sobrescreverá os dados atuais. Continuar?")) return;
    const btn = document.getElementById('btnRestaurarBackup');
    btn.innerText = "⏳ Restaurando...";
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
        alert("Restauração concluída!");
        location.reload();
    } catch(e) { alert("Erro: " + e.message); }
};

window.regerar = async (id) => { 
    if(!historicoGlobal[id]) return alert("Dados da planilha não encontrados.");
    await regenerarPlanilhaExcel(historicoGlobal[id]); 
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => carregarDashboard());
