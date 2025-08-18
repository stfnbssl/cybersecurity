**MITRE ATT&CK** (Adversarial Tactics, Techniques, and Common Knowledge) è un framework sviluppato dalla **MITRE Corporation** per catalogare e descrivere le **tattiche, tecniche e procedure (TTP)** utilizzate dagli avversari nelle operazioni di cyberattacco. È una base di conoscenza globale e strutturata che aiuta i professionisti della sicurezza informatica a comprendere il comportamento degli attaccanti, migliorare le difese, modellare le minacce e rispondere agli incidenti.

### **Caratteristiche principali di MITRE ATT&CK**
- **Struttura gerarchica**:
  - **Tattiche**: Rappresentano gli obiettivi strategici di un attaccante (es. accesso iniziale, esecuzione, persistenza, esfiltrazione dei dati). Ci sono 14 tattiche principali nella matrice Enterprise.
  - **Tecniche**: Descrivono i metodi specifici utilizzati per raggiungere un obiettivo tattico (es. phishing per l'accesso iniziale, utilizzo di PowerShell per l'esecuzione). Ogni tecnica ha un ID univoco (es. T1566 per Phishing).
  - **Sottotecniche**: Dettagli più specifici di una tecnica (es. T1566.001 per Spearphishing Attachment).
  - **Procedure**: Esempi concreti di come una tecnica è stata implementata da attori malevoli (es. un gruppo specifico che utilizza un malware particolare).
- **Matrici multiple**: ATT&CK copre diversi ambiti:
  - **Enterprise**: Per attacchi a reti aziendali, sistemi operativi (Windows, Linux, macOS) e ambienti cloud.
  - **Mobile**: Per attacchi a dispositivi mobili (iOS, Android).
  - **ICS** (Industrial Control Systems): Per attacchi a sistemi di controllo industriale.
- **Collegamenti ad altri framework**:
  - **CAPEC**: ATT&CK si integra con CAPEC (Common Attack Pattern Enumeration and Classification) per correlare tecniche di attacco a pattern generici.
  - **CWE** e **CVE**: Le tecniche ATT&CK possono essere mappate a debolezze (CWE) o vulnerabilità specifiche (CVE).
  - **NIST 800-53 e OSCAL**: ATT&CK può essere usato per mappare controlli di sicurezza per la conformità.
- **Focus sugli attori**: ATT&CK include informazioni su gruppi di attacco noti (es. APT28, Lazarus Group), collegando le loro TTP a tecniche specifiche.

### **Obiettivi di ATT&CK**
- **Threat Intelligence**: Fornire una base di conoscenza per comprendere le TTP degli avversari.
- **Modellazione delle minacce**: Identificare i rischi specifici per un'organizzazione mappando le TTP rilevanti.
- **Rilevamento e risposta**: Aiutare i team di sicurezza a sviluppare regole di rilevamento (es. per SIEM) e strategie di risposta agli incidenti.
- **Formazione e simulazione**: Supportare esercitazioni di red teaming e blue teaming per testare le difese.
- **Valutazione della sicurezza**: Valutare la copertura dei controlli di sicurezza rispetto alle tecniche di attacco.

### **Esempi di tattiche e tecniche**
- **Tattica: Accesso iniziale**
  - Tecnica: **T1566 - Phishing** (invio di email malevole per ottenere accesso).
  - Sottotecnica: **T1566.001 - Spearphishing Attachment** (email con allegati malevoli).
- **Tattica: Esecuzione**
  - Tecnica: **T1059 - Command and Scripting Interpreter** (uso di PowerShell o Bash per eseguire comandi malevoli).
- **Tattica: Esfiltrazione**
  - Tecnica: **T1041 - Exfiltration Over C2 Channel** (trasferimento di dati tramite un canale di comando e controllo).

### **Utilizzo**
- **Difensori**: I team di sicurezza utilizzano ATT&CK per mappare le minacce, configurare sistemi di rilevamento e migliorare la resilienza.
- **Red Team**: I penetration tester simulano attacchi basati su tecniche ATT&CK per testare le difese.
- **Analisti di threat intelligence**: Correlano le attività di gruppi di attacco con le TTP di ATT&CK.
- **Sviluppatori di strumenti**: Produttori di SIEM, EDR e altri strumenti di sicurezza integrano ATT&CK per migliorare il rilevamento.

### **Stato attuale (2025)**
- **Rilevanza**: ATT&CK è uno degli standard più utilizzati e influenti nella sicurezza informatica, con aggiornamenti regolari (l'ultima versione stabile al 2023 è la v13, con v14 attesa). È ampiamente adottato da organizzazioni governative, aziende private e vendor di sicurezza.
- **Integrazione con OSCAL**: ATT&CK può essere usato con **OSCAL** (Open Security Controls Assessment Language) del NIST per mappare tecniche di attacco a controlli di sicurezza, migliorando la gestione della conformità.
- **Evoluzione**: MITRE continua a espandere ATT&CK, aggiungendo nuove tecniche, sottotecniche e matrici (es. per ambienti cloud e IoT).

### **Confronto con CAPEC, OCIL, CCE e ARF**
- **CAPEC**: CAPEC descrive pattern di attacco generici, spesso legati a vulnerabilità software, mentre ATT&CK si concentra su TTP operative degli avversari. CAPEC è più astratto, ATT&CK più operativo.
- **OCIL**: OCIL gestisce checklist manuali per controlli di sicurezza, mentre ATT&CK descrive il comportamento degli attaccanti, non i controlli.
- **CCE**: CCE identifica configurazioni di sicurezza; ATT&CK mostra come queste configurazioni possono essere sfruttate.
- **ARF**: ARF aggrega i risultati delle valutazioni di sicurezza; ATT&CK fornisce un contesto per interpretare quei risultati in termini di minacce.

### **Risorse**
Per approfondire, visita il sito ufficiale di MITRE ATT&CK (https://attack.mitre.org) o esplora risorse correlate come CAPEC (https://capec.mitre.org) e OSCAL (https://csrc.nist.gov/projects/open-security-controls-assessment-language). ATT&CK offre anche strumenti come il **Navigator** per visualizzare e mappare le tecniche in modo interattivo.

### sys_source https://x.com/i/grok?conversation=1956932825732571284
### sys_author MITRE
### sys_practice Threat Intelligence
