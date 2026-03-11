<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Administrativo - Eskimó</title>
    
    <style>
        * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; margin: 0; padding: 0; }
        body { display: flex; height: 100vh; overflow: hidden; background: #f4f7f6; color: #333; line-height: 1.6; }

        /* O MENU SANDUÍCHE PERFEITO */
        .sidebar-admin { 
            width: 85px; /* Largura fechada mostrando os ícones */
            background: #2c3e50; display: flex; flex-direction: column; 
            transition: width 0.3s ease; overflow: hidden; white-space: nowrap; 
            z-index: 1000; box-shadow: 3px 0 15px rgba(0,0,0,0.15); flex-shrink: 0; height: 100vh;
        }
        .sidebar-admin:hover { width: 280px; /* Largura aberta */ }
        
        .sidebar-header { background: #e3000f; height: 75px; display: flex; align-items: center; padding-left: 25px; gap: 15px; border-bottom: 3px solid #b3000c; }
        .nav-links { display: flex; flex-direction: column; padding: 15px 0; flex-grow: 1; }
        
        .nav-links button { 
            background: transparent; border: none; color: #adb5bd; padding: 16px 25px; 
            text-align: left; cursor: pointer; display: flex; align-items: center; 
            width: 280px; transition: 0.2s; border-left: 4px solid transparent; font-size: 15px; outline: none; 
        }
        
        /* O segredo dos ícones alinhados */
        .nav-links button i { min-width: 35px; font-style: normal; font-size: 22px; text-align: left; }
        .nav-links button span { margin-left: 10px; opacity: 0; transition: 0.2s; pointer-events: none; }
        .sidebar-admin:hover .nav-links button span { opacity: 1; pointer-events: auto; }
        .nav-links button:hover, .nav-links button.active { background: #34495e; color: white; border-left-color: #e3000f; }

        /* CONTEÚDO PRINCIPAL E CARDS */
        .main-content { flex-grow: 1; padding: 35px; overflow-y: auto; height: 100vh; }
        .section-title { font-size: 26px; font-weight: 700; margin-bottom: 25px; color: #2c3e50; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;}
        .dash-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .card-stat { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: center; border-left: 6px solid #e3000f; }
        .card-stat h3 { color: #7f8c8d; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px; }
        .card-stat .valor { font-size: 36px; font-weight: 800; color: #2c3e50; line-height: 1; }
        .card-panel { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin-bottom: 25px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }

        /* TABELAS E BOTÕES */
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #f8f9fa; padding: 14px; text-align: left; border-bottom: 2px solid #ddd; font-weight: 700; color: #444; text-transform: uppercase; font-size: 13px; }
        td { padding: 14px; border-bottom: 1px solid #eee; vertical-align: middle; color: #333; }
        tr:hover td { background: #fdfdfd; }
        .img-produto { width: 45px; height: 45px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd; }
        .img-placeholder { width: 45px; height: 45px; background: #f8f9fa; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 1px dashed #ccc; }

        input[type="text"], input[type="password"], input[type="number"], select, input[type="file"] { width: 100%; padding: 12px; margin-bottom: 15px; border: 1px solid #dcdcdc; border-radius: 8px; font-size: 14px; outline: none; transition: 0.2s; background: #fff; }
        input:focus, select:focus { border-color: #e3000f; box-shadow: 0 0 0 3px rgba(227, 0, 15, 0.1); }
        label { display: block; font-weight: bold; color: #555; margin-bottom: 5px; font-size: 13px; }

        .btn-primario { background: #e3000f; color: white; border: none; padding: 14px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-sucesso { background: #28a745; color: white; border: none; padding: 14px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-secundario { background: #6c757d; color: white; border: none; padding: 14px 20px; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn-primario:hover, .btn-sucesso:hover, .btn-secundario:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
        
        .acoes-group { display: flex; gap: 8px; align-items: center; }
        .btn-small { width: 36px; height: 36px; border: none; border-radius: 8px; cursor: pointer; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; transition: 0.2s; padding: 0;}
        .btn-edit { background: #007bff; } .btn-edit:hover { background: #0056b3; transform: translateY(-2px); }

        /* MODAIS E ANIMAÇÕES */
        .modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); z-index: 3000; justify-content: center; align-items: center; backdrop-filter: blur(3px); }
        .modal-content { background: white; padding: 30px; border-radius: 12px; width: 500px; max-width: 95%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.2); animation: fadeIn 0.3s ease; }
        .secao { display: none; animation: fadeIn 0.3s ease-out; }
        .secao.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    </style>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
</head>
<body>
    
    <div class="sidebar-admin">
        <div class="sidebar-header">
            <span style="font-size:26px; min-width:35px; text-align: left;">🍨</span>
            <h2 style="color:white; margin:0; font-size: 18px;">Admin</h2>
        </div>
        <div class="nav-links">
            <button onclick="mudarSecao('dashboard')" class="active" id="nav-dashboard"><i>📊</i> <span>Dashboard</span></button>
            <button onclick="mudarSecao('produtos')" id="nav-produtos"><i>📦</i> <span>Catálogo de Produtos</span></button>
            <button onclick="mudarSecao('precos')" id="nav-precos"><i>💲</i> <span>Tabelas de Preços</span></button>
            <button onclick="mudarSecao('lojas')" id="nav-lojas"><i>🏪</i> <span>Gestão de Lojas</span></button>
            <button onclick="mudarSecao('backup')" id="nav-backup"><i>💾</i> <span>Sistema de Backup</span></button>
            <button onclick="localStorage.clear(); window.location.href='index.html'" style="margin-top:auto; background:#c0392b !important; color:white !important;"><i>🚪</i> <span>Sair</span></button>
        </div>
    </div>

    <div class="main-content">
        <div id="sec-dashboard" class="secao active">
            <h2 class="section-title">Visão Geral</h2>
            <div class="dash-cards">
                <div class="card-stat"><h3>Lojas Ativas</h3><div class="valor" id="dashLojas">0</div></div>
                <div class="card-stat" style="border-left-color: #0056b3;"><h3>Produtos Catálogo</h3><div class="valor" id="dashProdutos">0</div></div>
                <div class="card-stat" style="border-left-color: #28a745;"><h3>Planilhas Geradas</h3><div class="valor" id="dashPlanilhas">0</div></div>
            </div>
            <div class="card-panel">
                <h3>Últimas Atividades</h3>
                <input type="text" id="pesquisaLogAdmin" placeholder="🔍 Pesquisar no histórico..." style="margin: 15px 0;">
                <div style="max-height: 400px; overflow-y: auto;">
                    <table id="tabelaHistorico"><thead><tr><th>Data / Hora</th><th>Loja</th><th>Ação</th><th>Destino</th><th>Ações</th></tr></thead><tbody></tbody></table>
                </div>
            </div>
        </div>

        <div id="sec-produtos" class="secao">
            <h2 class="section-title">Catálogo Central de Produtos</h2>
            <div class="card-panel">
                <button onclick="window.abrirNovoProduto()" class="btn-sucesso" style="margin-bottom: 20px;">+ Criar Novo Produto</button>
                <input type="text" id="pesquisaProduto" placeholder="🔍 Buscar por código ou nome...">
                <div style="max-height: 500px; overflow-y: auto; margin-top: 15px;">
                    <table id="tabelaProdutosAdmin"><thead><tr><th style="width:50px; text-align:center;">📷</th><th>Cód</th><th>Descrição</th><th>Engr.</th><th>Cat.</th><th style="text-align:center">Ação</th></tr></thead><tbody></tbody></table>
                </div>
            </div>
        </div>

        <div id="sec-precos" class="secao">
            <h2 class="section-title">Gestão de Tabelas de Preços</h2>
            <div class="grid-2">
                <div class="card-panel">
                    <h3 style="color:#0056b3">1. Subir/Atualizar Tabela</h3>
                    <input type="text" id="nomeTabelaPreco" placeholder="Ex: PM01, TF, T03">
                    <input type="file" id="fileCsvPrecos" accept=".csv, .xlsx">
                    <button onclick="window.importarTabelaPrecos()" class="btn-primario" style="width:100%;">⚡ Importar Tabela</button>
                </div>
                <div class="card-panel">
                    <h3 style="color:#28a745">2. Associar Tabela a uma Loja</h3>
                    <select id="selectLojaAssociar"></select>
                    <select id="selectTabelaAssociar"></select>
                    <button onclick="window.associarTabelaLoja()" class="btn-sucesso" style="width:100%;">Vincular Tabela à Loja</button>
                </div>
            </div>
        </div>
        
        <div id="sec-lojas" class="secao">
            <h2 class="section-title">Lojas e Usuários</h2>
            <div class="card-panel">
                <button onclick="window.abrirNovaLoja()" class="btn-sucesso" style="margin-bottom: 20px;">+ Criar Loja / Usuário</button>
                <table id="tabelaLojasAdmin"><thead><tr><th>Login</th><th>Razão Social</th><th>CNPJ</th><th>Tabela (Venda)</th><th>Ações</th></tr></thead><tbody></tbody></table>
            </div>
        </div>

        <div id="sec-backup" class="secao">
            <h2 class="section-title">Proteção e Backup do Sistema</h2>
            <div class="grid-2">
                <div class="card-panel" style="text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 15px;">📦</div>
                    <h3 style="color: #2c3e50;">Exportar Backup</h3>
                    <p style="color: #666; font-size: 13px; margin: 15px 0;">Comprime Produtos, Utilizadores, Preços e Histórico num ficheiro .ZIP.</p>
                    <button onclick="window.gerarBackupCompleto()" id="btnGerarBackup" class="btn-sucesso" style="width: 100%;">⬇️ Baixar Backup (.ZIP)</button>
                </div>

                <div class="card-panel" style="text-align: center; border: 2px dashed #e3000f; background: #fffafa;">
                    <div style="font-size: 40px; margin-bottom: 15px;">🔄</div>
                    <h3 style="color: #e3000f;">Restaurar Banco de Dados</h3>
                    <p style="color: #666; font-size: 13px; margin: 15px 0;">Selecione o ficheiro .ZIP para repovoar o sistema. (Atenção: Irá sobrescrever dados existentes).</p>
                    <input type="file" id="fileRestoreZip" accept=".zip" style="margin-bottom: 10px;">
                    <button onclick="window.restaurarBackupCompleto()" id="btnRestaurarBackup" class="btn-primario" style="width: 100%;">⚡ Restaurar Sistema</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal-overlay" id="modalProduto">
        <div class="modal-content">
            <h2 id="titModalProduto" style="color: #e3000f; margin-bottom:15px;">Produto</h2>
            <input type="hidden" id="prodEditOrigem">
            <input type="hidden" id="prodEditImagemUrl"> <label>Código do Produto</label> <input type="text" id="prodEditCodigo">
            <label>Descrição Completa</label> <input type="text" id="prodEditDescricao">
            <label>Categoria (sorvete, seco, balde, promo)</label> <input type="text" id="prodEditCategoria" placeholder="Ex: sorvete">
            <label>Capacidade do Engradado</label> <input type="number" id="prodEditEngradado">
            
            <label>Subir Foto do Produto</label> 
            <input type="file" id="prodEditImagemFile" accept="image/png, image/jpeg, image/webp" style="background: #f4f6f9; border: 1px dashed #ccc;">
            
            <div style="text-align:center; margin:15px 0;"><img id="previewFoto" src="" style="width:100px; height:100px; object-fit:cover; border-radius:10px; display:none; border:1px solid #ccc;"></div>
            
            <button onclick="window.salvarProduto()" id="btnSalvarProd" class="btn-sucesso" style="width:100%;">💾 Salvar Produto</button>
            <button onclick="window.fecharModal('modalProduto')" class="btn-secundario" style="width:100%; margin-top:10px;">Cancelar</button>
        </div>
    </div>

    <div class="modal-overlay" id="modalLoja"><div class="modal-content"><h2 id="titModalLoja" style="color:#e3000f; margin-bottom:15px;">Loja / Usuário</h2><input type="hidden" id="lojaEditIsNew"><label>Login (Usuário)</label> <input type="text" id="lojaEditId"><label>Senha</label> <input type="text" id="lojaEditSenha" placeholder="Deixe em branco para não alterar"><label>Razão Social</label> <input type="text" id="lojaEditNome"><label>CNPJ</label> <input type="text" id="lojaEditCnpj"><label style="display:flex; align-items:center; gap:10px; margin-top:15px; background:#f4f6f9; padding:10px; border-radius:8px; cursor:pointer;"><input type="checkbox" id="lojaEditBloqueiaVenda" style="width:auto; margin:0;"> Bloquear módulo de Vendas (Apenas Transferência)</label><button onclick="window.salvarLoja()" class="btn-sucesso" style="width:100%; margin-top:20px;">💾 Salvar Loja</button><button onclick="window.fecharModal('modalLoja')" class="btn-secundario" style="width:100%; margin-top:10px;">Cancelar</button></div></div>
    <div class="modal-overlay" id="modalDetalhesLog"><div class="modal-content" style="width: 700px;"><h2 style="color:#e3000f; margin-bottom:15px;">Detalhes</h2><div id="conteudoDetalhesLog" style="background:#f8f9fa; padding:20px; border-radius:8px; margin-bottom:15px; border:1px solid #e0e0e0;"></div><button id="btnRegerarPlanilhaModal" class="btn-sucesso" style="width:100%; padding:15px; font-size:16px;"></button><button onclick="window.fecharModal('modalDetalhesLog')" class="btn-secundario" style="width:100%; margin-top:10px; padding:15px;">Fechar</button></div></div>

    <script type="module" src="./js/admin.js"></script>
</body>
</html>
