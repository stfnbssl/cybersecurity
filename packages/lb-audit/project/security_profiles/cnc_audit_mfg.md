# Profili MFG — CRA/62443 (SDLC & Component) — Unificato

Obiettivo: fornire **profili di sicurezza per Manufacturer (MFG)** riutilizzabili in audit, pen‑test, remediation e fascicolo tecnico, allineando **CRA ↔ IEC 62443‑4‑1 (SDLC)** e **IEC 62443‑4‑2 (CR)** e includendo una **segmentazione di riferimento** (zone & conduits) per la macchina CNC.

---

## 1) Razionale (MFG)

* Il costruttore deve dimostrare **processi di sviluppo sicuro** (4‑1) e **capability di componente (SL‑C)** per le interfacce esposte (4‑2), oltre a fornire **documentazione prodotto** (secure configuration, SBOM, advisories/VEX) utile a AO/SI.
* I profili MFG separano **processo** (SDLC & release) da **prodotto** (componenti e gateway), e aggiungono un **profilo di integrazione di riferimento** per la segmentazione interna macchina.

---

## 2) Profili proposti (panoramica)

* **M1 — MFG — SDLC & Secure Release (CRA/62443‑4‑1)** — profilo *di processo* per release sicure (disclosure, firma, update, SBOM/VEX). *Senza zone/conduits*.
* **M2 — MFG — CNC Component/Cell Security (62443‑4‑2)** — profilo *di prodotto* con requisiti CR e **SL‑C** per interfacce (OPC‑UA/REST, RDP/VNC, engineering).
* **M3 — MFG — CNC Reference Integration (Zones & Conduits)** — profilo *di integrazione di riferimento*, **con zone/conduits** nel perimetro macchina e conduits esterni dichiarati (SL‑T suggeriti). AO/SI ne ereditano la segmentazione.

---

## 3) JSON conformi allo **schema profilo**

### 3.1 M1 — *MFG — SDLC & Secure Release (CRA/62443‑4‑1)*

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

### 3.2 M2 — *MFG — CNC Component/Cell Security (62443‑4‑2)*

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

### 3.3 M3 — *MFG — CNC Reference Integration (Zones & Conduits)*

```json
{
  "profile": {"code":"MFG-CNC-REF","name":"MFG — CNC Reference Integration (Zones & Conduits)","description":"Segmentazione di riferimento per cella CNC e conduits esterni dichiarati"},
  "version": {"semver":"1.0.0","status":"released","release_notes":"Profilo di integrazione di riferimento per CNC"},
  "scope": {
    "owner_role":"Manufacturer","environment":"Edge","lifecycle":"Integration",
    "jurisdiction":["EU"],"essential_service": false,
    "sl_t_zone": 3, "sl_t_conduit": 3,
    "zones":[
      {"name":"Z-Automation","sl_t":3},
      {"name":"Z-HMI","sl_t":2},
      {"name":"Z-Service","sl_t":2}
    ],
    "conduits":[
      {"name":"C-HMI-Automation","from_zone":"Z-HMI","to_zone":"Z-Automation","sl_t":2},
      {"name":"C-Ext-Portal","from_zone":"Z-Service","to_zone":"Portal","sl_t":3},
      {"name":"C-Engineering","from_zone":"Z-Service","to_zone":"Vendor","sl_t":3}
    ]
  },
  "rules": [
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 1."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 2."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 3."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 4."}}},
    {"rule_kind":"include","criteria":{"mappings":{"framework_code":"IEC 62443-4-2","section_prefix":"CR 6."}}},
    {"rule_kind":"set_weight","criteria":{"target":{"kind":"conduit","ref":"C-Ext-Portal"}},"action":{"weight":1.3}}
  ],
  "controls": [
    {"canonical_id":"C-AC-IA","required":true,"weight":1.2,"param_values":{"password_length":"14"},"target":{"kind":"global"}},
    {"canonical_id":"C-NW-SEG","required":true,"weight":1.1,"param_values":{"mgmt_vlan_id":"210"},"target":{"kind":"zone","ref":"Z-Automation"}},
    {"canonical_id":"C-MO-LOG","required":true,"weight":1.2,"param_values":{"retention_days":"365"},"target":{"kind":"conduit","ref":"C-Ext-Portal"}}
  ],
  "checklist_extras": [
    {"canonical_id":"C-NW-SEG","question":"Regole NGFW/allow-list per C-Ext-Portal (OPC-UA/REST)","answer_type":"text","evidence_type_code":"CONFIG"},
    {"canonical_id":"C-MO-LOG","question":"Alerting mTLS/TLS failure sull'endpoint esterno","answer_type":"text","evidence_type_code":"LOG"}
  ]
}
```

---

## 4) Spiegazione delle scelte

* **M1 (SDLC)**: 4‑1/CRA (vulnerability mgmt, disclosure, firma/update, SBOM/VEX). Nessuna zona/conduit perché è *process‑profile*.
* **M2 (4‑2)**: capability **SL‑C** coerenti con le interfacce; conduits esterni pesati (FR1/FR5/FR6).
* **M3 (Reference Integration)**: segmentazione **interna macchina** con conduits esterni dichiarati; AO/SI erediteranno e completeranno lato sito.

---

## 5) SQL scaffolding (minimo)

```sql
-- M1 — MFG-SDLC-CRA
INSERT INTO profile(code, name, description) VALUES ('MFG-SDLC-CRA','MFG — SDLC & Secure Release (CRA/62443-4-1)','Processi e rilasci sicuri') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes)
SELECT id, '1.0.0', 'released', 'Profilo iniziale SDLC & release' FROM profile WHERE code='MFG-SDLC-CRA';
INSERT INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
SELECT id, 'Manufacturer','IT','Design','EU',0,2,2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-SDLC-CRA') AND semver='1.0.0';

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

-- M3 — MFG-CNC-REF
INSERT INTO profile(code, name, description) VALUES ('MFG-CNC-REF','MFG — CNC Reference Integration (Zones & Conduits)','Segmentazione di riferimento per cella CNC') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes)
SELECT id, '1.0.0', 'released', 'Profilo di integrazione di riferimento per CNC' FROM profile WHERE code='MFG-CNC-REF';
INSERT INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
SELECT id, 'Manufacturer','Edge','Integration','EU',0,3,3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-Automation',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-HMI',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-Service',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-HMI-Automation','Z-HMI','Z-Automation',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-Ext-Portal','Z-Service','Portal',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-Engineering','Z-Service','Vendor',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='MFG-CNC-REF') AND semver='1.0.0';
```

---

## 6) Integrazione con AO/SI (inheritance)

* **Uso raccomandato**: AO/SI creano un profilo di sito **figlio** (*inherit*) di `MFG-CNC-REF`, aggiungendo overlay locali (GDPR/NIS2), parametri e pesi specifici, e integrano i **site‑zones**.
* **RACI** (sintesi): zonizzazione interna macchina & conduits esterni dichiarati → **R: MFG**, **A: AO**, **C: SI**; zonizzazione di sito → **R: SI**, **A: AO**, **C: MFG**.
* **Deliverable MFG**: diagrammi *Zones & Conduits Annex*, **Interface Control Document**, **Security Capability Declaration** (CR 4‑2), guida di **secure configuration**.

### sys_source https://chatgpt.com/c/68b120c0-27b8-832b-8d1f-691965bc9ccf?model=gpt-5-thinking