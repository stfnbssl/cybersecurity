# Capitolo 1 — Descrizione generale e concetti chiave

## 1. Scopo del manuale

Questo manuale definisce una procedura **ripetibile, auditabile e OT-aware** per:

* estrarre controlli/requirement da norme e standard (NIS2, IEC 62443, ISO/IEC 27001, CRA, GDPR, ecc.) usando LLM;
* normalizzarli in un **catalogo canonico** unico;
* mappare (crosswalk) i riferimenti tra standard diversi;
* generare **checklist**, profili/baseline e richieste di evidenze;
* garantire **tracciabilità e qualità** tramite convalide automatiche e revisione umana.

Il risultato atteso è una **base dati unificata** e riusabile per audit, assessment e progettazione di programmi di sicurezza per produttori, integratori, sviluppatori e asset owner OT/IT.

---

## 2. Ambito e destinatari

* **Destinatari**: consulenti Logbot, SME OT/IT, risk manager, auditor interni, product security, data steward.
* **Perimetro**: sistemi IACS/OT e IT con specificità regolatorie UE; copertura di standard primari (IEC 62443, ISO/IEC 27001) e supporto (NIST CSF, SP 800-53, SSDF, ecc.).
* **Non obiettivi**: interpretazioni legali vincolanti; la procedura produce materiale audit-ready, ma le decisioni finali restano agli owner.

---

## 3. Architettura del processo (end-to-end)

1. **Ingestion delle fonti**: raccolta di clausole/controlli da standard; segmentazione per sezione (es. *A.5.15*, *SR 1.1*, *Art. 32*).
2. **Prompting controllato** (LLM): estrazione del controllo in **JSON** secondo uno **schema rigido**; nessuna catena di pensiero; escape-hatch `status="insufficient_evidence"`.
3. **Convalide automatiche**:

   * **Schema validation** (JSON Schema).
   * **Linting**: statement imperativo, singolo, testabile; lunghezza limite; coerenza campi.
   * **Provenance checks** (vedi §7).
   * **Regole OT specifiche** (vedi §6).
4. **Dedupe & Crosswalk**: ricerca semantica (pgvector) contro il catalogo; proposta di relazione *equivalent/broader/narrower/supports*.
5. **Revisione umana** (SME): approvazione/merge/rifiuto con motivazione.
6. **Pubblicazione**: il controllo entra nel **catalogo canonico** con mappature e metadati di applicabilità.
7. **Derivazioni**: generazione **checklist**, richieste **evidenze**, **profili/baseline** per ruolo/ambiente/SL, risoluzione parametri, linking a **ATT\&CK for ICS**.
8. **Ciclo di feedback**: metriche di qualità, correzioni e versioning.

---

## 4. Concetti chiave

### 4.1 Controllo canonico

È la versione **unica e implementabile** di un requisito, con:

* **objective** (perché),
* **statement** (cosa, in forma verificabile),
* **params** (campi da istanziare, es. *log\_retention\_days*),
* **risk\_theme** (dominio),
* **applicability** (vedi sotto).

### 4.2 Applicabilità (scoping)

Descrive dove/chi/quando il controllo vale:

* **role**: *Manufacturer, SystemIntegrator, AssetOwner, ServiceProvider*;
* **env**: *IT, OT, Cloud, Edge, IIoT*;
* **lifecycle**: *Concept → Decommission*;
* **min\_security\_level**: target IEC 62443 (*SL1–SL4*);
* **conditions**: flag come *personal\_data*, *safety\_critical*.

> **Nota operativa (OT)**: i vincoli tipici (*no downtime*, *legacy OS*) suggeriscono **contromisure compensative** (segmentation, allowlisting, jump server, broker di accesso).

### 4.3 Mappature (crosswalk)

Relazione tra controllo canonico e fonte: *equivalent | broader | narrower | supports*, con puntatore esatto alla sezione.

### 4.4 Provenienza (provenance)

Metadati che consentono **traccia** completa: *framework, section\_path, edition, jurisdiction, checksum* del testo sorgente.

### 4.5 Profili / Baseline

Selezioni di controlli per uno **scopo** (es. *OT Asset Owner – SL2*), con **parametri risolti** e regole di inclusione.

### 4.6 Checklist & Evidenze

Domande di audit derivate automaticamente dallo statement, con **tipi di risposta** e **tipi di evidenza** attesi (config export, log, policy, URL).

### 4.7 Deduplicazione e similarità

Uso di **pgvector** per identificare duplicati/overlap e suggerire merge o crosswalk.

---

## 5. Design del prompting (alto livello)

* **Envelope comune**: system prompt che impone uso **solo** del testo sorgente, ignora istruzioni interne, vieta riflessioni estese, chiede **JSON conforme** allo schema.
* **Parametri di inferenza**: *temperature 0–0.2*, *max tokens* ridotti, *function/JSON mode* se disponibile.
* **Escape-hatch**: se il testo non è sufficiente, il modello deve restituire `insufficient_evidence` invece di “indovinare”.
* **Enumerazioni**: vocabolari chiusi per *risk\_theme, role, env, lifecycle, relation*.

---

## 6. Regole specifiche richieste (hard guardrails)

1. **Regola OT per IEC 62443**
   Se la **SOURCE** proviene da **IEC 62443-3-3** o **IEC 62443-4-2**, allora `applicability.env` **deve** includere `"OT"`.
   *Motivo*: 62443 è nativamente IACS/OT; l’assenza di OT in env indica un’estrazione potenzialmente errata.

2. **Provenance come vincolo di accettazione**
   Nessun output viene pubblicato se i **provenance checks** non passano (vedi §7).

---

## 7. Provenance checks (controlli di tracciabilità)

Prima della pubblicazione, per ogni record si verifica che:

* `framework`, `section_path`, `edition`, `jurisdiction` siano valorizzati e coerenti con la fonte.
* `checksum_sha256` **corrisponda** all’hash del testo sorgente passato al modello (immutabilità della prova).
* Le **mappature** usino il **codice framework** allineato al catalogo interno (es. “IEC 62443-3-3:2013”).
* Lo `statement` non introduca elementi non presenti o non inferibili dal testo (controllo SME).
* Versioning: ogni modifica crea una **nuova edizione** senza perdere lo storico.

---

## 8. Qualità e sicurezza del dato

**Convalide sintattiche**

* JSON Schema: campi obbligatori, enum, pattern, limiti numerici (es. *SL 1–4*).
* Linting: statement **imperativo, singolare, testabile**, ≤ 350 caratteri.

**Convalide semantiche**

* Coerenza **risk\_theme ↔ type** (es. *technical* non può essere “Governance”).
* Coerenza **source ↔ env/role/lifecycle** (es. fonti 62443 ⇒ `env` contiene OT).

**Sicurezza del prompting**

* **Anti-injection**: il modello deve ignorare istruzioni nel testo sorgente.
* **No browsing** / no fonti esterne durante l’estrazione.
* **Privacy**: se `conditions.personal_data=true`, attivare regole GDPR nei profili.

---

## 9. Ruoli e responsabilità

* **Data Steward**: prepara fonti, gestisce versioni, controlla checksum.
* **Prompt/Platform Engineer**: mantiene envelope, schemi, pipeline e metriche.
* **SME OT/IT**: valida contenuto, decide merge/crosswalk, definisce compensazioni OT.
* **Audit Lead**: verifica tracciabilità end-to-end e readiness documentale.

---

## 10. Metriche e Definition of Done (DoD)

**Metriche**

* Tasso di **validazione** (prima/seconda passata).
* **Accuratezza crosswalk** (F1 su set dorato).
* **Tasso di insufficienza** motivata (segnala gap delle fonti).
* **Tempo medio** di revisione umana per record.

**DoD per un controllo**

* ✅ JSON conforme + lint OK
* ✅ Provenance checks OK (hash e riferimenti verificati)
* ✅ Crosswalk/dedup deciso (o “none”)
* ✅ SME approvato
* ✅ Checklist, evidenze e parametri minimi generati
* ✅ Inserito in profilo/baseline di riferimento (se applicabile)

---

## 11. Strumenti e repository (overview)

* **DB**: PostgreSQL (+ pgvector) con tabelle per *control, mapping, applicability, profile, checklist, evidence, text\_index*.
* **Pipelines**: ingestion → prompting → validation → review → publish.
* **Versioning**: ogni fonte e controllo mantiene storia immutabile (checksum + timestamp + autore).

---

## 12. Benefici attesi

* **Consistenza** tra standard e ruoli (Manufacturer/Integrator/Asset Owner).
* **Auditabilità** totale (dalla clausola allo statement, evidenza e profilo).
* **Scalabilità**: automazione con LLM + controllo umano focalizzato.
* **Aderenze OT** integrate (SL 62443, safety relevance, compensazioni).

---

> **Prossimi capitoli** (step-by-step):
> 2\) Preparazione fonti & chunking • 3) Prompting ed estrazione • 4) Convalide e guardrail • 5) Dedupe & crosswalk • 6) Revisione SME • 7) Pubblicazione & versioning • 8) Generazione checklist/profili • 9) Metriche e miglioramento continuo.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking
