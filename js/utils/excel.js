import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelVenda(dados) {
    const nomeTemplate = dados.isTransferencia ? 'TRANSFERENCIA.xlsx' : 'PEDIDO.xlsx';
    let workbook = new ExcelJS.Workbook();
    let isGeneric = false;
    
    try {
        // Tenta buscar o arquivo da pasta raiz
        const response = await fetch(`./templates/${nomeTemplate}`);
        if (!response.ok) throw new Error("Template não encontrado.");
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
    } catch (e) {
        console.warn(`Template ${nomeTemplate} não encontrado. Gerando um Excel genérico...`);
        alert(`⚠️ O sistema não encontrou a pasta "/templates/${nomeTemplate}". \n\nCriando uma planilha genérica de emergência.`);
        isGeneric = true;
        workbook = new ExcelJS.Workbook(); 
        const sheet = workbook.addWorksheet('Planilha 1');
        sheet.columns = [
            { header: 'CÓDIGO', key: 'codigo', width: 10 },
            { header: 'PRODUTO', key: 'descricao', width: 40 },
            { header: 'QTD UNID.', key: 'qtd', width: 12 },
            { header: 'PREÇO UN.', key: 'preco', width: 12 },
            { header: 'TOTAL R$', key: 'subtotal', width: 15 }
        ];
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
        // === PREENCHIMENTO INTELIGENTE DE TEMPLATES ===
        workbook.worksheets.forEach(sheet => {
            let headerRowNumber = -1;
            let colMap = {};
            
            // Define quais produtos entram em qual aba (Sheet)
            const sheetName = sheet.name.toUpperCase();
            let allowedCats = [];
            if (sheetName.includes('SORVETE')) allowedCats = ['sorvete', 'promo'];
            else if (sheetName.includes('BALDE')) allowedCats = ['balde'];
            else if (sheetName.includes('SECO')) allowedCats = ['seco'];
            else if (sheetName.includes('PROD')) allowedCats = ['sorvete', 'promo', 'balde'];
            else allowedCats = ['sorvete', 'promo', 'balde', 'seco']; // Romaneio geral pega tudo

            const sheetItems = dados.itens.filter(i => allowedCats.includes(i.catReal));
            
            // Calcula os totais específicos desta aba
            let sheetQtdTotal = 0;
            let sheetValorTotal = 0;
            let sheetEngTotal = 0;
            
            sheetItems.forEach(i => {
                sheetQtdTotal += i.calcTotalUnidades;
                sheetValorTotal += i.calcSubtotal;
                const cap = parseFloat(i.engradado) || 1;
                sheetEngTotal += Math.floor(i.calcTotalUnidades / cap);
            });

            // Escaneia as primeiras 20 linhas para encontrar os cabeçalhos
            for (let r = 1; r <= 20; r++) {
                const row = sheet.getRow(r);
                if (!row.values) continue;
                
                let foundHeaderInRow = false;
                
                row.eachCell((cell, colNumber) => {
                    if (!cell.value) return;
                    const text = String(cell.value).toUpperCase().trim();
                    
                    // Preenche Cabeçalho do Cliente / Filial (Célula ao lado)
                    if (text === 'CLIENTE') sheet.getCell(r, colNumber + 1).value = dados.razao;
                    if (text === 'CNPJ') sheet.getCell(r, colNumber + 1).value = dados.cnpj;
                    if (text === 'SAÍDA' || text === 'SAIDA') sheet.getCell(r, colNumber + 1).value = dados.nomeLoja;
                    if (text === 'ENTRADA') sheet.getCell(r, colNumber + 1).value = dados.razao;
                    if (text === 'PRAZO') sheet.getCell(r, colNumber + 1).value = dados.prazo || '-';
                    if (text === 'QNTD TOTAL' || text === 'QTD TOTAL') sheet.getCell(r, colNumber + 1).value = sheetQtdTotal;
                    if (text === 'VALOR TOTAL') sheet.getCell(r, colNumber + 1).value = sheetValorTotal;
                    if (text === 'TOTAL ENG' || text === 'TOTAL ENG.') sheet.getCell(r, colNumber + 1).value = sheetEngTotal;
                    
                    // Mapeia onde estão as colunas da tabela de produtos
                    if (!colMap['codigo'] && (text === 'COD' || text === 'CÓD' || text === 'CÓDIGO')) {
                        headerRowNumber = r;
                        colMap['codigo'] = colNumber;
                        foundHeaderInRow = true;
                    } else if (!colMap['eng'] && (text === 'ENG' || text === 'ENG.')) {
                        colMap['eng'] = colNumber;
                    } else if (!colMap['qtd'] && (text === 'QNTD' || text === 'QTD')) {
                        colMap['qtd'] = colNumber;
                    } else if (!colMap['desc'] && (text === 'PRODUTO' || text === 'DESCRIÇÃO')) {
                        colMap['desc'] = colNumber;
                    } else if (!colMap['valor'] && (text === 'V. TRANSF' || text === 'VALOR' || text === 'V. TOTAL')) {
                        colMap['valor'] = colNumber;
                    }
                });
                
                if (foundHeaderInRow) break; 
            }

            // Preenche os produtos abaixo do cabeçalho encontrado
            if (headerRowNumber !== -1 && sheetItems.length > 0) {
                let linhaAtual = headerRowNumber + 1;
                sheetItems.forEach(item => {
                    const row = sheet.getRow(linhaAtual);
                    if (colMap['codigo']) row.getCell(colMap['codigo']).value = item.codigo;
                    if (colMap['eng']) {
                        const cap = parseFloat(item.engradado) || 1;
                        if (cap > 1) {
                            const cx = Math.floor(item.calcTotalUnidades / cap);
                            const un = item.calcTotalUnidades % cap;
                            let engStr = `${cx} CX`;
                            if (un > 0) engStr += ` e ${un} UN`;
                            row.getCell(colMap['eng']).value = engStr;
                        } else {
                            row.getCell(colMap['eng']).value = `${item.calcTotalUnidades} UN`;
                        }
                    }
                    if (colMap['qtd']) row.getCell(colMap['qtd']).value = item.calcTotalUnidades;
                    if (colMap['desc']) row.getCell(colMap['desc']).value = item.descricao;
                    if (colMap['valor']) row.getCell(colMap['valor']).value = item.calcSubtotal;
                    
                    row.commit();
                    linhaAtual++;
                });
            }
        });
    }

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
