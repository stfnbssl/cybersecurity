# Prompt compilati per l'articolo

## Hook & Razionale (article-hook-razionale)
**Obiettivo:** Scrivere l'apertura che spiega perché la non-compliance blocca l'accesso al mercato per produttori e integratori.

**Prompt:**
```
Scrivi un paragrafo introduttivo (max 120 parole) che mostri come la non-compliance blocchi l’accesso al mercato per produttori di componenti e system integrator. 
Tono pratico, zero FUD, con 1 esempio concreto. 
Output: testo puro.
```
**Output atteso:** Testo breve (≤120 parole).

---
## Procedura in 5 passi (semplice ma accurata) (article-procedura-5-passi)
**Obiettivo:** Spiegare i 5 passi della procedura di monitoraggio compliance in modo comprensibile.

**Prompt:**
```
Spiega in modo non tecnico ma accurato i 5 passi della procedura di monitoraggio compliance 
(Perimetro, Raccolta & Normalizzazione, Estrazione LLM, Gap-assessment, Horizon scanning), 
in 5 paragrafi brevi con titoletti H3.
Output: Markdown.
```
**Output atteso:** Markdown con 5 sottosezioni H3.

---
## Sezione ‘as-a-Service’ (article-asa-service)
**Obiettivo:** Descrivere come funziona il servizio continuativo e i deliverable.

**Prompt:**
```
Descrivi come funziona il servizio continuativo: onboarding, aggiornamenti, deliverable trimestrali, 
metriche (tempo-to-evidence, % lacune chiuse), senza claim non verificabili. 
Output: elenco puntato.
```
**Output atteso:** Elenco puntato.

---
## Mini-case (PLC Wi‑Fi) (article-mini-case)
**Obiettivo:** Raccontare un caso fittizio ma realistico che mostri l’efficacia della procedura/servizio.

**Prompt:**
```
In 200 parole, racconta un caso fittizio ma realistico: da checklist a DoC pronta; 
mostra 3 ostacoli e come il servizio li ha superati. 
Output: testo.
```
**Output atteso:** Testo narrativo ~200 parole.

---
## FAQ & CTA (article-faq-cta)
**Obiettivo:** Generare 5 Q&A concise e 3 call-to-action chiare.

**Prompt:**
```
Genera 5 FAQ con risposte concise; chiudi con 3 CTA chiare (demo, audit gratuito, checklist). 
Output: Markdown.
```
**Output atteso:** Markdown con 5 FAQ + 3 CTA in elenco.

---
## Outline articolo (article-outline)
**Obiettivo:** Strutturare l'intero articolo in sezioni e sottosezioni prima della bozza.

**Prompt:**
```
Genera l’outline strutturato dell’articolo “Compliance che sblocca i mercati per produttori e system integrator”. 
Includi: Hook, Razionale, Procedura in 5 passi, As-a-Service, Mini-case, FAQ, CTA. 
Per ogni sezione indica 1–2 bullet con i punti chiave da toccare.
Output: Markdown.
```
**Output atteso:** Outline Markdown con sezioni e bullet.

---
## Titoli alternativi (article-titles)
**Obiettivo:** Proporre titoli efficaci per SEO e chiarezza.

**Prompt:**
```
Proponi 8 titoli H1 alternativi, chiari e non sensazionalistici, max 70 caratteri ciascuno. 
Tema: procedura e servizio di monitoraggio compliance come leva di accesso al mercato per produttori e integratori OT.
Output: elenco puntato.
```
**Output atteso:** Elenco di 8 titoli H1.

---
## Meta description SEO (article-seo-meta)
**Obiettivo:** Creare meta description sintetica per il post.

**Prompt:**
```
Scrivi 3 meta description (150–160 caratteri) per l’articolo, tono pratico. 
Includi termini naturali: accesso al mercato, conformità normativa, produttori, integratori.
Output: elenco puntato.
```
**Output atteso:** 3 meta description in elenco.

---
## Checklist di qualità (pre-pubblicazione) (article-quality-check)
**Obiettivo:** Verificare completezza, accuratezza e chiarezza del pezzo.

**Prompt:**
```
Genera una checklist di 10 punti per validare il pezzo prima della pubblicazione: 
esempi concreti, date e fonti verificate, glossario minimo, CTA presenti, visual ogni ~400 parole, 
tono coerente con target B2B.
Output: elenco puntato con caselle [ ].
```
**Output atteso:** Checklist con 10 voci [ ].

---
## Applicabilità & percorso di conformità (CE/RED/CRA) (compliance-applicability-conformity-path)
**Obiettivo:** Determinare atti applicabili, percorso di conformità, prove e norme armonizzate per un prodotto di riferimento.

**Variabili:** product_profile, markets

**Prompt:**
```
Sei un “regulatory triager”. Con i dati prodotto {{product_profile}} e mercati {{markets}}, 
stabilisci quali atti (es. RED, EMC, LVD, CRA, Machinery se safety) sono applicabili, lo schema di conformità 
(autovalutazione, organismo notificato), le prove e le norme armonizzate pertinenti.
Regole: SOLO JSON. Se un dato è incerto, usa "unknown".
Output atteso: 
{
  "applicability":[{
    "act":"RED|EMC|LVD|CRA|Machinery",
    "applicable":true,
    "triggers":["radio","elementi_digitali","safety_function"],
    "conformity_path":"CE:self-assessment|third-party|type-approval",
    "harmonised_standards":["{{EN/ETSI}}"],
    "evidence":["test_report_RF","DoC","tech_file","security_by_design_evidence"],
    "notes":"..."
  }],
  "unknowns":["..."]
}
```
**Output atteso:** JSON con blocco 'applicability' e 'unknowns'.

---
## Estrattore obblighi da testo normativo (compliance-extractor-legal-text)
**Obiettivo:** Trasformare estratti normativi in requisiti verificabili per alimentare l’articolo con fatti.

**Variabili:** legal_text

**Prompt:**
```
Estrai SOLO obblighi verificabili dal seguente testo: {{legal_text}}. Se non trovi attore o data, usa null.
Regole: SOLO JSON. Mantieni riferimenti ad articoli/annessi.
Output atteso: 
{
  "requirements":[{
    "id":"{{norma}}-ArtX-parY",
    "actor":"manufacturer|integrator|importer|distributor|null",
    "obligation":"...",
    "evidence":["..."],
    "applies_from":"YYYY-MM-DD|null",
    "reference":{"document":"{{id}}","article":"X","annex":"...","url":"{{link}}"},
    "maps_to_controls":[{"framework":"IEC 62443-3-3","control":"SR x.x"}]
  }]
}
```
**Output atteso:** JSON con lista 'requirements'.

---
## Bozza completa in un colpo solo (article-full-draft)
**Obiettivo:** Produrre direttamente una bozza completa seguendo l’outline proposto.

**Prompt:**
```
Scrivi una bozza completa dell’articolo “Compliance che sblocca i mercati: la procedura (e il servizio) che serve a produttori e system integrator”
seguendo questa struttura: Hook & Razionale; Perché adottarla; A chi serve; Procedura in 5 passi; Cosa ottieni; Mini-case (PLC Wi‑Fi);
Servizio as-a-Service; FAQ; CTA; Nota finale.
Tono pratico, B2B, zero gergo superfluo; evita claim non verificabili; usa H2/H3 e elenchi quando utile.
Output: Markdown.
```
**Output atteso:** Markdown completo (≈1.500–2.000 parole).

---
