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

### Workflow esempio (GitHub/GitLab)

**Obiettivo**: portare un documento da *draft* a *released* con evidenze tracciate e indicizzazione per l'LLM (solo golden sources "approved").

**Attori e responsabilità (RACI)**

* **Author/Owner**: redige la bozza, mantiene il documento.
* **Reviewer**: verifica contenuti tecnici e di conformità.
* **Approver (Compliance/Quality)**: approva per la pubblicazione (vincolo legale).
* **Indexer Bot**: indicizza solo documenti *approved/released* nel motore RAG.

**Stati e transizioni**

1. `draft` → (PR aperta) → 2) `in-review` → (2 approvazioni + check CI) → 3) `approved` → (tag release) → 4) `released` → (nuova versione pubblicata, indicizzata) → 5) `archived` (se sostituito).

**Struttura repo (esempio)**

```
/golden-sources
  /norme
  /policies
  /sop
  /evidenze
  /modelli-risposte
  /_meta
    CODEOWNERS
    golden.yml            # regole repo
    /ci
      docs-check.yml
      release-docs.yml
```

**Metadata obbligatori (front matter)**
Ogni documento *.md* in golden sources ha front matter YAML:

```
---
doc_id: POL-SDLC-CR
title: "Policy Code Review SDLC"
version: 0.9.0
status: draft
type: policy
owner: nome.cognome@azienda
approver: compliance@azienda
source_refs:
  - IEC 62443-4-1 §5.5
  - NIST SSDF PW.7
last_review: 2025-08-01
---
```

**Naming & path**

```
/policies/POL-SDLC-CR_v0.9.0.md
```

**Pull Request template (.github/pull\_request\_template.md)**

```
## Scopo
[breve descrizione]

## Checklist
- [ ] Front matter completo (doc_id, version, status, owner, approver, source_refs)
- [ ] Collegati: issue/ticket #[ID], requisito/i: [CRA/62443/SSDF]
- [ ] Evidenze previste aggiornate

## Impatti
- [ ] Aggiorna modelli risposte RFI/RFP
- [ ] Richiede training interno
```

**CODEOWNERS (\_meta/CODEOWNERS)**

```
/policies/ @compliance-team @security-lead
/sop/      @quality-team
```

**Protezione branch**

* Main/protected: richiede **2 review**, **status check** verdi (docs-check), **commit firmati**.
* Solo *Approver* può aggiungere etichetta `approved`.

**CI – docs-check (estratto GitHub Actions)**
`_meta/ci/docs-check.yml`

```
name: docs-check
on: [pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verifica front matter obbligatoria
        run: |
          set -e
          missing=0
          for f in $(git diff --name-only origin/main...HEAD | grep -E '^policies/|^sop/'); do
            awk '/^---$/{c++} c==1{print} c>1{exit}' "$f" > fm.yaml || true
            for k in doc_id title version status owner approver; do
              grep -q "^$k:" fm.yaml || { echo "Manca $k in $f"; missing=1; }
            done
          done
          [ "$missing" -eq 0 ]
```

**Regola di approvazione**

* Al merge, il bot imposta `status: approved` e propone `version: 1.0.0` se non ci sono TODO aperti.

**Release & attestazioni**

* Tag: `POL-SDLC-CR_v1.0.0` (annotato e firmato).
* CI genera PDF, calcola checksum, firma il blob, carica in release.

`_meta/ci/release-docs.yml` (estratto)

```
name: release-docs
on:
  push:
    tags:
      - '*_v*'
jobs:
  build-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Estrai file dal tag
        run: |
          FILE=$(git show --name-only --pretty='' $GITHUB_REF | head -1)
          echo "FILE=$FILE" >> $GITHUB_ENV
      - name: Genera PDF + checksum
        run: |
          pandoc "$FILE" -o artifact.pdf || true
          sha256sum "$FILE" artifact.pdf > checksums.txt
      - name: Firma checksum (cosign sign-blob)
        env:
          COSIGN_EXPERIMENTAL: 1
        run: |
          cosign sign-blob --yes checksums.txt > checksums.sig
      - name: Pubblica release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            ${{ env.FILE }}
            artifact.pdf
            checksums.txt
            checksums.sig
```

**Indicizzazione RAG (post-release)**

* Webhook `release` → *Indexer Bot* valida: tag firmato, stato `status: approved` nel front matter.
* Indicizza il contenuto con chiave `doc_id` e version.
* Aggiunge mapping *Requisito → Paragrafo → doc\_id* usato nei prompt con citazioni.

**Evidence Factory (output automatici)**

```
/evidence-factory/policies/POL-SDLC-CR/1.0.0/
  POL-SDLC-CR_v1.0.0.md
  artifact.pdf
  checksums.txt
  checksums.sig
  release.json           # note, tag, commit, reviewers, approver
  pr_url.txt             # link PR di approvazione
```

**Esempio end-to-end**

1. Author crea branch `feat/policy-code-review` e file `/policies/POL-SDLC-CR_v0.9.0.md` con front matter.
2. Apre PR con template compilato → scattano `docs-check` + 2 review.
3. Approver applica label `approved` → merge in `main`.
4. Approver crea tag `POL-SDLC-CR_v1.0.0` (annotato e firmato) → job `release-docs` pubblica artefatti e firme.
5. Webhook notifica Indexer → documento indicizzato come **golden source**. L'LLM userà *solo* questa versione con citazioni `doc_id`.

**Varianti GitLab**

* *Protected branches*, *Merge request approvals*, *gpg signing*, *release-cli*; i job equivalenti in `.gitlab-ci.yml` seguono la stessa logica (lint → release → indicizzazione).

---

## 2) Modelli RFI/RFP) Modelli RFI/RFP (questionari clienti)

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

\[contenuto invariato]

---

## 21bis) Matrice Requisiti ↔ Processi ↔ Evidenze (CRA / IEC 62443‑4‑1 / NIST SSDF)

> **Uso**: copia questa tabella e specializzala per prodotto/linea. Ogni riga ha un “requisito normativo” (con riferimento), il **processo SDLC** che lo soddisfa e le **evidenze** da archiviare in Evidence Factory.

| Requisito normativo                                                                            | Processo SDLC / Controllo                                               | Attività chiave                                                       | Evidenze accettate (campioni)                                                                     |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **CRA – Annex I Part 1(1)**: progettare/sviluppare con sicurezza “appropriate al rischio”.     | **Governance SDLC** (Policy Secure Dev) / 62443‑4‑1 **SM**; SSDF **PO** | Policy SDLC, ruoli, training, separazione ambienti, branch protection | Policy approvata (tag firmato), registro training, screenshot protezioni branch, log accessi repo |
| **CRA – Annex I Part 1(2)(a)**: senza vulnerabilità sfruttabili note al rilascio.              | **SCA/SAST/DAST** in CI; 62443‑4‑1 **SVV**/**SI**; SSDF **PW**          | Scansione code + deps, gating su severità, bug bar                    | Report scanner (Trivy/Grype/SAST), esito gate, ticket remediation                                 |
| **CRA – Vulnerability Handling (Part 2)**: processo di gestione vulnerabilità e aggiornamenti. | **PSIRT & Patch Mgmt**; 62443‑4‑1 **MSI**/**SU**; SSDF **RV**           | Intake, triage, advisory, CVE, patch/mitigazioni, SLA                 | Registro PSIRT, advisory pubblicati, timeline CVE, changelog release                              |
| **IEC 62443‑4‑1 – SR (req. di sicurezza)**                                                     | **Threat Modeling & Req.**; SSDF **PO/PW**                              | Analisi minacce (STRIDE/attack tree), requisiti di sicurezza          | Threat model file, verbali review, lista requisiti tracciata a user story                         |
| **IEC 62443‑4‑1 – SD (secure by design)**                                                      | **Design review**; SSDF **PW**                                          | Difesa in profondità, riduzione superficie, sicurezza per default     | Minutes design, diagrammi aggiornati, check di hardening applicati                                |
| **IEC 62443‑4‑1 – SI (secure implementation)**                                                 | **Coding standards & review**; SSDF **PW**                              | Regole di coding, gestione segreti, code review 4‑eyes                | Checklist review, risultati secret scan, CODEOWNERS, log merge                                    |
| **IEC 62443‑4‑1 – SVV (verifica/validazione)**                                                 | **Test security**; SSDF **PW**                                          | Test requisiti, fuzzing, pen‑test (interno/terza parte)               | Piani/rapporti test, evidenze bugfix, report pen‑test                                             |
| **IEC 62443‑4‑1 – SU (security update)**                                                       | **OTA/TUF**; SSDF **RV**                                                | Politica update sicuri, firma, rollback, maintenance windows          | Secure Update Policy, log TUF metadata, percentuali adozione                                      |
| **IEC 62443‑4‑1 – SG (security guidelines)**                                                   | **Manuali e guide**                                                     | Guide hardening, deployment sicuro, note rilascio                     | Manuale sicurezza firmato, note rilascio con SBOM+CVE                                             |
| **SSDF – PO.1/PO.2**: requisiti e ruoli definiti                                               | **Governance**                                                          | Definizione requisiti interni/esterni; comunicazione a fornitori      | Matrice requisiti, clausole contrattuali, e‑mail/PO con requisiti                                 |
| **SSDF – PS.2/PS.3**: protezione del codice e artefatti                                        | **Repo & Build security**                                               | Protezione CI, runner effimeri, firma artefatti                       | Config CI, policy runner, attestazioni firma (Cosign)                                             |
| **SSDF – PW\.4**: gestione componenti terze parti                                              | **SCA/SBOM**                                                            | SBOM (CycloneDX/SPDX) per ogni build, policy versioni                 | SBOM firmata, report Dependency‑Track, policy eccezioni                                           |
| **SSDF – RV.1/RV.2**: gestione vuln. post‑release                                              | **PSIRT**                                                               | Monitoraggio, risposta, prevenzione recidive                          | Post‑mortem, metriche MTTR, checklist lessons learned                                             |

> **Nota**: personalizza la colonna “Evidenze” con percorsi nella tua **Evidence Factory** (es. `/evidence-factory/ci-cd/sbom/appX/v1.2.3/sbom.cdx.json`).

---

## 21ter) Checklist CI/CD — SBOM, Scanning, Firma, Provenance

### Obiettivi di controllo

1. **SBOM per ogni build** (firmata; CycloneDX o SPDX).
2. **Scanning automatico** (SCA + container; gate su severità).
3. **Firma artefatti** (container/pacchetti) con Cosign.
4. **Provenance/attestazioni** SLSA o in‑toto.
5. **Upload governance**: SBOM e report su Dependency‑Track; collegamento a ticket.

### Gate e policy minime

* Fallire la pipeline per CVE **CRITICAL/HIGH** non accettate.
* Solo immagini **firmate** e con **provenance** possono passare allo stage di deploy.
* Runner **effimeri**, segreti **OIDC/short‑lived**, nessun artefatto persistente non firmato.

### Esempio GitHub Actions (container)

