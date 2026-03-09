import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, deleteField, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));
if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let usuariosData = {}; let editorItens = []; let itensExcluidos = []; let clientesData = {}; let historicoGlobal = {};

window.mudarSecao = (id) => {
    document.querySelectorAll('.secao').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(el => el.classList.remove('active'));
    document.getElementById('sec-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
    if(id === 'dashboard') carregarDashboard(); if(id === 'lojas') carregarLojas(); if(id === 'clientes') carregarClientes();
};

window.fecharModal = (id) => { document.getElementById(id).style.display = 'none'; };
window.toggleLog = () => { let box = document.getElementById('containerTabelaHistorico'); box.style.display = box.style.display === 'none' ? 'block' : 'none'; document.getElementById('btnToggleLog').innerText = box.style.display === 'none' ? '👁️ Mostrar Log' : '👁️ Ocultar Log'; };

// Função de Limpeza de Login (Pelo Admin)
function formatarNomeLogin(nomeRaw) {
    let nome = nomeRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    nome = nome.replace(/\([^)]*\)/g, " ").replace(/\/[a-z]{2}\b/g, " ");
    nome = nome.replace(/\b(eskimo|eskimó|loja de fabrica|loja|fabrica|sorvetes|sorvete|de|atacadao|atacadão|cd)\b/g, " ");
    nome = nome.replace(/[^a-z0-9\s]/g, " ");
    let p = nome.split(/\s+/).filter(x => x.length > 0);
    const rom = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/;
    if (p.length > 0) {
        let u = p[p.length - 1];
        if (rom.test(u)) return "filial." + p.slice(0, -1).join("") + "." + u;
        return "filial." + p.join("");
    }
    return "";
}

document.getElementById('editNome').addEventListener('input', (e) => { if(document.getElementById('editId').value === "NOVO") document.getElementById('editLogin').value = formatarNomeLogin(e.target.value); });

// Dashboard
async function carregarDashboard() {
    const [snapLojas, snapCli, snapHist] = await Promise.all([ getDocs(collection(db, "usuarios")), getDocs(collection(db, "clientes")), getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) ]);
    document.getElementById('dashTotLojas').innerText = snapLojas.size - 1;
    document.getElementById('dashTotClientes').innerText = snapCli.size;
    document.getElementById('dashTotAcoes').innerText = snapHist.size;
    let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = ''; historicoGlobal = {};
    snapHist.forEach(d => {
        let data = d.data(); historicoGlobal[d.id] = data;
        let dStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds*1000)).toLocaleString('pt-BR') : 'Data Indisp.';
        let btn = data.dadosPlanilha ? `<button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')">👁️ Ver</button><button class="btn-small btn-sucesso" style="margin:0" onclick="window.regenerarPlanilha('${d.id}')">⬇️ Baixar</button>` : "-";
        tbody.innerHTML += `<tr><td>${dStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td>${data.acao}</td><td>${data.destino || '-'}</td><td>${btn}</td></tr>`;
    });
}

// Filtro Log Admin
document.getElementById('pesquisaLogAdmin').addEventListener('input', (e) => {
    let f = e.target.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => { if(!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none'; });
});

// Outras funções de Gestão (Salvar Loja, Preços, Backup) seguem a mesma lógica dos passos anteriores...
// [Copie as funções abrirPrecos, salvarPrecos, gerarBackup e importarLojas do histórico anterior se necessário]

carregarDashboard();
