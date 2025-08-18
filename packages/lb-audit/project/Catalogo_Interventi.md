# Catalogo interventi OT/ICS – Schemi JSON e processo di governance

Questo documento propone:

* uno **schema di riferimento** per strutturare in JSON un catalogo di interventi (blocchi atomici), le composizioni in pacchetti/progetti, e gli artefatti di gestione (proposte, approvazioni, change request);
* un **processo procedurale** per arrivare alla versione approvata del catalogo e mantenerla nel tempo.

L’obiettivo è consentire la **composizione modulare** di offerte su misura per clienti OT/ICS, con tracciabilità rispetto agli standard (es. IEC 62443).

---

## 1) Principi di progettazione

* **Modularità**: ogni intervento è un blocco riusabile con input/output chiari.
* **Granularità sufficiente**: il blocco è quotabile come unità (tempo, costo, deliverable) senza ambiguità.
* **Componibilità**: pacchetti = sequenze/insiemi di blocchi con dipendenze e parametri.
* **Tracciabilità**: mapping a standard (IEC 62443, NIST CSF, ISO/IEC 27001) e a controlli.
* **Versionamento**: tutto è versionato (catalogo, blocchi, pacchetti, proposte).
* **Validazione automatica**: JSON Schema + CI per garantire qualità e coerenza.

### Specificità PMI

* **Time-to-value** rapido: risultati percepibili entro 30 giorni, baseline entro 90 giorni.
* **Perimetro ridotto di default**: presupporre ≤3 siti e ≤10 linee per sito; estensioni parametriche.
* **Remote-first** per discovery, interviste e formazione; **on-site mirato** per sopralluoghi e attività in campo.
* **Fasi timeboxed** e, dove possibile, **price cap** chiaro per favorire la previsione di spesa.
* **Materiali leggibili**: deliverable "light" (scheda A4 + runbook operativo) e checklist operative.
* **Prerequisiti minimi lato cliente** esplicitati (es. referente OT, accesso VPN, inventario base).
* **Turni e lingua**: definire slot brevi (≤2h) e materiale bilingue IT/EN quando necessario.
* **No-downtime per default**: attività intrusive solo in finestre di manutenzione.

---

## 2) Entità e relazioni (overview)

* **InterventionBlock**: mattone atomico (assessment, workshop, hardening, formazione, ecc.).
* **ServicePackage**: insieme ordinato di blocchi con parametri (use-case/verticale/obiettivo).
* **ClientProfile**: contesto cliente (settore, asset OT, vincoli, rischi, maturità, lingua, siti).
* **Proposal**: offerta composta per uno specifico cliente (selezione blocchi/pacchetti + stima).
* **ChangeRequest (CR)**: modifica a catalogo/pacchetti/proposte approvate.
* **ApprovalRecord**: evidenza di approvazione (ruoli, date, versioni, esiti).
* **MetricDefinition**: KPI/KRI e come vengono misurati.

---

## 3) Schemi JSON (draft 2020-12)

> Nota: gli schemi sono organizzati per file logici. I campi obbligatori sono nel `required`. Gli enum proposti sono estendibili.

### 3.1 `intervention_block.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/intervention_block.schema.json",
  "title": "InterventionBlock",
  "type": "object",
  "required": [
    "id", "name", "category", "summary", "inputs", "outputs",
    "effort", "pricingUnit", "deliverables", "acceptanceCriteria",
    "skills", "roles", "mapping",
    "version", "lifecycle", "qualityChecks"
  ],
  "properties": {
    "id": {"type": "string", "pattern": "^IB-[0-9]{4}$", "description": "Identificatore univoco (es. IB-0001)"},
    "name": {"type": "string"},
    "aka": {"type": "array", "items": {"type": "string"}, "description": "Sinonimi/alias"},
    "category": {
      "type": "string",
      "enum": [
        "Assessment", "Training", "Architecture", "Procedure", "Policy",
        "Hardening", "Segmentation", "Monitoring", "IncidentResponse",
        "Awareness", "ThirdParty/SupplyChain", "ComplianceMapping",
        "OTAssetInventory", "VulnerabilityManagement", "Backup/Recovery",
        "Governance"
      ]
    },
    "summary": {"type": "string", "description": "Breve descrizione di scopo e benefici"},
    "detailedDescription": {"type": "string"},
    "preRequisites": {"type": "array", "items": {"type": "string"}, "description": "Condizioni minime per eseguire il blocco"},
    "inputs": {"type": "array", "items": {"type": "string"}},
    "outputs": {"type": "array", "items": {"type": "string"}},
    "deliverables": {"type": "array", "items": {"type": "string"}},
    "artifacts": {"type": "array", "items": {"type": "string"}, "description": "Template/modelli prodotti o usati"},
    "acceptanceCriteria": {"type": "array", "items": {"type": "string"}},
    "dependencies": {"type": "array", "items": {"type": "string", "pattern": "^IB-[0-9]{4}$"}},
    "effort": {
      "type": "object",
      "required": ["unit", "min", "max"],
      "properties": {
        "unit": {"type": "string", "enum": ["person-day", "person-hour", "workshop-ore", "sessione"]},
        "min": {"type": "number", "minimum": 0},
        "max": {"type": "number", "minimum": 0}
      }
    },
    "pricingUnit": {"type": "string", "enum": ["fixed", "T&M", "parametric"]},
    "costDrivers": {"type": "array", "items": {"type": "string"}, "description": "Fattori che fanno crescere/decrescere sforzo e prezzo"},
    "parameters": {
      "type": "array",
      "description": "Parametri configurabili quando il blocco viene istanziato",
      "items": {
        "type": "object",
        "required": ["key", "type"],
        "properties": {
          "key": {"type": "string"},
          "type": {"type": "string", "enum": ["string", "integer", "number", "boolean", "enum"]},
          "enum": {"type": "array", "items": {"type": "string"}},
          "default": {},
          "description": {"type": "string"}
        }
      }
    },
    "skills": {"type": "array", "items": {"type": "string"}},
    "roles": {"type": "array", "items": {"type": "string", "enum": ["LeadConsultant", "SeniorOT", "NetworkSecurity", "PLC/SCADA", "GRC", "Trainer", "PM"]}},
    "tools": {"type": "array", "items": {"type": "string"}},
    "mapping": {
      "type": "object",
      "description": "Tracciamento a controlli/standard",
      "properties": {
        "IEC62443": {
          "type": "array",
          "items": {"type": "string", "description": "Es. 62443-3-3:SR 3.1 o FR[1..7]/CR"}
        },
        "NISTCSF": {"type": "array", "items": {"type": "string"}},
        "ISO27001": {"type": "array", "items": {"type": "string"}}
      }
    },
    "maturityTarget": {"type": "string", "enum": ["Foundational", "Intermediate", "Advanced"]},
    "risksMitigated": {"type": "array", "items": {"type": "string"}},
    "kpi": {
      "type": "array",
      "items": {"type": "string"},
      "description": "KPI principali associati al blocco (riferimenti a MetricDefinition)"
    },
    "version": {
      "type": "object",
      "required": ["catalogVersion", "blockVersion"],
      "properties": {
        "catalogVersion": {"type": "string", "pattern": "^([0-9]+)\\.([0-9]+)\\.([0-9]+)$"},
        "blockVersion": {"type": "string", "pattern": "^([0-9]+)\\.([0-9]+)\\.([0-9]+)$"}
      }
    },
    "lifecycle": {"type": "string", "enum": ["draft", "review", "approved", "deprecated"]},
    "qualityChecks": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  }
}
```

### 3.2 `service_package.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/service_package.schema.json",
  "title": "ServicePackage",
  "type": "object",
  "required": ["id", "name", "purpose", "blocks", "version", "lifecycle"],
  "properties": {
    "id": {"type": "string", "pattern": "^SP-[0-9]{4}$"},
    "name": {"type": "string"},
    "purpose": {"type": "string"},
    "audience": {"type": "array", "items": {"type": "string", "enum": ["OT Manager", "Maintenance", "Engineering", "CISO", "IT-Sec", "Plant Director"]}},
    "blocks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["blockId"],
        "properties": {
          "blockId": {"type": "string", "pattern": "^IB-[0-9]{4}$"},
          "overrideParameters": {"type": "object", "additionalProperties": {}},
          "sequence": {"type": "integer", "minimum": 1},
          "mandatory": {"type": "boolean", "default": true}
        }
      }
    },
    "preConfiguredVariants": {"type": "array", "items": {"type": "string"}},
    "risksAddressed": {"type": "array", "items": {"type": "string"}},
    "expectedOutcomes": {"type": "array", "items": {"type": "string"}},
    "leadTimeDays": {"type": "integer", "minimum": 0},
    "version": {"type": "string", "pattern": "^([0-9]+)\\.([0-9]+)\\.([0-9]+)$"},
    "lifecycle": {"type": "string", "enum": ["draft", "review", "approved", "deprecated"]},
    "notes": {"type": "string"}
  }
}
```

### 3.3 `client_profile.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/client_profile.schema.json",
  "title": "ClientProfile",
  "type": "object",
  "required": ["clientId", "name", "industry", "sites", "languages"],
  "properties": {
    "clientId": {"type": "string", "pattern": "^CL-[0-9]{4}$"},
    "name": {"type": "string"},
    "industry": {"type": "string", "enum": ["Food&Beverage", "Energy", "Pharma", "Automotive", "Chemicals", "Metals", "Water/Wastewater", "Logistics", "Other"]},
    "maturity": {"type": "string", "enum": ["Low", "Medium", "High"]},
    "regulatoryDrivers": {"type": "array", "items": {"type": "string"}},
    "sites": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["siteId", "name", "country"],
        "properties": {
          "siteId": {"type": "string"},
          "name": {"type": "string"},
          "country": {"type": "string"},
          "timezone": {"type": "string"},
          "criticality": {"type": "string", "enum": ["Low", "Medium", "High"]},
          "otZones": {"type": "integer", "minimum": 0},
          "plcVendors": {"type": "array", "items": {"type": "string"}}
        }
      }
    },
    "languages": {"type": "array", "items": {"type": "string"}},
    "contactRoles": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  }
}
```

### 3.4 `proposal.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/proposal.schema.json",
  "title": "Proposal",
  "type": "object",
  "required": ["proposalId", "clientId", "items", "pricing", "validity", "status"],
  "properties": {
    "proposalId": {"type": "string", "pattern": "^PR-[0-9]{6}$"},
    "clientId": {"type": "string", "pattern": "^CL-[0-9]{4}$"},
    "title": {"type": "string"},
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type"],
        "properties": {
          "type": {"type": "string", "enum": ["Block", "Package"]},
          "id": {"type": "string", "description": "IB-XXXX o SP-XXXX"},
          "parameters": {"type": "object", "additionalProperties": {}},
          "quantity": {"type": "number", "minimum": 1},
          "notes": {"type": "string"}
        }
      }
    },
    "scheduling": {"type": "string", "description": "Vincoli/finestre di esecuzione"},
    "assumptions": {"type": "array", "items": {"type": "string"}},
    "exclusions": {"type": "array", "items": {"type": "string"}},
    "pricing": {
      "type": "object",
      "required": ["currency", "total"],
      "properties": {
        "currency": {"type": "string", "enum": ["EUR", "USD", "GBP"]},
        "breakdown": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["ref", "amount"],
            "properties": {
              "ref": {"type": "string", "description": "Riferimento a item (Block/Package)"},
              "amount": {"type": "number", "minimum": 0}
            }
          }
        },
        "discounts": {"type": "array", "items": {"type": "string"}},
        "total": {"type": "number", "minimum": 0}
      }
    },
    "validity": {"type": "string", "description": "Data fine validità offerta (ISO 8601)"},
    "status": {"type": "string", "enum": ["draft", "sent", "accepted", "rejected", "expired"]},
    "approval": {"$ref": "#/definitions/ApprovalRef"},
    "version": {"type": "string", "pattern": "^([0-9]+)\\.([0-9]+)\\.([0-9]+)$"}
  },
  "definitions": {
    "ApprovalRef": {
      "type": "object",
      "properties": {
        "approvalId": {"type": "string", "pattern": "^AP-[0-9]{6}$"}
      }
    }
  }
}
```

### 3.5 `change_request.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/change_request.schema.json",
  "title": "ChangeRequest",
  "type": "object",
  "required": ["crId", "target", "reason", "impact", "requestedBy", "status"],
  "properties": {
    "crId": {"type": "string", "pattern": "^CR-[0-9]{6}$"},
    "target": {"type": "string", "enum": ["Catalog", "Block", "Package", "Proposal"]},
    "targetId": {"type": "string"},
    "summary": {"type": "string"},
    "reason": {"type": "string"},
    "impact": {"type": "string", "enum": ["low", "medium", "high"]},
    "requestedBy": {"type": "string"},
    "proposedChange": {"type": "string"},
    "status": {"type": "string", "enum": ["open", "in-review", "approved", "rejected", "implemented"]},
    "approval": {"type": "string", "pattern": "^AP-[0-9]{6}$"},
    "createdAt": {"type": "string"},
    "updatedAt": {"type": "string"}
  }
}
```

### 3.6 `approval_record.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/approval_record.schema.json",
  "title": "ApprovalRecord",
  "type": "object",
  "required": ["approvalId", "objectType", "objectId", "result", "date", "approvers"],
  "properties": {
    "approvalId": {"type": "string", "pattern": "^AP-[0-9]{6}$"},
    "objectType": {"type": "string", "enum": ["Catalog", "Block", "Package", "Proposal", "CR"]},
    "objectId": {"type": "string"},
    "result": {"type": "string", "enum": ["approved", "rejected", "conditional"]},
    "conditions": {"type": "array", "items": {"type": "string"}},
    "date": {"type": "string"},
    "approvers": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  }
}
```

### 3.7 `metric_definition.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/metric_definition.schema.json",
  "title": "MetricDefinition",
  "type": "object",
  "required": ["id", "name", "type", "unit", "calculation"],
  "properties": {
    "id": {"type": "string", "pattern": "^MT-[0-9]{4}$"},
    "name": {"type": "string"},
    "type": {"type": "string", "enum": ["KPI", "KRI"]},
    "unit": {"type": "string"},
    "calculation": {"type": "string"},
    "source": {"type": "string"},
    "frequency": {"type": "string", "enum": ["per-block", "weekly", "monthly", "quarterly"]},
    "targets": {"type": "string"},
    "notes": {"type": "string"}
  }
}
```

### 3.8 `pmi_extension.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/pmi_extension.schema.json",
  "title": "PMIExtension",
  "type": "object",
  "required": ["tier", "deliveryMode", "operationalConstraints"],
  "properties": {
    "tier": {"type": "string", "enum": ["Base", "Plus", "Pro"]},
    "scopeCaps": {
      "type": "object",
      "properties": {
        "maxSites": {"type": "integer", "minimum": 1, "maximum": 3},
        "maxLinesPerSite": {"type": "integer", "minimum": 1, "maximum": 12},
        "maxParticipants": {"type": "integer", "minimum": 1, "maximum": 30}
      },
      "additionalProperties": false
    },
    "deliveryMode": {"type": "string", "enum": ["remote-first", "hybrid", "on-site"]},
    "operationalConstraints": {
      "type": "object",
      "required": ["windows"],
      "properties": {
        "windows": {"type": "string", "enum": ["no-shutdown", "maintenance-only", "night-shift", "weekend"]},
        "downtimeLimitMinutes": {"type": "integer", "minimum": 0},
        "safetyCriticalArea": {"type": "boolean", "default": true},
        "accessRestrictions": {"type": "array", "items": {"type": "string"}}
      }
    },
    "leadTimeDays": {"type": "integer", "minimum": 0},
    "documentationLevel": {"type": "string", "enum": ["light", "standard"]},
    "language": {"type": "array", "items": {"type": "string"}},
    "trainingIncluded": {"type": "boolean", "default": true},
    "priceBand": {"type": "string", "enum": ["€", "€€", "€€€"]},
    "notes": {"type": "string"}
  }
}
```

> **Uso**: aggiungere una proprietà opzionale `x-pmi` in `InterventionBlock`, `ServicePackage` o `Proposal` conforme a `PMIExtension`. Per una validazione rigorosa si può creare uno schema composito:

```json
{
  "allOf": [
    { "$ref": "https://example.com/schemas/service_package.schema.json" },
    { "type": "object", "properties": { "x-pmi": { "$ref": "https://example.com/schemas/pmi_extension.schema.json" } } }
  ]
}
```

### 3.9 `training_module.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/training_module.schema.json",
  "title": "TrainingModule",
  "type": "object",
  "required": ["id", "title", "durationMinutes", "audience", "modality", "learningObjectives"],
  "properties": {
    "id": {"type": "string", "pattern": "^TM-[0-9]{4}$"},
    "title": {"type": "string"},
    "durationMinutes": {"type": "integer", "minimum": 15, "maximum": 240},
    "audience": {"type": "array", "items": {"type": "string"}},
    "modality": {"type": "string", "enum": ["microlearning", "webinar", "workshop"]},
    "prerequisites": {"type": "array", "items": {"type": "string"}},
    "materials": {"type": "array", "items": {"type": "string"}},
    "learningObjectives": {"type": "array", "items": {"type": "string"}},
    "assessment": {"type": "string", "enum": ["quiz", "exercise", "none"]},
    "mapping": {"type": "array", "items": {"type": "string"}},
    "notes": {"type": "string"}
  }
}
```

---

## 4) Esempi minimi

### 4.1 Esempio di blocco (InterventionBlock)

```json
{
  "id": "IB-0007",
  "name": "Assessment gap IEC 62443 per linea di confezionamento",
  "category": "Assessment",
  "summary": "Valutazione gap rispetto a 62443-3-3 su una linea OT",
  "detailedDescription": "Interviste, sopralluogo, campionamento configurazioni PLC/HMI, report gap & raccomandazioni",
  "preRequisites": ["Accesso a sito", "PoC sponsor", "Lista asset di base"],
  "inputs": ["Asset list", "Disegno reti se disponibile"],
  "outputs": ["Rapporto gap", "Prioritized action list"],
  "deliverables": ["Report PDF", "Presentazione stakeholders"],
  "artifacts": ["Template-Report-62443-v1.2"],
  "acceptanceCriteria": ["Report con scoring FR/CR", "Azioni prioritarie con effort"],
  "dependencies": [],
  "effort": {"unit": "person-day", "min": 3, "max": 6},
  "pricingUnit": "fixed",
  "costDrivers": ["Numero PLC", "Siti", "Accessi vincolati"],
  "parameters": [
    {"key": "sites", "type": "integer", "default": 1, "description": "Numero siti"},
    {"key": "lines", "type": "integer", "default": 1, "description": "Linee per sito"}
  ],
  "skills": ["IEC 62443", "OT network", "PLC"],
  "roles": ["LeadConsultant", "PLC/SCADA"],
  "tools": ["Scanner passivo", "Checklist 62443"],
  "mapping": {"IEC62443": ["62443-3-3:FR1,FR2,FR3,FR5"], "NISTCSF": ["ID.AM","PR.AC","DE.AE"]},
  "maturityTarget": "Foundational",
  "risksMitigated": ["Mancata visibilità asset", "Controlli non implementati"],
  "kpi": ["MT-0001"],
  "version": {"catalogVersion": "1.0.0", "blockVersion": "1.1.0"},
  "lifecycle": "approved",
  "qualityChecks": ["Peer review", "Verifica mapping standard"],
  "notes": "Usare PPE e policy accessi impianto"
}
```

### 4.2 Esempio di pacchetto (ServicePackage)

```json
{
  "id": "SP-0012",
  "name": "Avvio Programma Sicurezza OT – Fast Start",
  "purpose": "Stabilire baseline di sicurezza OT e roadmap 6-12 mesi",
  "audience": ["OT Manager", "CISO"],
  "blocks": [
    {"blockId": "IB-0007", "sequence": 1, "mandatory": true},
    {"blockId": "IB-0021", "sequence": 2, "mandatory": true, "overrideParameters": {"sessioni": 2}},
    {"blockId": "IB-0030", "sequence": 3, "mandatory": false}
  ],
  "risksAddressed": ["Assenza governance", "Assenza visibilità asset"],
  "expectedOutcomes": ["Roadmap prioritaria", "Quick wins in 90 giorni"],
  "leadTimeDays": 30,
  "version": "1.0.0",
  "lifecycle": "approved",
  "notes": "Adatto a PMI multi-sito (<=3 siti)"
}
```

### 4.3 Esempio di proposta (Proposal)

```json
{
  "proposalId": "PR-000123",
  "clientId": "CL-0042",
  "title": "Programma OT Security – Fast Start + Formazione",
  "items": [
    {"type": "Package", "id": "SP-0012"},
    {"type": "Block", "id": "IB-0040", "parameters": {"partecipanti": 12}, "quantity": 1}
  ],
  "scheduling": "Q4 2025 – preferenza settimane 41–46",
  "assumptions": ["Accesso remoto consentito per review documentale"],
  "exclusions": ["Penetration test attivi in produzione"],
  "pricing": {
    "currency": "EUR",
    "breakdown": [
      {"ref": "SP-0012", "amount": 14500},
      {"ref": "IB-0040", "amount": 2800}
    ],
    "discounts": ["Sconto pacchetto 5%"],
    "total": 16410
  },
  "validity": "2025-10-31",
  "status": "draft",
  "version": "1.0.0"
}
```

---

## 5) Processo procedurale (dalla bozza all’approvazione e manutenzione)

### Ruoli chiave (RACI sintetico)

* **Owner Catalogo (R)**: responsabile contenuto e roadmap.
* **Practice Lead OT (A)**: approva modifiche sostanziali.
* **PMO (C)**: verifica coerenza con offerte/processi.
* **QA/GRC (C)**: verifica tracciabilità a standard e qualità.
* **Sales Enablement (I)**: informato su cambi e materiale go-to-market.

### Fasi

1. **Inception & Governance Setup**

   * Definire principi, naming, policy versioning semantico (MAJOR.MINOR.PATCH), convenzioni ID (IB-XXXX, SP-XXXX, ecc.).
   * Repository Git + CI per validazione JSON Schema (lint, test).
   * Definire `metric_definition` base per KPI.

2. **Raccolta requisiti interni**

   * Interviste a consulenti, prevendita, delivery; raccolta interventi esistenti.
   * Clusterizzazione per categorie e maturità (Foundational/Intermediate/Advanced).

3. **Definizione blocchi (draft)**

   * Scrivere blocchi minimi (≥20–40) che coprano assessment, formazione, governance, quick wins tecnici.
   * Per ciascun blocco: input/output/deliverable, effort, pricingUnit, acceptanceCriteria, mapping standard.

4. **Revisione tecnica & GRC**

   * Peer review; QA verifica coerenza schemi e mapping IEC 62443 (FR/CR pertinenti).
   * Aggiornare lifecycle: `draft → review`.

5. **Composizione pacchetti**

   * Disegnare 3–5 pacchetti canonici (es. Fast Start, Governance & Policy, Monitoring & Incident Readiness, Supplier Security, Awareness Program OT).
   * Definire dipendenze e varianti.

6. **Pilota su 1–2 clienti**

   * Applicare pacchetti/blocchi; raccogliere feedback, KPI (lead time, NPS, effort reale vs stimato).
   * Aprire CR per affinamenti.

7. **Approvazione e rilascio Catalogo v1.0.0**

   * Emissione `ApprovalRecord` per blocchi e pacchetti; lifecycle `approved`.
   * Pubblicazione materiale abilitante (schede sintetiche, presentazioni, playbook).

8. **Change Management continuo**

   * Flusso CR con valutazione impatto (pricing, competenze, rischi, standard).
   * Cadence di release: minor ogni trimestre, patch ad-hoc, major su cambi sostanziali.
   * Deprecation policy (finestra di supporto, sostituzioni consigliate).

9. **Controllo qualità periodico**

   * Audit semestrale su mapping a standard (aggiornamenti normativi), accuratezza effort vs consuntivi, efficacia KPI.

### Criteri di entrata/uscita per le fasi chiave

* **Uscita Fase 3 (Bozza blocchi)**: tutti i required presenti; acceptanceCriteria misurabili; effort parametrizzato.
* **Uscita Fase 5 (Pacchetti)**: dipendenze risolte; varianti documentate; KPI associati.
* **Uscita Fase 7 (Rilascio)**: approval record emessi; materiale enablement pubblicato; tag Git `catalog-v1.0.0`.

---

## 6) Linee guida di granularità e pricing

* Un blocco dovrebbe:

  * avere **durata tipica** 0.5–10 gg/uomo e un **deliverable verificabile**;
  * esplicitare **unità di misura** (es. per sito, per linea, per sessione);
  * includere chiari **driver di costo** (es. n° PLC, n° linee, vincoli di accesso, turni, sito attivo 24/7).
* Pricing suggeriti: `fixed` per assessment/workshop con perimetro chiaro; `T&M` per attività esplorative; `parametric` per attività scalabili (es. €X per linea, €Y per sito).

---

## 7) Requisiti di qualità e accettazione

* **AcceptanceCriteria** per blocco: formula testabile (es. "Report con scoring FR1–FR7 e 10 raccomandazioni prioritarie con effort").
* **QualityChecks**: checklist minima (peer review, controllo mapping, controllo template, spell-check).
* **Evidenze**: allegare artefatti firmati, log delle review, riferimenti a ticket.

---

## 8) Struttura repository e CI suggerita

```
/catalog
  /schemas
    intervention_block.schema.json
    service_package.schema.json
    client_profile.schema.json
    proposal.schema.json
    change_request.schema.json
    approval_record.schema.json
    metric_definition.schema.json
  /blocks
    IB-0001.json
    ...
  /packages
    SP-0001.json
    ...
  /metrics
    MT-0001.json
  /examples
    example-block.json
    example-package.json
    example-proposal.json
```

* **CI**: validazione con JSON Schema (es. AJV), linting, controllo ID univoci, coerenza dipendenze (blockId esistenti), controllo versioning (no regressione MAJOR senza CR approvato), generazione sommari (README, catalogo HTML/PDF).

---

## 9) Mapping IEC 62443 (linee guida pratiche)

* Mappare ogni blocco ai **FR (Foundational Requirements)** pertinenti (FR1 a FR7) e, ove sensato, ai **SR/CR** specifici.
* Esempi:

  * **Asset inventory OT** → FR1 (Identification and Authentication Control), FR5 (Restrictive Data Flow), FR7 (Resource Availability) – in relazione alle capacità di inventario e controllo cambi.
  * **Network segmentation/Conduits** → FR5; eventuale supporto a SL-T/SL-C.
  * **IR tabletop esercitazioni OT** → FR6 (Response to Events).
* Indicare chiaramente **assunzioni operative** (es. nessun test attivo su sistemi in produzione senza finestra di manutenzione).

---

## 10) Estensioni opzionali

* `work_order.schema.json` per ordini di lavoro interni.
* `training_module.schema.json` se si vuole dettagliare formazione con syllabus, prerequisiti, materiali.
* `risk_control_mapping.schema.json` per legare rischi tipizzati (libreria) a controlli e blocchi.

---

## 11) Prossimi passi consigliati

1. Popolare 10–15 **blocchi base** (assessment, formazione base, governance minima, quick wins OT).
2. Disegnare 3 **pacchetti canonici** e un set di **varianti** per PMI vs enterprise.
3. Allestire repo + CI con validazione schemi e test esempi.
4. Avviare round di **peer review** e pianificare un **pilota** con un cliente amico.
5. Preparare materiale enablement (schede A4 per blocco, matrice mappature standard, checklist CR).

## 12) Taglio PMI – preset operativi

**Preset di tier**

* **Base**: scoperta remota, 1 sito (≤4 linee), deliverable light, 2 moduli formativi microlearning, lead time ≤15 gg.
* **Plus**: 1–2 siti (≤8 linee totali), 1 sopralluogo on-site, 3–4 moduli formativi, runbook operativo.
* **Pro**: fino a 3 siti (≤12 linee), mini-pilota monitoraggio, esercitazione IR tabletop, materiali bilingue.

**Vincoli tipici**: finestre *maintenance-only*; downtime ≤30 min cumulati; turni; accessi accompagnati.

---

## 13) Libreria blocchi PMI (proposta iniziale)

> Ogni elemento è istanziabile con `x-pmi`.

```json
[
  {"id":"IB-0101","name":"Inventario OT starter (passivo)","category":"OTAssetInventory","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"fixed","deliverables":["Elenco asset (baseline)","Mappa logica reti"],"mapping":{"IEC62443":["FR1","FR5","FR7"]}},
  {"id":"IB-0102","name":"Assessment rapido 62443 (1 linea)","category":"Assessment","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"fixed","deliverables":["Scheda gap A4","Action list 30-60-90"],"mapping":{"IEC62443":["FR1","FR2","FR3","FR5"]}},
  {"id":"IB-0103","name":"Hardening accessi remoti (VPN/jump)","category":"Hardening","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"parametric","deliverables":["Checklist configurazione","Runbook accessi fornitori"]},
  {"id":"IB-0104","name":"Segmentation review (read-only)","category":"Segmentation","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"fixed","deliverables":["Raccomandazioni conduit/zone","Piano regole firewall"]},
  {"id":"IB-0105","name":"Backup & restore drill (una cella)","category":"Backup/Recovery","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"fixed","deliverables":["Report esito drill","Checklist ripristino"]},
  {"id":"IB-0106","name":"User access review PLC/HMI","category":"Procedure","effort":{"unit":"person-day","min":0.5,"max":1.5},"pricingUnit":"fixed","deliverables":["Lista account & ruoli","Piano pulizia"]},
  {"id":"IB-0107","name":"Awareness OT microlearning (2x45m)","category":"Training","effort":{"unit":"sessione","min":2,"max":2},"pricingUnit":"fixed","deliverables":["Slide","Quiz"],"kpi":["MT-0203"]},
  {"id":"IB-0108","name":"Supplier security quick check","category":"ThirdParty/SupplyChain","effort":{"unit":"person-day","min":1,"max":1},"pricingUnit":"fixed","deliverables":["Checklist fornitori","Clausole minime"]},
  {"id":"IB-0109","name":"Incident Response tabletop (2h)","category":"IncidentResponse","effort":{"unit":"workshop-ore","min":2,"max":2},"pricingUnit":"fixed","deliverables":["Verbale esercitazione","Azioni di miglioramento"]},
  {"id":"IB-0110","name":"Vulnerability mgmt pilot (1 linea)","category":"VulnerabilityManagement","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"parametric","deliverables":["Lista vulnerabilità prioritarie","Piano patching prudente"]},
  {"id":"IB-0111","name":"Policy minima OT (1-2 pag)","category":"Policy","effort":{"unit":"person-day","min":1,"max":1},"pricingUnit":"fixed","deliverables":["Bozza policy","Checklist adesione"]},
  {"id":"IB-0112","name":"Runbook incidenti comuni","category":"Procedure","effort":{"unit":"person-day","min":1,"max":2},"pricingUnit":"fixed","deliverables":["Runbook A4 per 3 scenari"]}
]
```

---

## 14) Pacchetti PMI pronti all’uso

```json
[
  {
    "id":"SP-0110","name":"PMI Fast Start (Base)","purpose":"Baseline e roadmap 90 giorni","blocks":[{"blockId":"IB-0102","sequence":1},{"blockId":"IB-0101","sequence":2},{"blockId":"IB-0107","sequence":3}],
    "expectedOutcomes":["Gap principali noti","Action plan 30-60-90"],
    "leadTimeDays":15,
    "lifecycle":"approved",
    "x-pmi":{"tier":"Base","deliveryMode":"remote-first","operationalConstraints":{"windows":"no-shutdown"}}
  },
  {
    "id":"SP-0111","name":"Accessi & Segmentazione (Plus)","purpose":"Ridurre superfici di attacco e rischi supply chain","blocks":[{"blockId":"IB-0103","sequence":1},{"blockId":"IB-0104","sequence":2},{"blockId":"IB-0108","sequence":3}],
    "leadTimeDays":20,
    "x-pmi":{"tier":"Plus","deliveryMode":"hybrid","operationalConstraints":{"windows":"maintenance-only"}}
  },
  {
    "id":"SP-0112","name":"Resilienza operativa (Pro)","purpose":"Garantire backup/restore e preparazione incidenti","blocks":[{"blockId":"IB-0105","sequence":1},{"blockId":"IB-0112","sequence":2},{"blockId":"IB-0109","sequence":3}],
    "leadTimeDays":25,
    "x-pmi":{"tier":"Pro","deliveryMode":"hybrid","operationalConstraints":{"windows":"weekend"}}
  },
  {
    "id":"SP-0113","name":"Pilot Vulnerability Mgmt","purpose":"Patching prudente su una linea","blocks":[{"blockId":"IB-0110","sequence":1},{"blockId":"IB-0106","sequence":2}],
    "leadTimeDays":20,
    "x-pmi":{"tier":"Plus","deliveryMode":"remote-first","operationalConstraints":{"windows":"maintenance-only"}}
  }
]
```

---

## 15) KPI & metriche suggerite per PMI

```json
[
  {"id":"MT-0201","name":"Tempo a valore","type":"KPI","unit":"giorni","calculation":"giorni da kickoff a deliverable principale"},
  {"id":"MT-0202","name":"Copertura baseline","type":"KPI","unit":"%","calculation":"blocchi foundational completati / previsti"},
  {"id":"MT-0203","name":"Awareness completion","type":"KPI","unit":"%","calculation":"% personale target che completa i moduli"},
  {"id":"MT-0204","name":"Readiness incidenti","type":"KRI","unit":"livello 0-3","calculation":"maturità runbook ed esercitazioni"}
]
```

---

## 16) Processo "light" per PMI (90–180 giorni)

1. **Kickoff remoto (≤60 min)** + raccolta prerequisiti (inventario base, contatti, finestre).
2. **Discovery remota** (interviste, raccolta documenti) → avvio **Fast Start**.
3. **On-site mirato** (½–1 gg) per validare reti/asset e completare assessment.
4. **Quick wins** entro 30 giorni (accessi, backup, checklist essenziali).
5. **Formazione mirata** (microlearning + tabletop) e rilascio **runbook**.
6. **Follow-up** a 90g con misure KPI, CR per estensioni (altri siti/linee).

> Governance: approvazioni snelle (Owner Catalogo + Practice Lead); CR solo per cambi di scope/costi.

---

*Questo documento è un punto di partenza: gli schemi sono pensati per essere estesi/raffinati con i vostri vincoli e il vostro modello commerciale.*
