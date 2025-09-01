# Capitolo 7 — Pubblicazione & versioning

## 1. Obiettivo del capitolo

Definire **come** promuovere gli output approvati (Cap. 6) in **rilasci ufficiali** del catalogo, garantendo:

* **immutabilità e tracciabilità** (snapshot riproducibile),
* **versionamento chiaro** (MAJOR.MINOR.PATCH),
* **compatibilità** con profili/baseline e checklist,
* **rollback sicuri** e **migrazioni** quando cambiano edizioni degli standard.

---

## 2. Principi guida

1. **Immutabilità dei rilasci**: ogni release è uno snapshot firmato; mai riscrivere.
2. **Stabilità degli ID**: `canonical_id` non cambia; se serve rinominare, usare `alias`.
3. **Separazione “contenuto vs selezione”**: i **controlli** hanno revisioni; i **profili** puntano a revisioni **pinnate**.
4. **Chiarezza degli impatti**: ogni modifica classifica l’impatto (breaking, non-breaking, metadata-only).
5. **Riproducibilità**: ogni release ha manifest con **checksum** e **hash del codice pipeline**.

---

## 3. Modello dati per il versioning (estensioni operative)

### 3.1. Revisioni dei controlli

```sql
-- Storico immutabile
CREATE TABLE control_revision (
  id BIGSERIAL PRIMARY KEY,
  control_id INT NOT NULL,              -- fk al "control" logico
  rev INT NOT NULL,                     -- 1..n
  objective TEXT NOT NULL,
  statement TEXT NOT NULL,
  risk_theme TEXT NOT NULL,
  params JSONB NOT NULL,
  applicability JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL,             -- "pipeline" | "sme:<user>"
  parent_rev INT,                       -- rev precedente
  change_type TEXT CHECK (change_type IN ('breaking','non_breaking','metadata')),
  notes TEXT
);
CREATE UNIQUE INDEX ux_control_rev ON control_revision(control_id, rev);

-- Puntatore "current" (scrivibile solo in branch non di produzione)
ALTER TABLE control ADD COLUMN current_rev INT;
```

### 3.2. Alias e merge

```sql
ALTER TABLE control ADD COLUMN alias_of INT;  -- per merge dedupe
-- se alias_of non null, il controllo reindirizza a quello vincente
```

### 3.3. Snapshot di release

```sql
CREATE TABLE catalog_release (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,                 -- e.g., "1.4.0"
  channel TEXT NOT NULL CHECK (channel IN ('dev','staging','prod')),
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  code_hash TEXT,                        -- git commit della pipeline
  data_hash TEXT                         -- hash globale del manifest
);

CREATE TABLE release_control (
  release_id UUID REFERENCES catalog_release(id) ON DELETE CASCADE,
  control_id INT NOT NULL,
  rev INT NOT NULL,                      -- rev inclusa nel rilascio
  PRIMARY KEY (release_id, control_id)
);

CREATE TABLE release_profile (
  release_id UUID REFERENCES catalog_release(id) ON DELETE CASCADE,
  profile_id INT NOT NULL,
  version TEXT NOT NULL,                 -- versione profilo
  PRIMARY KEY (release_id, profile_id)
);
```

> **Nota**: `source_doc`, `control_mapping`, `checklist_item` possono avere tabelle *\_revision analoghe* o essere “pinnate” nel manifest con i loro ID/versioni.

---

## 4. Semantica delle versioni (MAJOR.MINOR.PATCH)

* **PATCH**: correzioni **metadata-only** (typo, note, evidence type, checklist wording) che **non cambiano** intent o verifica.
* **MINOR**: modifica **non-breaking** al contenuto (statement più chiaro ma equivalente; aggiunta di parametri opzionali; ampliamento `applicability` senza restringere).
* **MAJOR**: modifica **breaking** (statement restrittivo/differente; rimozione requisito; cambi scoping che invalidano vecchie evidenze).

**Regole di bump**

* Se almeno un controllo ha `change_type='breaking'` → **MAJOR**.
* Altrimenti se esistono `non_breaking` → **MINOR**.
* Solo `metadata` → **PATCH**.

---

## 5. Branching e promozione (dev → staging → prod)

1. **dev**: integrazione continua degli item approvati SME; `current_rev` aggiornati.
2. **staging**: **freeze** dei set candidati a release; esecuzione **test di regressione** (Cap. 4 §13).
3. **prod**: pubblicazione del **catalog\_release** con *manifest firmato*.

**Gate di promozione a staging**

* 100% hard gate pass (Schema/Lint/Provenance/OT).
* Nessun duplicato non risolto.
* Crosswalk coverage ≥ soglia (es. 90%) sugli standard target del ciclo.

---

## 6. Manifest di release (esempio)

```yaml
catalog_release:
  version: "1.4.0"
  channel: "prod"
  created_at: "2025-08-18T10:00:00Z"
  code_hash: "git:3f1c9a7"
  data_hash: "sha256:5c2a..."
  frameworks:
    - code: "IEC 62443-3-3"   # edizioni presenti
      edition: "2013"
    - code: "ISO/IEC 27002"
      edition: "2022"
  stats:
    controls: 182
    mappings: 611
    checklists: 540
  controls:
    - canonical_id: "LB-AC-001"
      rev: 3
      change_type: "non_breaking"
      source_docs: ["sdoc:62443-3-3:SR 1.1#e3b0c4", "sdoc:27002:A.5.15#1a79a4"]
    - canonical_id: "LB-NW-004"
      rev: 1
      change_type: "metadata"
  profiles:
    - name: "OT Asset Owner — SL2 Ops"
      version: "1.2.0"
      pinned_controls:
        - { canonical_id: "LB-AC-001", rev: 3, param_values: {"mfa_required": true} }
        - { canonical_id: "LB-NW-004", rev: 1 }
  signatures:
    - signer: "Logbot Release Key"
      alg: "ed25519"
      sig: "base64:MEUCIF..."
```

---

## 7. Pubblicazione dei profili/baseline

* Ogni **profilo** ha **propria versione** (MAJOR.MINOR.PATCH) indipendente dal catalogo.
* I profili **pinnano** i controlli a **revisioni specifiche** (no “latest”).
* Ogni cambio di **param\_values** che altera verifiche ⇒ almeno **MINOR** del profilo.
* **Compatibilità**: il manifest del profilo include una **compatibility matrix** con il catalogo (es. “compatibile con catalogo ≥ 1.3.0, < 2.0.0”).

---

## 8. Deprecation policy

* **Soft-deprecate** un controllo (campo `deprecated_at`, `deprecation_note`) in **dev/staging**; annunciare nel **CHANGELOG**.
* In **MAJOR+1** rimuovere dal profilo predefinito; mantenere comunque lo storico e l’alias.
* Finestra minima di **12 mesi** per deprecazioni che impattano checklist operative.

---

## 9. Gestione alias, supersessioni e cambi edizione degli standard

* **alias\_of**: dopo un merge dedupe, il perdente resta indirizzabile; tutti i vecchi riferimenti (mappings/evidenze) restano validi.
* **supersedes (framework)**: quando esce una nuova edizione (es. ISO 27002:2022), i `source_doc` nuovi puntano `supersedes=old_source_id`; i crosswalk vengono **riconciliati** nella nuova release.
* **Migrazioni assistite**: generare report “old↔new” per SME con proposte auto (Cap. 5).

---

## 10. Integrazione con checklist ed evidenze

* Le **checklist** hanno anch’esse revisioni (minimo: PATCH quando si migliora wording).
* In release, ogni `checklist_item` incluso porta `control_id`, `rev` e **tipo di evidenza** pin.
* Regola: cambio **breaking** del controllo ⇒ bump **MINOR** delle checklist collegate; se la domanda non è più valida, **replace** con nuova e marcare la vecchia `deprecated_at`.

---

## 11. API e distribuzione

* **REST/GraphQL versionate**: `/v1/controls?release=1.4.0`, header `Accept-Version: 1`.
* **Export OSCAL**: generare pacchetti `profile.json`/`catalog.json` **pinnati** alla release.
* **Pacchetti firmati** (zip): includono manifest, JSON, CSV di comodo, e `SBOM` della pipeline (transparenza supply-chain).

---

## 12. Rollback & roll-forward

**Rollback** (entro stesso major):

1. Severità alta post-release? Pubblica **1.4.1** (PATCH) che ripristina le `rev` precedenti problematiche **o** reimmetti **1.4.0** come release **“current”** (flag).
2. Checklist/Profili: restano validi perché **pinnati**.

**Roll-forward**:

* Preferibile a rollback quando il difetto è nel contenuto: correggi e rilascia **1.4.1** con CHANGELOG chiaro.

---

## 13. CHANGELOG e audit trail

* **CHANGELOG per release**: elenco **diff** per controllo (id, old\_rev→new\_rev, tipo change, rationale breve).
* **Log firmati**: includere utente SME, timestamp, reason code (Cap. 6 §10).
* **Evidence**: conserva hash degli export (OSCAL/CSV) per verifica a posteriori.

---

## 14. Quality gate pre-pubblicazione (staging → prod)

* [ ] 100% **Schema/Lint/Provenance/OT** pass.
* [ ] **No duplicati** (cosine ≥ 0.90) senza alias/merge.
* [ ] **Coverage crosswalk** raggiunta sugli scope del ciclo.
* [ ] **Test di regressione** su 50–100 item del set dorato invariati.
* [ ] **OSCAL export** valida contro schema NIST.
* [ ] **Manifest firmato** e **data\_hash** verificato.

---

## 15. Sicurezza e governance

* **Firma** (ed25519) dei manifest e archiviazione WORM (write-once) per le release prod.
* **Access control**: solo **Owner del Catalogo** può creare una release prod.
* **Segregazione**: ambienti dev/staging/prod separati; backup e **DR plan** (Cap. 1 §BC).
* **Privacy**: gli export non devono contenere PII; i testi sorgente rimangono referenziati via checksum/locator.

---

## 16. Pseudocodice: creazione di una release

```python
def create_release(channel='prod', bump='minor', title=''):
    assert all_gates_pass()                         # Cap. 4 & 6
    version = bump_version(prev_version(), bump)
    rel_id = insert_catalog_release(version, channel, title)

    for ctrl in approved_controls():                # in staging freeze
        rev = ctrl.current_rev
        add_release_control(rel_id, ctrl.id, rev)

    for prof in approved_profiles():
        add_release_profile(rel_id, prof.id, prof.version)

    manifest = build_manifest(rel_id)
    manifest.data_hash = sha256(json.dumps(manifest, sort_keys=True))
    sign_and_store(manifest)
    publish_api_index(version, manifest)
    return version
```

---

## 17. Checklist operativa (pubblicazione)

* [ ] Branch **staging** congelato; nessun item in coda SME.
* [ ] Version bump deciso (MAJOR/MINOR/PATCH) con motivazione.
* [ ] Manifest generato con **counts** e **checksums**.
* [ ] Export OSCAL/CSV allegati e validati.
* [ ] Firma digitale applicata; artefatti depositati (S3 + Glacier/WORM).
* [ ] CHANGELOG pubblicato; notifiche ai consumatori (API/Slack/email).
* [ ] Tag Git creato (contenuti + pipeline code).

---

## 18. Output del capitolo

* Un **processo di rilascio** robusto, riproducibile e auditabile, con versioning chiaro e strumenti per **rollback** e **migrazioni**.
* Profili e checklist **pinnati** garantiscono stabilità operativa, mentre il catalogo evolve in modo controllato.

> Prossimo: **Capitolo 8 — Generazione checklist & profili**, dove definiamo come trasformare il catalogo in questionari auditoriabili e in baseline operative per ruoli/ambienti/SL (OT/IT), con risoluzione parametri e packaging per gli assessment.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking