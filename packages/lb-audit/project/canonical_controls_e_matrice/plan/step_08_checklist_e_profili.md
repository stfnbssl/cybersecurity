# Capitolo 8 — Generazione **checklist** & **profili**

## 1. Obiettivo del capitolo

Definire **come** trasformare il catalogo di controlli approvati (Cap. 6–7) in:

* **Profili/Baseline** mirati (per ruolo, ambiente, SL 62443, contesto GDPR/CRA/NIS2).
* **Checklist di audit** operative, con domande, criteri di valutazione, evidenze attese, logica condizionale e punteggi.

---

## 2. Ingredienti in ingresso

* **Controlli canonici** + `applicability` (role/env/lifecycle/SL/conditions).
* **Regole di profilo** (JSON nel campo `profile.rules`).
* **Parametri** (da risolvere per il profilo: es. `log_retention_days`).
* **Mappature** (crosswalk) per la tracciabilità agli standard.
* **Template di domanda** per domini (AC, NW, PM, IR, …).

---

## 3. Modello di **Profilo** (baseline)

Un **profilo** è un insieme di controlli + valori parametrici + regole di inclusione/esclusione e priorità.

### 3.1. Struttura consigliata (`profile.rules`)

```json
{
  "scope": { "role":["AssetOwner"], "env":["OT"], "lifecycle":["Operation","Maintenance"] },
  "targets": { "sl": 2, "jurisdiction":"EU", "essential_service": true },
  "include_domains": ["NW","LM","IR","BC","PM","AC"],
  "exclude_controls": ["LB-PHYS-003"],
  "require_mappings": ["IEC 62443-3-3","NIS2","ISO/IEC 27001:2022"],
  "conditions": { "personal_data": true, "safety_critical": true },
  "compensations": {
    "legacy_os": ["NetworkIsolation","ApplicationAllowlisting","RemoteAccessBroker"]
  },
  "scoring": {
    "scheme":"weighted",
    "weights_by_domain":{"NW":1.2,"PM":1.3,"IR":1.2,"LM":1.1,"AC":1.0,"BC":1.0},
    "pass_threshold": 0.80,
    "partial_weight": 0.5,
    "na_policy":"exclude"
  },
  "language":"it"
}
```

### 3.2. Precedenze (risoluzione conflitti)

1. `exclude_controls` > qualunque inclusione.
2. `targets.sl` filtra `applicability.min_security_level`.
3. `conditions` (GDPR/safety) **aggiungono** controlli marcati pertinenti.
4. `require_mappings` preferisce controlli **con mappature** agli standard indicati.

---

## 4. Algoritmo di **compilazione** del profilo

1. **Seed**: prendi tutti i controlli con `applicability.role/env/lifecycle` che **intersecano** lo scope del profilo.
2. **Filtra per SL** (se impostato): `min_security_level ≤ target_sl`.
3. **Aggiungi overlay regolatori**: se `personal_data=true` ⇒ aggiungi controlli taggati GDPR; se `essential_service=true` ⇒ obblighi NIS2.
4. **Applica include/exclude** e domini richiesti.
5. **Risolvi parametri** (sezione 5).
6. **Genera checklist** da ciascun controllo (sezione 6).
7. **Pesa e calcola punteggi** secondo `scoring.scheme`.
8. **Emetti manifest** (sezione 10) con tracciabilità (crosswalk).

**SQL esempio (seed + SL + condizioni)**:

```sql
WITH base AS (
  SELECT c.id
  FROM control c
  JOIN applicability a ON a.control_id = c.id
  WHERE ARRAY['AssetOwner'] && a.role
    AND ARRAY['OT'] && a.env
    AND ARRAY['Operation','Maintenance'] && a.lifecycle
    AND (a.min_security_level IS NULL OR a.min_security_level <= 2)
),
overlays AS (
  SELECT c2.id
  FROM control c2
  JOIN applicability a2 ON a2.control_id = c2.id
  WHERE (a2.conditions->>'personal_data')::bool = true
     OR (a2.safety_relevance = true)
)
SELECT DISTINCT id FROM (
  SELECT * FROM base
  UNION ALL
  SELECT * FROM overlays
) t;
```

---

## 5. **Risoluzione parametri** (dal generico al concreto)

Regole **deterministiche** + facoltativo supporto LLM (Cap. 4 §D5).

### 5.1. Matrice di precedenza

1. **Policy Logbot** (default aziendale)
2. **Regolatorio** (es. retenzione min. per NIS2/GDPR)
3. **Contesto operativo** (criticality/legacy\_os/storage constraint)
4. **Preferenza cliente** (se ammessa)

### 5.2. Esempio di risoluzione

```json
{
  "log_retention_days": {
    "policy_default": 180,
    "regulatory_min": 90,
    "context": {"critical_process": true, "storage":"moderate"},
    "resolved": 180,
    "why": "≥90d per indagini NIS2; 180d compatibile con storage e rischio"
  },
  "mfa_required": { "resolved": true, "why": "SL2 OT remote admin" }
}
```

I valori risolti finiscono in `profile_control.param_values`.

---

## 6. **Generazione checklist** (domande & evidenze)

Ogni **controllo** produce **2–4 domande** massime, mirate e testabili.

### 6.1. Tipi di domanda

* `yes/no` (rapido gating)
* `evidence` (upload/link a artefatti)
* `text` (descrizione breve, max 500 char)
* `select` (lista di opzioni standardizzate)

### 6.2. Template per dominio (estratti)

