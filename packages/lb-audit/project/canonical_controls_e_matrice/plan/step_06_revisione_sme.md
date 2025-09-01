# Capitolo 6 — Revisione SME (Subject Matter Expert)

## 1. Obiettivo del capitolo

Definire **ruoli, criteri e flusso operativo** per la revisione umana degli output LLM (controlli canonici, crosswalk, checklist, parametri), con decisioni **tracciabili, coerenti e difendibili in audit**, riducendo al minimo l’attrito per gli esperti OT/IT.

---

## 2. Ruoli e responsabilità

* **SME Primario** (OT/IT): valuta contenuto tecnico e aderenza allo standard.
* **SME Privacy/Legale** (quando `personal_data=true` o fonti UE): verifica implicazioni GDPR/CRA/NIS2.
* **Data Steward**: garantisce integrità della **provenienza** (checksum, sezione, edizione).
* **Moderator**: risolve conflitti tra SME e applica il *tie-break* secondo policy.
* **Owner del Catalogo**: approva merge, naming e versioning finale.

---

## 3. Definition of Ready (DoR) — quando un item è pronto alla revisione

Un elemento entra in coda SME solo se:

1. **Schema OK** e **lint OK** (Cap. 4).
2. Provenienza coerente e checksum combaciano.
3. Similitudine con catalogo calcolata, con elenco **top-3 simili**.
4. Proposta di **relation** (crosswalk) e relativo **final score** presenti.
5. Evidenziati eventuali **guardrail OT** (es. SL 62443), con esito.

> Se un punto manca, il sistema **rimanda** l’item alla pipeline (no tempo SME sprecato).

---

## 4. Criteri di accettazione (rubrica decisionale)

Valuta **solo** ciò che è supportato dal testo sorgente.

**A. Statement**

* Unico, **imperativo**, **testabile**, ≤ 350 caratteri.
* Aderente alla clausola (niente “best effort”, niente raccomandazioni generiche).
* Terminologia coerente con il dominio (es. OT: *zones/conduits, jump service, SL*).

**B. Applicabilità**

* `role/env/lifecycle` con overlap realistico rispetto alla fonte.
* Per **IEC 62443**: `env` **contiene** “OT”; `min_security_level` sensato o assente.

**C. Parametri**

* Solo quelli **implicati** dalla clausola; nomi *snake\_case*; niente default inventati.

**D. Crosswalk**

* **equivalent** solo se scopo, forza prescrittiva e perimetro coincidono.
* **broader/narrower/supports** se esiste asimmetria chiara (vedi Cap. 5).

**E. Checklist/Evidence**

* Coerenza con `type` (tecnico → almeno un’evidenza configurativa/log).
* Domande non ridondanti e verificabili.

---

## 5. Decisioni disponibili (azioni SME)

* **Approve**: l’item entra nel catalogo senza modifiche.
* **Approve with edit**: piccole correzioni **testuali** allo statement/parametri/applicabilità (il sistema versiona).
* **Request changes**: rimanda in lavorazione con motivazione operativa.
* **Merge**: duplica con canone esistente (scegli “canone vincente” e reindirizza mapping/evidenze).
* **Split**: lo statement copre due misure → creare due controlli (il sistema propone uno split guidato).
* **Re-scope**: correggi `role/env/lifecycle/SL`.
* **Relation change**: modifica *equivalent/broader/narrower/supports*.
* **Reject**: fuori ambito o insufficiente (motivo obbligatorio).

---

## 6. Severità dei difetti & SLA

* **Critical** (SLA 1g): statement non testabile / provenienza errata / violazione guardrail OT.
* **Major** (SLA 3g): scoping sbagliato, relation fuorviante, parametro improprio.
* **Minor** (SLA 5g): stile, terminologia, checklist migliorabile.
* **Cosmetic** (batch): refusi.

> Gli SLA sono tempi massimi di presa in carico; priorità automatica su *Critical/Major*.

---

## 7. Triage e UI consigliata

**Riquadri in pagina:**

1. **Fonte** (framework, sezione, edizione, testo) + link alla posizione.
2. **Proposta LLM** (statement, parametri, applicabilità, checklist).
3. **Simili top-3** con highlight delle **frasi chiave**.
4. **Crosswalk proposto** con `final score` e motivazione breve.
5. **Azioni rapide**: *Approve*, *Edit*, *Merge*, *Split*, *Change relation*, *Request changes*.
6. **Pannello di provenienza** (checksum, modello, hyperparam, timestamp).

**Shortcuts utili**

* `A` Approve • `E` Edit • `M` Merge • `S` Split • `R` Request changes.

---

## 8. Linee guida pratiche per gli SME

* **Conservatività**: se il testo è ambiguo, preferire *insufficient\_evidence* o *supports* a *equivalent*.
* **OT-first**: per 62443 privilegiare formulazioni che citano **zone/conduits, unidirectional flows, compensazioni**.
* **No “policy-speak”** negli statement tecnici: la policy è *supports*.
* **Parametri**: evitare valori di default arbitrari; delegare ai profili.
* **Minimo comune testabile**: ridurre congiunzioni “and/or”; se servono due misure, usa **Split**.

---

## 9. Conflitti tra SME (come risolverli)

1. **Commenti strutturati** (vedi §10) e voto (Approve/Reject/Edit) → serve **quorum 2**.
2. Se disaccordo persiste: **Moderator** conduce una *adjudication* max 15 min, decide documentando la **rationale**.
3. Temi ricorrenti → aggiornare **Playbook di stile** (glossario, esempi accettati).

---

## 10. Template di commento (obbligatorio su edit/reject)

**Formato breve (max 300 caratteri):**

```
[ReasonCode]: <spiegazione> | Impact:<Critical/Major/Minor> | Fix:<istruzione operativa>
```

**ReasonCode (vocabolario)**

* NOT\_TESTABLE • AMBIGUOUS\_SCOPE • WRONG\_RELATION • OT\_GUARDRAIL • PARAM\_MISUSE • PRIVACY\_FLAG • DUPLICATE • STYLE • EVIDENCE\_WEAK

**Esempio**

```
AMBIGUOUS_SCOPE: env include IT ma fonte è 62443 OT-only | Impact: Major | Fix: env=["OT"], lifecycle=["Operation","Maintenance"]
```

---

## 11. Metriche di qualità e coerenza

* **Acceptance rate** per tipo (equivalent/broader/…).
* **Tempo medio di revisione** per severità.
* **Accordo tra revisori** (Cohen’s κ di base su campioni settimanali).
* **Riaperture** entro 14gg (se >5% → training mirato).
* **Drift terminologico**: variazione embedding media degli statement approvati.

---

## 12. Definition of Done (DoD) della revisione

Un item è **done** quando:

* Decisione registrata (*Approve/Approve with edit/Merge/Split/Reject*).
* **Rationale** salvata (ReasonCode + commento).
* Provenienza e versioning aggiornati (se edit/merge/split).
* Eventuali **azioni a valle** eseguite (reindirizzo mapping, aggiornamento checklist).

---

## 13. Versioning e tracciabilità

* Ogni **edit** crea una **nuova revisione** (`rev+1`) con diff visibile.
* **Merge**: controllo perdente marcato `alias_of=<id vincente>`; mapping/evidenze **migrati**.
* **Split**: nuovo `canonical_id` generato; l’originale resta con nota “split from …”.
* Log firmati con **utente, timestamp, motivo**.

---

## 14. Playbook di decisione (quick reference)

* **La fonte è generale, il canone è specifico** → `broader`.
* **La fonte aggiunge requisiti ulteriori** → `narrower`.
* **La fonte è procedurale/policy** su misura tecnica → `supports`.
* **Due statement quasi identici** (score ≥ 0.90) → `merge`.
* **Statement con “should/consider”** → *reject* o *edit* in forma testabile (se supportato dal testo).

---

## 15. Checklists operative per SME

**Prima di decidere**

* [ ] Ho letto l’estratto **integrale** e controllato l’ID sezione/edizione.
* [ ] Lo statement è **unico e testabile**.
* [ ] `env/role/lifecycle` sono coerenti (OT incluso per 62443).
* [ ] Parametri pertinenti e minimi.
* [ ] Relation proposta ha senso; confronto con **top-3** simili fatto.

**Se Merge/Split**

* [ ] Ho selezionato il canone vincente / creato gli ID figli.
* [ ] Ho migrato mapping/evidenze.
* [ ] Ho scritto una rationale chiara.

---

## 16. Esempi sintetici di decisione

**Caso 1 — 27002 “strong auth” vs canone “MFA su jump host OT”**

* Decisione: `broader` (27002) → canone resta specifico OT; aggiungere mapping *supports* a policy correlata.

**Caso 2 — 62443 SR 1.1 che include session recording**

* Canone attuale richiede solo MFA.
* Decisione: creare **Split**: *MFA su jump* e *Session recording su accessi remoti*.
* Fonte mappa `equivalent` al secondo solo se lo menziona in modo prescrittivo.

**Caso 3 — Duplicato**

* Similarità 0.93, stesso risk\_theme e scoping.
* Decisione: **Merge**; mantenere lo statement più chiaro, unire parametri.

---

## 17. Automazioni utili lato piattaforma

* **Pre-fill comment** con ReasonCode più frequenti.
* **Smart-edit** dello statement con suggerimenti (rimuovi “should”, spezza congiunzioni).
* **Guardrail live**: warning se `env` non contiene OT per 62443.
* **Batch approve** per mapping `supports` con final score ≥ 0.85.

---

## 18. Output del capitolo

Una **procedura di revisione** chiara, con **rubriche**, **azioni** e **template** che consentono agli SME di:

* approvare/raffinare rapidamente ciò che è corretto,
* bloccare ciò che è rischioso o poco testabile,
* mantenere un **catalogo coerente e privo di duplicati**,
* lasciare una **traccia decisionale** solida per audit.

> Prossimo: **Capitolo 7 — Pubblicazione & versioning**, dove definiamo come promuovere gli item approvati nei cataloghi/profili, gestire alias/supersessioni e rilasciare versioni controllate.

### sys-source https://chatgpt.com/c/68a33e62-7e24-832f-8c33-90f1e9ae8be9?model=gpt-5-thinking