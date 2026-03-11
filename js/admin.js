// js/admin.js - Lógica Completa Administrativa com Upload e Restore
import { db, storage } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let historicoGlobal = {}; let listaProdutosAdmin = []; let listaLojasAdmin = []; let listasDePrecos = [];
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

async function carregarDashboard() {
    try {
        const [snapLojas, snapProd, snapHist] = await Promise.all([ getDocs(collection(db, "usuarios")), getDocs(collection(db, "produtos")), getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) ]);
        document.getElementById('dashLojas').innerText = snapLojas.size > 0 ? snapLojas.size - 1 : 0; document.getElementById('dashProdutos').innerText = snapProd.size; document.getElementById('dashPlanilhas').innerText = snapHist.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = ''; historicoGlobal = {};
        snapHist.forEach(d => {
            const data = d.data(); historicoGlobal[d.id] = data;
            const dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : '---';
            let acoes = data.dadosPlanilha ? `<div class="acoes-group"><button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')">👁️</button><button class="btn-small btn-sucesso" onclick="window.regerar('${d.id}')">⬇️</button></div>` : "-";
            tbody.innerHTML += `<tr><td>${dStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color:${data.acao.includes('Venda')?'green':'#0056b3'}; font-weight:700">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoes}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}

// --- PRODUTOS E UPLOAD DE IMAGENS ---
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
    document.getElementById('prodEditOrigem').value = ''; document.getElementById('prodEditCodigo').value = ''; document.getElementById('prodEditCodigo').disabled = false;
    document.getElementById('prodEditDescricao').value = ''; document.getElementById('prodEditEngradado').value = ''; document.getElementById('prodEditCategoria').value = ''; 
    document.getElementById('prodEditImagemUrl').value = ''; document.getElementById('prodEditImagemFile').value = ''; document.getElementById('previewFoto').style.display = 'none';
    document.getElementById('titModalProduto').innerText = "Criar Novo Produto"; document.getElementById('modalProduto').style.display = 'flex';
};

window.abrirEdicaoProduto = (codigo) => {
    const p = listaProdutosAdmin.find(x => x.codigo === codigo); if(!p) return;
    document.getElementById('prodEditOrigem').value = p.id; document.getElementById('prodEditCodigo').value = p.codigo; document.getElementById('prodEditCodigo').disabled = true; 
    document.getElementById('prodEditDescricao').value = p.descricao || ''; document.getElementById('prodEditEngradado').value = p.engradado || ''; document.getElementById('prodEditCategoria').value = p.categoria || '';
    document.getElementById('prodEditImagemUrl').value = p.imagem || ''; document.getElementById('prodEditImagemFile').value = '';
    
    const preview = document.getElementById('previewFoto');
    if(p.imagem) { preview.src = p.imagem; preview.style.display = 'inline-block'; } else { preview.style.display = 'none'; }
    document.getElementById('titModalProduto').innerText = "Editar Produto"; document.getElementById('modalProduto').style.display = 'flex';
};

document.getElementById('prodEditImagemFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(file) { document.getElementById('previewFoto').src = URL.createObjectURL(file); document.getElementById('previewFoto').style.display = 'inline-block'; }
});

window.salvarProduto = async () => {
    const codigo = document.getElementById('prodEditCodigo').value.trim();
    if(!codigo) return alert("Código é obrigatório!");
    
    const btnSalvar = document.getElementById('btnSalvarProd');
    btnSalvar.innerText = "⏳ A Salvar..."; btnSalvar.disabled = true;

    try {
        let urlFinalDaFoto = document.getElementById('prodEditImagemUrl').value;
        const fileInput = document.getElementById('prodEditImagemFile');
        
        // Se o usuário selecionou uma foto no computador, fazemos o UPLOAD!
        if(fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const storageRef = ref(storage, `produtos/${codigo}_${file.name}`);
            await uploadBytes(storageRef, file);
            urlFinalDaFoto = await getDownloadURL(storageRef); // Pega o link da web gerado
        }

        const updateData = { codigo: codigo, descricao: document.getElementById('prodEditDescricao').value, engradado: document.getElementById('prodEditEngradado').value, categoria: document.getElementById('prodEditCategoria').value || 'sorvete', imagem: urlFinalDaFoto };
        await setDoc(doc(db, "produtos", codigo), updateData, { merge: true });
        
        alert("Produto salvo com foto!"); 
        window.fecharModal('modalProduto'); 
        carregarProdutos();
    } catch(err) {
        alert("Erro ao salvar produto/foto: " + err.message);
    } finally {
        btnSalvar.innerText = "💾 Salvar Produto"; btnSalvar.disabled = false;
    }
};

// --- PREÇOS E LOJAS (Omitidos p/ focar no backup, cole os mesmos que já usava) ---
async function carregarTabelasPrecos() { /* ... cole sua função ... */ }
window.importarTabelaPrecos = async () => { /* ... cole sua função ... */ };
window.associarTabelaLoja = async () => { /* ... cole sua função ... */ };
async function carregarLojas() { /* ... cole sua função ... */ }
window.abrirNovaLoja = () => { /* ... cole sua função ... */ };
window.abrirEdicaoLoja = (id) => { /* ... cole sua função ... */ };
window.salvarLoja = async () => { /* ... cole sua função ... */ };

// ==========================================
// 5. SISTEMA DE BACKUP E RESTAURAÇÃO
// ==========================================
window.gerarBackupCompleto = async () => {
    const btn = document.getElementById('btnGerarBackup'); btn.innerText = "⏳ A Gerar ZIP..."; btn.disabled = true;
    try {
        const zip = new JSZip(); const colecoes = ["usuarios", "produtos", "precos", "clientes", "historico"];
        for (const nomeCol of colecoes) {
            const snap = await getDocs(collection(db, nomeCol)); let dados = [];
            snap.forEach(doc => { dados.push({ id: doc.id, ...doc.data() }); });
            zip.file(`${nomeCol}.json`, JSON.stringify(dados, null, 2));
        }
        const content = await zip.generateAsync({ type: "blob" }); const dataHoje = new Date().toISOString().split('T')[0]; 
        saveAs(content, `BKP_SISTEMA_ESKIMO_${dataHoje}.zip`); alert("✅ Backup salvo no seu PC!");
    } catch (e) { alert("❌ Erro: " + e.message); } finally { btn.innerText = "⬇️ Baixar Backup (.ZIP)"; btn.disabled = false; }
};

window.restaurarBackupCompleto = async () => {
    const file = document.getElementById('fileRestoreZip').files[0];
    if(!file) return alert("Por favor, selecione um arquivo .zip criado pelo sistema.");
    
    const confirmacao = confirm("⚠️ ATENÇÃO EXTREMA: Restaurar este backup irá SOBRESCREVER E SUBSTITUIR todos os dados atuais do banco de dados (Produtos, Usuários, Histórico, etc.). Tem certeza absoluta que quer continuar?");
    if(!confirmacao) return;

    const btn = document.getElementById('btnRestaurarBackup');
    btn.innerText = "⏳ A RESTAURAR SISTEMA..."; btn.disabled = true;

    try {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(file);
        
        // Lê os arquivos JSON dentro do ZIP
        for (const filename of Object.keys(loadedZip.files)) {
            if(filename.endsWith('.json')) {
                const collectionName = filename.replace('.json', ''); // Pega o nome da pasta (ex: "produtos")
                const content = await loadedZip.files[filename].async("string");
                const dados = JSON.parse(content);
                
                // Grava de volta no Firebase, item por item
                for(let item of dados) {
                    const idOriginal = item.id;
                    delete item.id; // Tira o ID do miolo do dado
                    await setDoc(doc(db, collectionName, idOriginal), item, {merge: true});
                }
            }
        }
        alert("✅ RESTAURAÇÃO CONCLUÍDA COM SUCESSO! O sistema está repovoado.");
        location.reload(); // Recarrega a página para atualizar as tabelas
    } catch (e) {
        console.error(e);
        alert("❌ Falha na Restauração do Backup: O arquivo pode estar corrompido ou o banco de dados recusou a gravação. Erro: " + e.message);
    } finally {
        btn.innerText = "⚡ Restaurar Sistema"; btn.disabled = false;
    }
};

window.visualizarLog = (logId) => { /* Omitido por brevidade */ };
window.regerar = async (id) => { /* Omitido por brevidade */ };

carregarDashboard();
