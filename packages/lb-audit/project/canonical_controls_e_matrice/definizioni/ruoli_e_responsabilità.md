Ecco la descrizione operativa dei **ruoli e responsabilità** nel programma di audit LLM-assisted per macchine/impianti IACS. Ogni ruolo ha **decision rights**, **artefatti** di cui è owner, **KPI** e **handoff** chiari.

---

## Data Steward

**Missione:** garantire qualità, integrità e tracciabilità delle fonti e degli output dati.

* **Responsabilità**

  * Curare il **catalogo sorgenti** (standard, linee guida vendor, policy interne), con metadata (titolo, edizione, ambito, licenza).
  * Eseguire **normalizzazione & chunking** controllati; mantenere gli **schemi JSON** (input macchina, controlli, crosswalk).
  * Gestire **versioning semantico** (tag, release notes), **checksum** (SHA-256) e **manifests** di provenienza (chi ha caricato cosa, quando, da dove).
  * Curare dizionari/ontologie (glossario IACS, mapping termini vendor→FR/SR/CR).
  * Governare il **lifecycle dei dati** (retain/expire, dati personali minimizzati).
* **Decisioni chiave**

  * Accettare/rifiutare nuove fonti; definire “fonte autorevole” per conflitti.
  * Stabilire soglie di qualità (copertura, freschezza, duplicati).
* **Artefatti**

  * `sources_manifest.json`, `machine_input_schema.json`, dataset chunked con hash, tabella crosswalk base.
* **KPI**

  * % fonti con metadata completi; tasso errori di convalida schema; tempo medio di onboarding fonte; % chunk con checksum verificato.
* **Antipattern da evitare**

  * Caricamenti “una tantum” senza manifest; mix IT/OT senza etichette di contesto.

---

## Prompt/Platform Engineer

**Missione:** rendere il flusso LLM **deterministico, audit-safe e osservabile**.

* **Responsabilità**

  * Manutenere gli **envelope** (system + guardrail), i **prompt E1–E3**, e la pipeline (orchestrazione strumenti, timeouts, retry).
  * Versionare **schemi di I/O**; validare output con **JSON Schema** e regole (no allucinazioni su SR/CR).
  * Implementare **guardrail** (liste chiuse, stop words, quote limits), **telemetria** e **metriche** (precisione estrazioni, tasso rigetto).
  * Integrare strumenti: catalogo controlli, script `build_profile.py`, storage evidenze.
* **Decisioni chiave**

  * Aggiornare temperature/decoding; introdurre nuove regole di blocco; scegliere quando degradare a percorso “human-only”.
* **Artefatti**

  * `llm_prompts_E1_E2_E3.md`, test suite di regressione, dashboard di qualità modello.
* **KPI**

  * % output validi al primo colpo; tempo di esecuzione pipeline; tasso “insufficient\_evidence”; drift tra versioni.
* **Antipattern**

  * Lasciare al modello la **selezione dei requisiti** (deve essere a regole!); log non riproducibili.

---

## SME OT/IT (Subject Matter Expert)

**Missione:** assicurare correttezza tecnica e applicabilità OT/IT di minacce, compensazioni e mapping agli standard.

* **Responsabilità**

  * Validare **threat model** proposto (ATT\&CK for ICS), eliminando rumore e colmando lacune specifiche di processo/impianto.
  * Decidere **merge/crosswalk** tra controlli canonici e requisiti 62443-3-3/4-2; definire **compensazioni OT** (segmentazione, broker, allowlisting, unidirezionali).
  * Curare **parametrizzazione** dei controlli (es. SL, finestre patch, protocolli allowlist).
  * Rivedere **checklist** e **evidenze** per vendor/tecnologie specifiche.
* **Decisioni chiave**

  * Accettare il set finale “minaccia→requisito→controllo”; classificare **gap SL-C vs SL-T** e scegliere il rimedio.
* **Artefatti**

  * Note di razionale, matrice minacce→controlli, catalogo compensazioni approvate.
* **KPI**

  * % non-conformità evitate grazie a compensazioni; tempo medio di review; numero di ricicli su minacce.
* **Antipattern**

  * Compensazioni generiche non misurabili; divergenza tra safety e security non risolta.

---

## Audit Lead

**Missione:** garantire **tracciabilità end-to-end**, indipendenza, e **readiness documentale** per audit interni/esterni.

* **Responsabilità**

  * Definire **scope**, criteri, campionamento; approvare **piano d’audit** e timeline.
  * Verificare che ogni requisito abbia **evidenza sufficiente e verificabile** (config, log, report).
  * Eseguire **quality gate** su catena: fonte → chunk → estrazione → selezione requisiti → controllo → checklist → evidenza → finding.
  * Gestire **issue log**, severità, **piano di remediation** con proprietari e scadenze.
* **Decisioni chiave**

  * Emissione del **giudizio** (conforme / conforme con osservazioni / non conforme); accettazione rischi residui.
* **Artefatti**

  * Audit Plan, Registro Evidenze, Report finale con **traccia di provenienza** e checksum, roadmap remediation.
* **KPI**

  * % evidenze accettate senza rilavorazioni; lead time audit→report; closure rate remediation entro SLA.
* **Antipattern**

  * Affidarsi a schermate non verificabili; saltare la verifica di **provenance** e hash dei documenti.

---

## RACI sintetico per le fasi

| Fase                       | Data Steward | Prompt/Platform Eng. | SME OT/IT | Audit Lead |
| -------------------------- | ------------ | -------------------- | --------- | ---------- |
| Prep. fonti & chunking     | **R**        | C                    | C         | I          |
| Prompting & estrazione     | I            | **R**                | C         | I          |
| Convalide & guardrail      | C            | **R**                | C         | I          |
| Dedupe & crosswalk         | C            | C                    | **R**     | I          |
| SME review                 | I            | I                    | **R**     | C          |
| Pubblicazione & versioning | **R**        | C                    | C         | I          |
| Checklist & profili        | C            | C                    | **R**     | I          |
| Audit & reporting          | I            | I                    | C         | **R**      |

**Legenda:** R=Responsible, C=Consulted, I=Informed.

---

## Handoff & Definition of Done (DoD)

* **Gate G1 (dati pronti):** manifest completo, checksum verificati, schema valido.
* **G2 (pipeline ok):** ≥95% output JSON validi; zero “ID requisiti inventati”.
* **G3 (contenuto valido):** SME firma minacce/compensazioni; crosswalk consolidato.
* **G4 (audit-ready):** evidenze collegate a ogni controllo; log catena di tracciabilità chiuso; report con razionali e action plan.

Questa struttura mantiene **segregation of duties**, riduce il rischio di errore e rende l’audit **ripetibile, difendibile e scalabile**.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking