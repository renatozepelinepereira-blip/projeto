import { db } from "./api/firebase.js";
import { collection, getDocs, getDoc, doc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { processarExcelVenda } from "./utils/excel.js";

const userId = localStorage.getItem('user');
let filiais = [];

async function iniciar() {
    const snapLojas = await getDocs(collection(db, "usuarios"));
    const list = document.getElementById('listaFiliais');
    
    snapLojas.forEach(u => {
        if(u.id !== 'admin' && u.id !== userId) {
            filiais.push({id: u.id, ...u.data()});
            list.innerHTML += `<option value="${u.data().nomeLoja || u.id}">`;
        }
    });
}

document.getElementById('cliRazao').addEventListener('change', (e) => {
    const f = filiais.find(f => (f.nomeLoja || f.id) === e.target.value);
    if(f) document.getElementById('cliCnpj').value = f.cnpj || '---';
});

// A lógica de preencher a tabela é idêntica à loja.js, mas usando obrigatoriamente a tabela 'tf'
// ... (Código de renderização similar ao loja.js focado na tabela 'tf')

iniciar();
