import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelVenda(dados) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Pedido');

    sheet.columns = [
        { header: 'CÓDIGO', key: 'codigo', width: 10 },
        { header: 'PRODUTO', key: 'descricao', width: 40 },
        { header: 'PREÇO', key: 'preco', width: 12 },
        { header: 'QTD', key: 'qtd', width: 8 },
        { header: 'SUBTOTAL', key: 'subtotal', width: 15 }
    ];

    dados.itens.forEach(item => {
        sheet.addRow({
            codigo: item.codigo,
            descricao: item.descricao,
            preco: item.precoFinal,
            qtd: item.calcTotalUnidades,
            subtotal: item.calcSubtotal
        });
    });

    // Registrar no Histórico do Firebase
    await addDoc(collection(db, "historico"), {
        lojaId: dados.userId,
        nomeLoja: dados.nomeLoja,
        acao: "Gerou Venda: " + dados.razao,
        dataHora: serverTimestamp(),
        dadosPlanilha: dados
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Pedido_${dados.razao}_${new Date().getTime()}.xlsx`);
}

export async function regenerarPlanilhaExcel(dadosHistorico) {
    if (!dadosHistorico || !dadosHistorico.dadosPlanilha) return alert("Erro nos dados!");
    await processarExcelVenda(dadosHistorico.dadosPlanilha);
}
