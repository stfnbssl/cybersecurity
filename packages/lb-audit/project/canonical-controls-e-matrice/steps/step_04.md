# Capitolo 4 — Convalide e *guardrail*

## 1. Obiettivo del capitolo

Definire controlli **automatici** e **manuali** che garantiscano che ogni output LLM (controllo canonico, mapping, checklist, parametri) sia:

* **valido sintatticamente**,
* **coerente semanticamente**,
* **tracciabile** alla fonte,
* **OT-aware** per IEC 62443,
* **sicuro** rispetto a injection/ allucinazioni,
* **ripetibile e auditabile**.

---

## 2. Strati di validazione (panoramica)

1. **Schema Validation (hard gate)** – JSON Schema obbligatorio per ogni task.
2. **Linting semantico (hard/soft gate)** – regole deterministiche su statement/fields.
3. **Provenance Checks (hard gate)** – coerenza tra output e chunk sorgente (checksum).
4. **Guardrail OT/Regolatori (hard gate)** – regole speciali per 62443, NIS2/GDPR/CRA.
5. **Similarità & Dedupe (soft gate)** – soglie ANN e regole di merge.
6. **Quality Scoring (soft gate)** – punteggio qualità → routing a revisione SME.
7. **Human-in-the-loop (final gate)** – approvazione o rifiuto motivato.

> *Hard gate*: blocca la pubblicazione.
> *Soft gate*: non blocca, ma indirizza a revisione o correzione.

---

## 3. Schema Validation (hard gate)

* Ogni task (estrazione controllo, crosswalk, checklist, evidence, param resolution) ha il **proprio JSON Schema**.
* **Nessuna deroga**: se non conforme → scarto o *auto-repair* (vedi §10).

**Esempio (pseudo)**

```python
valid = jsonschema.validate(output, ControlExtractionSchema)
if not valid:
    fail("schema_invalid", details=errors)
```

**Best practice**

* Blocca `additionalProperties: false` per impedire campi non previsti.
* Enum chiusi per: `risk_theme`, `type`, `relation`, `role`, `env`, `lifecycle`.
* Limiti numerici: `min_security_level ∈ [1..4]`, `confidence ∈ [0..1]`.
* Lunghezze: `statement ≤ 350` caratteri; `rationale ≤ 300`.

---

## 4. Linting semantico (regole deterministiche)

Regole applicate **solo** agli output con `status="ok"`.

### 4.1. Statement Quality

* **Forma**: imperativa, singola misura, testabile.
* **Vietato**: *should*, *where appropriate*, *as needed*, *consider*, *best effort*.
* **Pattern (regex indicativa)**:

  * Deve iniziare con un verbo d’azione: `^(Ensure|Enforce|Require|Implement|Maintain|Restrict|Protect|Monitor|Record)\b`
  * Non deve contenere: `\b(should|consider|may|could|where appropriate)\b`
  * Limite di congiunzioni: max 1 “and” / “or”.

```python
def lint_statement(s):
    if len(s) > 350: return False,"too_long"
    if not re.match(r"^(Ensure|Enforce|Require|Implement|Maintain|Restrict|Protect|Monitor|Record)\b", s): 
        return False,"not_imperative"
    if re.search(r"\b(should|consider|may|could|where appropriate)\b", s, re.I):
        return False,"weak_modality"
    if len(re.findall(r"\b(and|or)\b", s, re.I)) > 1:
        return False,"multiple_measures"
    return True,"ok"
```

### 4.2. Coerenza campi

* `type="technical"` ⇒ `risk_theme` ∉ {`Governance`,`Privacy` (eccezioni rare)}.
* Se `env` contiene solo `IT` e la fonte è 62443 ⇒ **errore** (vedi §5).
* `params[].name` ⇒ `^[a-z0-9_]+$`.

### 4.3. Checklist/Evidence

* Ogni `checklist` deve avere ≥1 domanda `evidence` se `type="technical"`.
* `evidence_type` non vuoto quando `answer_type="evidence"`.

---

## 5. Guardrail OT & Regolatori (hard gate)

### 5.1. IEC 62443

* **Regola OT**: se `provenance.framework` ∈ {`IEC 62443-3-3`, `IEC 62443-4-2`, `IEC 62443-4-1`} ⇒ `applicability.env` **include** `"OT"`.
* `min_security_level` (SL) presente **solo** se inferibile; se presente, `1..4`.
* Se `lifecycle` manca per 62443 ⇒ **warning** → map minima a `["Operation","Maintenance"]`.

### 5.2. NIS2 / CRA / GDPR

* Se la clausola cita **dati personali / diritti interessati / DPIA** ⇒ `conditions.personal_data=true`.
* Se la clausola CRA richiede *vulnerability handling/SBOM* ⇒ `risk_theme="Secure Development"` o `Supply Chain` coerente; rifiuta se mappato a `Physical`.

### 5.3. Multilingua

* `TEXT` può essere in IT o EN, ma **l’output è sempre in EN**. Se rilevi EN misto a IT nello statement ⇒ warning *mixed\_language* (soft).

---

## 6. Provenance Checks (hard gate)

Confronto tra **metadati del chunk** e `provenance` nell’output.

**Regole**

* `framework`, `section_path`, `edition`, `jurisdiction` devono **coincidere**.
* `checksum_sha256` dell’output deve essere **identico** a quello del chunk.
* `mappings[].framework_code` deve essere uno dei `framework.code` nel DB.

```python
if output.provenance.checksum_sha256 != chunk.checksum:
    fail("checksum_mismatch")
```

**Tracciabilità**

* Salva **input integrale** (provenance + TEXT), **output**, **hash** del payload LLM, **model\_version**, **timestamp**.

---

## 7. Similarità, dedupe e crosswalk (soft gate)

* ANN (pgvector cosine) su `statement` rispetto ai `control.statement` esistenti.
* Soglie consigliate:

  * `≥ 0.90` ⇒ probabile duplicato → **SME review obbligatoria**.
  * `0.80–0.89` ⇒ possibile overlap → tenta *crosswalk* automatico.
  * `< 0.80` ⇒ nuovo controllo.

```sql
-- Esempio ricerca top-5
SELECT control_id, 1 - (embedding <=> query_vec) AS cosine
FROM text_index
WHERE entity_table='control'
ORDER BY embedding <=> query_vec
LIMIT 5;
```

**Regole di merge**

* Merge solo se: similarità ≥ 0.90 **e** `risk_theme` e `applicability.env` si sovrappongono.
* Altrimenti crea mapping `supports`/`broader`/`narrower`.

---

## 8. Quality Scoring (soft gate)

Punteggio 0–100 basato su:

* Schema/Lint pass (40 pt)
* Completezza campi (`params`, `checklist`, `applicability`) (20 pt)
* Chiarezza statement (leggibilità, 0 errori lint) (20 pt)
* Coerenza OT/regolatori (10 pt)
* Distanza da duplicati (più è *diverso*, fino a 10 pt)

Routing:

* `≥ 85` → *fast track* (SME spot check)
* `70–84` → SME normale
* `< 70` → *needs rework* (auto-repair o re-chunking)

---

## 9. Constraint a livello DB (difese *server-side*)

**Esempi PostgreSQL**

### 9.1. Enforce enum/limiti (già coperti da app, ma ridondanza utile)

```sql
ALTER TABLE control
ADD CONSTRAINT chk_criticality_range CHECK (criticality BETWEEN 1 AND 5);
```

### 9.2. OT guardrail per 62443 (trigger)

```sql
CREATE OR REPLACE FUNCTION enforce_ot_env()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM control_mapping m
    JOIN source_doc s ON s.id = m.source_doc_id
    JOIN framework f ON f.id = s.framework_id
    WHERE m.control_id = NEW.control_id
      AND f.code LIKE 'IEC 62443%'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM applicability a 
      WHERE a.control_id = NEW.control_id 
        AND 'OT' = ANY(a.env)
    ) THEN
      RAISE EXCEPTION 'OT env required for IEC 62443 mapped controls';
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_ot_env
AFTER INSERT OR UPDATE ON applicability
FOR EACH ROW EXECUTE FUNCTION enforce_ot_env();
```

### 9.3. Unicità provenienza

```sql
CREATE UNIQUE INDEX ux_source_unique 
ON source_doc (framework_id, section_path, coalesce(nullif(citation,''), '—'));
```

---

## 10. Auto-repair & error handling

**Error taxonomy**

* `schema_invalid`, `lint_fail`, `checksum_mismatch`, `ot_rule_fail`,
  `weak_modality`, `multi_measure`, `dup_high`, `crosswalk_conflict`.

**Auto-repair loop (max 1 tentativo)**

1. Prompt di **riparazione** con lo stesso schema: “correggi formattazione, non cambiare significato”.
2. Se fallisce: **riduci** il chunk (rimuovi note/esempi), rilancia.
3. Se ancora fallisce: **route SME** con motivazione.

