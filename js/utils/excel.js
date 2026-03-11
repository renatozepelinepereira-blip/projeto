import { db } from "../api/firebase.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function processarExcelTransferencia(dados) {
    const { userId, nomeLoja, razaoDestino, cnpjDestino, cnpjOrigem, resumo, itens } = dados;
    let dadosBackup = { tipo: 'transferencia', razaoDestino, cnpjDestino, cnpjOrigem, resumo, itens };

    await addDoc(collection(db, "historico"), { lojaId: userId, nomeLoja: nomeLoja, acao: "Gerou Transferência", destino: razaoDestino, dataHora: serverTimestamp(), dadosPlanilha: JSON.stringify(dadosBackup) });

    const response = await fetch('./TRANSFERENCIA.xlsx');
    if (!response.ok) throw new Error("Template TRANSFERENCIA.xlsx não encontrado.");
    const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

    const preencherAba = (nomeAba, categoriasPermitidas, tipoAba) => {
        const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
        let selecionados = itens.filter(p => categoriasPermitidas.includes(p.catReal));
        if(selecionados.length === 0) return;
        
        let qtdTotalUnidadeAba = 0; let valorTotalAba = 0;
        selecionados.forEach(p => { qtdTotalUnidadeAba += p.calcTotalUnidades; valorTotalAba += (p.calcTotalUnidades * p.precoFinal); });

        if (tipoAba === 'FATURAMENTO') { sheet.getCell('D7').value = cnpjOrigem; sheet.getCell('I7').value = cnpjDestino; sheet.getCell('E8').value = qtdTotalUnidadeAba; sheet.getCell('J8').value = valorTotalAba; } 
        else { sheet.getCell('E7').value = cnpjOrigem; sheet.getCell('K7').value = razaoDestino; sheet.getCell('D8').value = resumo.totalCaixas; sheet.getCell('G8').value = resumo.totalPecas; sheet.getCell('L8').value = resumo.valorTotal; }

        let linhaAtual = 10; 
        selecionados.forEach(item => {
            sheet.getCell(`C${linhaAtual}`).value = item.codigo;
            if (tipoAba === 'FATURAMENTO') { sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; } 
            else { sheet.getCell(`D${linhaAtual}`).value = item.calcQtdCx; sheet.getCell(`E${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = item.descricao; }
            linhaAtual++;
        });
    };

    preencherAba("FATURAMENTO - PROD", ["sorvete", "balde"], "FATURAMENTO"); preencherAba("FATURAMENTO - SECO", ["seco"], "FATURAMENTO"); preencherAba("ROMANEIO", ["sorvete", "seco", "balde"], "ROMANEIO");
    const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `TRANSFERENCIA_${razaoDestino.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
}

export async function processarExcelVenda(dados) {
    const { userId, nomeLoja, razao, cnpj, formaPagamento, prazo, totalV, itens } = dados;
    let dadosBackup = { tipo: 'venda', razao, cnpj, formaPagamento, prazo, totalV, itens };

    await addDoc(collection(db, "historico"), { lojaId: userId, nomeLoja: nomeLoja, acao: "Gerou Venda", destino: razao, dataHora: serverTimestamp(), dadosPlanilha: JSON.stringify(dadosBackup) });

    const response = await fetch('./PEDIDO.xlsx');
    if (!response.ok) throw new Error("Template PEDIDO.xlsx não encontrado.");
    const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

    const sheet = wb.worksheets[0];
    if(sheet) {
        sheet.getCell('E6').value = razao; sheet.getCell('J6').value = cnpj; sheet.getCell('L7').value = totalV;
        sheet.getCell('F8').value = formaPagamento + (prazo ? ` - ${prazo}` : '');
        let linhaAtual = 12; // Início no PEDIDO.xlsx
        itens.forEach(item => {
            sheet.getCell(`C${linhaAtual}`).value = item.codigo; sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades;
            sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; linhaAtual++;
        });
    }
    const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `PEDIDO_${razao.replace(/\s+/g, '_').toUpperCase()}.xlsx`);
}

export async function regenerarPlanilhaExcel(log) {
    const d = JSON.parse(log.dadosPlanilha);
    const isVenda = d.tipo === 'venda';
    
    const response = await fetch(isVenda ? './PEDIDO.xlsx' : './TRANSFERENCIA.xlsx');
    if(!response.ok) throw new Error("Template não encontrado.");
    const buffer = await response.arrayBuffer(); const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer);

    if (isVenda) {
        const sheet = wb.worksheets[0];
        if(sheet) {
            sheet.getCell('E6').value = d.razao; sheet.getCell('J6').value = d.cnpj; sheet.getCell('L7').value = d.totalV;
            sheet.getCell('F8').value = d.formaPagamento + (d.prazo ? ` - ${d.prazo}` : '');
            let linhaAtual = 12; 
            d.itens.forEach(item => {
                sheet.getCell(`C${linhaAtual}`).value = item.codigo; sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades || item.qtd;
                sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal || item.preco; linhaAtual++;
            });
        }
    } else {
        const preencherAba = (nomeAba, categoriasPermitidas, tipoAba) => {
            const sheet = wb.getWorksheet(nomeAba); if(!sheet) return; 
            let selecionados = d.itens.filter(p => categoriasPermitidas.includes(p.catReal)); if(selecionados.length === 0) return;
            let qtdTotalUnidadeAba = 0; let valorTotalAba = 0;
            selecionados.forEach(p => { qtdTotalUnidadeAba += p.calcTotalUnidades; valorTotalAba += (p.calcTotalUnidades * p.precoFinal); });

            if (tipoAba === 'FATURAMENTO') { sheet.getCell('D7').value = d.cnpjOrigem || ""; sheet.getCell('I7').value = d.cnpjDestino; sheet.getCell('E8').value = qtdTotalUnidadeAba; sheet.getCell('J8').value = valorTotalAba; } 
            else { sheet.getCell('E7').value = d.cnpjOrigem || ""; sheet.getCell('K7').value = d.razaoDestino; sheet.getCell('D8').value = d.resumo?.totalCaixas || 0; sheet.getCell('G8').value = d.resumo?.totalPecas || 0; sheet.getCell('L8').value = d.resumo?.valorTotal || 0; }
            let linhaAtual = 10; 
            selecionados.forEach(item => {
                sheet.getCell(`C${linhaAtual}`).value = item.codigo;
                if (tipoAba === 'FATURAMENTO') { sheet.getCell(`D${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`E${linhaAtual}`).value = item.descricao; sheet.getCell(`F${linhaAtual}`).value = item.precoFinal; } 
                else { sheet.getCell(`D${linhaAtual}`).value = item.calcQtdCx || 0; sheet.getCell(`E${linhaAtual}`).value = item.calcTotalUnidades; sheet.getCell(`F${linhaAtual}`).value = item.descricao; }
                linhaAtual++;
            });
        };
        preencherAba("FATURAMENTO - PROD", ["sorvete", "balde"], "FATURAMENTO"); preencherAba("FATURAMENTO - SECO", ["seco"], "FATURAMENTO"); preencherAba("ROMANEIO", ["sorvete", "seco", "balde"], "ROMANEIO");
    }
    const outBuffer = await wb.xlsx.writeBuffer(); saveAs(new Blob([outBuffer]), `REGERADO_${(d.razao || d.razaoDestino || 'PLANILHA').replace(/\s+/g, '_').toUpperCase()}.xlsx`);
}
