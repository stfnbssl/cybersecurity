# Scopo del documento

Spiegare, in modo operativo, tutti i punti richiesti e fornire micro‑procedure, strumenti consigliati, esempi di prompt per LLM, template e metodi di raccolta delle evidenze per audit e risposte ai clienti.

---

## 1) Golden sources

**Cosa sono**: l’insieme di documenti “fonte di verità” versionati e approvati (policy, norme, procedure, manuali, SBOM, report test, verbali, atti contrattuali).

**Perché servono**: riducono incoerenze nelle risposte a clienti/auditor; abilitano un RAG (Retrieval‑Augmented Generation) affidabile.

**Come si impostano**:

* Repository dedicato (Git) con controllo accessi e tag “approved”.
* Tassonomia: *Norme*, *Policy interne*, *SOP*, *Evidenze*, *Modelli risposte*.
* Naming & versioning: `DOC-TIPO_TITOLO_vMAJOR.MINOR.patch_data`.
* Workflow: proposta → revisione → approvazione → pubblicazione (release/tag) → archiviazione.

**Evidenze**: registro delle approvazioni, changelog, checksum dei file pubblicati.

**LLM**: indicizzare **solo** golden sources; ogni risposta deve citare ID documento + paragrafo.

---

## 2) Modelli RFI/RFP (questionari clienti)

**Cosa sono**: schemi standard per rispondere a richieste di informazioni (RFI) o proposte (RFP) sulla sicurezza/compliance.

**Contenuti tipici**: profilo azienda, SDLC (IEC 62443‑4‑1 / NIST SSDF), supply‑chain security (SBOM, firma, SLSA), vulnerability mgmt/PSIRT, accesso remoto, hardening, supporto/patching, certificazioni.

**Come prepararli**:

* Libreria di **golden answers** versionate e collegate a evidenze (link a commit, job CI, SBOM, attestazioni, verbali).
* Mappatura: Domanda → Risposta base → Evidenza → Riferimento norma.
* Output: PDF firmato + annessi (SBOM, report scanner, policy estratte).

**LLM**: auto‑compilazione con RAG; controllo umano prima dell’invio.

---

## 3) Ticket (issue/Change/Incident)

**Cosa sono**: registrazioni tracciate di richieste, modifiche, bug, vulnerabilità o incidenti.

**Campi minimi**: titolo, descrizione, componente/versione, rischio/severità, assegnatario, scadenza, collegamenti (commit, MR, build, SBOM, CVE), stato, evidenze finali.

**Policy**: niente rilascio senza ticket collegato; collegamento automatico dalla CI a ticket ID.

**LLM**: generare riepiloghi, checklist di acceptance, note per advisory e changelog.

---

## 4) SOP (Standard Operating Procedure)

**Cosa sono**: procedure operative versionate che definiscono “chi fa cosa, come, quando, con quali strumenti ed evidenze”.

**Struttura consigliata**:

* Scopo e campo di applicazione
* Riferimenti (norme/policy)
* Ruoli/responsabilità
* Prerequisiti e strumenti
* Passi operativi numerati
* Criteri di accettazione / uscita
* Evidenze da produrre (file/log/screenshot/attestazioni)
* Revisione/approvazioni

**LLM**: generare la prima bozza; il team la convalida.

---

## 5) SPDX vs CycloneDX (SBOM)

**SPDX**: standard della Linux Foundation orientato a licensing/compliance; molto diffuso per uso legale e supply‑chain.

**CycloneDX**: standard OWASP orientato a sicurezza; include estensioni per vulnerabilità, servizi, composizione.

**Differenze pratiche**:

* Entrambi supportano diversi formati (JSON/XML).
* CycloneDX ha schemi/pedigree utili per risk e VEX; SPDX è eccellente per licenze e provenance.
* Scegli **CycloneDX** per pipeline security e integrazione con Dependency‑Track; **SPDX** quando il focus è licenze/terze parti.

**Evidenza**: allegare SBOM firmata ad ogni release; mantenere storia.

---

## 6) Triage CVE guidato (incl. exception / VEX‑like)

**Obiettivo**: determinare rapidamente *se* e *quanto* una CVE impatta i vostri prodotti/asset.

**Passi**:

1. Allineare SBOM ↔ release/immagini → identificare pacchetti/versioni.
2. Verificare affettazione: *Affected* / *Not Affected* / *Under Investigation*.
3. Motivare “Not Affected” in stile **VEX**: componente non presente; configurazione non sfruttabile; funzione disabilitata; mitigazione già attiva; non in path di esecuzione.
4. Calcolare impatto (CVSS + contesto d’uso).
5. Definire remediation: aggiornamento, mitigazione, compensating control, timeline.

**LLM**:

* riassunto tecnico per ingegneria e management;
* bozza di **nota cliente/advisory**;
* generazione automatica di issue backlog.

**Evidenze**: decision log, link a SBOM, output scanner, motivazioni VEX‑like, patch PR.

---

## 7) OSV (db e scanner)

**Cos’è**: OSV.dev è un database di vulnerabilità orientato a package (ecosistemi come npm, PyPI, Go, crates, ecc.).

**Come usarlo**:

* **OSV‑Scanner** su repository e SBOM (JSON).
* Integrazione CI: fallire la build sopra soglia severità o creare ticket automatici.

**Evidenze**: report scanner versionati per build/release.

---

## 8) Grype/Trivy in CI

**Cos’è**: scanner SCA/Container (immagini, filesystem, repo) per trovare CVE e misconfig.

**Pattern CI**:

* Step “build immagine” → step “SBOM” (Syft) → step “scan” (Grype/Trivy) → policy gate → firma (Cosign) → push.
* Artifact dei report archiviato e linkato al ticket.

**Evidenze**: report JSON, log CI, esito gate.

---

## 9) Runner effimeri (ephemeral)

**Perché**: ridurre rischio di contaminazione/persistenza di segreti e artefatti tra job.

**Come**: runner creati on‑demand (VM/containers), segreti via OIDC/short‑lived, niente volume condiviso persistente, teardown completo a fine job.

**Evidenze**: configurazioni IaC, policy di segreti, log di provisioning/deprovisioning.

---

## 10) SLSA provenance/attestazioni

**Cos’è**: Supply‑chain Levels for Software Artifacts; definisce controlli e **attestazioni** (provenance) che descrivono *come* è stato costruito un artefatto.

**Implementazione**:

* Pipeline dichiarativa, controllo versioni della definizione CI.
* Generare **in‑toto/SLSA provenance** firmata alla build.
* Conservare attestazioni nel registry/artifact store e linkarle alla release.

**Evidenze**: file di attestazione, politica di verifica lato deploy.

---

## 11) Sigstore Cosign (firma artefatti/container)

**Cos’è**: firma e verifica di immagini e artefatti, con opzione keyless (OIDC + trasparenza Rekor) o con chiavi gestite.

**Uso tipico**:

* `cosign sign` dopo il passaggio dei gate security.
* Verifica lato deploy: `cosign verify` + policy (solo immagini firmate da identità X).

**Evidenze**: log firmati, record Rekor, policy di verifica.

---

## 12) Aggiornare/patchare da remoto (OTA)

**Cos’è**: distribuzione di aggiornamenti/patch a dispositivi/impianti sul campo.

**Rischi/controlli**:

* Integrità/autenticità update (firma), canale sicuro, **rollback** sicuro, finestre di manutenzione, staged rollout e canary, registrazione eventi.
* Separazione dei ruoli (chi crea/chi approva/chi pubblica).

**Evidenze**: registro aggiornamenti, firme, esiti, percentuali di adozione, casi di rollback.

---

## 13) Secure Update Policy (TUF‑aligned)

**Contenuti**:

* **Ruoli chiave e chiavi**: *root*, *targets*, *snapshot*, *timestamp* (root offline, rotation plan).
* **Metadati e scadenze**; policy di **rotazione** e di **revoca**.
* **Processo**: build → firma → pubblicazione metadata/artefatti → staged rollout → monitoraggio/rollback.
* **Finestre di manutenzione** e livelli di rischio.

**Evidenze**: documenti di policy, key ceremonies, log di pubblicazione e verifiche.

---

## 14) Note di rilascio per clienti

**Struttura**:

* Sommario, motivazioni (bugfix/security), prodotti/versioni impattate.
* SBOM allegata/link; CVE fixate (ID, severità, riferimento).
* Istruzioni di update e rollback; prerequisiti; impatti noti.
* Canale di supporto e contatti PSIRT.

**LLM**: generare versioni “executive” e “tecnica” a partire dal changelog.

---

## 15) TUF (The Update Framework)

**Cos’è**: standard per la sicurezza del canale di aggiornamento (firma, metadata, deleghe, rotazione, revoche, protezione da attacchi di re‑signing o freeze).

**Estensioni per ICS**: supporto a nodi intermittenti/offline, cache intermedie affidabili, proxy controllati, approvazioni manuali per impianti safety‑critical.

**Evidenze**: diagrammi del flusso TUF, configurazioni chiavi/metadati, test di verifica.

---

## 16) Normalizzazione inventario & correlazione SBOM ↔ asset reali

**Obiettivo**: avere un inventario coerente con componenti effettivamente installati in campo.

**Passi**:

* Normalizzare attributi: vendor, modello, seriale, versione firmware/OS, moduli, IP/ubicazione.
* Collegare ogni asset all’SBOM corrispondente (per versione/seriale/build date).
* Allineare con evidenze di installazione (job log, file manifest, hash).

**Evidenze**: export inventario firmato; mapping asset↔SBOM; report drift (deviazioni).

---

## 17) Raccolta dati da PLC/HMI/IPC & dashboard in Dependency‑Track

**Tooling**:

* Agente leggero o raccolta da API/OPC UA/SSH/WinRM, a seconda del target.
* Parsing dei dati verso formato coerente (JSON) e invio a Dependency‑Track.
* Dashboard per vulnerabilità per linea/prodotto/versione; policy di rischio/gate.

**Evidenze**: snapshot periodici, report trend, decisioni di remediation collegate a ticket.

---

## 18) Playbook di accesso remoto (JIT) + consenso cliente + checklist sessione

**Playbook (estratto)**:

1. Richiesta di intervento → autorizzazione cliente → generazione accesso **JIT** (durata limitata).
2. MFA su identità operatore; accesso tramite bastion/jump con **mTLS**.
3. Scoping minimo necessario; **segregazione** rete; registrazione video/keystroke.
4. Chiusura sessione: revoca JIT, raccolta log, verbale di intervento.

**Testo consenso (sintesi)**: finalità, durata massima, dati trattati/loggati, responsabilità, diritto al recesso, contatti PSIRT/supporto.

**Checklist sessione**: identità verificata, change ticket, finestra, backup/rollback pronti, logging attivo, chiavi temporanee, chiusura e revoca.

---

## 19) Architettura zero‑trust per teleassistenza

**Controlli**: identità forte (MFA), *device posture*, bastion con *policy enforcement*, **session recording**, **mTLS**, segmentazione L3/L7, principio del minimo privilegio, deny‑by‑default.

**Evidenze**: configurazioni del bastion, export policy, registrazioni sessioni, revisione mensile accessi.

---

## 20) Disclosure/PSIRT

**Cos’è**: Product Security Incident Response Team e processo associato per gestione vulnerabilità e incidenti.

**Riferimenti di processo**: ISO/IEC 29147 (disclosure) e ISO/IEC 30111 (handling).

**Flusso**: intake (canali pubblici/privati) → triage → riproduzione → remediation → comunicazione (advisory, CVE) → chiusura → *lessons learned*.

**Evidenze**: SLA presi in carico, timeline, advisory pubblicati, assegnazioni CVE, verbali post‑mortem.

**LLM**: generatori di advisory, Q\&A per supporto, playbook risposta coordinata.

---

## 21) Audit di conformità (evidence‑first)

**Scoping & baseline**:

* Raccolta artefatti (policy, SOP, CI/CD, SBOM, report scanner, training, contratti, accessi remoti).
* Costruzione **matrice Requisiti ↔ Processi ↔ Evidenze** per CRA / 62443‑4‑1 / SSDF.

**Gap analysis**: classificare *quick‑wins* vs *interventi strutturali* (priorità su rischio/sforzo/impatto mercato).

**Hardening SDLC**: aggiornare SOP per threat modeling, secure coding, code review, gestione segreti, SAST/DAST/SCA, SBOM, build, firma, rilascio, OTA, PSIRT.

**Integrazione tool in CI/CD**: Syft (SBOM), Trivy/Grype (scan), Cosign (firma), SLSA (attestazioni), OSV (scanner pacchetti), Dependency‑Track (governance SBOM/vuln).

**Evidence Factory**: cartella/portale che raccoglie **prove tracciate** per audit (vedi §24).

**Dry‑run audit**: checklist d’intervista generata dall’LLM, verifica campionaria evidenze.

**Misurazioni**: conformità parziale a 62443‑4‑1 e SSDF; backlog residuo con owner/date.

**Report & roadmap**: obiettivi (SLSA level target, coverage SBOM, MTTR CVE, % build firmate) e piano 6‑12 mesi.

---

## 22) Desk risposte rapide ai clienti (RFI/RFP)

* Libreria di **golden answers** con link a evidenze (commit, job CI, SBOM, attestazioni, registri accessi remoti).
* **Auto‑compilazione** questionari (SIG‑Lite/CAIQ o custom) con citazione a norma/ID evidenza.
* **SLA**: 24–72h per richieste standard; *fast lane* per audit remoto (telemetria/sessioni registrate).
* **Deliverable tipici**: *Secure Development Summary* (62443‑4‑1), *Supply‑chain Security One‑Pager* (SLSA+SBOM+signing), *Vulnerability Management Brief* (PSIRT+SBOM+OSV).

---

## 23) Prompt LLM pronti all’uso (campioni)

* **Estrazione requisiti dai PDF**
  «Estrai dai PDF {CRA|IEC 62443‑4‑1|NIST SSDF} e restituisci tabella: Requisito | Riferimento/Paragrafo | Controllo richiesto | Evidenza SDLC suggerita. Cita sempre ID documento e pagina.»

* **Policy SBOM**
  «Genera una *SBOM Policy* per container e firmware: formato {CycloneDX, SPDX}, punti di raccolta in CI, retention, firma, pubblicazione al cliente. Output in stile SOP con ruoli e evidenze.»

* **Triage CVE**
  «Dato l’SBOM (allegato) e questi CVE, riassumi impatto, exploitability nel nostro contesto, remediation; prepara *nota cliente* e issue di backlog con priorità e scadenze. Indica se *Not Affected* e perché (VEX‑like).»

* **Pipeline SLSA + Cosign**
  «Proponi pipeline GitHub/GitLab che produce attestazioni SLSA (in‑toto) e firma Cosign per immagini/pacchetti. Includi gate di sicurezza e verifica lato deploy.»

* **TUF / Secure Update Policy**
  «Scrivi *Secure Update Policy* allineata a TUF: ruoli/chiavi, rotazione, metadati, rollback, scadenze, finestre di manutenzione, staged rollout.»

* **Teleassistenza 62443‑3‑3**
  «Crea playbook di accesso remoto conforme a IEC 62443‑3‑3: JIT access, MFA, session recording, segregazione, mTLS. Aggiungi testo di consenso per il cliente.»

* **Citazioni obbligatorie**
  «Riformula la risposta includendo, per ogni affermazione normativa, la citazione al paragrafo/pagina della norma/policy interna. Se mancano fonti, dichiaralo.»

---

## 24) Evidence Factory (struttura consigliata)

```
/evidence-factory
  /policies
  /sop
  /ci-cd
    /sbom
    /scan
    /signing
    /provenance
  /releases
    /vX.Y.Z
      /sbom
      /advisory
      /attestations
      /notes
  /psirt
    /intake
    /triage
    /advisories
  /remote-access
    /requests
    /sessions
    /recordings
  /audit
    /checklists
    /interviews
    /samples
  /inventory
   /asset-snapshots
```

---

## 25) KPI – definizioni

* **MTTR CVE critiche**: tempo medio dalla scoperta (scanner/intake) alla disponibilità della patch/mitigazione.
* **% build con provenance SLSA e firma Cosign**: (build firmate e con attestazione)/(build totali) × 100.
* **Copertura SAST/SCA/DAST**: percentuale di repository/immagini coperte da test automatizzati a ogni commit o almeno per release.
* **Stato PSIRT**: SLO presa in carico (es. 1 giorno lavorativo), SLO comunicazione al cliente, SLO fix.
* **Esito dry‑run audit**: punteggio per requisito (compliant/parziale/non compliant) e numero di evidenze mancanti.

---

## 26) Esempi di snippet operativi

**Generare SBOM con Syft**

```
syft packages:./ -o cyclonedx-json > sbom.json
```

**Scansione con Trivy**

```
trivy image --exit-code 1 --severity CRITICAL,HIGH repo/app:tag
```

**Firma con Cosign**

```
cosign sign --yes repo/app:tag
cosign verify repo/app:tag
```

**OSV‑Scanner su SBOM**

```
osv-scanner --sbom=sbom.json --format=json > osv-report.json
```

---

## 27) Modelli pronti

**Template SOP (scheletro)**

```
Titolo: [Nome SOP]
Scopo: [...]
Campo di applicazione: [...]
Riferimenti: [norme/policy]
Ruoli: [owner, approvatore]
Strumenti: [...]
Procedura:
  1) ...
  2) ...
Criteri di accettazione: [...]
Evidenze da produrre: [...]
Versioni e approvazioni: [...]
```

**Template Advisory al cliente**

```
Titolo: Security Advisory [ID]
Prodotti/versioni impattati: [...]
Descrizione: [...]
CVE correlate: [ID, severità, link]
Impatto: [CVSS + contesto]
Soluzione: [patch/mitigazioni]
Istruzioni di applicazione e rollback: [...]
Timeline: [scoperta, fix, rilascio]
Contatti PSIRT: [...]
```

**Testo base consenso teleassistenza (estratto)**

```
Con il presente consenso il Cliente autorizza [Azienda] a una sessione di teleassistenza
limitata nel tempo (max [X] ore), destinata esclusivamente alla diagnosi/ripristino di [...].
La sessione è soggetta a MFA, registrazione e mTLS tramite bastion. Saranno registrati
log tecnici e, ove previsto, tracce video/keystroke. Il Cliente può interrompere la sessione
in qualsiasi momento. I dati saranno conservati per [N] giorni per fini di audit.
```

---

## 28) Come imporre “citazione obbligatoria” nelle risposte LLM

* **Pre‑prompt**: “Non rispondere se non puoi citare ID documento e paragrafo/pagina. Usa solo le Golden Sources.”
* **Validatore**: script che rifiuta risposte senza pattern `[DOC-ID §par]`.
* **UI**: pulsante “Mostra fonti” con link ai documenti versionati.
* **Processo**: approvazione umana delle risposte esterne (4‑eyes principle).

---

## 29) Roadmap d’adozione (riassunto)

1. Creare Golden Sources e Evidence Factory.
2. Integrare SBOM+scanner+firma in CI/CD con runner effimeri.
3. Abilitare SLSA provenance e policy di verifica lato deploy.
4. Definire Secure Update Policy (TUF) e playbook teleassistenza.
5. Allestire PSIRT con modelli advisory e canali disclosure.
6. Avviare desk RFI/RFP con golden answers collegate a evidenze.
7. Eseguire dry‑run audit e misurare KPI trimestralmente.

---

**Nota finale**: ogni sezione è pensata per generare *evidenze* riutilizzabili sia in audit sia nelle risposte ai clienti, riducendo tempi e barriere d’accesso ai mercati.