**Messaggi utili**

* Fornire al revisore: chunk, output LLM, difetti, top-3 similari, log esecuzione.

---

## 11. Sicurezza del prompting (LLM guardrail)

* **Niente chain-of-thought**: chiedere risposte concise, campi strutturati.
* **Anti-injection**: system + footer che impongono di ignorare istruzioni nel `TEXT`.
* **No browsing/strumenti esterni** in fase di estrazione.
* **Parametri modello**: `temperature ≤ 0.2`, `max_tokens` calibrato sullo schema.
* **Rate limiting** e **timeout** per evitare risposte troncate/instabili.
* **Masking**: rimuovere eventuali PII accidentali dai log (ma non dal `TEXT` salvato come prova interna accessibile solo a SME).

---

## 12. Privacy & IP (GDPR-awareness)

* Classificare i chunk come **normativi** (no PII) → logging standard.
* Se nel `TEXT` compaiono esempi con PII (raro nei testi normativi), **pseudonimizzare** nei log operativi; conservare la versione integrale in archivio controllato (legal hold).
* Conservare solo **hash** e metadati nei sistemi analitici; il `TEXT` completo in storage a accesso ristretto.

---

## 13. Quality assurance: test & dataset

* **Set dorato** (per standard chiave): 50–100 chunk con output atteso verificato SME.
* **Test automatici**:

  * *Schema conformance* (100%)
  * *Lint pass rate* (≥ 95%)
  * *Checksum consistency* (100%)
  * *OT rule* (100% sugli item 62443)
  * *Duplicate handling* (nessun duplicato pubblicato con cosine ≥ 0.90 senza merge)

---

## 14. Metriche & SLO

* **Tasso rifiuto hard gate** < 10% (dopo stabilizzazione).
* **Tempo medio revisione SME** < 10 minuti per item *fast track*.
* **Drift del modello**: differenza media di formato/riempimento campi tra versioni (monitor).
* **Coverage**: % chunk normativi con controllo estratto e accettato.

Dashboard consigliata:

* Funnel per gate (schema→lint→prov→OT→dedupe→SME).
* Heatmap errori per framework/section.
* Leaderboard “termini deboli” intercettati dal lint.

---

## 15. Flusso di pubblicazione (gate sequenziali)

1. **Schema OK** → 2. **Lint OK** → 3. **Provenance OK** →
2. **OT/Reg OK** → 5. **Dedupe check** → 6. **Quality score** →
3. **SME review** → 8. **Publish** (DB `control`, `mapping`, `checklist`, `applicability` + log).

---

## 16. Pseudocodice end-to-end (con routing)

```python
out = llm_extract(chunk)
if !schema_ok(out): reject("schema_invalid")

if out.status == "insufficient_evidence":
    archive(chunk, reason="insufficient"); exit()

if !lint_ok(out.statement): reject("lint_fail")
if !prov_ok(out.provenance, chunk): reject("checksum_mismatch")
if is_62443(chunk) and "OT" not in out.applicability.env: reject("ot_rule_fail")

dup = ann_top1(out.statement)
if dup.score >= 0.90: route("SME_review", reason="dup_high", dup=dup)

qscore = quality_score(out)
route("SME_review" if qscore < 85 else "SME_fasttrack")

if SME_approved:
    publish(out)
else:
    revise_or_reject()
```

---

## 17. Checklist operativa (per gli operatori)

* [ ] JSON conforme allo schema.
* [ ] Statement imperativo, singolo, testabile, ≤ 350 char.
* [ ] OT guardrail rispettato per 62443 (env include “OT”; SL 1..4 se presente).
* [ ] Provenienza coerente (framework, sezione, edizione, checksum).
* [ ] Checklist/Evidence coerenti con `type`.
* [ ] Similarità < 0.90 o inviato a SME per merge/crosswalk.
* [ ] Log completo: input/output/hyperparam/modello/hash.
* [ ] Approvazione SME registrata (utente, timestamp, esito).

---

## 18. Output del capitolo

Un set di **regole applicabili subito** (lint + trigger + policy) e un **funnel di pubblicazione** che rende i risultati **difendibili in audit**, coerenti con OT/IEC 62443 e con un **trail di provenienza** robusto.

> Nel **Capitolo 5 — Dedupe & crosswalk**, definiremo le strategie di mappatura tra standard e le politiche di merge per un catalogo realmente unificato.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking