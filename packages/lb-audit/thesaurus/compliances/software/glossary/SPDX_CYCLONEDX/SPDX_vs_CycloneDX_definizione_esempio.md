In un contesto industriale OT (Operational Technology) e ICS (Industrial Control Systems), un **SBOM (Software Bill of Materials)** è un inventario strutturato e machine-readable che elenca tutti i componenti software (e firmware) utilizzati in un prodotto o sistema, inclusi versioni, origini e dipendenze. In ambienti OT/ICS, dove i sistemi critici (es. PLC, SCADA, HMI) sono vulnerabili ad attacchi alla supply chain (es. SolarWinds, Log4Shell), gli SBOM sono fondamentali per tracciare componenti, identificare vulnerabilità, garantire conformità a normative come **IEC 62443** (cybersecurity per IACS) e **NIST SP 800-161** (gestione rischi supply chain), e rispondere a requisiti di sicurezza come EO 14028 (US Executive Order su supply chain security). Due standard principali per SBOM sono **SPDX** e **CycloneDX**, ciascuno con punti di forza specifici per licensing, sicurezza e gestione supply chain. In OT/ICS, gli SBOM sono usati per audit, triage CVE, e integrazione con pipeline CI/CD, specialmente in reti air-gapped o ambienti safety-critical.

### Cos’è in dettaglio: SPDX vs CycloneDX
Entrambi gli standard definiscono formati per SBOM, ma si differenziano per focus, struttura e casi d’uso in OT/ICS:

#### SPDX (Software Package Data Exchange)
- **Cos’è**: Standard della Linux Foundation, progettato per documentare componenti software con enfasi su **licensing** e **compliance legale**. È ampiamente adottato per la gestione di obblighi di licenza (es. open source) e provenance nella supply chain.
- **Caratteristiche**:
  - Copre dettagli su licenze (es. MIT, GPL), copyright, e attributi legali.
  - Include informazioni su provenance (es. repository Git, commit ID).
  - Supporta formati JSON, XML, RDF e altri (es. tag-value).
  - Esteso per audit di conformità (es. ISO/IEC 5230 per open source).
- **Caso d’uso in OT/ICS**: Ideale quando il focus è la conformità legale (es. verificare che le licenze di librerie usate in un firmware PLC siano conformi) o la tracciabilità di componenti di terze parti in ambienti regolati (es. energia, sanità).
- **Strumenti**: SPDX Tools, FOSSology, SCANOSS per generazione/analisi.
- **Pro**: Standard maturo, ampiamente adottato in settori legali e open source; forte per provenance e audit normativi.
- **Contro**: Meno orientato a sicurezza (es. vulnerabilità) rispetto a CycloneDX; schema più complesso per pipeline automatizzate.

#### CycloneDX
- **Cos’è**: Standard OWASP, progettato con focus su **sicurezza** e gestione del rischio supply chain. Include estensioni per vulnerabilità, servizi e composizione di sistemi complessi.
- **Caratteristiche**:
  - Supporta **VEX** (Vulnerability Exploitability eXchange) per documentare lo stato di vulnerabilità (es. Affected/Not Affected).
  - Include pedigree (origini e modifiche dei componenti) e dettagli su servizi (es. API in un sistema SCADA).
  - Formati JSON e XML, con schema più snello rispetto a SPDX.
  - Integrazione con tool di sicurezza come Dependency-Track per analisi vulnerabilità.
- **Caso d’uso in OT/ICS**: Preferito per pipeline di sicurezza, triage CVE rapido e integrazione con sistemi di monitoraggio (es. SIEM, IDS). Utile per identificare rischi in firmware o software OT.
- **Strumenti**: CycloneDX CLI, Dependency-Track, Syft per generazione/analisi.
- **Pro**: Orientato alla sicurezza; integrazione nativa con VEX e tool CI/CD; più leggero per automazione.
- **Contro**: Meno dettagliato per licensing rispetto a SPDX; adozione più recente in alcuni settori.

### Differenze pratiche
- **Formati**: Entrambi supportano JSON e XML, interoperabili con tool moderni.
- **Focus**:
  - **SPDX**: Eccellente per licenze, provenance e audit legali. Es. documentare che una libreria in un PLC rispetta GPL.
  - **CycloneDX**: Ottimizzato per sicurezza, con VEX per dichiarare vulnerabilità e pedigree per tracciare modifiche. Es. identificare CVE in una libreria OT.
- **Integrazione**:
  - **CycloneDX**: Ideale per pipeline di sicurezza (es. GitHub Actions con Dependency-Track) e triage CVE rapido in OT.
  - **SPDX**: Preferito per gestione terze parti e compliance in ambienti regolati (es. RFI/RFP).
- **Complessità**: CycloneDX ha uno schema più semplice, adatto a sistemi embedded OT; SPDX è più dettagliato ma complesso.
- **Estensioni**: CycloneDX supporta VEX nativo e dettagli su servizi; SPDX si concentra su metadati legali e provenance.

**Scelta in OT/ICS**:
- Usa **CycloneDX** per pipeline di sicurezza, integrazione con tool come Dependency-Track, e triage CVE in ambienti OT dove la rapidità è cruciale.
- Usa **SPDX** quando il focus è su conformità legale, licenze open source o gestione di terze parti in contesti regolati (es. utility energetiche).

### Evidenze
- **SBOM firmata**: File SBOM (JSON/XML) firmato digitalmente (es. con Sigstore o GPG) allegato a ogni release, per autenticità e integrità.
- **Storia SBOM**: Versionamento in repository (es. Git, Nexus) per tracciare modifiche.
- **Integrazione pipeline**: Output CI/CD con SBOM generato automaticamente (es. tramite Syft o CycloneDX CLI).
- **Report di verifica**: Analisi vulnerabilità (es. da Dependency-Track per CycloneDX) o conformità licenze (es. FOSSology per SPDX).

### Estensioni per ICS
In ICS, gli SBOM devono:
- **Supportare firmware**: Includere componenti embedded (es. librerie in PLC).
- **Funzionare offline**: Archiviare SBOM su supporti sicuri per reti air-gapped.
- **Integrarsi con VEX**: Per CycloneDX, collegare a dichiarazioni di vulnerabilità.
- **Conformità normativa**: Allinearsi a IEC 62443-4-1 e EO 14028 per audit.

### Esempio in contesto OT/ICS
**Scenario**: Un vendor sviluppa un firmware per un HMI in un impianto chimico. Deve fornire un SBOM per un RFP cliente, conforme a IEC 62443.
- **Scelta**: Usa **CycloneDX** per il focus su sicurezza e integrazione VEX.
- **Implementazione**:
  1. La pipeline CI/CD (GitHub Actions) usa Syft per generare un SBOM JSON durante la build del firmware v2.3.
  2. Il file `sbom.json` elenca componenti (es. "libmodbus v3.1.6"), versioni, hash e origini (es. Git commit).
  3. Firma il SBOM con Cosign e lo archivia in Nexus, collegandolo alla release.
  4. Integra VEX per dichiarare che CVE-2025-XXXX è "Not Affected" (funzione vulnerabile disabilitata).
- **Output SBOM** (semplificato):
  ```json
  {
    "bomFormat": "CycloneDX",
    "specVersion": "1.4",
    "components": [
      {
        "name": "libmodbus",
        "version": "3.1.6",
        "purl": "pkg:github/libmodbus@3.1.6",
        "hashes": [{"alg": "SHA-256", "content": "abc123..."}]
      }
    ],
    "vulnerabilities": [
      {
        "id": "CVE-2025-XXXX",
        "status": "not_affected",
        "justification": "vulnerable_code_not_in_use"
      }
    ]
  }
  ```
- **Uso**: Il cliente verifica il SBOM con Dependency-Track, confermando l’assenza di vulnerabilità sfruttabili e la conformità per il deploy in rete OT.

Questo assicura trasparenza, sicurezza e conformità, rispondendo a requisiti RFP.

### Risorse
- **Diagrammi del flusso**: Flowchart: Build → Generazione SBOM → Firma → Storage → Verifica. Esempi su cyclonedx.org o spdx.dev.
- **Configurazioni chiavi**: Template SBOM JSON/XML, script Syft/CycloneDX CLI.
- **Test di verifica**: Analisi con Dependency-Track (CycloneDX) o FOSSology (SPDX).

Per approfondire, consulta CISA SBOM Guidance o IEC 62443-4-1.

### sys_source https://x.com/i/grok?conversation=1957804821454508251