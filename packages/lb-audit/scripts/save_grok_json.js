const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

async function copyJsonFromGrok() {
    let browser;
    let page;
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        page = await browser.newPage();
        
        // Imposta un user agent realistico
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Imposta viewport
        await page.setViewport({ width: 1920, height: 1080 });

        // Gestione degli errori di navigazione
        page.on('error', (error) => {
            console.log('Errore della pagina:', error.message);
        });

        page.on('pageerror', (error) => {
            console.log('Errore JavaScript della pagina:', error.message);
        });

        // Naviga alla pagina con retry logic
        console.log('🔄 Tentativo di navigazione alla pagina...');
        
        let navigationSuccess = false;
        let retries = 3;
        
        while (!navigationSuccess && retries > 0) {
            try {
                console.log(`Tentativo ${4 - retries}/3...`);
                
                await page.goto('https://x.com/i/grok/share/sU5KcHoV4lWYFOgwvxo9L2cbG', {
                    waitUntil: 'domcontentloaded', // Cambiato da 'networkidle0' a 'domcontentloaded'
                    timeout: 60000
                });
                
                navigationSuccess = true;
                console.log('✅ Navigazione completata con successo');
                
            } catch (error) {
                console.log(`❌ Tentativo fallito: ${error.message}`);
                retries--;
                
                if (retries > 0) {
                    console.log('⏳ Attendo 5 secondi prima del prossimo tentativo...');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!navigationSuccess) {
            throw new Error('Impossibile caricare la pagina dopo 3 tentativi');
        }

        // Attendi che la pagina sia stabile
        console.log('⏳ Attendo il caricamento completo della pagina...');
        await page.waitForTimeout(10000);

        // Verifica se la pagina richiede login
        const isLoginRequired = await page.evaluate(() => {
            return document.body.innerText.includes('Sign in') || 
                   document.body.innerText.includes('Log in') ||
                   document.querySelector('input[name="text"]') !== null;
        });

        if (isLoginRequired) {
            console.log('⚠️ La pagina sembra richiedere il login. Premi INVIO dopo aver effettuato il login manualmente...');
            
            // Attendi input dall'utente
            await new Promise((resolve) => {
                process.stdin.once('data', () => resolve());
            });
            
            console.log('✅ Continuando con lo scraping...');
            await page.waitForTimeout(3000);
        }

        // Cerca il pulsante di copia con multiple strategie
        console.log('🔍 Cercando il pulsante di copia...');
        
        let copyButton = null;
        
        // Strategia 1: Selettore aria-label
        try {
            await page.waitForSelector('button[aria-label*="Copy"]', { timeout: 10000 });
            copyButton = await page.$('button[aria-label*="Copy"]');
            if (copyButton) {
                console.log('✅ Pulsante trovato con aria-label');
            }
        } catch (error) {
            console.log('❌ Selettore aria-label non trovato');
        }

        // Strategia 2: Cerca per icona SVG
        if (!copyButton) {
            try {
                const buttons = await page.$$('button');
                for (const button of buttons) {
                    const hasCopyIcon = await page.evaluate((btn) => {
                        const svg = btn.querySelector('svg path');
                        return svg && svg.getAttribute('d') && svg.getAttribute('d').includes('M19.5 2C20.88 2 22 3.12');
                    }, button);
                    
                    if (hasCopyIcon) {
                        copyButton = button;
                        console.log('✅ Pulsante trovato tramite icona SVG');
                        break;
                    }
                }
            } catch (error) {
                console.log('❌ Ricerca tramite SVG fallita');
            }
        }

        // Strategia 3: Mostra tutti i pulsanti disponibili per debug
        if (!copyButton) {
            console.log('🔍 Debug: Elenco di tutti i pulsanti trovati:');
            const allButtons = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.map((btn, index) => ({
                    index,
                    ariaLabel: btn.getAttribute('aria-label'),
                    textContent: btn.textContent.trim(),
                    innerHTML: btn.innerHTML.substring(0, 200)
                }));
            });
            
            allButtons.forEach((btn, i) => {
                if (i < 10) { // Mostra solo i primi 10
                    console.log(`  ${btn.index}: ${btn.ariaLabel} | ${btn.textContent}`);
                }
            });

            // Prova a cercare qualsiasi pulsante che potrebbe essere quello di copia
            const copyButtons = await page.$$eval('button', (buttons) => {
                return buttons.map((btn, index) => ({
                    index,
                    ariaLabel: btn.getAttribute('aria-label'),
                    textContent: btn.textContent.toLowerCase(),
                    hasClipboardIcon: btn.innerHTML.includes('clipboard') || btn.innerHTML.includes('copy')
                })).filter(btn => 
                    (btn.ariaLabel && btn.ariaLabel.toLowerCase().includes('copy')) ||
                    btn.textContent.includes('copy') ||
                    btn.hasClipboardIcon
                );
            });

            if (copyButtons.length > 0) {
                console.log('🎯 Possibili pulsanti di copia trovati:', copyButtons);
                // Usa il primo che sembra essere quello giusto
                const allButtons = await page.$$('button');
                copyButton = allButtons[copyButtons[0].index];
                console.log('✅ Selezionato il primo pulsante candidato');
            }
        }

        if (!copyButton) {
            // Ultima strategia: screenshot per debug
            await page.screenshot({ path: path.join(process.cwd(), 'debug-screenshot.png'), fullPage: true });
            console.log('📸 Screenshot salvato come debug-screenshot.png per analisi manuale');
            throw new Error('Pulsante di copia non trovato. Controlla lo screenshot per debug.');
        }

        // Abilita permessi clipboard
        const context = browser.defaultBrowserContext();
        await context.overridePermissions('https://x.com', ['clipboard-read', 'clipboard-write']);

        // Clicca sul pulsante
        console.log('🖱️ Cliccando sul pulsante di copia...');
        
        // Scroll per assicurarsi che il pulsante sia visibile
        await page.evaluate((element) => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, copyButton);
        
        await page.waitForTimeout(1000);
        await copyButton.click();
        await page.waitForTimeout(3000);

        // Leggi dalla clipboard
        console.log('📋 Leggendo dalla clipboard...');
        const clipboardContent = await page.evaluate(async () => {
            try {
                return await navigator.clipboard.readText();
            } catch (error) {
                console.error('Errore clipboard:', error);
                return null;
            }
        });

        if (!clipboardContent) {
            // Tentativo alternativo: intercettare le chiamate di rete
            console.log('⚠️ Clipboard vuota, tento intercettazione network...');
            
            const responses = [];
            page.on('response', async (response) => {
                const url = response.url();
                const contentType = response.headers()['content-type'] || '';
                
                if (contentType.includes('application/json') && !url.includes('hashflags')) {
                    try {
                        const text = await response.text();
                        if (text.startsWith('{') || text.startsWith('[')) {
                            responses.push({
                                url: url,
                                data: text
                            });
                            console.log(`📡 JSON intercettato da: ${url}`);
                        }
                    } catch (error) {
                        // Ignora errori
                    }
                }
            });

            // Riprova a cliccare il pulsante
            await copyButton.click();
            await page.waitForTimeout(5000);

            if (responses.length > 0) {
                // Salva le risposte intercettate
                const outputDir = 'C:/My/wizzi/stfnbssl/lavori/logbot-cybersecurity/packages/lb-audit/scripts/output';
                await fs.mkdir(outputDir, { recursive: true });

                for (let i = 0; i < responses.length; i++) {
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `grok-intercepted-${i}-${timestamp}.json`;
                    const filepath = path.join(outputDir, filename);
                    
                    await fs.writeFile(filepath, responses[i].data, 'utf8');
                    console.log(`💾 Salvato JSON intercettato: ${filepath}`);
                }

                return { success: true, method: 'network_intercept', files: responses.length };
            }

            throw new Error('Impossibile ottenere il JSON né tramite clipboard né tramite intercettazione');
        }

        console.log('✅ Contenuto letto dalla clipboard');
        console.log(`📏 Lunghezza: ${clipboardContent.length} caratteri`);

        // Valida JSON
        let jsonData;
        try {
            jsonData = JSON.parse(clipboardContent);
            console.log('✅ JSON valido');
        } catch (error) {
            console.log('⚠️ Il contenuto non è JSON valido, salvo comunque il testo');
            jsonData = { rawContent: clipboardContent };
        }

        // Salva il file
        const outputDir = 'C:/My/wizzi/stfnbssl/lavori/logbot-cybersecurity/packages/lb-audit/scripts/output';
        await fs.mkdir(outputDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `grok-data-${timestamp}.json`;
        const filepath = path.join(outputDir, filename);

        await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2), 'utf8');
        
        console.log(`🎉 File salvato con successo: ${filepath}`);
        console.log(`📊 Dimensione: ${Buffer.byteLength(JSON.stringify(jsonData, null, 2), 'utf8')} bytes`);

        return {
            success: true,
            filepath: filepath,
            method: 'clipboard',
            data: jsonData
        };

    } catch (error) {
        console.error('❌ Errore durante l\'esecuzione:', error.message);
        
        // Prova a fare uno screenshot per debug se possibile
        if (page && !page.isClosed()) {
            try {
                await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
                console.log('📸 Screenshot di errore salvato come error-screenshot.png');
            } catch (screenshotError) {
                // Ignora errori di screenshot
            }
        }
        
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.log('⚠️ Errore nella chiusura del browser:', closeError.message);
            }
        }
    }
}

// Versione semplificata che usa solo intercettazione di rete
async function interceptOnly() {
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const responses = [];
        
        page.on('response', async (response) => {
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            
            if (contentType.includes('application/json') && !url.includes('hashflags') && !url.includes('onboarding')) {
                try {
                    const text = await response.text();
                    if ((text.startsWith('{') || text.startsWith('[')) && text.length > 100) {
                        responses.push({
                            url: url,
                            status: response.status(),
                            data: text,
                            timestamp: new Date().toISOString()
                        });
                        console.log(`📡 JSON intercettato (${text.length} chars) da: ${url}`);
                    }
                } catch (error) {
                    // Ignora errori di parsing
                }
            }
        });

        console.log('🔄 Caricamento pagina per intercettazione...');
        await page.goto('https://x.com/i/grok/share/sU5KcHoV4lWYFOgwvxo9L2cbG', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('⏳ Attendo 15 secondi per raccogliere dati...');
        await page.waitForTimeout(15000);

        if (responses.length > 0) {
            const outputDir = 'C:/My/wizzi/stfnbssl/lavori/logbot-cybersecurity/packages/lb-audit/scripts/output';
            await fs.mkdir(outputDir, { recursive: true });

            console.log(`📁 Salvando ${responses.length} file JSON intercettati...`);
            
            for (let i = 0; i < responses.length; i++) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `grok-network-${i}-${timestamp}.json`;
                const filepath = path.join(outputDir, filename);
                
                // Salva anche i metadati
                const dataWithMeta = {
                    metadata: {
                        url: responses[i].url,
                        status: responses[i].status,
                        timestamp: responses[i].timestamp,
                        size: responses[i].data.length
                    },
                    data: JSON.parse(responses[i].data)
                };
                
                await fs.writeFile(filepath, JSON.stringify(dataWithMeta, null, 2), 'utf8');
                console.log(`💾 Salvato: ${filepath}`);
            }

            return { success: true, files: responses.length };
        } else {
            console.log('❌ Nessun JSON significativo intercettato');
            return { success: false, error: 'No JSON data intercepted' };
        }

    } catch (error) {
        console.error('❌ Errore nell\'intercettazione:', error.message);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.log('⚠️ Errore nella chiusura del browser');
            }
        }
    }
}

// Script principale
async function main() {
    console.log('🚀 Avviando lo scraping del JSON da Grok...\n');
    
    console.log('Scegli il metodo:');
    console.log('1. Metodo completo (clipboard + network)');
    console.log('2. Solo intercettazione network (più affidabile)');
    console.log('');
    
    // Per ora avvio il metodo 2 che è più affidabile
    console.log('🔄 Avvio metodo intercettazione network...\n');
    const result = await interceptOnly();
    
    if (!result.success) {
        console.log('\n🔄 Tentativo con metodo completo...');
        const fallbackResult = await copyJsonFromGrok();
        
        if (fallbackResult.success) {
            console.log('✅ Successo con metodo fallback!');
        } else {
            console.log('❌ Entrambi i metodi sono falliti');
        }
    } else {
        console.log(`✅ Intercettazione completata! ${result.files} file salvati.`);
    }
}

// Avvia lo script
if (require.main === module) {
    main();
}

module.exports = { copyJsonFromGrok, interceptOnly };