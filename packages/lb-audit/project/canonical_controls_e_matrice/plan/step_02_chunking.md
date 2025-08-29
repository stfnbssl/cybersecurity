# Capitolo 2 — Preparazione fonti & *chunking*

## 1. Obiettivo del capitolo

Definire come raccogliere, normalizzare e “spezzare” (chunking) le fonti normative/standard in **estratti atomici e tracciabili** pronti per:

* estrazione controlli via LLM,
* indicizzazione semantica,
* mappature crosswalk,
* audit trail con **provenienza verificabile**.

---

## 2. Fonti: tipologie, priorità e perimetro

**Tipologie**

* **Regolamenti/Direttive**: NIS2, CRA, GDPR, Nuovo Regolamento Macchine.
* **Standard**: IEC 62443 (serie), ISO/IEC 27001/27002, ISO 22301, NIST SP 800-53, NIST CSF, SSDF, EN 303 645, OWASP SAMM, BSIMM, CSA CAIQ.
* **Linee guida** e profili settoriali (informativi).

**Priorità iniziale**

1. IEC 62443-3-3 / 4-1 / 4-2 (OT core)
2. ISO/IEC 27001:2022 + 27002:2022 (controlli e guidance)
3. NIS2 (obblighi organizzativi)
4. CRA (requisiti per prodotti digitali)
5. GDPR Art. 25/32 (privacy by design/sicurezza)
6. NIST SP 800-53 Rev.5 (libreria di controlli parametrizzati)

**Perimetro legale**

* Importare **solo estratti necessari** (uso interno, analisi).
* Tracciare **licenze**/permessi; quando possibile, lavorare su riferimenti e citazioni brevi.

---

## 3. Normalizzazione (ETL testuale)

Obiettivo: ottenere **Markdown canonico** con struttura preservata e rumore rimosso.

**Passi**

1. **Acquisizione**: PDF/HTML→TXT/MD. Per PDF scansionati, OCR con dizionari tecnico-IT/OT.
2. **Pulizia**:

   * rimuovere header/footer, numeri pagina, watermark;
   * unificare spaziatura, virgolette ASCII, elenchi puntati;
   * preservare **numerazioni** (A.5.15, SR 1.1, AC-2(1)).
3. **Segmentazione preliminare**: dividere per **sezioni** e **sotto-sezioni**.
4. **Classificazione blocchi**: `normativo` (vincolante) vs `informativo` (note, esempi, appendici).
5. **Lingua**: etichettare `lang` (it/en) per edizioni multilingua.

**Convenzioni di file**

```
/catalog/IEC_62443-3-3_2013/en/section_SR_1.1.md
/catalog/ISO_27002_2022/en/A.8.16.md
/catalog/NIS2_2022/en/Art_21_1.md
```

---

## 4. Riconoscimento struttura per standard (pattern utili)

* **ISO/IEC 27001/27002**: `A\.(\d+)(\.\d+)*`
* **IEC 62443-3-3** (SR) / **-4-2** (CR): `SR\s?\d+(\.\d+)*` / `\bCR\s?\d+(\.\d+)*`
* **NIST SP 800-53**: `^[A-Z]{2}-\d+(\(\d+\))?$` (es. `AC-2`, `AC-2(1)`)
* **Direttive/Regolamenti UE**: `Art\.?\s?\d+([a-z])?` + lettere/commi
* **CRA Allegati**: `Annex\s?[IVXLC]+(\.\d+)*`

---

## 5. Regole di *chunking* (estratti atomici)

**Unità di chunk**

* **Clausola elementare** (controllo o requisito verificabile).
* Se un paragrafo contiene più obblighi, spezzare in **sub-chunk** mantenendo l’ID di sezione come prefisso.

**Heuristics**

* **Dimensione target** per estrazione LLM: **150–300 token**.
* **Sovrapposizione** per contesto (solo quando serve): includere **1 frase** introduttiva/definizionale come *context\_note* separata.
* **Escludere** *NOTE/EXAMPLES* dal chunk normativo (salvarli come `informativo=true` per consultazione).

**Casi speciali**

* **800-53 enhancements**: creare chunk separati per `AC-2(1)`, `AC-2(2)…` con link al padre `AC-2`.
* **IEC 62443 SR.x.y**: `SR 1` (padre) e `SR 1.1`/`1.2` (figli) → chunk distinti, relazione *parent\_id*.

---

## 6. Metadati minimi per ogni chunk

| Campo                         | Descrizione                            |
| ----------------------------- | -------------------------------------- |
| `framework_code`              | es. `IEC 62443-3-3`                    |
| `edition`                     | anno/label (es. `2013`)                |
| `jurisdiction`                | `EU`, `Global`, …                      |
| `section_path`                | es. `SR 1.1`, `A.5.15`, `Art. 21(2)`   |
| `lang`                        | `en`, `it`, …                          |
| `normative`                   | boolean (true se vincolante)           |
| `parent_section`              | opzionale (per enhancements)           |
| `text_md`                     | testo normalizzato (markdown)          |
| `checksum_sha256`             | hash del **testo grezzo normalizzato** |
| `source_locator`              | file path/URL + pagina/offset          |
| `imported_at` / `import_tool` | tracciabilità tecnica                  |

**ID deterministico**
`chunk_id = sha256(framework_code + edition + section_path + checksum_sha256)[0:16]`

---

## 7. Dal chunk al database

**Tabelle coinvolte**: `framework`, `source_doc`, `text_index`.

**Inserimento**

1. `framework` (se non presente) → `id`
2. `source_doc` (`framework_id`, `section_path`, `title`, `text_md`, `checksum`)
3. `text_index` (embedding del **solo testo normativo**; niente note)

---

## 8. Indicizzazione semantica

* Generare embedding su: `objective-like` + `verbi obbligativi` (MUST/SHALL/DEVE).
* Evitare di includere: titoli lunghi, citazioni legali ripetute, numeri pagina.
* Aggiungere **campi filtro** (lang, normative, framework) per ricerche ibride (BM25 + ANN).

---

## 9. Qualità: controlli automatici (QC)

1. **Hash stability**: ricalcolo `checksum` coerente tra run.
2. **Sezione non vuota**: `text_md` ≥ 40 caratteri, contiene un verbo prescrittivo.
3. **Unicità**: `(framework, edition, section_path, lang)` unico.
4. **Coerenza**: se `framework` è *IEC 62443*, allora `normative=true` per SR/CR (di norma).
5. **Diff** tra edizioni: se `checksum` cambia, marcare `supersedes=chunk_id_old`.

---

## 10. Esempi di etichette *section\_path*

* ISO/IEC 27002: `A.8.16` — *Monitoring activities*
* IEC 62443-3-3: `SR 1.1` — *Human user identification and authentication*
* NIST SP 800-53: `AC-17(2)` — *Protection of remote access sessions*
* NIS2: `Art. 21(2)(d)` — *Incident handling*
* CRA: `Annex I 1.2` — *Protection from known vulnerabilities*
* GDPR: `Art. 32(1)(b)` — *Integrity and availability*

---

## 11. Aggiornamenti di edizione

* Nuova edizione ⇒ **nuova riga** in `framework` (campo `edition` diverso).
* Re-chunking completo consigliato; mantenere mappature **old↔new** (campo `supersedes`).
* Crosswalk assistito: similarità ≥ 0,80 tra vecchi e nuovi chunk.

---

## 12. Checklist operativa (ingestion runbook)

1. Confermare **diritti d’uso** del documento.
2. Estrarre in **MD canonico**.
3. Applicare **regex di sezione** e taggare `normative/informativo`.
4. Eseguire **chunking** secondo regole §5.
5. Calcolare `checksum` e `chunk_id`.
6. Caricare in DB (`framework`→`source_doc`→`text_index`).
7. Lanciare **QC** e **report differenze** vs ultima edizione.
8. Pubblicare l’inventario (manifest) per revisione SME.

---

## 13. Manifest di import (esempio YAML)

```yaml
framework: "IEC 62443-3-3"
edition: "2013"
jurisdiction: "Global"
language: "en"
source: "file://catalog/IEC_62443-3-3_2013/en.pdf"
ingest_date: "2025-08-18"
chunks:
  - section_path: "SR 1.1"
    normative: true
    file: "section_SR_1.1.md"
    checksum_sha256: "e3b0c44298..."
  - section_path: "SR 1.2"
    normative: true
    file: "section_SR_1.2.md"
    checksum_sha256: "8f14e45fce..."
```

---

## 14. Pseudo-parsing (schema logico)

```
for each document:
  extract_plaintext()
  normalize_to_markdown()
  sections = split_by_patterns(framework_regex)
  for s in sections:
    blocks = split_into_atomic_clauses(s)
    for b in blocks:
      meta = build_metadata(b)
      meta.checksum = sha256(b.text_md)
      upsert_source_doc(meta)
      embed_and_index(b.text_md, filters=meta)
```

---

## 15. Errori comuni & come evitarli

* **Mescolare fonti** nello stesso chunk → mantenere 1-a-1 (un chunk = una clausola).
* **Note scambiate per obblighi** → marcare `informativo=true`, non inviarle al modello come testo normativo.
* **Perdita numerazione** in OCR → rivedere manualmente le sezioni con `SR x.y` / `A.x.y`.
* **Chunk troppo grandi** → ridurre a ≤ 300 token; altrimenti l’LLM sintetizza e perde specificità.
* **Duplicati tra lingue** → non indicizzare entrambe le lingue nello stesso indice semantico senza `lang` come filtro.

---

## 16. Output atteso del capitolo

* Linee guida chiare per generare **chunk normativi atomici** con **provenienza forte**.
* Dataset pronto per: estrazione controlli (Cap. 3), convalide (Cap. 4), crosswalk (Cap. 5).

> Nel **Capitolo 3 — Prompting ed estrazione**, useremo questi chunk per interrogare l’LLM con schemi JSON rigidi, includendo l’escape-hatch `insufficient_evidence` e le regole OT-aware.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking
