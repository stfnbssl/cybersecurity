# Appendice A — Modelli di **dashboard** (SQL → Grafana/Metabase) e pacchetti **ETL** per il data warehouse

Questa appendice ti dà **blocchi pronti** per:

1. modellare i dati di reporting (DW),
2. caricare/trasformare con **dbt** (opzione consigliata) o **Airflow**,
3. costruire **dashboard** in Grafana/Metabase con query SQL riutilizzabili.

---

## A1) Schema dati per reporting (DW)

### A1.1. Tabelle **operational → DW**

*(PostgreSQL/BigQuery/ClickHouse: gli SQL qui sotto sono in dialetto Postgres; adatta tipi/func se usi altro)*

**Dimensioni**

```sql
-- dim_time (giorno, settimana, mese) — utile per qualsiasi grafico
CREATE TABLE IF NOT EXISTS dim_time AS
SELECT d::date AS date,
       EXTRACT(isodow FROM d) AS dow,
       TO_CHAR(d, 'IYYY-IW') AS iso_week,
       TO_CHAR(d, 'YYYY-MM') AS ym
FROM GENERATE_SERIES('2023-01-01'::date, CURRENT_DATE + 365, interval '1 day') AS g(d);

-- dim_framework
CREATE TABLE IF NOT EXISTS dim_framework (
  framework_id INT PRIMARY KEY,
  code TEXT, edition TEXT, jurisdiction TEXT
);

-- dim_control
CREATE TABLE IF NOT EXISTS dim_control (
  control_id INT PRIMARY KEY,
  canonical_id TEXT,
  risk_theme TEXT
);

-- dim_profile
CREATE TABLE IF NOT EXISTS dim_profile (
  profile_id INT PRIMARY KEY,
  name TEXT
);
```

**Fatti (eventi e misurazioni)**

```sql
-- fact_llm_extraction: una riga per chiamata di estrazione
CREATE TABLE IF NOT EXISTS fact_llm_extraction (
  id BIGSERIAL PRIMARY KEY,
  chunk_id TEXT,
  model TEXT,
  created_at TIMESTAMPTZ,
  status TEXT,              -- schema_ok / schema_invalid / insufficient_evidence / ...
  lint_ok BOOLEAN,
  ot_guardrail_ok BOOLEAN,
  checksum_match BOOLEAN,
  statement_len INT,
  risk_theme TEXT,
  type TEXT,                -- process | technical
  sim_top1 NUMERIC,         -- similarità vs canone top-1
  framework_id INT,         -- della fonte chunk
  section_path TEXT
);

-- fact_crosswalk: proposta mapping fonte→canone
CREATE TABLE IF NOT EXISTS fact_crosswalk (
  id BIGSERIAL PRIMARY KEY,
  source_doc_id INT,
  control_id INT,
  proposed_relation TEXT,       -- equivalent/broader/narrower/supports
  llm_confidence NUMERIC,       -- 0..1
  hybrid_sim NUMERIC,           -- S ibrido Cap.5
  final_score NUMERIC,          -- combinato
  created_at TIMESTAMPTZ,
  approved BOOLEAN,             -- dopo SME
  approved_relation TEXT
);

-- fact_sme_review: ticket di revisione e outcome
CREATE TABLE IF NOT EXISTS fact_sme_review (
  id BIGSERIAL PRIMARY KEY,
  item_type TEXT,               -- control | mapping | checklist
  severity TEXT,                -- Critical/Major/Minor/Cosmetic
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  decision TEXT,                -- Approve/Edit/Merge/Split/Reject
  reason_code TEXT              -- Cap.6 §10
);

-- fact_release: snapshot pubblicazioni
CREATE TABLE IF NOT EXISTS fact_release (
  release_id UUID PRIMARY KEY,
  version TEXT,
  channel TEXT,                 -- dev/staging/prod
  created_at TIMESTAMPTZ,
  controls INT,
  mappings INT,
  checklists INT
);

-- fact_assessment (opzionale se usi in produzione le checklist)
CREATE TABLE IF NOT EXISTS fact_assessment (
  id UUID PRIMARY KEY,
  profile_id INT,
  started_at TIMESTAMPTZ,
  score NUMERIC,
  pass BOOLEAN
);
```

> Suggerimento: crea **materialized views** per KPI frequenti (A5).

---

## A2) ETL “chiavi in mano”

### A2.1. **dbt** (raccomandato)

**`dbt_project.yml` (estratto)**

```yaml
name: logbot_secprog
profile: logbot_dw
version: 1.0.0
models:
  logbot_secprog:
    staging:
      +schema: stg
    mart:
      +schema: mart
```

**`models/staging/stg_llm_extraction.sql`**

```sql
SELECT
  id,
  chunk_id,
  model,
  created_at AT TIME ZONE 'Europe/Rome' AS created_at,
  status,
  (status = 'schema_ok' AND lint_ok AND checksum_match) AS pipeline_pass,
  lint_ok,
  ot_guardrail_ok,
  checksum_match,
  statement_len,
  risk_theme,
  type,
  sim_top1,
  framework_id,
  section_path
FROM raw.fact_llm_extraction;
```

**`models/mart/fct_kpi_daily.sql`**

```sql
WITH by_day AS (
  SELECT DATE_TRUNC('day', created_at) AS day,
         COUNT(*) AS total,
         SUM((status='schema_ok')::int) AS schema_ok,
         SUM((lint_ok)::int) AS lint_ok,
         SUM((ot_guardrail_ok)::int) AS ot_ok,
         SUM((status='insufficient_evidence')::int) AS insufficient
  FROM stg.stg_llm_extraction
  GROUP BY 1
)
SELECT
  day::date AS date,
  ROUND(100.0*schema_ok/NULLIF(total,0),2) AS schema_pass_pct,
  ROUND(100.0*lint_ok/NULLIF(total,0),2)    AS lint_pass_pct,
  ROUND(100.0*ot_ok/NULLIF(total,0),2)      AS ot_guardrail_pass_pct,
  ROUND(100.0*insufficient/NULLIF(total,0),2) AS insufficient_pct,
  total
FROM by_day;
```

**`models/mart/fct_crosswalk_coverage.sql`**

```sql
SELECT
  f.code || ':' || f.edition AS framework,
  ROUND(100.0 * COUNT(DISTINCT s.id)
        / NULLIF((SELECT COUNT(*) FROM source_doc s2 WHERE s2.framework_id=s.framework_id AND s2.normative),0),2) AS coverage_pct
FROM source_doc s
JOIN dim_framework f ON f.framework_id = s.framework_id
JOIN control_mapping m ON m.source_doc_id = s.id
WHERE s.normative = true
GROUP BY 1;
```

Esempi aggiuntivi in A3/A4 si appoggiano a queste viste.

### A2.2. **Airflow** (alternativa)

**`dags/logbot_dw_ingest.py` (estratto)**

```python
from airflow import DAG
from airflow.providers.postgres.operators.postgres import PostgresOperator
from datetime import datetime

with DAG("logbot_dw_ingest", start_date=datetime(2025,8,1), schedule="0 * * * *", catchup=False) as dag:
    upsert_dim_framework = PostgresOperator(
        task_id="upsert_dim_framework",
        postgres_conn_id="dw",
        sql="INSERT INTO dim_framework (framework_id, code, edition, jurisdiction) "
            "SELECT id, code, edition, jurisdiction FROM framework "
            "ON CONFLICT (framework_id) DO UPDATE SET code=EXCLUDED.code, edition=EXCLUDED.edition, jurisdiction=EXCLUDED.jurisdiction;"
    )
    load_fact_llm = PostgresOperator(
        task_id="load_fact_llm",
        postgres_conn_id="dw",
        sql="INSERT INTO fact_llm_extraction SELECT * FROM operational_fact_llm_extraction WHERE created_at > NOW() - INTERVAL '2 hours';"
    )
    upsert_dim_framework >> load_fact_llm
```

> In alternativa: **Airbyte/Fivetran** per la replica grezza + **dbt** per le trasformazioni.

---

## A3) **Metabase** — “Domande” (SQL pronti)

> Imposta la variabile filtro `{{date_start}}` e `{{date_end}}` (tipo: data) e `{{framework}}` (lista).

### A3.1. Funnel qualità (giornaliero)

