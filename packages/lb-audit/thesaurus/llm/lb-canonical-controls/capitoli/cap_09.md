# Capitolo 9 — Metriche & miglioramento continuo

## 1. Obiettivo del capitolo

Definire **KPI, metodi di misurazione, dashboard e cicli di feedback** per migliorare qualità, copertura e velocità del sistema (dall’ingestion dei chunk fino a profili/checklist pubblicati), riducendo costi e rischi.

---

## 2. Mappa dei KPI (funnel end-to-end)

**Ingestion & Chunking**

* **Chunk validi (%)** = chunk\_normativi\_validi / chunk\_ingestiti
* **Stabilità hash (%)** tra run consecutivi
* **Tempo medio parsing** per documento

**Estrazione (LLM)**

* **Schema pass (%)**
* **Lint pass (%)**
* **OT guardrail pass (%)** (per fonti 62443)
* **Insufficient evidence (%)** (target di riferimento; troppo alto = chunking/regex da rivedere)

**Dedupe & Crosswalk**

* **Duplicati rilevati correttamente (%)** (verifica SME)
* **Precisione relazione** (*equivalent/broader/narrower/supports*) — macro-F1 su set dorato
* **Coverage crosswalk (%)** = fonti con ≥1 mapping / fonti totali

**Revisione SME**

* **Tempo medio revisione** per severità (Critical/Major/Minor)
* **Accordo tra revisori (κ)** su campioni settimanali
* **Riaperture entro 14 gg (%)**

**Pubblicazione**

* **Lead time** chunk → controllo pubblicato
* **Difetti post-release (PPM)** (issue per milione di record)
* **Rollback rate** (per release)

**Profili & Checklist**

* **Domande per controllo (media)** (target ≤ 4)
* **Must-pass coverage (%)** sui controlli critici
* **Evidenze on-time (%)** negli assessment reali
* **Score pass rate** per profilo (in produzione)

**Efficienza**

* **Costo/token** e **latency** per task LLM
* **Recall ANN (%)** (verificato su sondaggio campioni)

---

## 3. Dati di base e calcolo (formule/SQL)

**Schema pass (%)**

```sql
SELECT 100.0 * SUM( (status='schema_ok')::int ) / COUNT(*) AS schema_pass
FROM pipeline_events
WHERE stage='extract' AND ts::date = current_date;
```

**Coverage crosswalk (%)**

```sql
SELECT 100.0 * COUNT(DISTINCT s.id) / NULLIF((SELECT COUNT(*) FROM source_doc s2 WHERE s2.normative),0) AS coverage
FROM source_doc s
JOIN control_mapping m ON m.source_doc_id=s.id
WHERE s.normative = true;
```

**Precisione relazione (confusione semplificata)**

```sql
-- gold_relation e pred_relation su tabella audit_labels
SELECT pred_relation, gold_relation, COUNT(*) 
FROM audit_labels 
GROUP BY 1,2;
```

**Tempo medio revisione (min)**

```sql
SELECT severity, AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))/60.0) AS t_min
FROM sme_reviews WHERE closed_at IS NOT NULL
GROUP BY severity;
```

**Recall ANN (%)**
Su set campione con “vicini” attesi `K_expected`:

```
recall = |vicini_attesi ∩ vicini_ritornati| / |vicini_attesi|
```

---

## 4. Set dorati e campionamento

* **Set dorato base**: 50–100 clausole per framework chiave (62443, 27002, NIS2, CRA, GDPR).
* **Aggiornamento trimestrale**: aggiungere 10–20 nuovi item “difficili” (ambigui, multilabel, borderline).
* **Campionamento operativo**: 1–2% degli item pubblicati/sett. rientra in **audit di qualità** (blind review SME).

---

## 5. Monitoraggio qualità modello & drift

**Indicatori**

* **Distribuzione lunghezze** `statement` (media, deviazione)
* **Weak-terms rate** rilevati dal lint (“should/consider/…”), per modello/versione
* **Change failure rate**: percentuale di Auto-repair necessari
* **Calibrazione confidenza** (reliability curve su `confidence_llm` vs esito SME)

**Drift semantico**

* Variazione media **embedding** degli statement approvati / mese
* **Sim\_score medio** per crosswalk su stesso framework → se cala rapidamente, rivalutare index/embedding

**Allarmi (esempi)**

* OT guardrail pass < 98% su fonti 62443
* Insufficient evidence > 20% su un documento → chunking aggressivo o pdf/ocr da rivedere
* κ < 0.6 tra SME → riallineamento rubriche

---

## 6. Costi & prestazioni (LLM/MLOps)

* **Latency P50/P95** per task (estrazione, crosswalk, checklist)
* **Token in/out per task**; **costo per 1k chunk**
* **Retry rate** e **timeout**
* **Batching**: sfruttare parallelismo per chunk indipendenti
* **Caching** (chiave: checksum + modello + prompt) per idempotenza

**Target iniziali**

* Estr. controllo P95 < 4 s / item
* Crosswalk adjudication P95 < 6 s / item
* Costo < €X/1k chunk (definire budget trimestrale)

---

## 7. Dashboard operative (consigli)

**Funnel** (stack): Ingestion → Schema → Lint → OT → Dedupe → SME → Publish
**Heatmap errori**: per framework/section\_path vs ReasonCode
**Scatter**: sim\_score vs final\_score (crosswalk) con soglie 0.65/0.80
**Trend**: pass rate must-pass per profilo in produzione
**Cost & Latency**: per task e per modello
**ANN Recall**: per indice e dimensione IVFFLAT (param tuning)

---

## 8. Ciclo di miglioramento continuo (DMAIC semplificato)

**Define**

* Seleziona 1–2 KPI critici/trim. (es. precisione relation, tempo revisione SME)

**Measure**

* Implementa query/telemetrie, definisci valore di base e varianza

**Analyze**

* RCA (root cause) su bucket errori dominanti (es. WRONG\_RELATION su “broader/narrower”)

**Improve**

* Azioni tipiche:

  * Raffinare **regex chunking** / rimuovere NOTE
  * Aggiornare **prompt template** (envelope, esempi)
  * Aggiornare **glossario** e rubriche SME
  * Retuning parametri ANN (centroidi, lists, probes)
  * Few-shot aggiuntivi per casi ricorrenti
  * Regole lint più selettive

**Control**

* Congelare cambi in **staging**, A/B su un sottoinsieme, guardare KPI 2–4 settimane

---

## 9. Sperimentazione controllata (A/B, canary, shadow)

* **A/B** su modelli: una quota (es. 10%) di chunk usa *Model B* → confronto KPI.
* **Canary release**: nuova pipeline su 5% delle fonti; promozione solo se supera soglie.
* **Shadow mode**: esecuzione in parallelo senza influire sui risultati, per stimare guadagni/rischi.

---

## 10. Playbook di remediation (per ReasonCode frequenti)

| ReasonCode       | Rimedio tecnico                                             | Rimedi processuali                |
| ---------------- | ----------------------------------------------------------- | --------------------------------- |
| NOT\_TESTABLE    | Lint più severo su verbi; prompt che enfatizza “imperative” | Coaching SME con esempi           |
| AMBIGUOUS\_SCOPE | Aggiungi feature penalità scoping                           | Linee guida su env/role/lifecycle |
| WRONG\_RELATION  | Few-shot dedicati *broader/narrower*                        | Cheat-sheet esempi tipici         |
| OT\_GUARDRAIL    | Trigger DB per blocco; QA ingest su 62443                   | Formazione su 62443               |
| PARAM\_MISUSE    | Schema param con enum/limiti                                | Review mirata parametri           |
| DUPLICATE        | Soglia S 0.90→0.88 e penalità scoping                       | Sessione merge catalogo           |
| EVIDENCE\_WEAK   | Libreria evidence\_type per dominio                         | Template richieste evidenze       |

---

## 11. Governance dei dati e della conoscenza

* **Glossario vivo** (termini OT/IT, verbi ammessi) → aggiornamento mensile
* **Pattern library** per statement accettati (snippets)
* **Change Advisory Board (CAB)** per modifiche a regole lint/guardrail
* **Retro mensile** con SME e Platform: review KPI, 3 azioni migliorative

---

## 12. Automazioni ricorrenti (schedulate)

**Job giornalieri**

* Ricostruzione **indici ANN** e verifica recall su campione
* Report **guardrail OT** e **schema/lint pass**
* Export **health report** a Slack/Email

**Job settimanali**

* Audit qualità 1–2% item pubblicati
* Calibrazione **confidence\_llm** (isotonic)
* Aggiornamento dashboard costi/latency

**Job mensili**

* Refresh **set dorato** (+10–20 item difficili)
* Retro KPI e backlog miglioramenti
* Verifica **drift embedding** e re-training se necessario

*Pseudocodice schedulatore*

```python
schedule.every().day.at("02:00").do(rebuild_ann_and_recall)
schedule.every().day.at("08:00").do(send_ot_guardrail_report)
schedule.every().monday.at("09:00").do(sample_quality_audit)
schedule.every().month.do(update_golden_set)
```

---

## 13. SLO & soglie consigliate (iniziali)

* **Schema pass** ≥ 98%
* **Lint pass** ≥ 95%
* **OT guardrail pass** = 100% su fonti 62443
* **Precisione relation (macro-F1)** ≥ 0.85
* **Lead time** chunk → publish ≤ 5 gg median
* **Duplicati in produzione** (cosine ≥ 0.90 non uniti) = 0
* **Riaperture 14 gg** ≤ 5%
* **ANN recall** ≥ 0.95 sul campione

> Le soglie vanno tarate sui volumi reali; mantenere storico per trend.

---

## 14. Privacy, sicurezza e compliance delle metriche

* **Minimizzazione dati**: log delle richieste LLM senza PII; i testi normativi sono pubblici/permessi.
* **Access control**: dashboard e log visibili a ruoli autorizzati (RBAC).
* **Integrità**: firma report critici (ed25519) o archiviazione WORM.
* **Audit trail**: correlare eventi KPI a versioni di modello/pipeline (code\_hash).

---

## 15. Checklist operativa (Metriche & CI)

* [ ] KPI definiti con formula, frequenza e owner.
* [ ] Dashboard implementate e accessibili.
* [ ] Set dorato aggiornato (mensile).
* [ ] Allarmi e soglie configurati (guardrail, drift, costi).
* [ ] Processo RCA documentato e backlog priorizzato.
* [ ] Rituali di retro (mensile) e CAB per cambi di regola.

---

## 16. Output del capitolo

Un sistema di **misurazione continuo** che:

* rende visibili qualità, costi e rischi,
* guida interventi mirati su chunking, prompt, indici e rubriche SME,
* assicura **miglioramento iterativo** e **stabilità in produzione** dei profili e delle checklist.

> (Facoltativo) Appendice A: modelli di dashboard (SQL→Grafana/Metabase) e pacchetti ETL pronti da collegare al vostro data warehouse.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking
