/* Inclui regras de Sidebar Retrátil e Upload Estilizado */
* { box-sizing: border-box; font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; }
body { background: #f4f6f9; color: #333; display: flex; height: 100vh; overflow: hidden; }
.sidebar { width: 75px; background: #2c3e50; color: white; display: flex; flex-direction: column; transition: 0.3s; overflow-x: hidden; white-space: nowrap; z-index: 1000; }
.sidebar:hover { width: 260px; }
.sidebar-header { background: #e3000f; height: 65px; display: flex; align-items: center; padding-left: 20px; gap: 15px; }
.logo-icon { font-size: 24px; min-width: 35px; }
.nav-links { display: flex; flex-direction: column; padding: 10px 0; flex-grow: 1; }
.nav-links button { background: none; border: none; color: #adb5bd; padding: 15px 20px; text-align: left; cursor: pointer; display: flex; align-items: center; width: 260px; }
.nav-links button i { min-width: 35px; font-style: normal; font-size: 20px; }
.nav-links button:hover, .nav-links button.active { background: #34495e; color: white; border-left: 4px solid #e3000f; }
.logout-btn { background: #c0392b !important; color: white !important; margin-top: auto; }
.main-content { flex-grow: 1; padding: 30px; overflow-y: auto; }
.card-panel { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; }
input[type="text"], input[type="file"], select { width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ddd; border-radius: 6px; }
input[type="file"]::file-selector-button { background: #2c3e50; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer; }
.btn-primario { background: #e3000f; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 100%; }
.btn-sucesso { background: #28a745; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-perigo { background: #dc3545; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; }
.btn-small { padding: 6px 10px; font-size: 11px; border: none; border-radius: 4px; cursor: pointer; color: white; margin-right: 3px; }
.btn-edit { background: #007bff; } .badge { padding: 4px 8px; border-radius: 12px; color: white; font-size: 11px; }
.upload-interno-box { background: #eef5fa; padding: 20px; border-radius: 8px; border: 2px dashed #0056b3; margin-bottom: 20px; }
.modal-overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; justify-content: center; align-items: center; }
.modal-content { background: white; padding: 25px; border-radius: 8px; width: 500px; max-height: 90vh; overflow-y: auto; }
.checkbox-group { display: flex; gap: 10px; margin-bottom: 15px; }
.checkbox-group label { background: #f4f4f4; padding: 8px; border-radius: 6px; border: 1px solid #ddd; cursor: pointer; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #ddd; }
td { padding: 12px; border-bottom: 1px solid #eee; }