```sql
WITH base AS (
  SELECT DATE_TRUNC('day', created_at) AS day,
         COUNT(*) AS total,
         SUM((status='schema_ok')::int) AS schema_ok,
         SUM((lint_ok)::int) AS lint_ok,
         SUM((ot_guardrail_ok)::int) AS ot_ok
  FROM fact_llm_extraction
  WHERE created_at::date BETWEEN {{date_start}} AND {{date_end}}
  GROUP BY 1
)
SELECT day::date,
       total,
       schema_ok,
       lint_ok,
       ot_ok
FROM base
ORDER BY 1;
```

*Visuale:* **Area stacked** → “Funnel”.

### A3.2. Heatmap errori per framework/ReasonCode

```sql
SELECT f.code || ':' || f.edition AS framework,
       r.reason_code,
       COUNT(*) AS n
FROM fact_sme_review r
JOIN source_doc s ON s.id = r.id  -- se hai un mapping item→source_doc
JOIN dim_framework f ON f.framework_id = s.framework_id
WHERE r.opened_at::date BETWEEN {{date_start}} AND {{date_end}}
GROUP BY 1,2
ORDER BY 3 DESC;
```

*Visuale:* **Heatmap**.

### A3.3. Coverage crosswalk per framework

```sql
SELECT * FROM mart.fct_crosswalk_coverage
WHERE framework LIKE COALESCE({{framework}}, framework);
```

*Visuale:* **Barre orizzontali**.

### A3.4. Scatter `sim_score` vs `final_score` (qualità crosswalk)

```sql
SELECT hybrid_sim AS sim_score, final_score
FROM fact_crosswalk
WHERE created_at::date BETWEEN {{date_start}} AND {{date_end}};
```

*Visuale:* **Scatter** con linee soglia 0.65 / 0.80.

### A3.5. Tempo medio revisione SME (per severità)

```sql
SELECT severity,
       ROUND(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60.0),2) AS minutes
FROM fact_sme_review
WHERE closed_at IS NOT NULL
  AND opened_at::date BETWEEN {{date_start}} AND {{date_end}}
GROUP BY severity;
```

*Visuale:* **Column**.

### A3.6. OT Guardrail pass (62443)

```sql
SELECT DATE_TRUNC('day', created_at)::date AS day,
       ROUND(100.0*SUM((ot_guardrail_ok)::int)/NULLIF(COUNT(*),0),2) AS ot_pass_pct
FROM fact_llm_extraction e
JOIN dim_framework f ON f.framework_id = e.framework_id
WHERE f.code LIKE 'IEC 62443%' AND created_at::date BETWEEN {{date_start}} AND {{date_end}}
GROUP BY 1 ORDER BY 1;
```

*Visuale:* **Line** (target 100%).

---

## A4) **Grafana** — pannelli (Postgres datasource)

### A4.1. Variabili dashboard

* `time_range` (nativo)
* `framework` (Query):

  ```sql
  SELECT DISTINCT code || ':' || edition AS framework FROM dim_framework ORDER BY 1;
  ```

### A4.2. Pannello: **Schema/Lint/OT pass (%)**

Query:

```sql
SELECT
  DATE_TRUNC('day', created_at) AS time,
  100.0*SUM((status='schema_ok')::int)/COUNT(*) AS schema_pass,
  100.0*SUM((lint_ok)::int)/COUNT(*) AS lint_pass,
  100.0*SUM((ot_guardrail_ok)::int)/COUNT(*) AS ot_pass
FROM fact_llm_extraction
WHERE $__timeFilter(created_at)
GROUP BY 1 ORDER BY 1;
```

*Visuale:* **Time series**, tre metriche.

### A4.3. Pannello: **Coverage crosswalk** (per framework selezionato)

```sql
SELECT framework, coverage_pct
FROM mart.fct_crosswalk_coverage
WHERE framework = '${framework}';
```

*Visuale:* **Gauge** (min 0, max 100).

### A4.4. Pannello: **Triage SME — tempo medio (min)**

```sql
SELECT DATE_TRUNC('day', opened_at) AS time,
       AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60.0) AS t_min
FROM fact_sme_review
WHERE $__timeFilter(opened_at) AND closed_at IS NOT NULL
GROUP BY 1 ORDER BY 1;
```

*Visuale:* **Time series**.

### A4.5. Pannello: **Duplicati non risolti (cosine ≥ 0.90)**

```sql
SELECT DATE_TRUNC('day', created_at) AS time,
       COUNT(*) FILTER (WHERE hybrid_sim >= 0.90 AND approved IS DISTINCT FROM true) AS dup_unresolved
FROM fact_crosswalk
WHERE $__timeFilter(created_at)
GROUP BY 1 ORDER BY 1;
```

*Visuale:* **Bar time series** (target 0).

---

## A5) **Materialized Views** (prestazioni)

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_kpi_daily AS
SELECT DATE_TRUNC('day', created_at)::date AS day,
       COUNT(*) AS total,
       SUM((status='schema_ok')::int) AS schema_ok,
       SUM((lint_ok)::int) AS lint_ok,
       SUM((ot_guardrail_ok)::int) AS ot_ok
FROM fact_llm_extraction
GROUP BY 1;
-- refresh giornaliero
CREATE OR REPLACE FUNCTION refresh_mv_kpi_daily() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_kpi_daily;
END $$ LANGUAGE plpgsql;
```

---

## A6) Sicurezza & **RBAC**

* Crea **ruoli read-only** per dashboard: `dw_analyst`, `dw_viewer`.
* Concedi **SELECT** su schema `mart`/`mv_*`, nega su tabelle raw operative.
* Se paragrafi normativi contengono testi protetti, esponi **solo KPI** (non TEXT).

---

## A7) Pacchetto **export KPI** (CSV/JSON)

**CSV giornaliero KPI**:

```sql
COPY (
  SELECT day, total,
         ROUND(100.0*schema_ok/NULLIF(total,0),2) AS schema_pass_pct,
         ROUND(100.0*lint_ok/NULLIF(total,0),2) AS lint_pass_pct,
         ROUND(100.0*ot_ok/NULLIF(total,0),2) AS ot_pass_pct
  FROM mv_kpi_daily
) TO STDOUT WITH CSV HEADER;
```

---

## A8) Dashboard bundle — layout suggerito

**Dashboard “Quality & Throughput”**

1. Time series: Schema/Lint/OT pass %
2. Funnel giornaliero (stack)
3. Gauge: Coverage crosswalk (per framework selezionato)
4. Bar: Duplicati non risolti
5. Line: Tempo medio revisione SME
6. Heatmap: ReasonCode per framework

**Dashboard “Crosswalk Deep Dive”**

1. Scatter: sim\_score vs final\_score
2. Tabella: top-50 mapping sotto soglia 0.65 (da correggere)
3. Bar: coverage per standard (62443/27002/NIS2/CRA/GDPR)

---

## A9) Controlli qualità automatici (SQL per alert)

**Allarme OT guardrail < 98% (settimanale)**

```sql
SELECT TO_CHAR(NOW(), 'IYYY-IW') AS iso_week,
       ROUND(100.0*SUM((ot_guardrail_ok)::int)/COUNT(*),2) AS ot_pass_pct
FROM fact_llm_extraction e
JOIN dim_framework f ON f.framework_id=e.framework_id
WHERE f.code LIKE 'IEC 62443%' AND created_at >= NOW() - INTERVAL '7 days'
HAVING ROUND(100.0*SUM((ot_guardrail_ok)::int)/COUNT(*),2) < 98.0;
```

**Allarme insufficient evidence > 20% su documento**

```sql
SELECT framework_id, section_path,
       ROUND(100.0*SUM((status='insufficient_evidence')::int)/COUNT(*),2) AS insufficient_pct
FROM fact_llm_extraction
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1,2
HAVING ROUND(100.0*SUM((status='insufficient_evidence')::int)/COUNT(*),2) > 20.0;
```

---

## A10) Note di deployment

* Imposta il fuso **Europe/Rome** nelle query/time-series.
* Programma **refresh** delle MV prima dei cron Grafana/Metabase.
* Versiona le viste **mart/** e i pannelli (JSON Grafana, Metabase Collection).

---

### Con questa appendice:

* hai un **modello dati** DW minimale ma sufficiente per i KPI del Cap. 9,
* **trasformazioni dbt** e una **DAG Airflow** di esempio,
* query pronte per **Metabase/Grafana** con layout consigliati,
* allarmi SQL per mantenere i **guardrail** sotto controllo.

Se vuoi, posso produrre anche i file iniziali di progetto **dbt** (cartelle e `schema.yml`) o un **JSON esportato** di dashboard Grafana, adattato ai nomi delle tue tabelle.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking