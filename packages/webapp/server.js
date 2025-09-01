const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3005;

// Configura la cartella base dei tuoi JSON
const BASE_DIR = 'C:\\My\\wizzi\\stfnbssl\\cybersecurity\\packages\\ingestion-norme\\extraction';

// Middleware per servire file statici dalla cartella public
app.use(express.static(path.join(__dirname, 'public'), {
    // Opzioni per migliorare la gestione dei file statici
    maxAge: '1d', // Cache per 1 giorno
    etag: true,   // Abilita ETag per il caching
    dotfiles: 'ignore', // Ignora file nascosti
    index: ['index.html', 'index.htm'] // File di default
}));

app.use(express.json());

// Funzione per verificare se la cartella public esiste
function ensurePublicFolder() {
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
        console.log('📁 Cartella public creata:', publicDir);
        
        // Crea un file index.html di esempio
        const indexContent = `<!DOCTYPE html>
<html lang="it">
<head> 
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pagine Statiche - JSON Chunks Viewer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav { background: #007bff; padding: 15px; margin: -30px -30px 30px -30px; border-radius: 8px 8px 0 0; }
        .nav a { color: white; text-decoration: none; margin-right: 20px; font-weight: bold; }
        .nav a:hover { text-decoration: underline; }
        h1 { color: #333; margin-bottom: 20px; }
        .card { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">🏠 Home</a>
            <a href="/chunks-viewer">📊 Chunks Viewer</a>
            <a href="/about.html">ℹ️ About</a>
        </div>
        
        <h1>🌟 Benvenuto nel JSON Chunks Viewer</h1>
        
        <div class="card">
            <h3>📂 Pagine Statiche Disponibili</h3>
            <p>Questa è la pagina principale servita dalla cartella <code>public/</code></p>
            <ul>
                <li><a href="/">Home (Viewer principale)</a></li>
                <li><a href="/chunks-viewer">Chunks Viewer HTML</a></li>
                <li><a href="/about.html">Pagina About</a></li>
            </ul>
        </div>
        
        <div class="card">
            <h3>🔗 API Endpoints</h3>
            <ul>
                <li><code>GET /api/chunks-files</code> - Lista tutti i file chunks.json</li>
                <li><code>GET /api/chunks-content?path=[path]</code> - Contenuto di un file specifico</li>
            </ul>
        </div>
        
        <div class="card">
            <h3>📁 Cartella Scansionata</h3>
            <p><code>${BASE_DIR}</code></p>
        </div>
    </div>
</body>
</html>`;
        
        console.log('writing index.html', path.join(publicDir));
        fs.writeFileSync(path.join(publicDir, 'index.html'), indexContent);
        
        // Crea una pagina about di esempio
        const aboutContent = `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - JSON Chunks Viewer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .nav { background: #28a745; padding: 15px; margin: -30px -30px 30px -30px; border-radius: 8px 8px 0 0; }
        .nav a { color: white; text-decoration: none; margin-right: 20px; font-weight: bold; }
        .nav a:hover { text-decoration: underline; }
        h1 { color: #333; }
        .info-box { background: #e7f3ff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">🏠 Home</a>
            <a href="/chunks-viewer">📊 Chunks Viewer</a>
            <a href="/about.html">ℹ️ About</a>
        </div>
        
        <h1>ℹ️ About JSON Chunks Viewer</h1>
        
        <div class="info-box">
            <h3>🎯 Scopo dell'applicazione</h3>
            <p>Questo tool è stato creato per visualizzare e analizzare file chunks.json generati dal processo di ingestion delle norme di cybersecurity.</p>
        </div>
        
        <div class="info-box">
            <h3>⚙️ Funzionalità</h3>
            <ul>
                <li>Scansione ricorsiva delle cartelle</li>
                <li>Visualizzazione contenuti JSON</li>
                <li>API REST per accesso programmatico</li>
                <li>Interfaccia web intuitiva</li>
            </ul>
        </div>
        
        <div class="info-box">
            <h3>🛠️ Tecnologie utilizzate</h3>
            <ul>
                <li>Node.js + Express</li>
                <li>HTML/CSS/JavaScript vanilla</li>
                <li>File system nativo Node.js</li>
            </ul>
        </div>
        
        <p><a href="/">← Torna alla home</a></p>
    </div>
</body>
</html>`;
        
        fs.writeFileSync(path.join(publicDir, 'about.html'), aboutContent);
        console.log('📄 File di esempio creati in public/');
    } else {
        console.log('📁 Cartella public già esistente:', publicDir);
    }
}

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

// Middleware per logging delle richieste statiche (opzionale)
app.use((req, res, next) => {
    // Log solo per file statici dalla cartella public
    if (req.url.startsWith('/') && !req.url.startsWith('/api/') && !req.url.startsWith('/chunks-viewer')) {
        console.log(`📄 Richiesta file statico: ${req.method} ${req.url}`);
    }
    next();
});

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

// API endpoint per informazioni sui file statici disponibili
app.get('/api/static-files', (req, res) => {
    const publicDir = path.join(__dirname, 'public');
    
    try {
        const files = [];
        
        function scanPublicDir(dir, baseDir = '') {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                const relativePath = path.join(baseDir, item);
                
                if (stat.isFile()) {
                    files.push({
                        name: item,
                        path: '/' + relativePath.replace(/\\/g, '/'),
                        size: stat.size,
                        lastModified: stat.mtime,
                        type: path.extname(item) || 'no-ext'
                    });
                } else if (stat.isDirectory()) {
                    scanPublicDir(fullPath, relativePath);
                }
            }
        }
        
        if (fs.existsSync(publicDir)) {
            scanPublicDir(publicDir);
        }
        
        res.json({
            success: true,
            publicDir: publicDir,
            count: files.length,
            files: files
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

// Route per chunks-viewer (mantieni quella esistente)
app.get('/chunks-viewer', (req, res) => {
    console.log("Serving chunks-viewer page");
    res.sendFile(path.join(__dirname, 'chunks-viewer.html'));
});

// Route per informazioni sul server
app.get('/server-info', (req, res) => {
    res.json({
        server: 'JSON Chunks Viewer',
        version: '1.0.0',
        port: PORT,
        baseDir: BASE_DIR,
        publicDir: path.join(__dirname, 'public'),
        staticFilesEnabled: true,
        endpoints: {
            api: [
                'GET /api/chunks-files',
                'GET /api/chunks-content?path=[path]',
                'GET /api/static-files'
            ],
            pages: [
                'GET /',
                'GET /chunks-viewer',
                'GET /server-info',
                'GET /public/* (file statici)'
            ]
        }
    });
});

// Handler per 404 su file statici non trovati
app.use((req, res, next) => {
    // Se la richiesta è per un file statico che non esiste
    if (!req.url.startsWith('/api/') && !req.url.startsWith('/chunks-viewer') && !req.url.startsWith('/server-info')) {
        res.status(404).send(`
            <!DOCTYPE html>
            <html lang="it">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>404 - Pagina non trovata</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
                    .error-container { max-width: 600px; margin: 0 auto; padding: 40px; background: #f8f9fa; border-radius: 8px; }
                    h1 { color: #dc3545; }
                    .back-link { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
                    .back-link:hover { background: #0056b3; }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1>404 - Pagina non trovata</h1>
                    <p>La pagina richiesta <code>${req.url}</code> non esiste.</p>
                    <p>Verifica che il file sia presente nella cartella <code>public/</code></p>
                    <a href="/" class="back-link">← Torna alla Home</a>
                </div>
            </body>
            </html>
        `);
    } else {
        next();
    }
});

// Inizializza il server
app.listen(PORT, () => {
    console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
    console.log(`📁 Scansionando la cartella: ${BASE_DIR}`);
    console.log(`📂 Cartella file statici: ${path.join(__dirname, 'public')}`);
    console.log('🔍 Verifica che le cartelle esistano e siano accessibili...');
    
    // Verifica cartella base chunks
    if (fs.existsSync(BASE_DIR)) {
        console.log('✅ Cartella base chunks trovata e accessibile');
    } else {
        console.log('❌ ATTENZIONE: Cartella base chunks non trovata!');
    }
    
    // Verifica/crea cartella public
    ensurePublicFolder();
    
    console.log('\n📋 Endpoints disponibili:');
    console.log('   🌐 http://localhost:3005/ (Home con pagine statiche)');
    console.log('   📊 http://localhost:3005/chunks-viewer (Viewer chunks)');
    console.log('   ℹ️  http://localhost:3005/about.html (About page)');
    console.log('   🔧 http://localhost:3005/server-info (Info server)');
    console.log('   📡 http://localhost:3005/api/chunks-files (API chunks)');
    console.log('   📄 http://localhost:3005/api/static-files (API file statici)');
});