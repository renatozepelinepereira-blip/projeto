import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, deleteField, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBA9gyn1dWpSoTD8VORiiPU4hUIEVG7DU8", authDomain: "sistema-pedidos-3f2c2.firebaseapp.com", projectId: "sistema-pedidos-3f2c2", storageBucket: "sistema-pedidos-3f2c2.firebasestorage.app", messagingSenderId: "669786014126", appId: "1:669786014126:web:d0da498633a145d56a883f" };
const db = getFirestore(initializeApp(firebaseConfig));

if(localStorage.getItem('tipo') !== 'admin') window.location.href = 'index.html';

let usuariosData = {}; 
let editorItens = []; 
let itensExcluidos = []; 
let clientesData = {};
let historicoGlobal = {};

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
    let nome = nomeRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
    nome = nome.replace(/\([^)]*\)/g, " ").replace(/\/[a-z]{2}\b/g, " ");
    nome = nome.replace(/\b(eskimo|eskimó|loja de fabrica|loja|fabrica|sorvetes|sorvete|de|atacadao|atacadão|cd)\b/g, " ");
    nome = nome.replace(/[^a-z0-9\s]/g, " "); 
    let palavras = nome.split(/\s+/).filter(p => p.length > 0);
    const romanos = /^(i{1,3}|iv|v|vi{1,3}|ix|x)$/;
    if (palavras.length > 0) {
        let ultima = palavras[palavras.length - 1];
        if (romanos.test(ultima)) return "filial." + palavras.slice(0, -1).join("") + "." + ultima;
        return "filial." + palavras.join("");
    }
    return "";
}

document.getElementById('editNome').addEventListener('input', (e) => {
    if(document.getElementById('editId').value === "NOVO") document.getElementById('editLogin').value = formatarNomeLogin(e.target.value);
});

async function carregarDashboard() {
    try {
        const [snapLojas, snapCli, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "clientes")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) 
        ]);
        document.getElementById('dashTotLojas').innerText = (snapLojas.size > 0 ? snapLojas.size - 1 : 0);
        document.getElementById('dashTotClientes').innerText = snapCli.size;
        document.getElementById('dashTotAcoes').innerText = snapHist.size;
        let tbody = document.querySelector('#tabelaHistorico tbody'); tbody.innerHTML = '';
        if(snapHist.size === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma atividade registada ainda.</td></tr>'; return; }
        historicoGlobal = {};
        snapHist.forEach(d => {
            let data = d.data(); historicoGlobal[d.id] = data;
            let dataStr = data.dataHora ? (data.dataHora.toDate ? data.dataHora.toDate() : new Date(data.dataHora.seconds * 1000)).toLocaleString('pt-BR') : 'Data Indisponível';
            let acoesBtn = "-";
            if(data.dadosPlanilha) {
                acoesBtn = `<div style="display: flex; gap: 5px;">
                    <button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')" title="Visualizar detalhes da planilha">👁️</button>
                    <button class="btn-small btn-sucesso" style="margin:0;" onclick="window.regenerarPlanilha('${d.id}')" title="Baixar planilha Excel novamente">⬇️</button>
                </div>`;
            }
            tbody.innerHTML += `<tr><td>${dataStr}</td><td><b>${data.nomeLoja || data.lojaId}</b></td><td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td><td>${data.destino || '-'}</td><td>${acoesBtn}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}

// Lógica de Lojas e Preços simplificada para o espaço
async function carregarLojas() {
    const snap = await getDocs(collection(db, "usuarios"));
    const tbody = document.querySelector('#tabelaLojas tbody'); tbody.innerHTML = ''; usuariosData = {};
    tbody.innerHTML += `<tr style="background:#e6f2ff;"><td><b>TABELA TF</b></td><td>Tabela de Transferência Base</td><td>-</td><td><button class="btn-small btn-preco" onclick="window.abrirPrecos('tf')" title="Editar Preços de Transferência">💲</button></td></tr>`;
    snap.forEach(d => {
        usuariosData[d.id] = d.data(); const u = d.data();
        if(d.id !== 'admin') {
            tbody.innerHTML += `<tr><td><b>${d.id}</b></td><td>${u.nomeLoja}</td><td>${u.cnpj||'-'}</td>
                <td><div style="display:flex; gap:5px;">
                    <button class="btn-small btn-preco" onclick="window.abrirPrecos('${d.id}')" title="Gerir Preços">💲</button>
                    <button class="btn-small btn-edit" onclick="window.editarLoja('${d.id}')" title="Editar Loja">✏️</button>
                    <button class="btn-small btn-del" onclick="window.excluirLoja('${d.id}')" title="Excluir Loja">❌</button>
                </div></td></tr>`;
        }
    });
}

// Pesquisas em tempo real
document.getElementById('pesquisaLogAdmin').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => { if(!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none'; });
});

document.getElementById('pesquisaLoja').addEventListener('input', function() {
    let f = this.value.toLowerCase();
    document.querySelectorAll('#tabelaLojas tbody tr').forEach(r => { r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none'; });
});

carregarDashboard();
