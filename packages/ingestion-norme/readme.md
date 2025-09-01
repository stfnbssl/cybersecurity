# Document Text Extractor - Installazione e Configurazione

## 📦 Dipendenze Base

```bash
# Dipendenze principali
npm install cheerio pdf-parse mammoth

# Dipendenze per OCR avanzato
npm install tesseract.js pdf-poppler sharp jimp
```

## 🛠️ Requisiti Sistema per OCR

### **Windows:**
```bash
# Installa Poppler per conversione PDF -> Immagini
# Scarica da: https://github.com/oschwartz10612/poppler-windows/releases
# Estrai in C:\poppler-windows e aggiungi C:\poppler-windows\bin al PATH

# Verifica installazione
pdftoppm -v
```

### **macOS:**
```bash
# Installa Poppler con Homebrew
brew install poppler

# Verifica installazione
pdftoppm -v
```

### **Linux (Ubuntu/Debian):**
```bash
# Installa Poppler
sudo apt-get update
sudo apt-get install poppler-utils

# Verifica installazione
pdftoppm -v
```

## 🚀 Funzionalità OCR

### **Modalità Automatica**
Il sistema rileva automaticamente se il PDF ha problemi di estrazione e switcha a OCR:

```json
{
  "single": {
    "source": "./documento.pdf",
    "output": "./output.txt",
    "options": {
      "autoSwitchToOCR": true
    }
  }
}
```

### **Modalità OCR Forzata**
Forza l'uso di OCR anche su PDF con testo selezionabile:

```json
{
  "options": {
    "useOCR": true,
    "ocrLanguage": "ita+eng",
    "detectColumns": true,
    "dpi": 400
  }
}
```

## 📋 Opzioni OCR Disponibili

| Opzione | Default | Descrizione |
|---------|---------|-------------|
| `useOCR` | `false` | Forza l'uso di OCR |
| `autoSwitchToOCR` | `true` | Switch automatico se il testo è di bassa qualità |
| `ocrLanguage` | `"eng+ita"` | Lingue per Tesseract (`eng`, `ita`, `fra`, `deu`, `spa`) |
| `detectColumns` | `true` | Rileva automaticamente le colonne |
| `columnsCount` | `"auto"` | Numero colonne (`"auto"`, `1`, `2`, `3`) |
| `dpi` | `300` | Risoluzione immagini (300-600) |
| `enhanceImage` | `true` | Migliora qualità immagini prima di OCR |
| `removeNoise` | `false` | Rimuove rumore dalle immagini |
| `keepImages` | `false` | Mantiene immagini temporanee per debug |
| `pageRange` | `null` | Range pagine (`"1-10"`, `"5,7,9"`) |
| `columnSeparator` | `"\n\n--- COLONNA ---\n\n"` | Separatore tra colonne |

## 🔍 Rilevamento Colonne

Il sistema rileva automaticamente le colonne analizzando:
- **Spazi bianchi verticali** tra le colonne
- **Distribuzione del testo** sulla pagina
- **Pattern di layout** ricorrenti

### **Modalità rilevamento:**
- **Automatico**: Analizza la prima pagina e applica a tutte
- **Manuale**: Specifica il numero di colonne con `columnsCount`
- **Disabilitato**: `detectColumns: false` per documenti a singola colonna

## 📊 Valutazione Qualità Automatica

Il sistema valuta automaticamente:
- **Rapporto testo/dimensione PDF**
- **Frammentazione delle righe**
- **Caratteri corrotti**
- **Lunghezza media delle parole**

Quando la qualità è < 60%, switcha automaticamente a OCR.

## 🎯 Esempi Pratici

### **PDF Scansionato a 2 Colonne:**
```json
{
  "single": {
    "source": "./giornale.pdf",
    "output": "./giornale.txt",
    "options": {
      "useOCR": true,
      "detectColumns": true,
      "dpi": 400,
      "ocrLanguage": "ita"
    }
  }
}
```

### **Documento Legale con Analisi:**
```json
{
  "single": {
    "source": "./decreto.pdf",
    "output": "./decreto.json",
    "options": {
      "useOCR": true,
      "ocrLanguage": "ita",
      "legalAnalysis": {
        "outputFormat": "json"
      }
    }
  }
}
```

### **Batch con Strategie Diverse:**
```json
{
  "batch": [
    {
      "source": "./doc1.pdf",
      "output": "./out1.txt",
      "options": { "autoSwitchToOCR": true }
    },
    {
      "source": "./doc2.pdf", 
      "output": "./out2.txt",
      "options": { 
        "useOCR": true,
        "detectColumns": true,
        "dpi": 600 
      }
    }
  ]
}
```

## 🐛 Troubleshooting

### **Errore "pdftoppm not found":**
- Installa Poppler seguendo le istruzioni sopra
- Verifica che sia nel PATH di sistema

### **OCR lento:**
- Riduci DPI a 300
- Limita il range di pagine
- Disabilita `enhanceImage` se non necessario

### **Colonne non rilevate correttamente:**
- Usa `columnsCount: 2` (o numero specifico)
- Aumenta DPI per documenti piccoli
- Controlla che le colonne abbiano spazi bianchi chiari

### **Testo OCR inaccurato:**
- Aumenta DPI (400-600)
- Abilita `enhanceImage` e `removeNoise`
- Aggiungi correzioni personalizzate in `customCorrections`
- Verifica la lingua in `ocrLanguage`

## 📈 Performance

| Documento | Tempo Estrazione | Tempo OCR (300 DPI) | Tempo OCR (600 DPI) |
|-----------|------------------|---------------------|---------------------|
| PDF 10 pagine | 2 secondi | 30-60 secondi | 60-120 secondi |
| PDF 50 pagine | 5 secondi | 3-5 minuti | 8-15 minuti |
| PDF 100 pagine | 10 secondi | 8-12 minuti | 20-30 minuti |

**Suggerimenti per ottimizzare:**
- Usa range di pagine limitati per test
- DPI 300 è sufficiente per la maggior parte dei casi
- Abilita `keepImages: false` per risparmiare spazio
- Processa documenti grandi in batch notturni