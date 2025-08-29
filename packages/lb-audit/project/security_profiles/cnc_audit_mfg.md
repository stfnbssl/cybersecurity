# Profili MFG — CRA/62443 (SDLC & Component)

Obiettivo: fornire **profili di sicurezza per Manufacturer (MFG)** che si raccordino al caso CNC e siano riutilizzabili in audit, pen‑test, remediation e fascicolo tecnico, allineando **CRA ↔ IEC 62443‑4‑1 (SDLC)** e **IEC 62443‑4‑2 (CR)**.

---

## 1) Razionale (MFG)

* Il costruttore deve dimostrare **processi di sviluppo sicuro** (4‑1) e **capability di componente (SL‑C)** per le interfacce esposte (4‑2), oltre a fornire **documentazione prodotto** (secure configuration, SBOM, advisories/VEX) utile a AO/SI.
* I profili MFG separano **processo** (SDLC & release) da **prodotto** (componenti e gateway), così che audit e pen‑test possano essere focalizzati e versionati.

---

## 2) Profili proposti

### M1 — *MFG — SDLC & Secure Release (CRA/62443‑4‑1)*

**Scopo**: definire i requisiti minimi di processo/release per firmware/software/immagini macchina (coordinated disclosure, hardening CI/CD, firma e update sicuro, SBOM/VEX, test sicurezza).
**Ruolo**: Manufacturer • **Ambiente**: IT • **Ciclo di vita**: Design
**Overlay**: CRA (obbligatorio), NIS2 (se rientra)
**Output tipici**: policy SDLC, pipeline CI/CD con firma artefatti, SBOM per release, VEX/advisories, report test sicurezza.

### M2 — *MFG — CNC Component/Cell Security (62443‑4‑2, SL‑C target)*

**Scopo**: requisiti di sicurezza per i **componenti** della cella CNC (CN/Soft‑PLC/HMI/gateway) che dichiarano **SL‑C** per le interfacce (OPC‑UA/REST, RDP/VNC, engineering).
**Ruolo**: Manufacturer • **Ambiente**: Edge/OT • **Ciclo di vita**: Integration
**Overlay**: opz. GDPR (se dati personali), opz. NIS2 per notifica vulnerabilità ai clienti enterprise.

> *Uso con il caso CNC*: M1 copre le **release** (firmware/immagini, advisories); M2 copre la **sicurezza di runtime** del gateway/endpoint forniti con la macchina e delle loro interfacce.

---

## 3) Esempi JSON conformi allo **schema profilo**

> Nota: le **regole (rules)** selezionano i controlli dal vostro catalogo tramite mapping a **IEC 62443‑4‑2 CR** e meta di processo (per 4‑1). Le liste `controls` esplicite sono minime e **dimostrative** (usano ID demo); in produzione P2 compilerà l’elenco completo.

### 3.1 M1 — *MFG — SDLC & Secure Release*

```json
{
  "profile": {"code":"MFG-SDLC-CRA","name":"MFG — SDLC & Secure Release (CRA/62443-4-1)","description":"Processi e rilasci sicuri per prodotti/firmware"},
  "version": {"semver":"1.0.0","status":"draft","release_notes":"Profilo iniziale SDLC & release"},
  "scope": {
    "owner_role":"Manufacturer","environment":"IT","lifecycle":"Design",
    "jurisdiction":["EU"],"essential_service": false,
    "sl_t_zone": 2, "sl_t_conduit": 2,
    "overlays":["CRA"],
    "zones":[], "conduits":[]
  },
  "rules": [
    {"rule_kind":"include","criteria":{"process":"SDLC","capability":"vulnerability_management"}},
    {"rule_kind":"include","criteria":{"process":"release","capability":"firmware_signing"}},
    {"rule_kind":"include","criteria":{"process":"release","capability":"sbom_vex"}},
    {"rule_kind":"set_weight","criteria":{"process":"release"},"action":{"weight":1.3}}
  ],
  "controls": []
}
```

### 3.2 M2 — *MFG — CNC Component/Cell Security (SL‑C target)*

```json
{
  "profile": {"code":"MFG-CNC-CR","name":"MFG — CNC Component/Cell Security (62443-4-2)","description":"Requisiti di sicurezza per componenti e gateway di cella CNC"},
  "version": {"semver":"1.0.0","status":"draft","release_notes":"Baseline component/cell security"},
  "scope": {
    "owner_role":"Manufacturer","environment":"Edge","lifecycle":"Integration",
    "jurisdiction":["EU"],"essential_service": false,
    "sl_t_zone": 3, "sl_t_conduit": 3,
    "overlays":[],
    "zones":[{"name":"Component","sl_t":3}],
    "conduits":[{"name":"Ext-Portal","from_zone":"Component","to_zone":"Portal","sl_t":3}]
  },
  "rules": [
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 1."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 2."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 3."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 4."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 6."}}},
    {"rule_kind":"set_weight","criteria":{"target":{"kind":"conduit","ref":"Ext-Portal"}},"action":{"weight":1.3}}
  ],
  "controls": [
    {"canonical_id":"C-AC-IA","required":true,"weight":1.2,"param_values":{"password_length":"14"},"target":{"kind":"global"}},
    {"canonical_id":"C-MO-LOG","required":true,"weight":1.2,"param_values":{"retention_days":"365"},"target":{"kind":"conduit","ref":"Ext-Portal"}},
    {"canonical_id":"C-NW-SEG","required":true,"weight":1.1,"param_values":{"mgmt_vlan_id":"210"},"target":{"kind":"zone","ref":"Component"}}
  ],
  "checklist_extras": [
    {"canonical_id":"C-MO-LOG","question":"SBOM allegata all'ultima release e policy di logging dell'endpoint OPC-UA/REST","answer_type":"text","evidence_type_code":"CONFIG"}
  ]
}
```

---

## 4) Spiegazione delle scelte

* **M1 (SDLC)**: focalizza processi 4‑1 e richieste CRA (gestione vulnerabilità, disclosure, update sicuro, firma, SBOM/VEX). Non lega a zone/conduits perché è **process‑profile**. In audit: si chiedono *policy*, pipeline, attestazioni firma e pacchetti SBOM/VEX per release.
* **M2 (4‑2)**: punta a **SL‑C** coerente con interfacce esposte del gateway/endpoint. Si pesano FR1/FR6/FR5 sui conduits esterni (mTLS OPC‑UA/REST, autenticazione forte, logging/alerting).
* **Overlay GDPR (se applicabile)**: aumenta peso/rigore per identity/logging/cifratura quando i log contengono dati personali (vedi Glossario K.2).

---

## 5) SQL scaffolding minimo

> Eseguire dopo il DDL. Gli ID demo dei controlli sono solo per renderlo eseguibile; il vostro catalogo reale selezionerà molte più voci via *rules*.

```sql
-- M1 — MFG-SDLC-CRA
INSERT INTO profile(code, name, description) VALUES ('MFG-SDLC-CRA','MFG — SDLC & Secure Release (CRA/62443-4-1)','Processi e rilasci sicuri') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes)
SELECT id, '1.0.0', 'released', 'Profilo iniziale SDLC & release' FROM profile WHERE code='MFG-SDLC-CRA';
INSERT INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
SELECT id, 'Manufacturer','IT','Design','EU',0,2,2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-SDLC-CRA') AND semver='1.0.0';

-- Nessuna zona/conduit per profilo di processo; controlli compilati via regole nel vostro tool P2.

-- M2 — MFG-CNC-CR
INSERT INTO profile(code, name, description) VALUES ('MFG-CNC-CR','MFG — CNC Component/Cell Security (62443-4-2)','Requisiti di sicurezza per componenti e gateway di cella') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes)
SELECT id, '1.0.0', 'released', 'Baseline component/cell security' FROM profile WHERE code='MFG-CNC-CR';
INSERT INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
SELECT id, 'Manufacturer','Edge','Integration','EU',0,3,3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Component',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'Ext-Portal','Component','Portal',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';

-- Controlli minimi demo (sostituire/espandere con P2 su catalogo reale)
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind)
SELECT id, 'C-AC-IA',1,1.2,'{"password_length":"14"}','global' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT id, 'C-MO-LOG',1,1.2,'{"retention_days":"365"}','conduit','Ext-Portal' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT id, 'C-NW-SEG',1,1.1,'{"mgmt_vlan_id":"210"}','zone','Component' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-CR') AND semver='1.0.0';
```

---

## 6) Come usarli in audit MFG

1. **Seleziona profilo**: M1 per verificare il ciclo di vita prodotto/release; M2 per verificare le interfacce e le capability SL‑C dei componenti.
2. **Compila controlli** con P2; valida che nessun `canonical_id` sia inventato.
3. **Export checklist** per ogni profilo; allega SBOM/VEX, report test, evidenze di firma e impostazioni di sicurezza runtime.
4. **Pen‑test**: focus su endpoint OPC‑UA/REST (mTLS, authz), RDP/VNC (MFA, session control), aggiornamento sicuro (rollback/resilience).
5. **Fascicolo tecnico (Reg. Macchine)**: includi profili MFG + evidenze; fornisci guida di configurazione sicura a AO/SI.
