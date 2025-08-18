Il **CVE** (Common Vulnerabilities and Exposures) è un sistema standardizzato gestito dalla **MITRE Corporation** per identificare e catalogare in modo univoco le **vulnerabilità di sicurezza** nei software, firmware, sistemi operativi e altri componenti IT. È una base di conoscenza pubblica che fornisce un identificatore standard per ogni vulnerabilità, facilitando la condivisione di informazioni tra organizzazioni, vendor di sicurezza e professionisti per migliorare la gestione delle vulnerabilità e la risposta agli incidenti.

### **Caratteristiche principali di CVE**
- **Identificatori univoci**: Ogni vulnerabilità riceve un ID CVE univoco nel formato **CVE-AAAA-NNNNN**, dove AAAA è l'anno di assegnazione e NNNNN è un numero sequenziale (es. CVE-2023-12345).
- **Descrizione delle vulnerabilità**: Ogni voce CVE include:
  - Una descrizione tecnica della vulnerabilità.
  - Riferimenti al software o hardware interessato (spesso mappato tramite **CPE** - Common Platform Enumeration).
  - Impatti potenziali (es. esecuzione di codice remoto, accesso non autorizzato).
  - Collegamenti a patch, advisory o mitigazioni, se disponibili.
- **Database pubblico**: Le voci CVE sono memorizzate nel **National Vulnerability Database (NVD)** gestito dal NIST, che arricchisce i dati CVE con informazioni aggiuntive, come punteggi CVSS (Common Vulnerability Scoring System) per valutare la gravità.
- **Autorità di numerazione (CNA)**: MITRE coordina l'assegnazione degli ID CVE attraverso le CNA, organizzazioni autorizzate (es. vendor di software, enti di ricerca) che identificano e documentano le vulnerabilità.

### **Obiettivi di CVE**
- **Standardizzazione**: Fornire un linguaggio comune per identificare le vulnerabilità, eliminando ambiguità.
- **Interoperabilità**: Facilitare l'integrazione con strumenti di sicurezza, scanner di vulnerabilità e sistemi di gestione del rischio.
- **Risposta rapida**: Consentire ai vendor e agli utenti di identificare, prioritizzare e mitigare le vulnerabilità in modo tempestivo.
- **Condivisione delle informazioni**: Supportare la collaborazione tra vendor, ricercatori e professionisti della sicurezza.

### **Esempi di vulnerabilità CVE**
- **CVE-2021-44228 (Log4Shell)**: Una vulnerabilità nella libreria Apache Log4j che consentiva l'esecuzione di codice remoto.
- **CVE-2017-0144 (EternalBlue)**: Una vulnerabilità in Microsoft Windows sfruttata dal ransomware WannaCry.
- **CVE-2023-12345**: Un esempio ipotetico di una vulnerabilità in un software specifico che consente l'accesso non autorizzato.

### **Utilizzo**
- **Vendor di software**: Usano CVE per comunicare vulnerabilità nei loro prodotti e rilasciare patch.
- **Analisti di sicurezza**: Correlano le vulnerabilità CVE con scanner (es. Nessus, Qualys) per identificare sistemi a rischio.
- **Organizzazioni**: Prioritizzano le mitigazioni in base alla gravità (CVSS) e all'impatto delle vulnerabilità CVE.
- **Threat Intelligence**: Collegano le vulnerabilità CVE a pattern di attacco (**CAPEC**) o tecniche di avversari (**ATT&CK**).

### **Stato attuale (2025)**
- **Rilevanza**: CVE è uno standard fondamentale nella sicurezza informatica, ampiamente utilizzato e aggiornato quotidianamente. Il database CVE/NVD contiene decine di migliaia di vulnerabilità.
- **Integrazione con OSCAL**: CVE può essere mappato ai modelli di **OSCAL** (Open Security Controls Assessment Language) del NIST per correlare vulnerabilità a controlli di sicurezza.
- **Evoluzione**: MITRE e NIST continuano a migliorare il sistema CVE, con un focus su automazione e integrazione con altri standard.

### **Confronto con CWE, CAPEC, ATT&CK, OCIL, CCE e ARF**
- **CWE (Common Weakness Enumeration)**: CWE descrive le debolezze generiche (es. CWE-79 per XSS) che possono causare vulnerabilità specifiche (CVE). Una voce CVE è spesso collegata a una o più debolezze CWE.
- **CAPEC**: CAPEC descrive i pattern di attacco che sfruttano vulnerabilità (CVE) o debolezze (CWE).
- **ATT&CK**: ATT&CK mappa le tecniche degli avversari, che possono sfruttare vulnerabilità CVE (es. T1190 per sfruttare una vulnerabilità in un server pubblico).
- **OCIL**: OCIL si concentra su checklist manuali per controlli di sicurezza, mentre CVE identifica vulnerabilità specifiche.
- **CCE**: CCE si occupa di configurazioni di sicurezza; una configurazione errata (CCE) può introdurre una vulnerabilità (CVE).
- **ARF**: ARF aggrega i risultati delle valutazioni di sicurezza, che possono includere vulnerabilità CVE rilevate.

### **Risorse**
Per maggiori informazioni, consulta:
- Il sito ufficiale di CVE: https://cve.mitre.org
- Il National Vulnerability Database (NVD): https://nvd.nist.gov
- Risorse correlate come CWE (https://cwe.mitre.org), CAPEC (https://cap

ec.mitre.org) e OSCAL (https://csrc.nist.gov/projects/open-security-controls-assessment-language). Il NVD è particolarmente utile per accedere a dettagli arricchiti sulle vulnerabilità CVE, inclusi punteggi CVSS e riferimenti a patch.