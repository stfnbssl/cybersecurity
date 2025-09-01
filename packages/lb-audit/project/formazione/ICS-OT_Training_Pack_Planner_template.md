# ICS/OT Audit & Security – Training Pack Planner

> Usa questo documento come **contenitore unico** per raccogliere i contenuti sparsi nelle altre chat e trasformarli in **slide** e in un **testo di accompagnamento** (trainer notes / dispensa). Inserisci o incolla qui sotto i materiali seguendo le sezioni.

---

## 0) Obiettivi e pubblico

- **Obiettivi del programma** (cosa devono saper fare i partecipanti alla fine)
- **Pubblici**:
  - Clienti (management / referenti OT / IT / HSE)
  - Collaboratori interni (ingegneri automazione non esperti di standard)
- **Prerequisiti** per ciascun pubblico
- **Durata** e formato (workshop, e‑learning, sessioni in aula)

---

## 1) Struttura dei materiali da produrre

- **Deck 1 – Percorso Clienti** (40–60 slide)
  - Focus: quadro normativo (UE/NA), cosa aspettarsi dall’audit, ruoli/responsabilità, evidenze richieste, benefici (accesso al mercato, qualifica fornitori)
- **Deck 2 – Percorso Collaboratori** (60–90 slide)
  - Focus: metodo, data model di controlli canonici e security profiles, procedure passo‑passo, checklists, raccolta evidenze, reporting
- **Trainer Notes / Dispensa** (testo articolato, 20–40 pagine)
  - Approfondimenti, esempi, script di conduzione, soluzioni degli esercizi
- **Allegati**: checklist operative, modelli di report, modelli di piani di remediation

---

## 2) Mappa delle Quattro Linee di Intervento (riassunto esecutivo)

Compila una riga per ciascun ambito.

| # | Ambito                                   | Scopo | Output principali | Stakeholder | Rischi/criticità |
| - | ---------------------------------------- | ----- | ----------------- | ----------- | ---------------- |
| 1 | Security Program & Governance            |       |                   |             |                  |
| 2 | Controlli canonici & Profili per Dominio |       |                   |             |                  |
| 3 | Auditing Sviluppo Software (SSDLC)       |       |                   |             |                  |
| 4 | Auditing Macchine di OEM/Integratori     |       |                   |             |                  |

---

## 3) Base dati dei controlli canonici di audit (schema)

> Incolla qui la definizione che abbiamo elaborato o compila i campi se serve rifinirla.

**Campi suggeriti**

- Control_ID (chiave)
- Titolo / Intent
- Dominio (Asset Mgmt, Network Segmentation, Access Control, Monitoring, Incident Response, Procurement, Physical, Safety, ecc.)
- Fonte/Norma (IEC 62443‑x‑x, ISO/IEC 27001/2, NIST 800‑82, NIS2, CRA, NERC CIP, 21 CFR Part 11, ecc.)
- Clausola / Riferimento
- Applicabilità (IT/OT, livello Purdue, ambiente: impianto, laboratorio, macchina)
- Tipo controllo (preventivo/detective/correttivo)
- Procedura di test (step, campionamento)
- Evidenze richieste
- Criteri di conformità
- Metrica/Maturità (CMMI/62443 maturity rating, peso)
- Frequenza / Trigger
- Owner / Responsabilità
- Rischio associato (minaccia, impatto, livello)
- Note / Eccezioni

---

## 4) Profili di intervento per Dominio

> Elenca i **profili** (set di controlli canonici pre‑selezionati) per: segmento di rete, impianto, macchina singola, fornitura, manutenzione, remoto, cloud/edge, ecc.

**Esempio tabellare (completa/integra):**

| Profilo               | Scopo                                     | Standard primari    | Controlli chiave    | Evidenze richieste                   |
| --------------------- | ----------------------------------------- | ------------------- | ------------------- | ------------------------------------ |
| "Linea di Produzione" | Segmentazione e monitoring in tempo reale | IEC 62443‑3‑3, NIS2 | AC‑1, NWM‑2, MON‑4  | Diagrammi, regole firewall, log SIEM |
| "Macchina OEM"        | Hardening e gestione supply chain         | IEC 62443‑4‑1/4‑2   | DEV‑3, CFG‑1, VUL‑2 | Distinta SW, SBOM, risultati test    |

---

## 5) Ambito 1 – Security Program & Governance

- **Learning Objectives** (per Clienti e Collaboratori)
- **Riferimenti normativi principali** (es.: IEC 62443‑2‑1/2‑4, ISO/IEC 27001, NIS2, CRA)
- **Processo**: assessment iniziale → risk register → plan di adeguamento → KPI → audit periodico
- **Ruoli**: Sponsor, CISO/OT, Plant Manager, Qualità, HSE, Fornitori
- **Artefatti**: Politiche, Standard tecnici, Procedure, RACI, Piano formazione
- **Esercizio**: costruzione di una matrice RACI e di un piano 90 giorni

---

## 6) Ambito 2 – Catalogo Controlli Canonici & Normative UE/NA

- **Obiettivo**: riuso nei profili, tracciabilità verso le norme
- **Mappature**: tabella di corrispondenza (es. 62443 ↔ ISO27001 ↔ NIST 800‑82 ↔ NIS2 ↔ NERC CIP)
- **Criteri di scoring**: rischio, impatto su safety/availability, costo/complessità
- **Output**: checklist per audit, report di conformità, roadmap remediation
- **Esercizio**: creare un profilo per “impianto brownfield”

---

## 7) Ambito 3 – Auditing dello Sviluppo Software (SSDLC)

- **Scope**: PLC/RTU/SCADA, HMI, gateway, edge, firmware
- **Riferimenti**: IEC 62443‑4‑1, 62443‑4‑2, OWASP SAMM, ISO/IEC 27034
- **Controlli canonici chiave**: policy coding sicuro, revisione codice, SBOM, gestione vulnerabilità, signing, patching
- **Evidenze**: pipeline CI/CD, risultati SAST/DAST, threat model, test di penetrazione
- **Esercizio**: valutare una pipeline CI/CD e compilare una check‑list SSDLC

---

## 8) Ambito 4 – Auditing Macchine (OEM/Integrator)

- **Scope**: macchine/linee fornite da terzi, retrofitting
- **Riferimenti**: IEC 62443‑3‑3, 62443‑4‑2, requisiti fornitura 2‑4, NDA/contrattualistica, marcatura CE (solo contesto)
- **Controlli canonici chiave**: hardening, accessi remoti, gestione credenziali, logging, update, documentazione tecnica
- **Evidenze**: manuali, configurazioni, SBOM, risultati FAT/SAT, prove di cyber‑safety
- **Esercizio**: checklist per accettazione macchina in ingresso

---

## 9) Raccolta Evidenze & Reporting

- **Metodi di campionamento** (per asset, reti, utenti, procedure)
- **Template di checklist** (incolla o crea qui)
- **Modello di report di audit** (indice, sezioni, criteri di grading)
- **Modello di piano di remediation** (priorità, owner, timeline)

---

## 10) Percorsi Didattici (moduli, tempi, attività)

### Percorso Clienti (suggerito)

1. Introduzione & benefici (20’)
2. Quadro normativo UE/NA (40’)
3. Come funziona l’audit (30’)
4. Evidenze e responsabilità (30’)
5. Casi pratici & Q&A (30’)

### Percorso Collaboratori (suggerito)

1. Data model dei controlli canonici (45’)
2. Metodologia di audit (60’)
3. Profili per dominio (45’)
4. SSDLC e fornitori (60’)
5. Reporting & remediation (45’)
6. Laboratori/esercizi (60’)

---

## 11) Glossario (termini chiave)

> Aggiungi qui i termini e le definizioni usate nelle slide (es.: asset OT, Purdue, SBOM, SSDLC, zone/conduits, ecc.)

---

## 12) Materiali di partenza da incollare qui

- Estratti dalle 3–4 chat precedenti (copia/incolla)
- Diagrammi, tabelle, elenchi di controlli canonici
- Esempi di report o checklist già abbozzati

---

## 13) Checklist di raccolta contenuti (spuntare)

-

---

## 14) Piano lavorativo (bozza)

1. **Convergenza contenuti** in questo documento
2. **Prima bozza slide** (2 deck) + **trainer notes**
3. **Revisione** con esempi reali del cliente
4. **Versione finale** con branding e grafica

> Quando hai incollato i materiali, scrivi "Pronto per la bozza" e preparerò subito **slide** e **testo** a partire da qui.
