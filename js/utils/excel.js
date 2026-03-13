import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelVenda(dados) {
    const nomeTemplate = dados.isTransferencia ? 'TRANSFERENCIA.xlsx' : 'PEDIDO.xlsx';
    let workbook = new ExcelJS.Workbook();
    let isGeneric = false;
    
    try {
        const response = await fetch(`./templates/${nomeTemplate}`);
        if (!response.ok) throw new Error("Template não encontrado no servidor.");
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
    } catch (e) {
        console.warn(`Template não encontrado. Gerando um Excel genérico...`);
        isGeneric = true;
        workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Planilha 1');
        sheet.columns = [ { header: 'CÓDIGO', key: 'codigo', width: 10 }, { header: 'PRODUTO', key: 'descricao', width: 40 }, { header: 'QTD UNID.', key: 'qtd', width: 12 }, { header: 'PREÇO UN.', key: 'preco', width: 12 }, { header: 'TOTAL R$', key: 'subtotal', width: 15 } ];
    }

    if (isGeneric) {
        const sheet = workbook.worksheets[0]; 
        let linhaAtual = 2; 
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
    } else {
        const categoriasDB = dados.categorias || [];

        workbook.worksheets.forEach(sheet => {
            const sheetName = sheet.name.toUpperCase();
            
            // Procura quais categorias configuradas no Admin pertencem a esta aba específica
            let mappedCats = categoriasDB.filter(c => {
                let targetSheet = dados.isTransferencia ? c.abaTransf : c.abaVenda;
                return targetSheet && sheetName.includes(targetSheet.toUpperCase());
            });

            if (mappedCats.length === 0) return; // Nenhuma categoria configurada para esta aba

            let allowedCatIds = mappedCats.map(c => c.id);
            const sheetItems = dados.itens.filter(i => allowedCatIds.includes(i.catReal));
            
            let sheetQtdTotal = 0; let sheetValorTotal = 0;
            sheetItems.forEach(i => { sheetQtdTotal += i.calcTotalUnidades; sheetValorTotal += i.calcSubtotal; });

            if (dados.isTransferencia) {
                sheet.getCell('D7').value = `${dados.nomeLoja}`; 
                sheet.getCell('I7').value = `${dados.razao} - CNPJ: ${dados.cnpj || 'Não informado'}`;
                sheet.getCell('E8').value = sheetQtdTotal;
                sheet.getCell('J8').value = sheetValorTotal;

                let linhaAtual = 10;
                sheetItems.forEach(item => {
                    const row = sheet.getRow(linhaAtual);
                    row.getCell(3).value = item.codigo;
                    row.getCell(4).value = item.calcTotalUnidades;
                    row.getCell(5).value = item.descricao;
                    row.getCell(6).value = item.calcSubtotal;
                    row.commit();
                    linhaAtual++;
                });

            } else {
                sheet.getCell('E6').value = dados.razao;
                sheet.getCell('I6').value = dados.cnpj || '';
                sheet.getCell('F7').value = sheetQtdTotal;
                sheet.getCell('K7').value = sheetValorTotal;
                sheet.getCell('F8').value = `${dados.formaPagamento} ${dados.prazo && dados.prazo !== '-' ? '- ' + dados.prazo : ''}`;
                
                // INJETA O DESCONTO DINÂMICO
                // Pega o desconto configurado para a primeira categoria que mapeou nessa aba
                if (dados.descontos) {
                    let descontoAba = dados.descontos[allowedCatIds[0]];
                    if (descontoAba !== undefined && descontoAba > 0) {
                        sheet.getCell('L8').value = descontoAba;
                    }
                }

                let linhaAtual = 10;
                sheetItems.forEach(item => {
                    const row = sheet.getRow(linhaAtual);
                    row.getCell(3).value = item.codigo;
                    
                    const cap = parseFloat(item.engradado) || 0; 
                    if (cap > 1) {
                        const cx = Math.floor(item.calcTotalUnidades / cap);
                        const un = item.calcTotalUnidades % cap;
                        row.getCell(4).value = `${cx} CX${un > 0 ? ` + ${un} UN` : ''}`;
                    } else {
                        row.getCell(4).value = 0; 
                    }
                    
                    row.getCell(5).value = item.calcTotalUnidades;
                    row.getCell(6).value = item.descricao;
                    row.getCell(7).value = item.precoFinal;
                    row.commit();
                    linhaAtual++;
                });
            }
        });
    }

    if(!dados.idHistorico) {
        await addDoc(collection(db, "historico"), {
            lojaId: dados.userId, nomeLoja: dados.nomeLoja,
            acao: dados.isTransferencia ? "Gerou Transferência" : "Gerou Venda",
            destino: dados.razao, dataHora: serverTimestamp(), dadosPlanilha: dados
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
