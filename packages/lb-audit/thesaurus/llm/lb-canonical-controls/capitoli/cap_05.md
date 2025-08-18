# Capitolo 5 — Dedupe & *crosswalk*

## 1. Obiettivo del capitolo

Stabilire come:

1. **individuare e gestire duplicati/sovrapposizioni** tra controlli canonici (dedupe),
2. **mappare** (crosswalk) clausole/controlli di standard diversi verso il **catalogo canonico**,
   con regole ripetibili, tracciabili e *OT-aware*.

---

## 2. Modello di relazione (ripasso operativo)

Relazioni ammesse in `control_mapping.relation`:

* **equivalent** – stesso scopo e forza prescrittiva; ambito sovrapponibile.
* **broader** – la fonte copre un’area più ampia del controllo canonico.
* **narrower** – la fonte è più specifica/restringente (o copre un sotto-caso).
* **supports** – misura abilitante o pratica di supporto, non sufficiente da sola.

> Regola d’oro: privilegia **equivalent** solo quando *scope, enforceability e oggetto* coincidono chiaramente.

---

## 3. Dedupe (rilevare e consolidare duplicati)

### 3.1. Pre-filtri (veloci)

Prima di calcolare similarità semantica, riduci il candidato set:

* **risk\_theme** uguale.
* **type** uguale (process vs technical).
* **env/role** con **overlap** (almeno un elemento in comune).
* **lunghezza** statement ±30% (per evitare macro/micro statement fuori scala).

### 3.2. Similarità ibrida (score composito)

Calcola uno **score S (0..1)** combinando:

* **Cosine embedding** su `control.statement` (pgvector) → `sim_vec`.
* **BM25**/TF-IDF su *bigrammi/verbi prescrittivi* → `sim_lex`.
* **Jaccard** su **keyphrase** (es. “MFA”, “jump host”, “session recording”) → `sim_key`.
* **Penalty** da **mismatch** di scoping → `pen_scope` ∈ \[0, 0.2].

Formula consigliata (iniziale):

```
S = 0.55*sim_vec + 0.30*sim_lex + 0.15*sim_key - pen_scope
```

Soglie operative:

* `S ≥ 0.90` ⇒ **dup\_high**: probabile duplicato → merge o riscrittura.
* `0.80 ≤ S < 0.90` ⇒ **overlap**: candidare a crosswalk (*broader/narrower/supports*).
* `S < 0.80` ⇒ generalmente **nuovo** controllo.

### 3.3. Penalità di scoping (esempi)

* `OT` mancante in uno dei due quando l’altro è `OT`-only → `pen_scope = 0.10`.
* `role` disgiunti (es. solo Manufacturer vs solo AssetOwner) → `0.05`.
* `lifecycle` senza overlap → `0.05`.

### 3.4. Flusso dedupe

1. Pre-filtri → 2) Calcolo score → 3) Se `dup_high`, **unisci**:

   * scegli **statement** più **chiaro e testabile**;
   * **unisci** `applicability` (unione insiemi) e **parametri** (superset, con note);
   * **reindirizza** tutte le `control_mapping` al **canone scelto**;
   * mantieni il controllo scartato come **alias storico** (soft-delete + redirect).

**Query esempio (top-5 simili)**

```sql
-- q_vec è l'embedding dello statement candidato
SELECT c.id, c.canonical_id, 
       1 - (ti.embedding <=> :q_vec) AS sim_vec
FROM text_index ti
JOIN control c ON c.id = ti.entity_id
WHERE ti.entity_table='control'
  AND c.risk_theme = :risk_theme
ORDER BY ti.embedding <=> :q_vec
LIMIT 5;
```

---

## 4. Crosswalk (mappare le fonti al catalogo)

### 4.1. Generazione candidati (retrieval a due stadi)

1. **Lexical recall (BM25)** su `control.statement` + sinonimi (thesaurus interno).
2. **Re-ranking semantico** con **embedding cosine** tra:

   * **A**: testo **della fonte** (`source_doc.text_md`),
   * **B**: `control.statement`.
     Conserva i **top-k** (es. 20).

> Suggerimento: indicizza anche `source_doc` in `text_index` per poter fare A↔B.

### 4.2. Regressione regole → relazione

Applica regole deterministiche per proporre **relation preliminare**:

* Se `sim_vec ≥ 0.88` **e** contengono gli stessi **verbi di enforcement** (Require/Enforce/Implement) **e** *scope match* ⇒ `equivalent`.
* Se fonte cita **principio generale** (es. “strong authentication”) e canonico **specifica MFA** ⇒ `broader`.
* Se fonte è **più stringente** (es. “MFA + session recording obbligatoria”) ⇒ `narrower`.
* Se fonte è **procedurale** (es. policy, awareness) su un controllo tecnico ⇒ `supports`.

### 4.3. *LLM adjudication* (ultima passata)

Per i **top-m** (es. 5) invoca il prompt “Crosswalk” (Cap. 4, §D2) per classificare la relazione e stimare `confidence`.

* Vincola l’LLM con: **testo esatto** della fonte + **statement canonico**;
* Output **solo JSON** (Crosswalk.schema);
* **No chain-of-thought**.

### 4.4. Composizione 1\:N e N:1

* Una **fonte** può mappare a **più controlli** (es. “remote access” + “logging”) → crea **più righe** in `control_mapping`.
* **Più fonti** possono mappare allo **stesso controllo** (tipico) → mantieni **tutte** le righe per tracciabilità.
* Per indicare che **più clausole di una stessa sezione** coprono un unico requisito, aggiungi (facoltativo) un campo `bundle_id` in `control_mapping` per **gruppare** i mapping omogenei di una stessa *fonte logica*.

```sql
ALTER TABLE control_mapping ADD COLUMN bundle_id UUID;
```

---

## 5. Politiche decisionali (matrix pratica)

| Situazione    | Indizio                                                 | Azione                        |
| ------------- | ------------------------------------------------------- | ----------------------------- |
| **Duplicato** | `S ≥ 0.90`, verbi e oggetto coincidenti                 | **Merge** nel canone migliore |
| **Broader**   | Fonte parla di “strong auth”; canonico richiede **MFA** | `relation="broader"`          |
| **Narrower**  | Fonte impone **registrazione sessione** oltre MFA       | `relation="narrower"`         |
| **Supports**  | Fonte prescrive **policy/awareness** sul tema tecnico   | `relation="supports"`         |
| **Conflitto** | Verbi divergenti (recommend vs require)                 | scala a **SME**               |

> In caso di dubbi, preferisci **supports** a “equivalent” (conservativo).

---

## 6. Scoring & confidenza (per routing)

Combina feature **non-LLM** e la `confidence` dell’LLM in un **final score**:

```
final = 0.5*S (ibrido) + 0.5*confidence_llm
```

Routing:

* `final ≥ 0.80` ⇒ **auto-approve** con *SME spot-check*.
* `0.65–0.79` ⇒ **SME review**.
* `< 0.65` ⇒ **needs rework** (rivedi chunk o canone).

> Calibra `confidence_llm` con un set dorato (isotonic regression o Platt scaling) per affidabilità.

---

## 7. Esempi concreti (schematici)

### 7.1. Accesso remoto OT (MFA su jump host)

* **Canonico**: “Require MFA via managed jump service for OT remote admin.”
* **Fonte A (OT)**: clausola che impone autenticazione forte per accessi remoti → `broader`.
* **Fonte B (IT/Cloud)**: controllo 27002 su gestione credenziali/mfa generica → `supports` (ambito diverso).
* **Fonte C (linea guida)**: raccomanda session recording → `narrower` rispetto al canonico solo MFA.

### 7.2. Patch & compensazioni in OT

* **Canonico**: “Maintain validated patch process or compensating controls when patching infeasible in OT.”
* **Fonte**: 62443 richiede gestione delle vulnerabilità al livello di sistema → `equivalent` o `broader` a seconda del testo; se cita esplicitamente **compensazioni** in ambienti con downtime limitato → `equivalent`.

---

## 8. Estensioni di schema (opzionali ma utili)

### 8.1. Rafforzare `control_mapping`

