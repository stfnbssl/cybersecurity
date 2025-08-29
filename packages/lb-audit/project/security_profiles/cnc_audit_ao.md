# CNC Audit - AO (IEC 62443‑1‑5)

Questo documento mostra **come raccordare l’intervento di audit sulla macchina CNC** a una **definizione di security profiles** (IEC 62443‑1‑5) e **come avvalersi dei profili** per assessment, pen‑test, remediation e documentazione.

---

## 1) Dal caso reale al modello Zone/Conduits (62443)

**Macchina CNC** con CN Siemens (Sinumerik), soft‑PLC S7‑1500, pannello HMI integrato, PC gateway per accesso remoto (Ubiquiti ASEM), rete interna con **3 VLAN** (Automazione, HMI, Comunicazione esterna), protocolli **PROFINET IRT (Classe 3)** e **PROFISAFE**, comunicazione esterna **OPC‑UA/REST** via **single point** (gateway/NGFW).

### Proposta di segmentazione (profilo logico)

**Zone**

* **Z‑Automation** *(SL‑T 3)* — motion/CN, Soft‑PLC, drive; safety/real‑time → alto requisito di integrità/disponibilità (FR3/FR7), controllo identità macchine (FR1).
* **Z‑HMI** *(SL‑T 2)* — UI locale/remote desktop; esposizione minore, ma controllo accessi e logging (FR1/FR6).
* **Z‑External** *(SL‑T 2)* — PC gateway/DMZ di cella, terminazione OPC‑UA/REST, firewall locale.

**Conduits**

* **C‑HMI↔Automation** *(SL‑T 2)* — RDP/VNC/IPC strettamente necessari; cifratura e allow‑list.
* **C‑External↔Portal** *(SL‑T 3)* — verso rete cliente/portale; TLS mTLS/allow‑list, ispezione applicativa, rate‑limit.
* **C‑Engineering** *(SL‑T 3)* — (se presente) accesso manutenzione; jump host, MFA, session recording.

> **Perché SL‑T misti?** L’area **Automation** e i conduits esposti esternamente sono più critici (safety/real‑time ed esposizione). L’HMI resta a **SL2** se isolata e con RBAC robusto.

---

## 2) Profili di esempio (P1) — Scope & scelte

### Profilo A — *AO — CNC Cell Operations (SL2/SL3 misto)*

* **Ruolo**: AssetOwner • **Ambiente**: OT • **Ciclo di vita**: Operations/Maintenance
* **Giurisdizione**: UE • **Overlay**: GDPR *(solo se trattiamo dati personali degli operatori)*
* **SL‑T**: zone=2 (default), conduits=3 (default); specifiche per zona/conduit come sotto.

**Zones**: Z‑Automation(SL3), Z‑HMI(SL2), Z‑External(SL2)
**Conduits**: C‑HMI↔Automation(SL2), C‑External↔Portal(SL3), C‑Engineering(SL3)

**Scelte chiave**

* **SL3 in Automation**: PROFINET IRT/PROFISAFE richiedono maggiore integrità/anticollisione di traffico e hardening di endpoint.
* **SL3 su conduits esterni/engineering**: esposizione Internet/intranet → identity forte, cifratura, monitoraggio.
* **Overlay GDPR (condizionale)**: se log/telemetria contengono ID operatori → incremento peso/rigore su FR1/FR4/FR6.

### Profilo B — *AO — CNC Remote Access Hardened (SL3 uplift)*

* **Figlio** del Profilo A (mode: *inherit*).
* **Obiettivo**: alzare rigore per **accesso remoto** e **gateway** (conduit SL3), utile quando il PC fa da firewall/SDN client.
* **Override**: MFA obbligatoria, password ≥14, retention log ≥365 gg, segmentazione più stretta, pesi +20–30% su controlli FR1/FR5/FR6.

> **Come si usano**: in audit si parte dal **Profilo A**; se l’impianto usa accesso remoto continuativo o è in ambienti ad alto rischio, si applica l’uplift **Profilo B**.

---

## 3) Esempi JSON (validi per lo schema del progetto)

> Nota: l’elenco **controls** esplicito è illustrativo e usa alcuni *canonical\_id* di esempio già presenti nel catalogo demo (`C-NW-SEG`, `C-AC-IA`, `C-MO-LOG`). In produzione, il **Rule Compiler (P2)** espanderà i criteri su tutto il vostro catalogo; gli ID non presenti **devono essere rifiutati**.

### 3.1 Profilo A — *Scope + Regole + Controlli minimi*

```json
{
  "profile": {"code":"AO-CNC-OPS","name":"AO — CNC Cell Operations (SL2/SL3)","description":"Profilo operativo per cella CNC con CN Siemens, soft-PLC S7-1500, HMI e gateway esterno"},
  "version": {"semver":"1.0.0","status":"draft","release_notes":"Baseline profilo cella CNC"},
  "scope": {
    "owner_role":"AssetOwner","environment":"OT","lifecycle":"Operations",
    "jurisdiction":["EU"],"essential_service": false,
    "sl_t_zone": 2, "sl_t_conduit": 3,
    "overlays":["GDPR"],
    "zones":[
      {"name":"Z-Automation","sl_t":3},
      {"name":"Z-HMI","sl_t":2},
      {"name":"Z-External","sl_t":2}
    ],
    "conduits":[
      {"name":"C-HMI-Automation","from_zone":"Z-HMI","to_zone":"Z-Automation","sl_t":2},
      {"name":"C-External-Portal","from_zone":"Z-External","to_zone":"Portal","sl_t":3},
      {"name":"C-Engineering","from_zone":"Z-External","to_zone":"Vendor","sl_t":3}
    ]
  },
  "rules": [
    {"rule_kind":"include","criteria":{"env":"OT","min_sl":2,"mappings":{"framework_code":"IEC 62443-3-3","section_prefix":"SR 1."}}},
    {"rule_kind":"include","criteria":{"env":"OT","min_sl":2,"mappings":{"framework_code":"IEC 62443-3-3","section_prefix":"SR 5."}}},
    {"rule_kind":"include","criteria":{"env":"OT","min_sl":2,"mappings":{"framework_code":"IEC 62443-3-3","section_prefix":"SR 6."}}},
    {"rule_kind":"set_weight","criteria":{"target":{"kind":"conduit","ref":"C-External-Portal"}},"action":{"weight":1.3}},
    {"rule_kind":"set_weight","criteria":{"target":{"kind":"zone","ref":"Z-Automation"}},"action":{"weight":1.2}},
    {"rule_kind":"set_param","criteria":{"canonical_id":"C-AC-IA"},"action":{"param_values":{"password_length":"12"}}}
  ],
  "controls": [
    {"canonical_id":"C-NW-SEG","required":true,"weight":1.0,"param_values":{"mgmt_vlan_id":"200"},"target":{"kind":"zone","ref":"Z-Automation"}},
    {"canonical_id":"C-AC-IA","required":true,"weight":1.0,"param_values":{"password_length":"12"},"target":{"kind":"global"}},
    {"canonical_id":"C-MO-LOG","required":true,"weight":1.0,"param_values":{"retention_days":"180"},"target":{"kind":"conduit","ref":"C-External-Portal"}}
  ],
  "checklist_extras": [
    {"canonical_id":"C-NW-SEG","question":"Elenco regole firewall attive su C-External-Portal (allow-list by service)","answer_type":"text","evidence_type_code":"CONFIG"},
    {"canonical_id":"C-MO-LOG","question":"Mostrare log TLS handshake e mTLS sull'endpoint OPC-UA/REST","answer_type":"text","evidence_type_code":"LOG"}
  ]
}
```

### 3.2 Profilo B — *Uplift remoto (eredita da A)*

```json
{
  "profile": {"code":"AO-CNC-OPS-RA","name":"AO — CNC Remote Access Hardened (SL3 uplift)","description":"Uplift per accesso remoto e gateway di cella"},
  "version": {"semver":"1.1.0","status":"draft","release_notes":"Uplift SL3 su conduits e identity"},
  "scope": {"owner_role":"AssetOwner","environment":"OT","lifecycle":"Operations","jurisdiction":["EU"],"essential_service": false,
    "sl_t_zone": 3, "sl_t_conduit": 3,
    "zones":[{"name":"Z-Automation","sl_t":3},{"name":"Z-HMI","sl_t":2},{"name":"Z-External","sl_t":3}],
    "conduits":[{"name":"C-External-Portal","from_zone":"Z-External","to_zone":"Portal","sl_t":3}]
  },
  "inheritance": {"parent_profile_code":"AO-CNC-OPS","parent_semver":"1.0.0","mode":"inherit"},
  "rules": [
    {"rule_kind":"set_weight","criteria":{"target":{"kind":"conduit","ref":"C-External-Portal"}},"action":{"weight":1.4}},
    {"rule_kind":"set_weight","criteria":{"mappings":{"framework_code":"IEC 62443-3-3","section_prefix":"SR 1."}},"action":{"weight":1.3}},
    {"rule_kind":"set_param","criteria":{"canonical_id":"C-AC-IA"},"action":{"param_values":{"password_length":"14"}}}
  ],
  "controls": [
    {"canonical_id":"C-AC-IA","required":true,"weight":1.3,"param_values":{"password_length":"14"},"target":{"kind":"global"}},
    {"canonical_id":"C-MO-LOG","required":true,"weight":1.2,"param_values":{"retention_days":"365"},"target":{"kind":"conduit","ref":"C-External-Portal"}},
    {"canonical_id":"C-NW-SEG","required":true,"weight":1.2,"param_values":{"mgmt_vlan_id":"210"},"target":{"kind":"zone","ref":"Z-Automation"}}
  ],
  "checklist_extras": [
    {"canonical_id":"C-AC-IA","question":"Evidenza MFA per account operatori e accesso engineering (IdP/AD OT)","answer_type":"text","evidence_type_code":"CONFIG"}
  ]
}
```

---

## 4) SQL scaffolding (INSERT minimi)

> Da usare dopo aver caricato il **DDL** del repository. Gli ID/nomi zone‑conduits corrispondono agli esempi JSON.

```sql
-- PROFILO A (AO-CNC-OPS)
INSERT INTO profile(code, name, description) VALUES ('AO-CNC-OPS','AO — CNC Cell Operations (SL2/SL3)','Cella CNC con CN Siemens e gateway esterno') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes)
SELECT id, '1.0.0', 'released', 'Baseline profilo cella CNC' FROM profile WHERE code='AO-CNC-OPS';

-- Scope
INSERT INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
SELECT id, 'AssetOwner','OT','Operations','EU',0,2,3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';

-- Zone & conduits
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-Automation',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-HMI',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_zone(profile_version_id, zone_name, sl_t)
SELECT id, 'Z-External',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';

INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-HMI-Automation','Z-HMI','Z-Automation',2 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-External-Portal','Z-External','Portal',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t)
SELECT id, 'C-Engineering','Z-External','Vendor',3 FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';

-- Controlli minimi (demo IDs)
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT id, 'C-NW-SEG',1,1.0,'{"mgmt_vlan_id":"200"}','zone','Z-Automation' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind)
SELECT id, 'C-AC-IA',1,1.0,'{"password_length":"12"}','global' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT id, 'C-MO-LOG',1,1.0,'{"retention_days":"180"}','conduit','C-External-Portal' FROM profile_version WHERE profile_id=(SELECT id FROM profile WHERE code='AO-CNC-OPS') AND semver='1.0.0';

-- PROFILO B (AO-CNC-OPS-RA), figlio di A
INSERT INTO profile(code, name, description) VALUES ('AO-CNC-OPS-RA','AO — CNC Remote Access Hardened','Uplift per accesso remoto e gateway di cella') ON CONFLICT DO NOTHING;
INSERT INTO profile_version(profile_id, semver, status, release_notes, previous_version_id)
SELECT p2.id, '1.1.0', 'released', 'Uplift SL3 su conduits e identity', pv.id
FROM profile p1
JOIN profile p2 ON p2.code='AO-CNC-OPS-RA'
JOIN profile_version pv ON pv.profile_id=p1.id AND pv.semver='1.0.0'
WHERE p1.code='AO-CNC-OPS';

INSERT INTO profile_inheritance(parent_profile_version_id, child_profile_version_id, mode)
SELECT pvA.id, pvB.id, 'inherit'
FROM profile_version pvA
JOIN profile pA ON pA.id=pvA.profile_id AND pA.code='AO-CNC-OPS' AND pvA.semver='1.0.0'
JOIN profile_version pvB
JOIN profile pB ON pB.id=pvB.profile_id AND pB.code='AO-CNC-OPS-RA' AND pvB.semver='1.1.0';

-- Override controlli (demo IDs)
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind)
SELECT pvB.id, 'C-AC-IA',1,1.3,'{"password_length":"14"}','global'
FROM profile_version pvB JOIN profile pB ON pB.id=pvB.profile_id AND pB.code='AO-CNC-OPS-RA' AND pvB.semver='1.1.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT pvB.id, 'C-MO-LOG',1,1.2,'{"retention_days":"365"}','conduit','C-External-Portal'
FROM profile_version pvB JOIN profile pB ON pB.id=pvB.profile_id AND pB.code='AO-CNC-OPS-RA' AND pvB.semver='1.1.0';
INSERT INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, target_kind, target_ref)
SELECT pvB.id, 'C-NW-SEG',1,1.2,'{"mgmt_vlan_id":"210"}','zone','Z-Automation'
FROM profile_version pvB JOIN profile pB ON pB.id=pvB.profile_id AND pB.code='AO-CNC-OPS-RA' AND pvB.semver='1.1.0';
```

---

## 5) Come l’audit **si avvale** dei profili

1. **Scoping rapido**: mappo la macchina al modello zone/conduits e seleziono il profilo (A o B).
2. **Compilazione regole (P2)**: genera l’elenco esplicito di controlli **per zona/conduit**; nessun ID inventato.
3. **Export checklist**: `v_profile_checklist` → Excel/CSV; carico owner/stato evidenze; applico overlay GDPR se necessario.
4. **Pen‑test mirato**: casi su conduits SL3 (mTLS OPC‑UA/REST, session hijack RDP/VNC, bypass NGFW, DoS traffic shaping PROFINET).
5. **Remediation**: uso i pesi per priorità; `v_profile_mappings` per copertura **SR/CR** e gap.
6. **Fascicolo tecnico** (Regolamento Macchine 2023/1230): allego export profilo, checklist ed evidenze; traccio *diff* pre‑/post‑remediation.
7. **Monitoraggio**: `v_profile_evidence_summary` come KPI; pianifico **DR test** e patching (Fase 5).

---

## 6) Note operative specifiche CNC

* **PROFINET IRT/PROFISAFE**: isolare il traffico real‑time; evitare ispezione profonda inline che alteri timing; preferire enforcement L2/L3 (ACL/VLAN/TSN) e monitoraggio passivo.
* **Remote desktop (RDP/VNC)**: consentire solo da **jump host** con MFA; session recording; disabilitare clipboard/drive‑mapping se non necessari.
* **OPC‑UA/REST**: TLS con **client cert** e profili di sicurezza OPC‑UA moderni; policy di *node/endpoint allow‑list*.
* **SDN in sperimentazione**: trattare come **overlay** (risk‑flag) → richiedere cambio/approvazione versionata della policy di rete e test in *maintenance window*.
* **Backup**: immagini CN/PLC, ricette, licenze; vault immutabile; **DR test** periodico (vedi Glossario §K.1).

### sys_source https://chatgpt.com/c/68b120c0-27b8-832b-8d1f-691965bc9ccf?model=gpt-5-thinking