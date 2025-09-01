const fs = require('fs');
const path = require('path');

// Configurazione
const BASE_DIR = 'C:\\My\\wizzi\\stfnbssl\\cybersecurity\\packages\\ingestion-norme\\extraction';
const OUTPUT_FILE = './chunks-index.json';

/**
 * Scansiona ricorsivamente le cartelle per trovare tutti i file chunks.json
 */
function scanForChunksFiles(baseDir) {
    const results = [];
    const stats = {
        totalDirectories: 0,
        totalFiles: 0,
        chunksFiles: 0,
        errors: []
    };
    
    function scanDirectory(currentDir, depth = 0) {
        try {
            stats.totalDirectories++;
            const items = fs.readdirSync(currentDir);
            
            for (const item of items) {
                const fullPath = path.join(currentDir, item);
                
                try {
                    const stat = fs.statSync(fullPath);
                    stats.totalFiles++;
                    
                    if (stat.isDirectory()) {
                        // Scansiona ricorsivamente le sottocartelle
                        scanDirectory(fullPath, depth + 1);
                    } else if (item === 'chunks.json') {
                        // Trovato un file chunks.json
                        stats.chunksFiles++;
                        const relativePath = path.relative(baseDir, fullPath);
                        
                        // Prova a leggere il contenuto per verificare se è un JSON valido
                        let isValidJson = false;
                        let contentPreview = null;
                        let chunkCount = 0;
                        
                        try {
                            const content = fs.readFileSync(fullPath, 'utf8');
                            const jsonContent = JSON.parse(content);
                            isValidJson = true;
                            
                            // Genera anteprima del contenuto
                            if (Array.isArray(jsonContent)) {
                                chunkCount = jsonContent.length;
                                contentPreview = `Array con ${chunkCount} elementi`;
                            } else if (typeof jsonContent === 'object') {
                                const keys = Object.keys(jsonContent);
                                chunkCount = keys.length;
                                contentPreview = `Oggetto con chiavi: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`;
                            }
                        } catch (jsonError) {
                            stats.errors.push({
                                file: fullPath,
                                error: `JSON non valido: ${jsonError.message}`
                            });
                        }
                        
                        results.push({
                            path: fullPath,
                            relativePath: relativePath,
                            directory: path.dirname(relativePath),
                            fileName: item,
                            size: stat.size,
                            sizeKB: Math.round(stat.size / 1024 * 100) / 100,
                            lastModified: stat.mtime,
                            created: stat.birthtime,
                            depth: depth,
                            isValidJson: isValidJson,
                            contentPreview: contentPreview,
                            chunkCount: chunkCount
                        });
                        
                        console.log(`✓ Trovato: ${relativePath} (${chunkCount} chunks, ${Math.round(stat.size/1024)}KB)`);
                    }
                } catch (statError) {
                    stats.errors.push({
                        file: fullPath,
                        error: `Errore stat: ${statError.message}`
                    });
                }
            }
        } catch (error) {
            stats.errors.push({
                directory: currentDir,
                error: `Errore lettura directory: ${error.message}`
            });
            console.error(`✗ Errore nella scansione di ${currentDir}: ${error.message}`);
        }
    }
    
    console.log(`🔍 Inizio scansione di: ${baseDir}`);
    console.log('─'.repeat(50));
    
    scanDirectory(baseDir);
    
    return { files: results, stats };
}

/**
 * Genera un indice completo e lo salva su file
 */
function generateIndex() {
    console.log('🚀 Avvio generazione indice...\n');
    
    if (!fs.existsSync(BASE_DIR)) {
        console.error(`❌ Cartella non trovata: ${BASE_DIR}`);
        process.exit(1);
    }
    
    const scanResult = scanForChunksFiles(BASE_DIR);
    const { files, stats } = scanResult;
    
    // Ordina i file per path
    files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    
    // Genera statistiche aggiuntive
    const directoriesWithChunks = [...new Set(files.map(f => f.directory))];
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    const index = {
        metadata: {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            baseDirectory: BASE_DIR,
            scanner: 'chunks-scanner.js'
        },
        statistics: {
            totalChunksFiles: files.length,
            totalDirectoriesScanned: stats.totalDirectories,
            totalFilesScanned: stats.totalFiles,
            directoriesWithChunks: directoriesWithChunks.length,
            totalSizeBytes: totalSize,
            totalSizeKB: Math.round(totalSize / 1024),
            totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
            errors: stats.errors.length,
            avgFileSize: files.length > 0 ? Math.round(totalSize / files.length) : 0
        },
        directories: directoriesWithChunks.map(dir => ({
            path: dir,
            fileCount: files.filter(f => f.directory === dir).length,
            totalSize: files.filter(f => f.directory === dir).reduce((sum, f) => sum + f.size, 0)
        })),
        files: files,
        errors: stats.errors
    };
    
    // Salva l'indice su file
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), 'utf8');
        
        console.log('\n' + '═'.repeat(50));
        console.log('📊 STATISTICHE FINALI');
        console.log('═'.repeat(50));
        console.log(`📁 Directory base: ${BASE_DIR}`);
        console.log(`📄 File chunks.json trovati: ${files.length}`);
        console.log(`📂 Directory con chunks: ${directoriesWithChunks.length}`);
        console.log(`💾 Dimensione totale: ${index.statistics.totalSizeMB} MB`);
        console.log(`⚠️  Errori: ${stats.errors.length}`);
        console.log(`💾 Indice salvato in: ${OUTPUT_FILE}`);
        
        if (stats.errors.length > 0) {
            console.log('\n⚠️  ERRORI RILEVATI:');
            stats.errors.forEach(err => {
                console.log(`  - ${err.file || err.directory}: ${err.error}`);
            });
        }
        
        console.log('\n✅ Scansione completata con successo!');
        
    } catch (writeError) {
        console.error(`❌ Errore nel salvare l'indice: ${writeError.message}`);
        process.exit(1);
    }
}

// Esegui la generazione dell'indice se il file viene eseguito direttamente
if (require.main === module) {
    generateIndex();
}

module.exports = {
    scanForChunksFiles,
    generateIndex
};