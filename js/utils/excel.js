import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelVenda(dados) {
    const nomeTemplate = dados.isTransferencia ? 'TRANSFERENCIA.xlsx' : 'PEDIDO.xlsx';
    let workbook = new ExcelJS.Workbook();
    let isGeneric = false;
    
    try {
        // Tenta buscar o arquivo da pasta raiz (/templates/)
        const response = await fetch(`./templates/${nomeTemplate}`);
        if (!response.ok) throw new Error("Template não encontrado no servidor.");
        const arrayBuffer = await response.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        console.log(`✅ Template ${nomeTemplate} carregado com sucesso!`);
    } catch (e) {
        console.error(`Erro ao carregar o template:`, e);
        alert(`⚠️ O sistema não encontrou o arquivo "/templates/${nomeTemplate}". \n\nGerando planilha genérica de emergência.`);
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
        // PREENCHIMENTO DE EMERGÊNCIA (SE FALTAR O TEMPLATE)
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
        // =========================================================
        // PREENCHIMENTO EXATO NOS TEMPLATES DA ESKIMÓ
        // =========================================================
        workbook.worksheets.forEach(sheet => {
            const sheetName = sheet.name.toUpperCase();
            let allowedCats = [];

            // 1. DEFINE QUAIS CATEGORIAS ENTRAM EM CADA ABA
            if (dados.isTransferencia) {
                if (sheetName.includes('PROD')) allowedCats = ['sorvete', 'promo', 'balde'];
                else if (sheetName.includes('SECO')) allowedCats = ['seco'];
                else return; // Pula outras abas se houver
            } else {
                if (sheetName.includes('SORVETE')) allowedCats = ['sorvete', 'promo'];
                else if (sheetName.includes('BALDE')) allowedCats = ['balde'];
                else if (sheetName.includes('SECO')) allowedCats = ['seco'];
                else return; // Pula outras abas se houver
            }

            // Filtra apenas os itens que pertencem a esta aba
            const sheetItems = dados.itens.filter(i => allowedCats.includes(i.catReal));
            
            // Calcula totais específicos desta aba
            let sheetQtdTotal = 0;
            let sheetValorTotal = 0;
            sheetItems.forEach(i => {
                sheetQtdTotal += i.calcTotalUnidades;
                sheetValorTotal += i.calcSubtotal;
            });

            if (dados.isTransferencia) {
                // ==========================================
                // REGRAS DA PLANILHA DE TRANSFERÊNCIA
                // ==========================================
                // Loja saida = D7 (Nome + CNPJ caso exista no sistema)
                sheet.getCell('D7').value = `${dados.nomeLoja}`; 
                
                // Filial destino = I7 (COM CNPJ)
                sheet.getCell('I7').value = `${dados.razao} - CNPJ: ${dados.cnpj || 'Não informado'}`;
                
                // Quantidade Total = E8
                sheet.getCell('E8').value = sheetQtdTotal;
                
                // Valor total = J8
                sheet.getCell('J8').value = sheetValorTotal;

                // Produtos a partir da linha 10
                let linhaAtual = 10;
                sheetItems.forEach(item => {
                    const row = sheet.getRow(linhaAtual);
                    
                    // Coluna C (3) = Código
                    row.getCell(3).value = item.codigo;
                    // Coluna D (4) = Quantidade
                    row.getCell(4).value = item.calcTotalUnidades;
                    // Coluna E (5) = Descrição
                    row.getCell(5).value = item.descricao;
                    // Coluna F (6) = Valor unitario total (Subtotal)
                    row.getCell(6).value = item.calcSubtotal;
                    
                    row.commit();
                    linhaAtual++;
                });

            } else {
                // ==========================================
                // REGRAS DA PLANILHA DE VENDA (PEDIDO)
                // ==========================================
                // Cliente = E6
                sheet.getCell('E6').value = dados.razao;
                
                // CNPJ/CPF = I6
                sheet.getCell('J6').value = dados.cnpj || '';
                
                // Quantidade total = F7
                sheet.getCell('F7').value = sheetQtdTotal;
                
                // Valor total = K7
                sheet.getCell('L7').value = sheetValorTotal;
                
                // Prazo e condição = F8
                sheet.getCell('F8').value = `${dados.formaPagamento} ${dados.prazo && dados.prazo !== '-' ? '- ' + dados.prazo : ''}`;

                // Produtos a partir da linha 10
                let linhaAtual = 10;
                sheetItems.forEach(item => {
                    const row = sheet.getRow(linhaAtual);
                    
                    // Coluna C (3) = Produto (Código)
                    row.getCell(3).value = item.codigo;
                    
                    // Coluna D (4) = Engradado (Tradução de Unidades para Caixas)
                    const cap = parseFloat(item.engradado) || 1;
                    if (cap > 1) {
                        const cx = Math.floor(item.calcTotalUnidades / cap);
                        const un = item.calcTotalUnidades % cap;
                        row.getCell(4).value = `${cx} CX${un > 0 ? ` + ${un} UN` : ''}`;
                    } else {
                        row.getCell(4).value = `${item.calcTotalUnidades} UN`;
                    }
                    
                    // Coluna E (5) = Quantidade de itens (Unidades Totais)
                    row.getCell(5).value = item.calcTotalUnidades;
                    
                    // Coluna F (6) = Descrição
                    row.getCell(6).value = item.descricao;
                    
                    // Coluna G (7) = Preço unitário
                    row.getCell(7).value = item.precoFinal;
                    
                    row.commit();
                    linhaAtual++;
                });
            }
        });
    }

    // Grava a ação no Histórico do Firebase (Se for a primeira vez sendo gerada)
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

    // Dispara o Download
    const prefixo = dados.isTransferencia ? 'Transferencia' : 'Pedido';
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `${prefixo}_${dados.razao}_${new Date().getTime()}.xlsx`);
}

export async function regenerarPlanilhaExcel(dadosHistorico) {
    if (!dadosHistorico || !dadosHistorico.dadosPlanilha) return alert("Erro nos dados!");
    dadosHistorico.dadosPlanilha.idHistorico = dadosHistorico.id; 
    await processarExcelVenda(dadosHistorico.dadosPlanilha);
}
