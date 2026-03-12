import { db } from "./api/firebase.js";
import { iniciarInterfaceGlobais } from "./utils/interface.js";
import { processarExcelVenda } from "./utils/excel.js";
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const userId = localStorage.getItem('user'); 
if(!userId) window.location.href = 'index.html';

let produtosGlobais = [];
iniciarInterfaceGlobais();

async function carregarLoja() {
    const userSnap = await getDoc(doc(db, "usuarios", userId));
    const dados = userSnap.data();
    document.getElementById('txtLoja').innerText = dados.nomeLoja || userId;

    const tabPreco = dados.tabelaPreco || 'tf';
    const [precosSnap, prodSnap] = await Promise.all([
        getDoc(doc(db, "precos", tabPreco)),
        getDocs(collection(db, "produtos"))
    ]);

    const tabela = precosSnap.data() || {};
    const tbodySorvete = document.querySelector('#tbl_sorvete tbody');

    prodSnap.forEach(d => {
        const p = d.data();
        const preco = tabela[p.codigo];
        if(preco) {
            produtosGlobais.push({...p, precoFinal: preco});
            // Adicionar na tabela apenas se tiver preço
            const img = p.imagem ? `<img src="${p.imagem}" class="img-produto">` : '📦';
            tbodySorvete.innerHTML += `<tr>
                <td>${img}</td>
                <td>${p.codigo}</td>
                <td>${p.descricao}</td>
                <td>${p.engradado}</td>
                <td>R$ ${preco.toFixed(2)}</td>
                <td><input type="number" step="0.5" oninput="window.calcular()"></td>
                <td><input type="number" oninput="window.calcular()"></td>
                <td class="subtotal">R$ 0,00</td>
            </tr>`;
        }
    });
}

window.mudarAba = (aba) => {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.getElementById('content_' + aba).style.display = 'block';
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
};

carregarLoja();
