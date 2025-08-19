In un contesto industriale OT (Operational Technology) e ICS (Industrial Control Systems), un **ticket** (noto anche come issue, change request o incident) è una registrazione strutturata e tracciata utilizzata per documentare, gestire e risolvere richieste, modifiche, bug, vulnerabilità o incidenti relativi a sistemi critici come PLC, SCADA, HMI o reti OT. I ticket sono fondamentali per garantire tracciabilità, accountability e conformità a standard come **IEC 62443** (cybersecurity per sistemi di automazione industriale) e **NIST SP 800-82** (linee guida per la sicurezza ICS). In ambienti OT/ICS, dove errori o ritardi possono causare downtime costosi, incidenti fisici o violazioni di sicurezza, i ticket servono come strumento centrale per coordinare interventi, monitorare lo stato delle attività e fornire evidenze per audit o requisiti normativi (es. NIS2, ISO 27001). Sono tipicamente gestiti tramite piattaforme come Jira, ServiceNow o BMC Remedy, con workflow che integrano processi di change management, incident response e vulnerability management.

### Cos’è in dettaglio
Un ticket è un record digitale che documenta un problema, una richiesta o un evento, con informazioni strutturate per facilitare la risoluzione e la verifica. In OT/ICS, i ticket possono riguardare:
- **Issue**: Bug o malfunzionamenti (es. errore in un firmware PLC).
- **Change**: Modifiche pianificate (es. aggiornamento software SCADA o configurazione rete).
- **Incident**: Eventi di sicurezza (es. tentativo di accesso non autorizzato rilevato da un IDS).
- **Vulnerabilità**: Gestione di CVE o vulnerabilità interne (es. triage di una CVE su una libreria usata).

I ticket sono integrati con processi come **PSIRT** (Product Security Incident Response Team), **change management** (per approvazioni in ambienti safety-critical) e **supply chain security** (es. tracciamento tramite SBOM). La loro gestione deve rispettare vincoli OT, come minimizzare il downtime, garantire la sicurezza fisica e operare in reti air-gapped.

### Campi minimi
Un ticket in OT/ICS deve includere informazioni essenziali per garantire tracciabilità e completezza:
- **Titolo**: Sintesi del problema o richiesta (es. "Aggiornamento firmware PLC per CVE-2025-XXXX").
- **Descrizione**: Dettagli tecnici e contesto (es. "Vulnerabilità in libreria Modbus, impatta SCADA v2.3").
- **Componente/versione**: Sistema o software affetto (es. "PLC Siemens S7-1200, firmware v4.2").
- **Rischio/severità**: Valutazione basata su CVSS o contesto OT (es. "High, potenziale interruzione processo").
- **Assegnatario**: Team o persona responsabile (es. "Team PSIRT" o "Ingegnere OT").
- **Scadenza**: Timeline per risoluzione, considerando finestre di manutenzione OT (es. "01/09/2025, ore 02:00").
- **Collegamenti**: Riferimenti a commit Git, merge request (MR), build CI/CD, SBOM, CVE o altri ticket correlati.
- **Stato**: Fasi del workflow (es. Open, In Progress, Resolved, Closed).
- **Evidenze finali**: Documentazione di chiusura (es. log di deploy, report di test, VEX per vulnerabilità).

Questi campi supportano audit e conformità, come richiesto da IEC 62443-2-4.

### Policy
Per garantire rigore in OT/ICS:
- **Niente rilascio senza ticket collegato**: Nessuna modifica o aggiornamento (es. patch firmware) può essere rilasciata senza un ticket associato che documenti il processo e l’approvazione.
- **Collegamento automatico dalla CI a ticket ID**: Le pipeline CI/CD (es. GitHub Actions, Jenkins) integrano il ticket ID nei log di build, creando un link tracciabile tra codice, build e issue (es. tramite API Jira).
- **Workflow approvativi**: In OT, includono approvazioni multiple (es. responsabile sicurezza e operations) per evitare impatti su processi critici.
- **Logging immutabile**: I ticket e i relativi log sono conservati in sistemi sicuri (es. SIEM) per audit.

