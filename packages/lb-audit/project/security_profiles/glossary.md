# Glossario — Profili di Sicurezza IEC 62443

> Riferimento al progetto: profili di sicurezza per IACS (IEC 62443‑1‑5) basati su catalogo canonico di controlli, versioning e tracciabilità fino a checklist ed evidenze.

## A. Acronimi

* **AO** — *Asset Owner* (Proprietario dell’impianto/sistema)
* **SI** — *System Integrator* (Integratore di sistema)
* **MFG** — *Manufacturer* (Costruttore/fornitore di componenti)
* **IACS** — *Industrial Automation and Control Systems*
* **ICS** — *Industrial Control Systems* (termine generico)
* **OT** — *Operational Technology*
* **IT** — *Information Technology*
* **SL** — *Security Level* (0–4)
  * **SL‑T** — *Target Security Level* (richiesto)
  * **SL‑C** — *Security Level Capability* (capacità del sistema/componente)
  * **SL‑A** — *Achieved/Assessed Security Level* (ottenuto/valutato)
* **SR** — *System Requirement* (IEC 62443‑3‑3, es. SR 3.1)
* **CR** — *Component Requirement* (IEC 62443‑4‑2, es. CR 3.1)
* **FR** — *Foundational Requirement* (raggruppamento SR/CR 1..7)
* **SDLC** — *Secure Development Lifecycle* (IEC 62443‑4‑1)
* **FAT/SAT** — *Factory/Site Acceptance Test*
* **PDCA** — *Plan‑Do‑Check‑Act* (ciclo di miglioramento)
* **GDPR** — *General Data Protection Regulation* (UE)
* **NIS2** — Direttiva sicurezza reti e sistemi informativi (UE)
* **CRA** — *Cyber Resilience Act* (Regolamento UE sui prodotti digitali)
* **MFA** — *Multi‑Factor Authentication*
* **VLAN** — *Virtual LAN*
* **LLM** — *Large Language Model*

## B. Documenti nella serie IEC 62443 (rilevanti al progetto)

* **IEC 62443‑1‑1** — Terminologia, concetti e modelli.
* **IEC 62443‑1‑5** — **Specificazione dei profili di sicurezza** (*Security Profiles*): definisce come descrivere profili con SL‑T per zone e conduits.
* **IEC 62443‑2‑1** — Requisiti per la gestione del programma di sicurezza IACS (*ISMS OT*).
* **IEC 62443‑2‑4** — Requisiti per fornitori/integratori di soluzioni IACS.
* **IEC 62443‑3‑3** — **Requisiti di sicurezza di sistema (SR)** e livelli di sicurezza.
* **IEC 62443‑4‑1** — Requisiti per **SDLC** dei produttori.
* **IEC 62443‑4‑2** — **Requisiti di sicurezza per componenti (CR)**.

> Nota: nel nostro modello i **mappings** collegano i controlli del catalogo a SR (3‑3) e CR (4‑2).

## C. FR / SR / CR — Struttura logica

* **FR 1** — Identificazione e Autenticazione (IAC) → SR/CR 1.x
* **FR 2** — Controllo degli utilizzi (UC) → SR/CR 2.x
* **FR 3** — Integrità del sistema (SI) → SR/CR 3.x
* **FR 4** — Riservatezza dei dati (DC) → SR/CR 4.x
* **FR 5** — Flusso dati ristretto (RDF) → SR/CR 5.x
* **FR 6** — Risposta tempestiva agli eventi (TRE) → SR/CR 6.x
* **FR 7** — Disponibilità delle risorse (RA) → SR/CR 7.x

## D. Livelli di sicurezza (SL)

| Livello | Descrizione sintetica                                     |
| ------- | --------------------------------------------------------- |
| **SL0** | Nessun requisito specifico di sicurezza OT                |
| **SL1** | Protezione contro uso *accidentale* o non intenzionale    |
| **SL2** | Avversario con **mezzi semplici** e motivazione limitata  |
| **SL3** | Avversario con **capacità sofisticate**, risorse moderate |
| **SL4** | Avversario con **capacità avanzate** e risorse elevate    |

* **SL‑T**: livello richiesto per una **zona** o un **conduit** (deriva da valutazione del rischio).
* **SL‑C**: livello che un **sistema/componente** può sostenere grazie ai controlli implementati.
* **SL‑A**: livello effettivamente **raggiunto** in esercizio (esito di valutazione/assessement).

## E. Termini chiave (alfabetico)

* **Applicabilità** — Metadati che indicano *quando* un controllo è pertinente (ruolo, ambiente, ciclo di vita, SL minimo, condizioni).
* **Baseline (profilo)** — Profilo di riferimento da cui derivano profili figli (ereditarietà) con override minimi.
* **Checklist** — Insieme di domande verificabili per ogni controllo; genera *evidence* d’audit.
* **Checklist (specializzazione)** — Aggiunta di ≤2 domande mirate per controllo, calibrate su SL‑T, zona/conduit o overlay.
* **Conduit** — Collegamento controllato tra zone; ha un **SL‑T** e vincoli sul flusso dati (FR5).
* **Condizioni (profile/control)** — Vincoli contestuali (es. *jurisdiction=EU*, overlay=GDPR) che attivano/parametrizzano un controllo.
* **Controllo (control)** — Misura tecnica/organizzativa nel catalogo canonico; tracciato verso SR/CR.
* **Copertura (coverage)** — Porzione di SR/CR coperta da un profilo (conteggio sezioni toccate).
* **Diff (profili)** — Confronto tra due versioni per evidenziare *added/removed/changed*.
* **Ereditarietà / Overlay** — Meccanismo per derivare un profilo *figlio* da uno *genitore* e sovrapporre temi (es. GDPR/NIS2) con regole additive.
* **Evidenza (evidence)** — Prova a supporto di un controllo (documento, configurazione, log, test). Tipizzata (POLICY/CONFIG/LOG/TEST).
* **Export audit‑ready** — Estrazione checklist + metadati + riferimenti SR/CR, pronta per audit/assessor.
* **FR (Foundational Requirement)** — Sette categorie di requisiti che organizzano SR/CR.
* **Governance (profili)** — Ciclo `draft → in_review → released → deprecated`, con semver e *release notes*.
* **Jurisdiction** — Ambito legale applicabile (paese/regione) che può introdurre overlay o condizioni.
* **Mapping** — Collegamento tra un controllo e una sezione SR/CR (es. *C‑AC‑IA → SR 1.1*).
* **Overlay** — Strato tematico che modifica *required/weight/parametri* (es. GDPR → logging pseudonimizzazione).
* **Parametri (control)** — Valori configurabili del controllo (es. lunghezza password, retention log).
* **Peso (weight)** — Rilevanza relativa di un controllo nel profilo (priorità/score).
* **Profili di sicurezza (IEC 62443‑1‑5)** — Descrizioni formali di requisiti di sicurezza per specifici scopi IACS, con SL‑T e regole di selezione controlli.
* **Razionale (rationale)** — Motivazione del progetto/profilo, legame con rischi, SL‑T e conformità.
* **Release notes** — Sintesi delle modifiche tra versioni e loro motivazione.
* **Responsabilità (AO/SI/MFG)** — *Chi fa cosa* per ogni controllo, utile per FAT/SAT e hand‑over.
* **Scope (profilo)** — Perimetro d’applicazione: ruolo, ambiente, ciclo di vita, giurisdizione, *essential service*, SL‑T zone e conduits.
* **Traceability** — Catena dimostrabile *profilo → controllo → mapping SR/CR → checklist → evidenza*.
* **Zone** — Raggruppamenti di asset con requisiti di sicurezza equivalenti; ciascuna con **SL‑T** e confini chiari.
* **Zone & Conduits model** — Modello architetturale IEC 62443 per segmentare l’IACS e governare i flussi.

## F. Ruoli principali

* **Asset Owner (AO)** — Responsabile del rischio e dei profili operativi; approva SL‑T e controlli minimi.
* **System Integrator (SI)** — Progetta/implementa la soluzione conforme al profilo; produce evidenze in FAT/SAT.
* **Manufacturer (MFG)** — Fornisce componenti con **SL‑C** dichiarato e processi **SDLC** (4‑1); supporta i profili CRA/62443.
* **SME 62443** — *Subject Matter Expert* per revisione tecnica dei profili e dei mappings.

## G. Tipi di evidenza (standardizzati nel progetto)

* **POLICY** — Policy/standard/procedura approvata.
* **CONFIG** — Esporti/parametri di configurazione o architetture.
* **LOG** — Estratti di log/eventi con retention e alerting.
* **TEST** — Report di test/validazione (FAT/SAT, pen‑test, DR test).

## H. Oggetti dati del progetto (sintesi)

* **Profile / Profile Version** — Identità stabile + versioni con semver e stato.
* **Profile Scope** — Campi di scoping (ruolo, env, lifecycle, SL‑T, ecc.).
* **Profile Rule** — Regole deterministiche di inclusione/esclusione/parametri/pesi.
* **Profile Control** — Elenco esplicito dei controlli compilati (target: global/zone/conduit).
* **Profile Inheritance** — Relazioni genitore‑figlio; overlay tematici.
* **Views** — `v_profile_controls_resolved`, `v_profile_checklist`, `v_profile_mappings`, `v_profile_evidence_summary`.

## I. Collegamenti normativi correlati (UE)

* **NIS2** — Impone misure tecniche/organizzative e reporting incident; i profili aiutano a comprovare l’adozione su impianti OT.
* **GDPR** — Per dati personali trattati in OT/IT; overlay guida logging, minimizzazione, controllo accessi.
* **CRA** — Requisiti di sicurezza per prodotti digitali; per MFG allinea SDLC (4‑1) e dichiarazioni SL‑C (4‑2).

## J. Esempi rapidi

* *SL‑T zona=2* → include controlli minimi per IAC (FR1), UC (FR2), logging (FR6), segmentazione (FR5) adeguati a minacce con mezzi semplici.
* *Overlay GDPR* → aumenta peso/rigore per controlli di gestione identità, logging selettivo e cifratura (FR1/4/6).

---

**Uso pratico:** questo glossario va tenuto allineato al repository dei profili; ogni nuova *release* che introduce termini va accompagnata da un aggiornamento qui (sezione *H*).

## K. Approfondimenti — Chiarimenti richiesti

### 1) DR test (Disaster Recovery test) in ambito OT/IACS

**Scopo:** verificare che i servizi critici OT possano essere ripristinati entro RTO/RPO definiti.
**Perimetro tipico:** SCADA/HMI, Historian, server di allarmi, ingegneria (ES), server licenze, jump host, IdP/AD OT, repository backup di log/config, (ove applicabile) immagini/golden backup di PLC/RTU e ricette.
**Casi di prova minimi:**

* Ripristino da backup offline/immutabile; riacquisizione della telemetria e comandi sicuri.
* Failover primario↔secondario di SCADA/allarmi e verifica persistenza allarmi.
* Ripristino connessioni di conduits e rinegoziazione trust (certificati/chiavi).
* Ripristino configurazioni di rete (segmentazione, ACL) e regole di logging.
  **Evidenze:** runbook approvato (POLICY), report backup/restore (CONFIG), estratti eventi (LOG), verbale prova con esiti e tempi (TEST).
  **Metriche:** RTO (tempo di ripristino), RPO (perdita dati ammessa), tasso di successo, deviazioni.

### 2) Overlay GDPR → come “aumenta peso/rigore”

**Quando si applica:** profilo/asset tratta *dati personali* (es. badge operatori, video sorveglianza, ticket manutentivi nominativi, log con ID utente).
**Effetti sul profilo (regole P2):**

* **Pesi (weight):** incrementi su controlli in FR1/FR4/FR6 (*identità, cifratura, logging*); es. `set_weight` con moltiplicatore +20–50% in base al rischio.
* **Obbligatorietà (required):** forzata = `true` per: gestione identità forte (MFA dove fattibile), cifratura in transito/a riposo, controllo accessi ai log, minimizzazione e *need‑to‑know*.
* **Parametri (param\_values):** soglie minime (es. password ≥ 12/14), retention log per scopo definito (DPIA), pseudonimizzazione/mascheramento identificativi nei log, hardening canali di conduits con dati personali.
  **Checklist extra tipiche:** presenza DPIA, registro trattamenti, controllo accessi ai log, test di pseudonimizzazione.

> Nota: l’overlay **non inventa** nuovi framework; agisce su `required/weight/param_values` dei controlli già mappati a SR/CR.

### 3) Profili CRA/62443 (per Manufacturer/fornitori)

**Obiettivo:** allineare i requisiti del **Cyber Resilience Act (CRA)** con 62443‑4‑1 (processi **SDLC**) e 62443‑4‑2 (requisiti componente, **SL‑C**).
**Contenuto tipico del profilo:**

* Processo di gestione vulnerabilità e **coordinated disclosure** (4‑1), politiche di update sicuro e firma firmware.
* Sicurezza by design/default del componente (4‑2): autenticazione, logging, cifratura, hardening configurazioni.
* Documentazione prodotto: guida secure configuration, **SBOM**, advisories/VEX, matrice delle dipendenze crittografiche.
  **Evidenze attese:** policy SDLC (POLICY), pipeline CI/CD hardenizzata (CONFIG), SBOM/VEX (CONFIG/LOG), rapporti test sicurezza (TEST).

### 4) Responsabilità di **hand‑over** (SI → AO) e controllo finale

**Momento:** al **SAT**/messa in esercizio o variazioni rilevanti del profilo.
**Artefatti minimi da consegnare/accettare:**

* **As‑built**: modello zone/conduits, architetture, baseline config di rete e sistemi (CONFIG).
* **Conformità al profilo**: export `profile → controls → checklist → evidence` con copertura SR/CR (REPORT/LOG/TEST).
* **Account e privilegi**: trasferimento ownership, rimozione account temporanei SI, rotazione/segreti consegnati all’AO.
* **Runbook O\&M**: backup/restore, patching, incident & change (POLICY/CONFIG).
* **Pacchetto FAT/SAT**: evidenze di test di accettazione e difformità risolte.
  **RACI sintetico:**
* Conformità al profilo → **R:** SI, **A:** AO, **C:** SME 62443, **I:** Auditor.
* As‑built & baseline → **R:** SI, **A:** AO.
* Account/segreti → **R:** SI (revoca), **A:** AO (presa in carico), **C:** CyberSec.
* Vulnerability & patch mgmt → **R:** AO; **C:** MFG per advisories.
  **Checklist di chiusura hand‑over:** verifica logging verso SOC AO, backup pianificati e testati, documentazione firmata, accessi SI rimossi, *diff* finale vs profilo rilasciato.

## L. Pipeline E1–E3 (come usata nel progetto)
- **E1 — Threat elicitation**: raccolta/elicitazione delle minacce e degli scenari d’abuso rilevanti per l’impianto e il contesto OT (asset coinvolti, vettori, impatto). Output tipico: elenco minacce con meta (asset/zone/conduit, rischio tematico) e riferimento ai **FR** interessati.
- **E2 — Rationale linkage**: collegamento **deterministico** tra minacce/obiettivi e i **controlli** del catalogo, con razionale sintetico (perché questo controllo riduce quel rischio), e richiamo ai **mapping** SR/CR. Output: grafi di tracciabilità *minaccia ↔ controllo ↔ SR/CR*.
- **E3 — Checklist specialization**: specializzazione operativa per impianto/macchina: aggiunta di ≤2 domande mirate per controllo in base a **SL‑T**, zona/conduit e overlay (es. GDPR/NIS2). Output: checklist arricchita con **evidence types** coerenti (POLICY/CONFIG/LOG/TEST).
> Tutti gli step E1–E3 sono vincolati da **JSON Schema** e guardrail (liste chiuse, limiti lunghezza, rifiuto ID non presenti nel catalogo).

## M. Prompt pattern P1–P3 (LLM, audit‑safe)
- **P1 — Profile scoping assistant**: raccoglie **scope** (ruolo, ambiente, ciclo di vita, giurisdizione, *essential service*, SL‑T per zone/conduits, overlay). Output JSON validato contro schema.
- **P2 — Rule compiler**: trasforma lo scope in **regole** e produce l’elenco **esplicito** dei controlli con `required/weight/param_values/target`. **Non inventa** `canonical_id`; usa solo l’indice del catalogo e i mapping a **IEC 62443‑3‑3 / 4‑2**.
- **P3 — Checklist specialization**: genera domande/ evidenze mirate per ciascun controllo senza duplicare le domande già presenti nel catalogo; massimo **2** per controllo; preferisce evidenze concrete.
> Tutti i prompt producono **solo JSON**; niente testo libero.

## N. Oggetti e campi del repository (integrazione)
- **Catalogo canonico dei controlli**: tabella principale `canonical_control` con chiavi e meta.
- `canonical_id` (chiave), `objective`, `statement`, `type`, `risk_theme`, `criticality`.
- **Applicability** (`applicability` JSON): `{ role, env, lifecycle, min_security_level, conditions }` per filtrare pertinence.
- **Parametri** (`params` JSON): lista `{ name, description, default }` per la parametrizzazione nei profili.
- **Mappings** (`control_mapping`): collegano ogni controllo a sezioni di standard esistenti. Campi: `framework_code` (es. "IEC 62443-3-3" / "IEC 62443-4-2" / "ISO/IEC 27002"), `section_path` (es. "SR 1.1", "CR 2.1"), `relation` (es. `implements`, `supports`).
- **Checklist (catalogo)**: `checklist_item` con `question`, `answer_type` (boolean/text/enum/number), `evidence_type_code` (→ `evidence_type`).
- **Evidence types**: dizionario (`POLICY`, `CONFIG`, `LOG`, `TEST`) usato sia dal catalogo sia dalle specializzazioni di profilo.
- **Starter set di profili baseline**: profili seme da cui derivare versioni locali (ereditarietà/overlay) — es. *AO — SL2/SL3 Operations*.
- **Script derivazione macchina**: utility che, dato un profilo e l’inventario/asset model, genera la **checklist macchina‑specifica** (binding a zone/conduits e parametri).
- **JSON Schema & guardrail**: tutti i file di authoring (scope, regole, controlli, checklist extra) vengono validati; qualunque `canonical_id` non presente nel catalogo comporta **rifiuto**.

---
**Nota di manutenzione:** quando si aggiornano P1–P3 o le regole E1–E3, riportare qui eventuali nuovi campi/enum introdotti negli schemi per mantenere il glossario allineato alla toolchain.

### sys_source https://chatgpt.com/c/68b120c0-27b8-832b-8d1f-691965bc9ccf?model=gpt-5-thinking