La 62443-1-5 chiama **Areas of responsability** questi domini, vedi [grok](https://x.com/i/grok?conversation=1961263952589115408) e chiama **specific application domain** : discrete manufacturing, 
process industry, ecc...; la 62443 ha inoltre **intended operational environment** e **security context** of a product (component, system) or automation solution within that environment; e anche **particular type(s) of product(s)**.

* **AC (Access Control)**

  * Y/N: “Tutti gli accessi remoti amministrativi passano da un jump service gestito?”
  * Evidence: “Carica la policy MFA del broker” (`evidence_type`: `AccessGatewayConfig`, `IdPPolicy`)
* **NW (Network/Segmentation)**

  * Y/N: “Sono definiti flussi unidirezionali tra zone critiche?”
  * Evidence: “Esporta regole firewall/ACL” (`FirewallConfig`)
* **PM (Patch/Vulnerability OT)**

  * Select: “Frequenza finestra patch” (mensile/trimestrale/semestrale)
  * Text: “Descrivi compensazioni per asset non patchabili”
* **LM (Logging/Monitoring)**

  * Evidence: “Estratto SIEM/IDS per protocolli OT” (`SIEMReport`)
* **IR (Incident Response)**

  * Y/N: “Playbook include safe-state e escalation safety?”
  * Evidence: “Ultimo report post-incident (redacted)” (`IRReport`)
* **BC (Backup/Recovery)**

  * Evidence: “Log di test ripristino ultimi 6 mesi” (`RestoreTestLog`)

### 6.3. Logica condizionale

* Se `legacy_os=true` ⇒ aggiungi domanda su **allowlisting**/isolation.
* Se `personal_data=true` ⇒ aggiungi domanda DPIA/ROPA.
* Se `env` include `Cloud` ⇒ aggiungi ISO/IEC 27017 overlay (hardening tenant).

**Esempio (pseudoregole)**

```json
{
  "if": {"constraints":["legacy_os"]},
  "then_add_questions": ["AC-remote-allowlisting","NW-zdiode-or-proxy"]
}
```

### 6.4. Criteri di valutazione (per domanda)

* `Pass` / `Fail` / `Partial` / `N/A`
* `Partial` pesa **50%** (configurabile a livello profilo).
* `N/A` escluso dal denominatore (se `na_policy="exclude"`).

---

## 7. **Scoring** del profilo (punteggio complessivo)

Calcolo per **controllo**:

```
score_control = (Σ weight(answer_i)) / (max_score_domande)
```

Poi media pesata per **dominio** (pesi da `rules.scoring.weights_by_domain`), quindi punteggio profilo:

```
score_profile = Σ (score_domain * weight_domain) / Σ weight_domain
```

**Soglia di superamento**: `pass_threshold` (es. 0.80).
**Criticità**: alcune domande possono essere **“must-pass”** (gate duro): se `Fail` ⇒ profilo `Fail` a prescindere dal punteggio.

---

## 8. **Manifest di checklist** (pacchetto per l’audit)

Per ogni profilo rilasciato:

* **Intestazione**: nome profilo, versione, catalog release, data.
* **Scope**: ruoli, ambienti, SL, condizioni.
* **Sezioni** per dominio, con:

  * ID controllo (canonical\_id + rev)
  * Domande (ID domanda, tipo, testo, guida)
  * Evidenze attese (`evidence_type`, formato, fonte sistema)
  * Crosswalk (standard/clausole)
* **Criteri di scoring** e **must-pass**
* **Lingua** (`language`)
* **Firma** e checksum del pacchetto (come in Cap. 7)

---

## 9. **Evidenze**: catalogo & raccolta

Tabella `evidence_type` (Cap. 1) + mappatura **controllo→evidenze**.

**Esempio di lista richiesta**

```
- AccessGatewayConfig: export JSON del broker (ultimo 30gg)
- IdPPolicy: screenshot/policy MFA gruppo "OT-Admins"
- FirewallConfig: dump regole da zona OT a DMZ (firmato)
- SIEMReport: report rilevazioni Modbus/Profinet ultimi 90gg
- RestoreTestLog: esito test ripristino trimestrali
```

Ogni evidenza ha: **proprietario**, **scadenza**, **sensibilità** (low/med/high), e **verifica** (hash/file size/anteprima).

---

## 10. **Export** (formati)

* **CSV/XLSX** (operativi);
* **JSON** (API/automazioni);
* **OSCAL** (profile+assessment plan) — opzionale;
* **PDF** (pacchetto statico firmato per audit).

**Esempio intestazione CSV**

```
profile,control_id,rev,domain,question_id,question_text,answer_type,evidence_type,mandatory,must_pass
```

---

## 11. **Esempi di profilo** (estratti)

### 11.1. **OT Asset Owner — SL2 Ops (EU, essential service, GDPR)**

Regole chiave:

* Domini: NW, PM, LM, IR, BC, AC
* `targets.sl=2`, `personal_data=true`, `safety_critical=true`
* **Must-pass**: MFA su accessi remoti; backup offline testato; segmentazione per zone.

Domande esempio (IT):

1. **Y/N**: “Gli accessi remoti OT avvengono esclusivamente tramite jump service con MFA?” *(must-pass)*
2. **Evidence**: “Caricare export policy MFA del broker e report sessioni ultime 4 settimane.”
3. **Y/N**: “Esiste filtro deny-by-default tra Zone e DMZ con allowlisting protocolli OT?”
4. **Evidence**: “Dump regole firewall + diagramma flussi approvati.”
5. **Text**: “Descrivere compensazioni attive per asset non patchabili (legacy OS).”
6. **Evidence**: “Report SIEM/IDS OT ultimi 90 giorni.”
7. **Y/N**: “È stata eseguita DPIA per trattamenti OT con dati personali?” *(GDPR overlay)*

### 11.2. **Manufacturer — CRA/62443 SDLC**

Domini: **SDLC, Supply Chain, Vulnerability**, **IR (PSIRT)**.
Regole chiave: **SBOM**, **VEX**, **CVD/PSIRT**, **Secure boot**, **signed firmware**.

Domande esempio:

1. **Y/N**: “Il prodotto rilascia SBOM per ogni versione (formato SPDX/CycloneDX)?” *(must-pass)*
2. **Evidence**: “Allegare SBOM e policy generazione automatica pipeline CI.”
3. **Y/N**: “È implementato un processo CVD (coordinated vulnerability disclosure) pubblico?”
4. **Evidence**: “URL advisory + template VEX per CVE note.”
5. **Y/N**: “Il firmware è firmato e la chain of trust è verificata in boot?”
6. **Evidence**: “Output laboratorio validazione secure boot (report).”

---

## 12. UX operativa (piattaforma checklist)

* **Filtri per dominio** + **ricerca**.
* **Indicatori**: Pass/Partial/Fail/NA; badge **must-pass**.
* **Upload evidenze** con **validazioni** (tipo/size/hash) e **scadenze**.
* **Owners** per domanda (assegnazione, notifiche).
* **Commenti** con ReasonCode (Cap. 6 §10).
* **Preview punteggio** in tempo reale + **what-if** (simula NA/Partial).
* **Export** con un click (CSV/PDF/JSON).

---

## 13. QA e controlli di qualità

* **Coerenza linguistica**: lingua del profilo (`language`) applicata a tutte le domande.
* **No duplicati**: dedupe delle domande per controllo.
* **Copertura mappature**: ≥ 1 `control_mapping` per controllo incluso.
* **Evidenze**: almeno 1 `evidence` per controlli `technical` critici.
* **Simmetria scoring**: nessun dominio con peso totale 0.

---

## 14. Definition of Done (DoD) — profilo & checklist

* ✅ Controlli selezionati secondo regole, con `param_values` risolti.
* ✅ Domande generate (≤4 per controllo) con **evidenze** e **must-pass** dove richiesto.
* ✅ Scoring configurato (pesi, soglia, NA policy).
* ✅ Manifest generato (crosswalk, versioni, checksum).
* ✅ Export validi (CSV/JSON/OSCAL opz.).
* ✅ Approvazione Owner del Profilo + pubblicazione (Cap. 7).

---

## 15. Pseudocodice end-to-end

```python
def build_profile(profile_id):
    prof = load_profile(profile_id)
    controls = select_controls(prof.rules)               # §4
    resolved = resolve_params(controls, prof.rules)      # §5
    checklist = []
    for c in controls:
        qs = generate_questions(c, prof.rules.language, context=prof.rules)  # §6
        qs = apply_conditionals(qs, context=prof.rules)                      # §6.3
        checklist.extend(qs)
    scoring = build_scoring(prof.rules.scoring)          # §7
    manifest = assemble_manifest(prof, controls, checklist, resolved)  # §8/10
    validate_manifest(manifest)                          # §13
    return manifest
```

---

## 16. Tabelle/estensioni utili (DB)

```sql
-- Lingua e must-pass a livello di domanda
ALTER TABLE checklist_item ADD COLUMN language TEXT DEFAULT 'it';
ALTER TABLE checklist_item ADD COLUMN must_pass BOOLEAN DEFAULT false;

-- Pesi per dominio nel profilo
ALTER TABLE profile ADD COLUMN scoring JSONB DEFAULT '{}'::jsonb;

-- Associazione domanda→evidenze suggerite
CREATE TABLE checklist_evidence (
  checklist_item_id INT REFERENCES checklist_item(id) ON DELETE CASCADE,
  evidence_type_id INT REFERENCES evidence_type(id),
  PRIMARY KEY (checklist_item_id, evidence_type_id)
);
```

---

## 17. Output del capitolo

Hai un metodo **ripetibile** per:

* costruire **profili** tailor-made (OT/IT, SL, overlay regolatori),
* generare **checklist** brevi, testabili e pesate,
* collegare **evidenze** e **crosswalk** per audit,
* confezionare **manifest** ed export pronti per la pubblicazione (Cap. 7).

> Prossimo (facoltativo): **Capitolo 9 — Metriche & miglioramento continuo**, con dashboard, KPI e cicli di raffinamento su profili e checklist in produzione.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking
