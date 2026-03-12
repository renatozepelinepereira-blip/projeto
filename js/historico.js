import { db } from "./api/firebase.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { regenerarPlanilhaExcel } from "./utils/excel.js";

const userId = localStorage.getItem('user');
let logs = [];

async function carregar() {
    const q = query(collection(db, "historico"), where("lojaId", "==", userId), orderBy("dataHora", "desc"));
    const snap = await getDocs(q);
    const tbody = document.getElementById('corpoHist');
    tbody.innerHTML = '';

    snap.forEach(d => {
        const data = d.data();
        logs.push({id: d.id, ...data});
        const ts = data.dataHora?.toDate ? data.dataHora.toDate() : new Date();
        
        tbody.innerHTML += `<tr>
            <td>${ts.toLocaleString('pt-BR')}</td>
            <td>${data.acao}</td>
            <td>${data.destino || '-'}</td>
            <td><button class="btn-sucesso" style="padding:5px 10px" onclick="window.baixar('${d.id}')">Excel</button></td>
        </tr>`;
    });
}

window.baixar = async (id) => {
    const log = logs.find(l => l.id === id);
    await regenerarPlanilhaExcel(log);
};

carregar();
