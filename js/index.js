<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Eskimó Sorvetes</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍨</text></svg>">
    <link rel="stylesheet" href="./css/login.css">
</head>
<body>
    <div class="login-container">
        <div class="login-box">
            <h1><span>🍨</span> Eskimó</h1>
            <p>Acesse o portal de gestão e pedidos</p>
            
            <input type="text" id="user" placeholder="Usuário">
            <input type="password" id="pass" placeholder="Senha">
            
            <button id="btnLogin">Entrar no Sistema</button>
            <div id="errorMsg" style="color: #ef4444; font-size: 14px; margin-top: 15px; display: none; font-weight: 600;">⚠️ Login ou senha inválidos</div>
        </div>
    </div>
    <script type="module" src="./js/index.js"></script>
</body>
</html>