```sql
ALTER TABLE control_mapping
  ADD COLUMN confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1),
  ADD COLUMN scorer TEXT,                   -- "hybrid_v1", "llm_adjudication"
  ADD COLUMN bundle_id UUID,                -- vedi §4.4
  ADD COLUMN created_by TEXT,               -- "pipeline" | "SME"
  ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
```

### 8.2. Indice di similarità persistito

Salva `S` nel momento del mapping per **audit & drift**:

```sql
ALTER TABLE control_mapping ADD COLUMN sim_score NUMERIC;
```

---

## 9. UI di revisione (triage SME)

**Colonne consigliate**:

* Fonte (framework, sezione), snippet → **Open in source**
* Canonico candidato (id, statement)
* `relation` proposta + **final score** (badge colore)
* Evidenze pro/contro (parole chiave coincidenti, mismatch scoping)
* Pulsanti: *Approve*, *Edit relation*, *Change canonical*, *Split (crea bundle)*
* **Diff semantico** evidenziando parti sovrapponibili (MFA, jump host, recording)

**Azioni bulk**: approvare tutti i `supports` con `final ≥ 0.85`.

---

## 10. Versioning & cambi edizione

* Nuova edizione **sorgente** ⇒ crea **nuovi `source_doc`**, conserva i vecchi (audit).
* Rilancia **crosswalk differenziale**: per ogni `section_path` nuovo, cerca il **miglior canone**; per quelli con `checksum` invariato, **riusa** mapping (propaga `bundle_id`).
* Traccia `supersedes` tra edizioni per ricostruire lo storico.

---

## 11. Pseudocodice (pipeline completa)

```python
def crosswalk_pipeline(source_doc_id):
    # 1) Retrieval candidati
    cand = lexical_bm25(source_doc_id, top=200)
    cand = rerank_semantic(source_doc_id, cand, top=20)

    results = []
    for ctrl in cand:
        S = hybrid_score(source_doc_id, ctrl) - scope_penalty(source_doc_id, ctrl)
        relation = rule_based_relation(source_doc_id, ctrl, S)
        if needs_llm(relation, S):
            rel_llm, conf_llm = llm_adjudicate(source_doc_id, ctrl)
        else:
            rel_llm, conf_llm = relation, 0.6

        final = 0.5*S + 0.5*conf_llm
        results.append((ctrl, rel_llm, S, conf_llm, final))

    # 2) Routing
    for r in top_by_final(results, k=5):
        if r.final >= 0.80:
            persist_mapping(r, created_by="pipeline")
        elif r.final >= 0.65:
            queue_for_sme(r)
        else:
            log_low_confidence(r)
```

---

## 12. Metriche & SLO (per miglioramento continuo)

* **Precisione relation** su set dorato (target ≥ 0.85 macro-F1).
* **Tasso merge dedupe corretto** (verificato SME) ≥ 0.95.
* **Copertura crosswalk**: % fonti mappate ad almeno un canone (≥ 90% su standard principali).
* **Tempo medio triage** SME < 5 min/item per `final ≥ 0.80`.
* **Drift**: variazione media `sim_score` nel tempo (se sale, sinonimi/lessico cambiano: ri-indicizza).

---

## 13. Checklist operativa

* [ ] Pre-filtri applicati (risk\_theme/type/env/role).
* [ ] Similarità ibrida calcolata e soglia decisione applicata.
* [ ] Relazione proposta da regole + (se necessario) LLM adjudication.
* [ ] `control_mapping` salvato con `confidence`, `sim_score`, `scorer`.
* [ ] Duplicati consolidati (redirect mapping, alias storico).
* [ ] Triage SME eseguito per casi < 0.80.
* [ ] Log completo e tracciabilità garantiti.

---

## 14. Output del capitolo

Un metodo **deterministico + assistito da LLM** per:

* eliminare duplicati nel catalogo,
* costruire **crosswalk** robusti, spiegabili e auditabili tra standard,
  mantenendo la **specificità OT** e la coerenza con il modello dati di Capitolo 1.

> Prossimo: **Capitolo 6 — Revisione SME**, dove definiamo criteri, UI e linee guida perché gli esperti approvino/raffinino i mapping e i merge con minima frizione.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking