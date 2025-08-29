const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3005;

// Configura la cartella base dei tuoi JSON
const BASE_DIR = 'C:\\My\\wizzi\\stfnbssl\\cybersecurity\\packages\\ingestion-norme\\extraction';

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Funzione per scansionare ricorsivamente le cartelle e trovare chunks.json
function scanForChunksFiles(dir) {
    const results = [];
    
    function scanDirectory(currentDir) {
        try {
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (item === 'chunks.json') {
                    const relativePath = path.relative(BASE_DIR, fullPath);
                    results.push({
                        path: fullPath,
                        relativePath: relativePath,
                        directory: path.dirname(relativePath),
                        lastModified: stat.mtime,
                        size: stat.size
                    });
                }
            }
        } catch (error) {
            console.error(`Errore nella scansione di ${currentDir}:`, error.message);
        }
    }
    
    scanDirectory(dir);
    return results;
}

// API endpoint per ottenere tutti i file chunks.json
app.get('/api/chunks-files', (req, res) => {
    try {
        const chunksFiles = scanForChunksFiles(BASE_DIR);
        res.json({
            success: true,
            count: chunksFiles.length,
            files: chunksFiles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// API endpoint semplificato per leggere il contenuto (SOLO PER TESTING LOCALE)
app.get('/api/chunks-content', (req, res) => {
    const filePath = req.query.path;
    
    if (!filePath) {
        return res.status(400).json({
            success: false,
            error: 'Path del file richiesto'
        });
    }
    
    console.log('Tentativo di leggere file:', filePath);
    
    try {
        // Verifica che il file esista
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                error: `File non trovato: ${filePath}`
            });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const jsonContent = JSON.parse(content);
        
        res.json({
            success: true,
            path: filePath,
            content: jsonContent
        });
        
        console.log(`✓ File letto con successo: ${filePath}`);
        
    } catch (error) {
        console.error('Errore nel leggere il file:', error);
        res.status(500).json({
            success: false,
            error: `Errore nella lettura del file: ${error.message}`
        });
    }
});

// Pagina principale
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>JSON Chunks Viewer - Debug</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                .file-list { margin: 20px 0; }
                .file-item { 
                    border: 1px solid #ddd; 
                    margin: 10px 0; 
                    padding: 15px; 
                    border-radius: 5px; 
                    background: #f9f9f9;
                }
                .file-path { font-weight: bold; color: #333; word-break: break-all; }
                .file-meta { color: #666; font-size: 0.9em; margin: 5px 0; }
                .content-preview { 
                    background: #fff; 
                    border: 1px solid #eee; 
                    padding: 10px; 
                    margin-top: 10px;
                    border-radius: 3px;
                    max-height: 300px;
                    overflow-y: auto;
                    font-family: monospace;
                    font-size: 0.8em;
                }
                .load-btn { 
                    background: #007bff; 
                    color: white; 
                    border: none; 
                    padding: 8px 12px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    margin-right: 10px;
                }
                .load-btn:hover { background: #0056b3; }
                .error { color: red; background: #ffe6e6; padding: 10px; border-radius: 3px; margin: 10px 0; }
                .debug-info { background: #f0f8ff; padding: 10px; border-radius: 3px; margin: 10px 0; font-size: 0.8em; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>JSON Chunks Viewer (Debug Mode)</h1>
                <p>Directory base: <code>${BASE_DIR}</code></p>
                <button onclick="loadFilesList()" class="load-btn">🔍 Carica Lista File</button>
                <div id="status"></div>
                <div id="filesList" class="file-list"></div>
            </div>
            
            <script>
                function showStatus(message, isError = false) {
                    const statusDiv = document.getElementById('status');
                    statusDiv.innerHTML = \`<div class="\${isError ? 'error' : 'debug-info'}">\${message}</div>\`;
                }
                
                async function loadFilesList() {
                    showStatus('⏳ Caricamento lista file...');
                    
                    try {
                        const response = await fetch('/api/chunks-files');
                        const data = await response.json();
                        
                        if (data.success) {
                            showStatus(\`✅ Trovati \${data.files.length} file chunks.json\`);
                            displayFiles(data.files);
                        } else {
                            showStatus('❌ Errore: ' + data.error, true);
                        }
                    } catch (error) {
                        showStatus('❌ Errore nella richiesta: ' + error.message, true);
                    }
                }
                
                function displayFiles(files) {
                    const container = document.getElementById('filesList');
                    container.innerHTML = \`<h2>📄 File trovati: \${files.length}</h2>\`;
                    
                    files.forEach((file, index) => {
                        const fileDiv = document.createElement('div');
                        fileDiv.className = 'file-item';
                        fileDiv.innerHTML = \`
                            <div class="file-path">📁 \${file.relativePath}</div>
                            <div class="file-meta">
                                <strong>Path completo:</strong> \${file.path}<br>
                                <strong>Cartella:</strong> \${file.directory}<br>
                                <strong>Dimensione:</strong> \${(file.size / 1024).toFixed(1)} KB<br>
                                <strong>Modificato:</strong> \${new Date(file.lastModified).toLocaleString()}
                            </div>
                            <button onclick="loadContent('\${file.path.replace(/\\\\/g, '\\\\\\\\')}', \${index})" class="load-btn">
                                👀 Visualizza Contenuto
                            </button>
                            <div id="content_\${index}" class="content-preview" style="display: none;"></div>
                        \`;
                        container.appendChild(fileDiv);
                    });
                }
                
                async function loadContent(filePath, index) {
                    const contentDiv = document.getElementById('content_' + index);
                    contentDiv.style.display = 'block';
                    contentDiv.innerHTML = '⏳ Caricamento contenuto...';
                    
                    try {
                        console.log('Richiesta contenuto per:', filePath);
                        
                        const response = await fetch('/api/chunks-content?path=' + encodeURIComponent(filePath));
                        const data = await response.json();
                        
                        if (data.success) {
                            const jsonStr = JSON.stringify(data.content, null, 2);
                            contentDiv.innerHTML = \`
                                <div class="debug-info">
                                    <strong>✅ Caricato con successo</strong><br>
                                    Path: \${data.path}
                                </div>
                                <pre>\${jsonStr}</pre>
                            \`;
                        } else {
                            contentDiv.innerHTML = \`<div class="error">❌ Errore: \${data.error}</div>\`;
                        }
                    } catch (error) {
                        contentDiv.innerHTML = \`<div class="error">❌ Errore nella richiesta: \${error.message}</div>\`;
                    }
                }
                
                // Carica automaticamente la lista all'avvio
                window.onload = () => loadFilesList();
            </script>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
    console.log(`📁 Scansionando la cartella: ${BASE_DIR}`);
    console.log('🔍 Verifica che la cartella esista e sia accessibile...');
    
    if (fs.existsSync(BASE_DIR)) {
        console.log('✅ Cartella base trovata e accessibile');
    } else {
        console.log('❌ ATTENZIONE: Cartella base non trovata!');
    }
});