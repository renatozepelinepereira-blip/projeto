
// js/utils/excel.js - Motor Gerador de Planilhas
import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelTransferencia(dadosExcel) {
    const { userId, nomeLoja, razaoDestino, cnpjDestino, cnpjOrigem, resumo, itens } = dadosExcel;

    let dadosBackup = { tipo: 'transferencia', razaoDestino, cnpjDestino, cnpjOrigem, resumo, itens };

    // 1. Salva no Firebase (Histórico)
    await addDoc(collection(db, "historico"), { 
        lojaId: userId, nomeLoja: nomeLoja, acao: "Gerou Transferência", 
        destino: razaoDestino, dataHora: serverTimestamp(), dadosPlanilha: JSON.stringify(dadosBackup) 
    });

    // 2. Gera o Arquivo Físico
    const response = await fetch('./TRANSFERENCIA.xlsx');
    if (!response.ok) throw new Error("Template TRANSFERENCIA.xlsx não encontrado no servidor.");
    
    const buffer = await response.arrayBuffer(); 
    const wb = new ExcelJS.Workbook(); 
    await wb.xlsx.load(buffer);

    const preencherAba = (nomeAba, categoriasPermitidas, tipoAba) => {
        const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
        let selecionados = itens.filter(p => categoriasPermitidas.includes(p.catReal));
        if(selecionados.length === 0) return;
        
        let qtdTotalUnidadeAba = 0; let valorTotalAba = 0;
        selecionados.forEach(p => { qtdTotalUnidadeAba += p.calcTotalUnidades; valorTotalAba += (p.calcTotalUnidades * p.precoFinal); });

        if (tipoAba === 'FATURAMENTO') { 
            sheet.getCell('D7').value = cnpjOrigem; sheet.getCell('I7').value = cnpjDestino; 
            sheet.getCell('E8').value = qtdTotalUnidadeAba; sheet.getCell('J8').value = valorTotalAba; 
        } else { 
            sheet.getCell('E7').value = cnpjOrigem; sheet.getCell('K7').value = razaoDestino; 
            sheet.getCell('D8').value = resumo.totalCaixas; sheet.getCell('G8').value = resumo.totalPecas; sheet.getCell('L8').value = resumo.valorTotal; 
        }

        let linhaAtual = 10; 
        selecionados.forEach(item => {
            sheet.getCell(`C${linhaAtual}`).value = item.codigo;
            if (tipoAba === 'FATURAMENTO') { 
                sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; 
            } else { 
                sheet.getCell(`D${linhaAtual}`).value = item.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = item.descricao; 
            }
            linhaAtual++;
        });
    };

    preencherAba("FATURAMENTO - PROD", ["sorvete", "balde"], "FATURAMENTO"); 
    preencherAba("FATURAMENTO - SECO", ["seco"], "FATURAMENTO"); 
    preencherAba("ROMANEIO", ["sorvete", "seco", "balde"], "ROMANEIO");
    
    const outBuffer = await wb.xlsx.writeBuffer(); 
    saveAs(new Blob([outBuffer]), `TRANSFERENCIA_${razaoDestino.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
}
