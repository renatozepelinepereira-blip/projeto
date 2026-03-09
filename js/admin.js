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
    try {
        const [snapLojas, snapCli, snapHist] = await Promise.all([ 
            getDocs(collection(db, "usuarios")), 
            getDocs(collection(db, "clientes")), 
            getDocs(query(collection(db, "historico"), orderBy("dataHora", "desc"), limit(50))) 
        ]);
        
        document.getElementById('dashTotLojas').innerText = (snapLojas.size > 0 ? snapLojas.size - 1 : 0);
        document.getElementById('dashTotClientes').innerText = snapCli.size;
        document.getElementById('dashTotAcoes').innerText = snapHist.size;
        
        let tbody = document.querySelector('#tabelaHistorico tbody'); 
        tbody.innerHTML = '';
        if(snapHist.size === 0) { 
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Nenhuma atividade registrada ainda.</td></tr>'; 
            return; 
        }
        
        historicoGlobal = {};
        snapHist.forEach(d => {
            let data = d.data(); 
            let dataStr = 'Data Indisponível';
            historicoGlobal[d.id] = data;
            
            if(data.dataHora) { 
                if(typeof data.dataHora.toDate === 'function') dataStr = data.dataHora.toDate().toLocaleString('pt-BR'); 
                else if(data.dataHora.seconds) dataStr = new Date(data.dataHora.seconds * 1000).toLocaleString('pt-BR'); 
            }
            
            let acoesBtn = "-";
            if(data.dadosPlanilha) {
                // Aqui os botões ficam lado a lado, apenas com ícones e o 'title' para a mensagem
                acoesBtn = `
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-small btn-edit" onclick="window.visualizarLog('${d.id}')" title="Visualizar detalhes da planilha">👁️</button>
                        <button class="btn-small btn-sucesso" style="margin:0;" onclick="window.regenerarPlanilha('${d.id}')" title="Baixar planilha Excel novamente">⬇️</button>
                    </div>`;
            }

            tbody.innerHTML += `<tr>
                <td>${dataStr}</td>
                <td><b>${data.nomeLoja || data.lojaId}</b></td>
                <td style="color: ${data.acao.includes('Venda') ? 'green' : 'blue'}; font-weight:bold;">${data.acao}</td>
                <td>${data.destino || '-'}</td>
                <td>${acoesBtn}</td>
            </tr>`;
        });
    } catch (error) {
        console.error("Erro no Dashboard:", error);
        document.querySelector('#tabelaHistorico tbody').innerHTML = `<tr><td colspan="5" style="color:red; text-align:center; padding: 20px;">Erro ao carregar dados.</td></tr>`;
    }
}

// Filtro Log Admin
document.getElementById('pesquisaLogAdmin').addEventListener('input', (e) => {
    let f = e.target.value.toLowerCase();
    document.querySelectorAll('#tabelaHistorico tbody tr').forEach(r => { if(!r.querySelector('td[colspan]')) r.style.display = r.innerText.toLowerCase().includes(f) ? '' : 'none'; });
});

// Outras funções de Gestão (Salvar Loja, Preços, Backup) seguem a mesma lógica dos passos anteriores...
// [Copie as funções abrirPrecos, salvarPrecos, gerarBackup e importarLojas do histórico anterior se necessário]

carregarDashboard();
