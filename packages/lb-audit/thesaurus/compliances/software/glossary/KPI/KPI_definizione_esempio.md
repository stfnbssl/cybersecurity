In un contesto industriale OT (Operational Technology) e ICS (Industrial Control Systems), i **KPI (Key Performance Indicators)** sono metriche fondamentali per garantire tracciabilità, sicurezza e conformità nella gestione dei processi di cybersecurity, specialmente in ambienti critici dove i sistemi (es. PLC, SCADA, HMI) controllano processi fisici come linee di produzione, reti energetiche o impianti chimici. Questi strumenti supportano la conformità a standard come **IEC 62443** (cybersecurity per IACS), **NIST SP 800-161** (gestione rischi supply chain) e normative come EO 14028, riducendo rischi di attacchi (es. supply chain attacks) e fornendo evidenze per audit e RFI/RFP clienti.

---
### 25) KPI – Definizioni
I **KPI (Key Performance Indicators)** sono metriche quantitative che misurano l’efficacia dei processi di sicurezza OT/ICS, fornendo dati per migliorare operazioni, dimostrare conformità e rispondere a requisiti clienti. In OT/ICS, i KPI tengono conto di vincoli come basso downtime e priorità su safety.

#### Definizioni
1. **MTTR CVE critiche**: Tempo medio dalla scoperta di una vulnerabilità critica (via scanner come Trivy o intake PSIRT) alla disponibilità di una patch o mitigazione (es. compensating control come firewall rule). Es. obiettivo: <30 giorni per CVE CVSS ≥ 7.0.
2. **% build con provenance SLSA e firma Cosign**: Percentuale di build con attestazioni SLSA e firme Cosign rispetto al totale: `(build firmate e con attestazione)/(build totali) × 100`. Es. obiettivo: 100% per release critiche.
3. **Copertura SAST/SCA/DAST**: Percentuale di repository o immagini coperti da test automatizzati (Static Application Security Testing, Software Composition Analysis, Dynamic Application Security Testing) a ogni commit o per release. Es. obiettivo: 95% di copertura SCA con Trivy.
4. **Stato PSIRT**:
   - **SLO presa in carico**: Tempo massimo per iniziare il triage di una vulnerabilità (es. 1 giorno lavorativo).
   - **SLO comunicazione al cliente**: Tempo massimo per notificare clienti (es. 3 giorni per advisory).
   - **SLO fix**: Tempo massimo per rilasciare fix/mitigazione (es. 30 giorni per CVE critiche).
5. **Esito dry-run audit**: Punteggio per requisito (compliant, parziale, non compliant) e numero di evidenze mancanti in simulazioni di audit (es. per IEC 62443). Es. obiettivo: 90% compliant, <5 evidenze mancanti.

#### Estensioni per ICS
- **MTTR**: Adatta a finestre di manutenzione OT, con priorità su compensating controls per evitare downtime.
- **Provenance/Signature**: Enfasi su firme offline per air-gapped.
- **PSIRT SLO**: Tempi più lunghi per test estensivi in safety-critical.
- **Audit**: Focus su requisiti SIL e conformità normativa.

#### Esempio in contesto OT/ICS
**Scenario**: Un vendor di PLC monitora KPI per un sistema di controllo idrico:
- **MTTR CVE critiche**: Una CVE (CVSS 8.5) rilevata da Trivy il 01/08/2025; patch disponibile il 15/08/2025 (MTTR: 14 giorni).
- **% build con provenance SLSA e firma Cosign**: 95% delle build firmware v3.2 hanno attestazioni SLSA e firme Cosign.
- **Copertura SAST/SCA/DAST**: 98% dei repository coperti da Trivy in CI/CD.
- **Stato PSIRT**: SLO presa in carico (24h) rispettato; advisory cliente inviato in 2 giorni; fix in 20 giorni.
- **Esito dry-run audit**: 92% compliant per IEC 62443, 3 evidenze mancanti (corrette prima dell’audit reale).

Questi KPI sono estratti dall’Evidence Factory e presentati in un dashboard Grafana per il cliente.

### Risorse
- **Diagrammi del flusso**: Struttura Evidence Factory (directory tree) e workflow KPI (es. discovery → triage → fix).
- **Configurazioni chiavi**: Template JSON per SBOM, VEX, log PSIRT.
- **Test di verifica**: Simulazioni audit con checklist IEC 62443.

Per approfondire, consulta CISA ICS Toolkit o NIST SP 800-161.

### sys_source https://x.com/i/grok?conversation=1957804821454508251