### LLM
Large Language Models (es. Grok) ottimizzano la gestione dei ticket:
- **Generare riepiloghi**: Sintesi tecniche per team OT o report per management (es. "Rischio CVE mitigato, no downtime previsto").
- **Checklist di acceptance**: Creazione automatica di liste di controllo per verificare la risoluzione (es. "Patch testata, log raccolti").
- **Note per advisory e changelog**: Bozze per comunicazioni PSIRT o changelog pubblici, conformi a ISO/IEC 29147.
- **Automazione workflow**: Creazione ticket da alert (es. CVE da scanner) con assegnazioni e priorità suggerite.

### Estensioni per ICS
In ICS, i ticket devono:
- **Supportare ambienti air-gapped**: Registrazione su sistemi locali o supporti fisici per reti isolate.
- **Integrarsi con safety**: Collegamento a requisiti SIL (Safety Integrity Levels) per evitare impatti su processi fisici.
- **Prioritizzare compensating controls**: Se il patching è ritardato (es. per test), il ticket documenta mitigazioni temporanee (es. firewall rules).
- **Audit rigorosi**: Evidenze per conformità a IEC 62443-2-3 o CISA ICS Best Practices.

### Esempio in contesto OT/ICS
Immagina un impianto manifatturiero che riceve un alert per una CVE in una libreria usata nel firmware di un HMI (Human-Machine Interface). Il processo di ticketing:
1. **Creazione ticket** (in Jira):
   - **Titolo**: "Gestione CVE-2025-1234 su HMI firmware v3.1".
   - **Descrizione**: "Vulnerabilità buffer overflow in libreria X, segnalata da ICS-CERT. Impatta HMI in rete OT".
   - **Componente/versione**: "HMI Schneider, firmware v3.1".
   - **Rischio/severità**: "Medium (CVSS 7.5, ma rete air-gapped riduce exploitability)".
   - **Assegnatario**: "Team PSIRT OT".
   - **Scadenza**: "10/09/2025, finestra manutenzione".
   - **Collegamenti**: SBOM (CycloneDX), CVE-2025-1234, commit Git per patch.
   - **Stato**: "Open".
2. **Policy**: La pipeline CI/CD genera il ticket automaticamente da uno scan Trivy, collegandolo al build ID.
3. **LLM**: Genera un riepilogo ("CVE non sfruttabile in configurazione attuale, patch in sviluppo") e una bozza advisory per il cliente.
4. **Risoluzione**: Il team sviluppa un patch, testato in lab virtuale. Il ticket passa a "Resolved" con evidenze: log di test, VEX ("Not Affected" per configurazione disabilitata), e merge request.
5. **Chiusura**: Verbale finale con log SIEM e conferma cliente.

Il ticket assicura tracciabilità, evitando rilasci non autorizzati e supportando audit IEC 62443.

### Evidenze
- **Decision log**: Registro delle decisioni prese nel ticket (es. priorità, mitigazioni).
- **Link a SBOM**: File SBOM collegato al ticket per tracciare componenti.
- **Output scanner**: Report Trivy/Nessus con VEX integrato.
- **Motivazioni VEX-like**: JSON con stato "Not Affected" e giustificazioni.
- **Patch PR**: Link a commit/pull request per il fix.
- **Verbale chiusura**: Documento con esito e log.

### Risorse
- **Diagrammi del flusso**: Flowchart: Alert → Ticket → Triage → Remediation → Closure. Esempi in NIST SP 800-82.
- **Configurazioni chiavi**: Template ticket in Jira/ServiceNow con campi standard.
- **Test di verifica**: Simulazioni con tool come Jira API per validare automazioni.

Per approfondire, consulta CISA ICS Toolkit o IEC 62443-2-3.