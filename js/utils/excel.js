import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelVenda(dados) {
    const nomeTemplate = dados.isTransferencia ? 'TRANSFERENCIA.xlsx' : 'PEDIDO.xlsx';
    let workbook = new ExcelJS.Workbook();
    
    try {
        const response = await fetch(`./templates/${nomeTemplate}`);
        if (!response.ok) throw new Error("Template não encontrado.");
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
    } catch (e) {
        console.warn(`Template ${nomeTemplate} não encontrado. Gerando um Excel genérico...`);
        const sheet = workbook.addWorksheet('Planilha 1');
        sheet.columns = [
            { header: 'CÓDIGO', key: 'codigo', width: 10 },
            { header: 'PRODUTO', key: 'descricao', width: 40 },
            { header: 'QTD UNID.', key: 'qtd', width: 12 },
            { header: 'PREÇO UN.', key: 'preco', width: 12 },
            { header: 'TOTAL R$', key: 'subtotal', width: 15 }
        ];
    }

    const sheet = workbook.worksheets[0]; 
    
    // Você pode descomentar e ajustar as linhas abaixo para preencher o cabeçalho do seu template:
    // sheet.getCell('B2').value = dados.nomeLoja;
    // sheet.getCell('B3').value = dados.razao;
    // sheet.getCell('B4').value = dados.cnpj;

    // Acha a última linha preenchida ou começa na linha 2 (ajuste caso seu template tenha um cabeçalho muito grande)
    let linhaAtual = sheet.lastRow && sheet.lastRow.number > 1 ? sheet.lastRow.number + 1 : 2; 

    dados.itens.forEach(item => {
        const row = sheet.getRow(linhaAtual);
        row.getCell(1).value = item.codigo;      
        row.getCell(2).value = item.descricao;   
        row.getCell(3).value = item.calcTotalUnidades; 
        row.getCell(4).value = item.precoFinal; 
        row.getCell(5).value = item.calcSubtotal;
        row.commit();
        linhaAtual++;
    });

    if(!dados.idHistorico) {
        await addDoc(collection(db, "historico"), {
            lojaId: dados.userId,
            nomeLoja: dados.nomeLoja,
            acao: dados.isTransferencia ? "Gerou Transferência" : "Gerou Venda",
            destino: dados.razao,
            dataHora: serverTimestamp(),
            dadosPlanilha: dados
        });
    }

    const prefixo = dados.isTransferencia ? 'Transferencia' : 'Pedido';
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${prefixo}_${dados.razao}_${new Date().getTime()}.xlsx`);
}

export async function regenerarPlanilhaExcel(dadosHistorico) {
    if (!dadosHistorico || !dadosHistorico.dadosPlanilha) return alert("Erro nos dados!");
    dadosHistorico.dadosPlanilha.idHistorico = dadosHistorico.id; 
    await processarExcelVenda(dadosHistorico.dadosPlanilha);
}