```yaml
name: ci-security
on: [push]
permissions:
  contents: read
  packages: write
  id-token: write   # necessario per Cosign keyless
jobs:
  build-scan-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}

      - name: Build and push image
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

      - name: Generate SBOM (CycloneDX)
        uses: anchore/sbom-action@v0
        with:
          path: .
          format: cyclonedx-json
          output-file: sbom.cdx.json

      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.cdx.json

      - name: Scan image with Trivy (fail on HIGH/CRITICAL)
        uses: aquasecurity/trivy-action@0.20.0
        with:
          image-ref: ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          format: 'table'
          exit-code: '1'
          vuln-type: 'os,library'
          severity: 'HIGH,CRITICAL'

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign image with Cosign (keyless)
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          IMAGE=ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          cosign sign --yes $IMAGE

      - name: Attach SBOM as attestation
        env:
          COSIGN_EXPERIMENTAL: '1'
        run: |
          IMAGE=ghcr.io/${{ github.repository }}:sha-${{ github.sha }}
          cosign attest --yes \
            --predicate sbom.cdx.json \
            --type cyclonedx \
            $IMAGE

  slsa-provenance:
    needs: build-scan-sign
    permissions:
      id-token: write
      contents: write
      packages: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_container_slsa3.yml@v2.1.0
    with:
      image: ghcr.io/${{ github.repository }}
      # Digests per tag saranno risolti automaticamente dal generator in base ai permessi/registry
```

> **Note**:
>
> * Il tag `sha-${{ github.sha }}` è generato automaticamente da `docker/metadata-action` (pattern predefinito). Puoi aggiungere `latest` o tag semantici.
> * Il job `slsa-provenance` usa il workflow ufficiale SLSA per creare attestazioni L3 per l’immagine.

### Esempio GitLab CI (.gitlab-ci.yml)

```yaml
stages: [build, sbom, scan, sign]
variables:
  IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

build:
  stage: build
  image: docker:24
  services: [docker:24-dind]
  script:
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" $CI_REGISTRY
    - docker build -t "$IMAGE" .
    - docker push "$IMAGE"
  artifacts:
    reports:
      dotenv: build.env

sbom:
  stage: sbom
  image: anchore/syft:latest
  script:
    - syft "$IMAGE" -o cyclonedx-json > sbom.cdx.json
  artifacts:
    paths: [sbom.cdx.json]

scan:
  stage: scan
  image: aquasec/trivy:latest
  script:
    - trivy image --exit-code 1 --severity HIGH,CRITICAL "$IMAGE" || EXIT=$?
    - trivy image --format json -o trivy.json "$IMAGE"
    - exit ${EXIT:-0}
  artifacts:
    paths: [trivy.json]

sign:
  stage: sign
  image: gcr.io/projectsigstore/cosign:v2.2.4
  variables:
    COSIGN_EXPERIMENTAL: '1'
  script:
    # Opzione 1: keyless (se OIDC GitLab abilitato e supportato da fulcio)
    - cosign sign --yes "$IMAGE" || echo "Falling back to key-based"
    # Opzione 2: key-based (impostare COSIGN_PRIVATE_KEY e COSIGN_PASSWORD come Protected Variables)
    - if [ -n "$COSIGN_PRIVATE_KEY" ]; then echo "$COSIGN_PRIVATE_KEY" > cosign.key &&
        cosign sign --key cosign.key --yes "$IMAGE"; fi
    - cosign attest --predicate sbom.cdx.json --type cyclonedx --yes "$IMAGE"
  rules:
    - if: $CI_COMMIT_BRANCH
```

### Step di pubblicazione SBOM/Report su Dependency‑Track (facoltativo)

Aggiungi dopo `sbom`/`scan` un job che invii la SBOM:

```yaml
- curl -s -X POST "$DT_URL/api/v1/bom" \
    -H "X-Api-Key: $DT_API_KEY" \
    -F "project=$DT_PROJECT_UUID" \
    -F "autoCreate=true" \
    -F "bom=@sbom.cdx.json"
```

### Collegamenti alle evidenze

* Salva `sbom.cdx.json`, `trivy.json`, log firma/attestazioni in `/evidence-factory/ci-cd/<app>/<version>/`.
* Includi link ai job CI nel ticket di release.

---

Desk risposte rapide ai clienti (RFI/RFP)

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

---

