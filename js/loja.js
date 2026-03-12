<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova Venda - Eskimó</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍨</text></svg>">
    <link rel="stylesheet" href="./css/loja.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js" defer></script>
</head>
<body>
    <div class="top-header">
        <div class="top-header-left">
            <button class="menu-btn" onclick="window.toggleMenu()">☰</button>
            <div class="logo-container">🍨 Eskimó</div>
        </div>
        <div class="store-badge" id="txtLoja">Carregando...</div>
    </div>

    <div class="sidebar">
        <div class="sidebar-head">
            <h2>🍨 Eskimó</h2>
            <button class="close-btn" onclick="window.toggleMenu()">×</button>
        </div>
        <div class="sidebar-links">
            <button class="active"><i>🛒</i> Nova Venda</button>
            <button onclick="window.location.href='transferencia.html'"><i>🔄</i> Transferência</button>
            <button onclick="window.location.href='historico.html'"><i>📜</i> Histórico</button>
            <button onclick="localStorage.clear(); window.location.href='index.html'" style="margin-top:auto; color:#ef4444;"><i>🚪</i> Sair</button>
        </div>
    </div>
    <div class="overlay" onclick="window.toggleMenu()"></div>

    <div class="container">
        <h2 class="section-title">Portal de Vendas</h2>

        <div class="card-panel client-box">
            <div><label>Razão Social do Cliente</label><input type="text" id="cliRazao" list="listaNomesClientes" placeholder="Ex: Supermercado XYZ"></div>
            <div><label>CNPJ</label><input type="text" id="cliCnpj" placeholder="00.000.000/0000-00"></div>
            <div><label>Pagamento</label><select id="cliFormaPagamento"><option>A vista</option><option>Boleto</option><option>Cartão</option></select></div>
            <div><label>Prazo</label><input type="text" id="cliPrazo" placeholder="Ex: 7 dias" disabled style="background:#e2e8f0; cursor:not-allowed;"></div>
        </div>

        <div class="tabs">
            <button class="tab-btn active" id="btnTabSorvete" onclick="window.mudarAba('sorvete')">Sorvetes</button>
            <button class="tab-btn" id="btnTabAcai" onclick="window.mudarAba('acai')">Açaí</button>
            <button class="tab-btn" id="btnTabSeco" onclick="window.mudarAba('seco')">Secos</button>
            <button class="tab-btn" id="btnTabBalde" onclick="window.mudarAba('balde')">Baldes</button>
            <button class="tab-btn" id="btnTabPromo" onclick="window.mudarAba('promo')">Promoções</button>
        </div>

        <div class="table-container">
            <div id="content_sorvete" class="tab-content active">
                <div style="display: flex; justify-content: flex-end; align-items: center; padding: 10px; background: #f8fafc; border-bottom: 1px solid var(--border);">
                    <label style="margin: 0; font-weight: bold; color: var(--text-main); margin-right: 10px;">Desconto Aplicado (%):</label>
                    <input type="number" id="desc_sorvete" value="0" min="0" style="width: 80px; margin: 0; text-align: center;" oninput="window.calcularTudo()">
                    <span id="max_desc_sorvete" style="margin-left: 10px; font-size: 12px; color: #ef4444; font-weight: bold;">Máx: 0%</span>
                </div>
                <table id="tbl_sorvete"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody></tbody></table>
            </div>
            
            <div id="content_acai" class="tab-content">
                <div style="display: flex; justify-content: flex-end; align-items: center; padding: 10px; background: #f8fafc; border-bottom: 1px solid var(--border);">
                    <label style="margin: 0; font-weight: bold; color: var(--text-main); margin-right: 10px;">Desconto Aplicado (%):</label>
                    <input type="number" id="desc_acai" value="0" min="0" style="width: 80px; margin: 0; text-align: center;" oninput="window.calcularTudo()">
                    <span id="max_desc_acai" style="margin-left: 10px; font-size: 12px; color: #ef4444; font-weight: bold;">Máx: 0%</span>
                </div>
                <table id="tbl_acai"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody></tbody></table>
            </div>
            
            <div id="content_seco" class="tab-content">
                <div style="display: flex; justify-content: flex-end; align-items: center; padding: 10px; background: #f8fafc; border-bottom: 1px solid var(--border);">
                    <label style="margin: 0; font-weight: bold; color: var(--text-main); margin-right: 10px;">Desconto Aplicado (%):</label>
                    <input type="number" id="desc_seco" value="0" min="0" style="width: 80px; margin: 0; text-align: center;" oninput="window.calcularTudo()">
                    <span id="max_desc_seco" style="margin-left: 10px; font-size: 12px; color: #ef4444; font-weight: bold;">Máx: 0%</span>
                </div>
                <table id="tbl_seco"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody></tbody></table>
            </div>
            
            <div id="content_balde" class="tab-content">
                <div style="display: flex; justify-content: flex-end; align-items: center; padding: 10px; background: #f8fafc; border-bottom: 1px solid var(--border);">
                    <label style="margin: 0; font-weight: bold; color: var(--text-main); margin-right: 10px;">Desconto Aplicado (%):</label>
                    <input type="number" id="desc_balde" value="0" min="0" style="width: 80px; margin: 0; text-align: center;" oninput="window.calcularTudo()">
                    <span id="max_desc_balde" style="margin-left: 10px; font-size: 12px; color: #ef4444; font-weight: bold;">Máx: 0%</span>
                </div>
                <table id="tbl_balde"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody></tbody></table>
            </div>
            
            <div id="content_promo" class="tab-content">
                <div style="display: flex; justify-content: flex-end; align-items: center; padding: 10px; background: #f8fafc; border-bottom: 1px solid var(--border);">
                    <label style="margin: 0; font-weight: bold; color: var(--text-main); margin-right: 10px;">Desconto Aplicado (%):</label>
                    <input type="number" id="desc_promo" value="0" min="0" style="width: 80px; margin: 0; text-align: center;" oninput="window.calcularTudo()">
                    <span id="max_desc_promo" style="margin-left: 10px; font-size: 12px; color: #ef4444; font-weight: bold;">Máx: 0%</span>
                </div>
                <table id="tbl_promo"><thead style="position: sticky; top: 0; z-index: 1;"><tr><th style="width:60px;">Foto</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Preço un.</th><th>Caixas</th><th>Unid.</th><th>Subtotal</th></tr></thead><tbody></tbody></table>
            </div>
        </div>

        <div class="resumo-box">
            <div class="resumo-grid">
                <div class="resumo-info">
                    <b>Qtd (Unid)</b>
                    <span id="qtdTotal" style="color: #475569;">0</span>
                </div>
                <div class="resumo-info">
                    <b>Total Líquido</b>
                    <span id="valComDesc">R$ 0,00</span>
                </div>
                <button onclick="window.gerarExcelPedido()" class="btn-sucesso">
                    <span style="font-size: 16px;">⬇️</span> Gerar Pedido
                </button>
            </div>
        </div>
    </div>

    <datalist id="listaNomesClientes"></datalist>
    <script type="module" src="./js/loja.js"></script>
</body>
</html>
