# Meta‑Canvas — come generare (ricorsivamente) un canvas per un certo tipo di applicazione

> Usa questo **meta‑canvas** per chiedere a ChatGPT di creare **un canvas su misura** per una specifica applicazione (web/mobile/CLI/ML/IoT, ecc.). Supporta anche l’uso **ricorsivo**: puoi usarlo per generare il canvas che a sua volta userai per generare un altro canvas più specifico.

---

## 0) Scopo

* Creare rapidamente **canvases applicativi** consistenti (analisi, design, sviluppo, test, delivery).
* Tenere allineati **obiettivi, vincoli, stack, architettura, qualità** e **prompt di generazione del codice**.
* Abilitare **ricorsione controllata** (canvas → meta‑prompt → nuovo canvas).

---

## 1) Parametri di generazione del Canvas Target

Compila e incolla nei prompt della Sez. 3.

* **APP\_KIND**: {es. “web app B2B per gestione ticket”}
* **CONTEXT**: {dominio, utenti, flussi principali}
* **SCOPE**: {MVP / v1 / modulo singolo}
* **AUDIENCE**: {dev team, stakeholder business, misto}
* **CONSTRAINTS**: {budget, performance, privacy, standard}
* **QUALITY\_GOALS**: {affidabilità, sicurezza, manutenibilità, UX}
* **STACK\_PREFS**: {frontend, backend, DB, cloud, CI/CD}
* **COMPLIANCE**: {GDPR, IEC 62443, SOC2… se rilevante}
* **DEADLINES / MILESTONES**: {date/epoche}

---

## 2) Sezioni consigliate per un Canvas Applicativo

Quando generi un canvas per {APP\_KIND}, includi:

1. **Obiettivo & KPI** (outcome, metriche di successo)
2. **Utenti & Job‑to‑be‑Done**
3. **Requisiti funzionali (epiche → storie)**
4. **Requisiti non funzionali** (SLA, latenza, SLO, sicurezza, privacy, accessibilità)
5. **Architettura** (diagrammi testuali + decision log ADR)
6. **Modello dati / schema** (chiavi, indici, retention)
7. **Contratti API** (OpenAPI/GraphQL SDL)
8. **UI/UX** (wireframe testuali, stati vuoti/errori)
9. **Qualità** (test pyramid, coverage, PR checklist)
10. **DevEx & Flusso** (branching, CI/CD, env, feature flags)
11. **Osservabilità** (log, metriche, tracce, alert)
12. **Sicurezza** (threat model, segreti, SBOM, dipendenze)
13. **Prestazioni & Scalabilità** (budget di latenza/costi)
14. **Piano rilascio & rollback**
15. **Backlog & Roadmap** (MVP → v1 → v2)
16. **Prompt Library** per generare codice, test, docs

---

## 3) Libreria di **Meta‑Prompt** (copiabile)

### 3.1 — Crea un **Canvas Base** per {APP\_KIND}

```
Sei un solution architect. Con i PARAMETRI:
APP_KIND: {…}
CONTEXT: {…}
SCOPE: {…}
AUDIENCE: {…}
CONSTRAINTS: {…}
QUALITY_GOALS: {…}
STACK_PREFS: {…}
COMPLIANCE: {…}
MILESTONES: {…}

Genera un **Canvas Applicativo** completo seguendo le 16 sezioni della Sezione 2.
Usa elenchi compatti, includi esempi concreti, KPI misurabili e ADR sintetici.
Se mancano dati, proponi assunzioni esplicite e alternative.
Restituisci solo il canvas pronto da incollare in un documento.
```

### 3.2 — **Estendi per sviluppo codice**

```
Prendi il Canvas Applicativo generato e aggiungi una **Prompt Library tecnica** con:
- Prompt per generare scheletri di repository (monorepo o multi),
- Prompt per scaffolding di componenti (React/Flutter/CLI),
- Prompt per contratti API (OpenAPI/GraphQL) + validazione,
- Prompt per test unit/integration/e2e, dati fittizi e fixture,
- Prompt per IaC (Terraform/Pulumi) + pipeline CI/CD,
- Prompt per hardening sicurezza (lint SAST/DAST, SBOM),
- Prompt per scrivere docs (README, architettura, runbook).
Restituisci la sezione “Prompt Library” aggiornata.
```

### 3.3 — Versioni **Breve** (MVP) vs **Estesa** (Enterprise)

```
Duplica il Canvas Applicativo in due varianti:
A) MVP: solo must‑have, 1 sprint di setup, budget minimo.
B) Enterprise: NFR completi (SLO, DR/BCP, IAM federato, audit).
Evidenzia differenze per ogni sezione.
```

### 3.4 — **Localizza** e imposta **compliance**

```
Adatta il canvas a {lingua/mercato} includendo requisiti legali e standard
rilevanti (es. GDPR, NIS2, IEC 62443). Aggiorna rischi e controlli.
```

### 3.5 — **Ricorsione controllata** (canvas → meta‑canvas → canvas)

```
Partendo da questo Meta‑Canvas, genera un **Meta‑Canvas Specializzato** per {APP_KIND}
che un team possa usare per generare, a sua volta, canvases di micro‑moduli
(es. “autenticazione”, “billing”, “reporting”). Includi:
- parametri minimi per ciascun modulo,
- prompt per creare sotto‑canvases,
- regole di stop (profondità massima = 2),
- checklist di coerenza tra moduli.
```

---

## 4) Guardrail per la ricorsione

* **Profondità massima**: 2 (Meta‑Canvas → Canvas Modulare → Canvas di Feature).
* **Regole di stop**: sezione mancante in 2 livelli consecutivi → interrompi e richiedi input.
* **Coerenza**: definisci un **Glossario** condiviso; usa ADR versionati.
* **Idempotenza**: assegna un **ID canvas** e mantieni `version` / `changelog`.

---

## 5) Schema JSON/YAML (facoltativo) per Canvas Target

Scegli JSON o YAML per parametrizzare e rigenerare rapidamente.

**JSON**

```json
{
  "meta": {
    "id": "app-canvas-{slug}",
    "version": "v0.1.0",
    "app_kind": "",
    "scope": "MVP",
    "audience": "dev",
    "compliance": [],
    "milestones": []
  },
  "sections": {
    "goals_kpi": [],
    "users_jtbd": [],
    "functional_reqs": [],
    "non_functional_reqs": [],
    "architecture": {"style": "", "adr": []},
    "data_model": [],
    "apis": [],
    "ui_ux": [],
    "quality": {"tests": [], "coverage": 0},
    "devex_flow": {"branching": "", "ci_cd": []},
    "observability": {"logs": [], "metrics": [], "traces": []},
    "security": {"threats": [], "controls": []},
    "performance": {"latency_budget_ms": 0, "scaling": ""},
    "release_plan": {"strategy": "", "rollback": ""},
    "backlog_roadmap": [],
    "prompt_library": []
  }
}
```

---

## 6) Prompt Library (tecnica) — esempi pronti

### 6.1 — **Repo scaffolding**

```
Genera la struttura di un monorepo per {APP_KIND} con {stack}. Includi: package manager,
workspace, lint/format, test, CI minima, script npm/make, template README.
```

### 6.2 — **Contratti API**

```
Crea una bozza OpenAPI 3.1 per le risorse: {…}. Includi schemi, errori, paginazione,
autenticazione, esempi di request/response, regole di validazione.
```

### 6.3 — **Componenti UI**

```
Dato il flusso {…}, proponi componenti, props, stato, error handling, esempi d’uso.
Aggiungi 3 test di interazione.
```

### 6.4 — **Test pyramid**

```
Progetta la piramide dei test per {APP_KIND}. Elenca test unitari chiave, integrazione, e2e,
fixture e dati fittizi. Fornisci esempi concreti di casi limite.
```

### 6.5 — **IaC + CI/CD**

```
Definisci un pipeline CI/CD e IaC minimo per ambienti dev/stage/prod con {cloud}.
Includi controlli sicurezza e policy di approvazione.
```

### 6.6 — **Sicurezza**

```
Esegui un mini threat modeling STRIDE per {APP_KIND}. Fornisci controlli e test associati.
```

---

## 7) Checklist qualità (ricorsione & completezza)

* [ ] Parametri (Sez. 1) completi e coerenti
* [ ] Tutte le 16 sezioni presenti nel canvas generato
* [ ] ADR con decisioni e alternative
* [ ] KPI misurabili collegati a feature
* [ ] Test & osservabilità definiscono SLO e alert azionabili
* [ ] Regole ricorsione rispettate (profondità ≤ 2)
* [ ] Versioning e changelog aggiornati

---

## 8) Esempio di meta‑prompt (da incollare e utilizzare subito)

```
Voglio generare un **Canvas Applicativo**. Parametri:
APP_KIND: "piattaforma SaaS multi‑tenant per reportistica OT/ICS"
CONTEXT: "PMI manifatturiere, dati da PLC/SCADA, trend e allarmi"
SCOPE: "MVP 3 mesi"
AUDIENCE: "CTO + team dev + responsabili OT"
CONSTRAINTS: "budget limitato, on‑prem edge gateway, latenza < 500 ms"
QUALITY_GOALS: "sicurezza, affidabilità, manutenibilità"
STACK_PREFS: "React+TS, FastAPI, Postgres, MQTT, Docker/K8s, GitHub Actions"
COMPLIANCE: "IEC 62443, GDPR"
MILESTONES: "M1 architettura, M2 MVP, M3 pilot"

Usando la **Sezione 2** come struttura, crea il Canvas Applicativo completo e poi
applica la **Sezione 3.2** per aggiungere la Prompt Library tecnica.
Se servono assunzioni, esplicale. Restituisci solo il canvas finale.
```

---

## 9) Versioning

* **Versione**: v0.1.0
* **Data**: {AAAA‑MM‑GG}
* **Note**: Primo rilascio del meta‑canvas.
