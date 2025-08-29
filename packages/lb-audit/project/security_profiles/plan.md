# 62443-1-5 security profiles

First-class, versioned, and traceable from scope → rules → controls → checklist → evidence.

# Plan (data model + workflow)

We’ll treat a **Profile** as a *stable identity* (name/code/owner) with many **Profile Versions** (semver; draft → review → released → deprecated). 
Each **version** captures: 
(a) **scope** (role, environment, lifecycle, jurisdiction, essential service, SL-T targets, zones/conduits), 
(b) **rules** (include/exclude/overlay/params/weights) that deterministically compile into an explicit list of **profile\_controls**, and 
(c) optional **checklist extras** produced by your E1–E3 pipeline. 
**Inheritance/overlays** are captured via a `profile_inheritance` edge between versions; a recursive “lineage” view resolves the effective control set with **child overrides winning**.

Authoring flow (aligned to 62443-1-5):
**P1 (Scope)** collects constrained enums (role/env/lifecycle, SL-T targets, overlays like GDPR/NIS2, zone/conduit SL-T).
**P2 (Rule compiler)** turns scope → **rules** → **explicit controls** (no hallucinated IDs), applying inheritance and overlays into `profile_control` with `param_values`, `required`, `weight`, `conditions`, and target binding (`global|zone|conduit`).
**P3 (Checklist specialization)** adds ≤2 targeted items per control to `profile_checklist_extra`. Views materialize **profile → controls → checklist (dedup) → evidence summary**, and coverage vs your existing **mappings to 62443-3-3 SR / 4-2 CR**.

---

# SQL DDL (PostgreSQL-first, SQLite-compatible)

> Notes
> • JSON stored as `TEXT` for portability (use `JSONB` in Postgres if you prefer).
> • This includes tiny **demo** canonical tables so views run end-to-end. Replace them with your real catalog in production.

```sql
-- =========================
-- DEMO canonical catalog (replace with your real schema)
-- =========================
CREATE TABLE IF NOT EXISTS evidence_type (
  code TEXT PRIMARY KEY,
  description TEXT
);

CREATE TABLE IF NOT EXISTS canonical_control (
  canonical_id TEXT PRIMARY KEY,
  objective TEXT,
  statement TEXT,
  type TEXT,
  risk_theme TEXT,
  criticality INTEGER,
  applicability TEXT,      -- JSON: {role, env, lifecycle, min_security_level, conditions}
  params TEXT              -- JSON: [{name, description, default}]
);

CREATE TABLE IF NOT EXISTS control_mapping (
  canonical_id TEXT,
  framework_code TEXT,     -- e.g., 'IEC 62443-3-3' or 'IEC 62443-4-2'
  section_path TEXT,       -- e.g., 'SR 1.1' or 'CR 2.1'
  relation TEXT,           -- e.g., 'implements', 'supports'
  PRIMARY KEY (canonical_id, framework_code, section_path, relation),
  FOREIGN KEY (canonical_id) REFERENCES canonical_control(canonical_id)
);

CREATE TABLE IF NOT EXISTS checklist_item (
  id INTEGER PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_type TEXT NOT NULL,        -- e.g., 'boolean', 'text', 'enum'
  evidence_type_code TEXT,          -- FK into evidence_type
  FOREIGN KEY (canonical_id) REFERENCES canonical_control(canonical_id),
  FOREIGN KEY (evidence_type_code) REFERENCES evidence_type(code)
);

-- =========================
-- Profiles core
-- =========================
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                -- stable identity, e.g., 'AO-OT-OPS'
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS profile_version (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL,
  semver TEXT NOT NULL,                     -- e.g., '1.0.0'
  status TEXT NOT NULL CHECK (status IN ('draft','in_review','released','deprecated')),
  release_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  previous_version_id INTEGER,
  FOREIGN KEY (profile_id) REFERENCES profile(id),
  FOREIGN KEY (previous_version_id) REFERENCES profile_version(id),
  UNIQUE (profile_id, semver)
);

-- Scope for a specific version (62443-1-5 constructs)
CREATE TABLE IF NOT EXISTS profile_scope (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL UNIQUE,
  owner_role TEXT NOT NULL CHECK (owner_role IN ('AssetOwner','SystemIntegrator','Manufacturer')),
  environment TEXT NOT NULL CHECK (environment IN ('OT','IT','Edge')),
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('Design','Integration','Commissioning','Operations','Maintenance','Decommissioning')),
  jurisdiction TEXT,                       -- e.g., 'EU', 'US', 'IT', 'DE' (comma-separated if multiple)
  essential_service INTEGER NOT NULL CHECK (essential_service IN (0,1)),  -- boolean
  sl_t_zone INTEGER,                       -- target SL-T for zones (0-4)
  sl_t_conduit INTEGER,                    -- target SL-T for conduits (0-4)
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id)
);

-- Optional overlays applied to this version (e.g., 'GDPR', 'NIS2', 'HIPAA')
CREATE TABLE IF NOT EXISTS profile_overlay (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  overlay_code TEXT NOT NULL,
  note TEXT,
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id)
);

-- Zones & conduits for profile scoping (names must be unique per version)
CREATE TABLE IF NOT EXISTS profile_zone (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  zone_name TEXT NOT NULL,
  sl_t INTEGER,                             -- 0-4
  UNIQUE (profile_version_id, zone_name),
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id)
);

CREATE TABLE IF NOT EXISTS profile_conduit (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  conduit_name TEXT NOT NULL,
  from_zone TEXT NOT NULL,
  to_zone TEXT NOT NULL,
  sl_t INTEGER,
  UNIQUE (profile_version_id, conduit_name),
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id)
);

-- Human-readable rules used to compile the explicit control set
CREATE TABLE IF NOT EXISTS profile_rule (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  rule_order INTEGER NOT NULL,
  rule_kind TEXT NOT NULL CHECK (rule_kind IN ('include','exclude','set_param','set_weight')),
  criteria_json TEXT,                       -- JSON: filters over control fields/mappings
  action_json TEXT,                         -- JSON: {param_values},{weight},{required}
  note TEXT,
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id)
);

-- Inheritance/overlay graph between versions (child overrides parent)
CREATE TABLE IF NOT EXISTS profile_inheritance (
  id INTEGER PRIMARY KEY,
  parent_profile_version_id INTEGER NOT NULL,
  child_profile_version_id INTEGER NOT NULL UNIQUE,
  mode TEXT NOT NULL CHECK (mode IN ('inherit','overlay')),
  order_index INTEGER NOT NULL DEFAULT 1,   -- if multiple parents (overlays), apply ascending
  FOREIGN KEY (parent_profile_version_id) REFERENCES profile_version(id),
  FOREIGN KEY (child_profile_version_id) REFERENCES profile_version(id)
);

-- The compiled, explicit set of controls for a profile version (and optional target binding)
CREATE TABLE IF NOT EXISTS profile_control (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  canonical_id TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,      -- boolean
  weight REAL NOT NULL DEFAULT 1.0,         -- >= 0
  param_values TEXT,                        -- JSON: {paramName: value, ...}
  conditions TEXT,                          -- JSON: e.g., {"jurisdiction":"EU"} or {"overlay":"GDPR"}
  target_kind TEXT NOT NULL DEFAULT 'global' CHECK (target_kind IN ('global','zone','conduit')),
  target_ref TEXT,                          -- zone_name or conduit_name when bound
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('direct','inherited','overlay')),
  source_profile_version_id INTEGER,
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id),
  FOREIGN KEY (canonical_id) REFERENCES canonical_control(canonical_id),
  FOREIGN KEY (source_profile_version_id) REFERENCES profile_version(id)
);

-- Optional profile-specific extra checklist items (<=2 per control)
CREATE TABLE IF NOT EXISTS profile_checklist_extra (
  id INTEGER PRIMARY KEY,
  profile_version_id INTEGER NOT NULL,
  canonical_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer_type TEXT NOT NULL,
  evidence_type_code TEXT,
  note TEXT,
  FOREIGN KEY (profile_version_id) REFERENCES profile_version(id),
  FOREIGN KEY (canonical_id) REFERENCES canonical_control(canonical_id),
  FOREIGN KEY (evidence_type_code) REFERENCES evidence_type(code)
);

-- =========================
-- Views & helper logic
-- =========================

-- lineage: for every version, list itself (depth=0) + ancestors (depth>0)
WITH RECURSIVE _lineage(v_id, ancestor_id, depth) AS (
  SELECT id, id, 0 FROM profile_version
  UNION ALL
  SELECT l.v_id, pi.parent_profile_version_id, l.depth + 1
  FROM _lineage l
  JOIN profile_inheritance pi ON pi.child_profile_version_id = l.ancestor_id
)
SELECT 1; -- (no-op to keep SQLite happy when running all at once)

-- Resolved controls: child overrides parent (closest depth wins)
CREATE VIEW IF NOT EXISTS v_profile_controls_resolved AS
WITH RECURSIVE lineage(v_id, ancestor_id, depth) AS (
  SELECT id, id, 0 FROM profile_version
  UNION ALL
  SELECT l.v_id, pi.parent_profile_version_id, l.depth + 1
  FROM lineage l
  JOIN profile_inheritance pi ON pi.child_profile_version_id = l.ancestor_id
),
joined AS (
  SELECT
    l.v_id AS profile_version_id,
    pc.canonical_id,
    pc.required,
    pc.weight,
    pc.param_values,
    pc.conditions,
    pc.target_kind,
    pc.target_ref,
    pc.source,
    pc.source_profile_version_id,
    l.depth
  FROM profile_control pc
  JOIN lineage l ON pc.profile_version_id = l.ancestor_id
)
SELECT j.profile_version_id,
       j.canonical_id,
       j.required,
       j.weight,
       j.param_values,
       j.conditions,
       j.target_kind,
       j.target_ref
FROM joined j
WHERE NOT EXISTS (
  SELECT 1 FROM joined j2
  WHERE j2.profile_version_id = j.profile_version_id
    AND j2.canonical_id = j.canonical_id
    AND j2.target_kind = j.target_kind
    AND IFNULL(j2.target_ref,'') = IFNULL(j.target_ref,'')
    AND j2.depth < j.depth
);

-- Checklist expansion: base catalog checklist + profile extras (dedup by (canonical_id, question))
CREATE VIEW IF NOT EXISTS v_profile_checklist AS
WITH base AS (
  SELECT v.profile_version_id,
         ci.canonical_id,
         ci.id AS checklist_item_id,
         ci.question,
         ci.answer_type,
         ci.evidence_type_code,
         'base' AS source
  FROM v_profile_controls_resolved v
  JOIN checklist_item ci ON ci.canonical_id = v.canonical_id
),
extras AS (
  SELECT pce.profile_version_id,
         pce.canonical_id,
         pce.id AS checklist_item_id,
         pce.question,
         pce.answer_type,
         pce.evidence_type_code,
         'extra' AS source
  FROM profile_checklist_extra pce
)
SELECT profile_version_id,
       canonical_id,
       MIN(checklist_item_id) AS checklist_item_id, -- stable pick for dedup
       question,
       answer_type,
       evidence_type_code,
       MIN(source) AS source
FROM (
  SELECT * FROM base
  UNION ALL
  SELECT * FROM extras
)
GROUP BY profile_version_id, canonical_id, question, answer_type, evidence_type_code;

-- Evidence summary per profile version
CREATE VIEW IF NOT EXISTS v_profile_evidence_summary AS
SELECT
  v.profile_version_id,
  et.code AS evidence_type_code,
  et.description AS evidence_type_description,
  COUNT(*) AS item_count
FROM v_profile_checklist v
LEFT JOIN evidence_type et ON et.code = v.evidence_type_code
GROUP BY v.profile_version_id, et.code, et.description;

-- Coverage vs IEC 62443-3-3 and 62443-4-2 (unique SR/CR sections touched)
CREATE VIEW IF NOT EXISTS v_profile_mappings AS
SELECT
  v.profile_version_id,
  cm.framework_code,
  cm.section_path,
  COUNT(DISTINCT v.canonical_id) AS controls_covering
FROM v_profile_controls_resolved v
JOIN control_mapping cm ON cm.canonical_id = v.canonical_id
WHERE cm.framework_code IN ('IEC 62443-3-3','IEC 62443-4-2')
GROUP BY v.profile_version_id, cm.framework_code, cm.section_path;

-- Optional: simple, parameterizable diff mechanism
CREATE TABLE IF NOT EXISTS profile_diff_request (
  left_profile_version_id INTEGER,
  right_profile_version_id INTEGER
);

CREATE VIEW IF NOT EXISTS v_profile_control_diff AS
WITH
L AS (
  SELECT canonical_id, target_kind, IFNULL(target_ref,'') AS target_ref,
         required, weight, IFNULL(param_values,'{}') AS param_values
  FROM v_profile_controls_resolved
  WHERE profile_version_id = (SELECT left_profile_version_id FROM profile_diff_request LIMIT 1)
),
R AS (
  SELECT canonical_id, target_kind, IFNULL(target_ref,'') AS target_ref,
         required, weight, IFNULL(param_values,'{}') AS param_values
  FROM v_profile_controls_resolved
  WHERE profile_version_id = (SELECT right_profile_version_id FROM profile_diff_request LIMIT 1)
),
added AS (
  SELECT 'added' AS change_type, R.* FROM R
  EXCEPT
  SELECT 'added', L.* FROM L
),
removed AS (
  SELECT 'removed' AS change_type, L.* FROM L
  EXCEPT
  SELECT 'removed', R.* FROM R
),
changed AS (
  SELECT 'changed' AS change_type, L.canonical_id, L.target_kind, L.target_ref,
         L.required || ' -> ' || R.required AS required_delta,
         L.weight   || ' -> ' || R.weight   AS weight_delta,
         CASE WHEN L.param_values <> R.param_values THEN 'params_changed' ELSE '' END AS params_delta
  FROM L JOIN R USING (canonical_id, target_kind, target_ref)
  WHERE (L.required <> R.required OR L.weight <> R.weight OR L.param_values <> R.param_values)
)
SELECT * FROM added
UNION ALL
SELECT * FROM removed
UNION ALL
SELECT change_type,
       canonical_id, target_kind, target_ref,
       NULL AS required, NULL AS weight, params_delta AS param_values
FROM changed;
```

---

## Minimal demo INSERTs (catalog + profiles SL2/SL3)

> Replace the **demo controls** with your real catalog; these are just to make the views executable.

```sql
-- Evidence types
INSERT OR IGNORE INTO evidence_type(code, description) VALUES
 ('POLICY','Policy/Standard Document'),
 ('CONFIG','Configuration Export'),
 ('LOG','Security Log Extract'),
 ('TEST','Test/Validation Record');

-- Demo controls
INSERT OR IGNORE INTO canonical_control(canonical_id, objective, statement, type, risk_theme, criticality, applicability, params) VALUES
 ('C-NW-SEG', 'Network segmentation', 'Segment IACS network into zones with controlled conduits.', 'preventive','Network',3,
  '{"role":["AssetOwner","SystemIntegrator"],"env":["OT"],"lifecycle":["Design","Operations"],"min_security_level":1}',
  '[{"name":"mgmt_vlan_id","description":"VLAN for management plane","default":"100"}]'
 ),
 ('C-AC-IA', 'Identity & authN', 'Centralized account management and strong authN for operators.', 'preventive','AccessControl',3,
  '{"role":["AssetOwner"],"env":["OT"],"lifecycle":["Operations"],"min_security_level":2}',
  '[{"name":"password_length","description":"Min password length","default":"12"}]'
 ),
 ('C-MO-LOG', 'Security monitoring', 'Collect and retain security logs for critical assets and conduits.', 'detective','Monitoring',2,
  '{"role":["AssetOwner"],"env":["OT"],"lifecycle":["Operations"],"min_security_level":2}',
  '[{"name":"retention_days","description":"Log retention","default":"180"}]'
 );

-- Mappings to 62443
INSERT OR IGNORE INTO control_mapping(canonical_id, framework_code, section_path, relation) VALUES
 ('C-NW-SEG','IEC 62443-3-3','SR 5.2','implements'),
 ('C-AC-IA','IEC 62443-3-3','SR 1.1','implements'),
 ('C-MO-LOG','IEC 62443-3-3','SR 6.1','implements');

-- Catalog checklist
INSERT OR IGNORE INTO checklist_item(id, canonical_id, question, answer_type, evidence_type_code) VALUES
 (1001,'C-NW-SEG','Is there a documented zone/conduit model?','boolean','POLICY'),
 (1002,'C-NW-SEG','Provide L3/L2 segmentation design artifacts.','text','CONFIG'),
 (2001,'C-AC-IA','Is unique ID enforced for operators?','boolean','CONFIG'),
 (2002,'C-AC-IA','Min password length configured?','text','CONFIG'),
 (3001,'C-MO-LOG','Are logs centralized for SL2/SL3 assets?','boolean','CONFIG'),
 (3002,'C-MO-LOG','Provide last 7 days of security events.','text','LOG');

-- Profiles
INSERT OR IGNORE INTO profile(id, code, name, description) VALUES
 (1, 'AO-OT-OPS', 'OT Asset Owner — Operations', 'Asset Owner profiles for OT Operations');

-- SL2 version
INSERT OR IGNORE INTO profile_version(id, profile_id, semver, status, release_notes) VALUES
 (10, 1, '1.0.0-SL2', 'released', 'Initial SL2 operations profile');

INSERT OR IGNORE INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
VALUES (10, 'AssetOwner','OT','Operations','EU', 0, 2, 2);

INSERT OR IGNORE INTO profile_zone(profile_version_id, zone_name, sl_t) VALUES
 (10,'ControlRoom',2), (10,'CellA',2);

INSERT OR IGNORE INTO profile_conduit(profile_version_id, conduit_name, from_zone, to_zone, sl_t) VALUES
 (10,'CR_to_CellA','ControlRoom','CellA',2);

-- Explicit controls for SL2 profile
INSERT OR IGNORE INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, conditions, target_kind, target_ref, source)
VALUES
 (10,'C-NW-SEG',1,1.0,'{"mgmt_vlan_id":"200"}','{"justification":"SL2 zones"}','zone','CellA','direct'),
 (10,'C-AC-IA',1,1.0,'{"password_length": "12"}',NULL,'global',NULL,'direct'),
 (10,'C-MO-LOG',1,1.0,'{"retention_days":"180"}',NULL,'conduit','CR_to_CellA','direct');

-- SL3 version inherits SL2 and overrides a few controls
INSERT OR IGNORE INTO profile_version(id, profile_id, semver, status, release_notes, previous_version_id)
VALUES (11, 1, '1.1.0-SL3', 'released', 'Derived from SL2; raised rigor/weights', 10);

INSERT OR IGNORE INTO profile_scope(profile_version_id, owner_role, environment, lifecycle, jurisdiction, essential_service, sl_t_zone, sl_t_conduit)
VALUES (11, 'AssetOwner','OT','Operations','EU', 0, 3, 3);

INSERT OR IGNORE INTO profile_inheritance(parent_profile_version_id, child_profile_version_id, mode, order_index)
VALUES (10, 11, 'inherit', 1);

-- Overrides / additions for SL3
INSERT OR IGNORE INTO profile_control(profile_version_id, canonical_id, required, weight, param_values, conditions, target_kind, target_ref, source)
VALUES
 (11,'C-NW-SEG',1,1.2,'{"mgmt_vlan_id":"210"}','{"escalation":"SL3 tighter segmentation"}','zone','CellA','inherited'),
 (11,'C-AC-IA',1,1.3,'{"password_length":"14"}',NULL,'global',NULL,'inherited'),
 (11,'C-MO-LOG',1,1.2,'{"retention_days":"365"}',NULL,'conduit','CR_to_CellA','inherited');

-- Profile-specific extra checklist (<=2 per control)
INSERT OR IGNORE INTO profile_checklist_extra(profile_version_id, canonical_id, question, answer_type, evidence_type_code, note)
VALUES
 (11,'C-AC-IA','Provide MFA policy excerpt for SL3 operators.','text','POLICY','SL3 uplift'),
 (11,'C-MO-LOG','Show alerting rules for SL3 conduits.','text','CONFIG','SL3 uplift');
```

---

# JSON Schema (author-time profile definition)

> Draft-07 compatible. Validate authored JSON before compiling to rows. Enums/closed lists help your guardrails. (`canonical_id` must match existing catalog—compiler must **refuse** unknown IDs.)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IEC 62443-1-5 Profile Definition",
  "type": "object",
  "required": ["profile", "version", "scope"],
  "additionalProperties": false,
  "properties": {
    "profile": {
      "type": "object",
      "required": ["code", "name"],
      "additionalProperties": false,
      "properties": {
        "code": {"type": "string", "maxLength": 64},
        "name": {"type": "string", "maxLength": 200},
        "description": {"type": "string", "maxLength": 2000}
      }
    },
    "version": {
      "type": "object",
      "required": ["semver", "status"],
      "additionalProperties": false,
      "properties": {
        "semver": {"type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+(-[A-Za-z0-9.-]+)?$"},
        "status": {"type": "string", "enum": ["draft", "in_review", "released", "deprecated"]},
        "release_notes": {"type": "string", "maxLength": 4000},
        "previous_semver": {"type": "string"}
      }
    },
    "scope": {
      "type": "object",
      "required": ["owner_role", "environment", "lifecycle"],
      "additionalProperties": false,
      "properties": {
        "owner_role": {"type": "string", "enum": ["AssetOwner","SystemIntegrator","Manufacturer"]},
        "environment": {"type": "string", "enum": ["OT","IT","Edge"]},
        "lifecycle": {"type": "string", "enum": ["Design","Integration","Commissioning","Operations","Maintenance","Decommissioning"]},
        "jurisdiction": {"type": "array", "items": {"type": "string"}, "minItems": 0, "uniqueItems": true},
        "essential_service": {"type": "boolean"},
        "sl_t_zone": {"type": "integer", "minimum": 0, "maximum": 4},
        "sl_t_conduit": {"type": "integer", "minimum": 0, "maximum": 4},
        "overlays": {"type": "array", "items": {"type": "string", "maxLength": 32}, "uniqueItems": true},
        "zones": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name"],
            "additionalProperties": false,
            "properties": {
              "name": {"type": "string", "maxLength": 64},
              "sl_t": {"type": "integer", "minimum": 0, "maximum": 4}
            }
          },
          "uniqueItems": true
        },
        "conduits": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name","from_zone","to_zone"],
            "additionalProperties": false,
            "properties": {
              "name": {"type": "string", "maxLength": 64},
              "from_zone": {"type": "string", "maxLength": 64},
              "to_zone": {"type": "string", "maxLength": 64},
              "sl_t": {"type": "integer", "minimum": 0, "maximum": 4}
            }
          },
          "uniqueItems": true
        }
      }
    },
    "inheritance": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "parent_profile_code": {"type": "string"},
        "parent_semver": {"type": "string"},
        "mode": {"type": "string", "enum": ["inherit","overlay"]}
      }
    },
    "rules": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["rule_kind"],
        "additionalProperties": false,
        "properties": {
          "rule_kind": {"type": "string", "enum": ["include","exclude","set_param","set_weight"]},
          "criteria": {"type": "object"},  /* filters over control fields/mappings */
          "action": {"type": "object"},    /* {required, weight, param_values} */
          "note": {"type": "string", "maxLength": 500}
        }
      }
    },
    "controls": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["canonical_id"],
        "additionalProperties": false,
        "properties": {
          "canonical_id": {"type": "string", "minLength": 1},
          "required": {"type": "boolean"},
          "weight": {"type": "number", "minimum": 0},
          "param_values": {"type": "object"},
          "conditions": {"type": "object"},
          "target": {
            "type": "object",
            "additionalProperties": false,
            "properties": {
              "kind": {"type": "string", "enum": ["global","zone","conduit"]},
              "ref": {"type": "string"}
            }
          }
        }
      },
      "uniqueItems": true
    },
    "checklist_extras": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["canonical_id","question","answer_type"],
        "additionalProperties": false,
        "properties": {
          "canonical_id": {"type": "string"},
          "question": {"type": "string", "maxLength": 500},
          "answer_type": {"type": "string", "enum": ["boolean","text","enum","number"]},
          "evidence_type_code": {"type": "string"},
          "note": {"type": "string", "maxLength": 300}
        }
      }
    }
  }
}
```

---

# Views/queries you’ll use

* **Expand profile → checklist/evidence**
  `SELECT * FROM v_profile_checklist WHERE profile_version_id = ?;`
  `SELECT * FROM v_profile_evidence_summary WHERE profile_version_id = ?;`

* **Coverage vs SR/CR**
  `SELECT * FROM v_profile_mappings WHERE profile_version_id = ? ORDER BY framework_code, section_path;`

* **Diff two versions**

  ```
  DELETE FROM profile_diff_request;
  INSERT INTO profile_diff_request(left_profile_version_id,right_profile_version_id) VALUES (10,11);
  SELECT * FROM v_profile_control_diff;
  ```

---

# LLM prompt patterns (audit-safe)

**General guardrails (prepend to all prompts)**

* Output **JSON only**, no prose.
* Use the provided enums and the JSON Schema.
* **Never invent** `canonical_id`. If a needed control is missing, return an empty list and set `"needs_human_review": "Unknown canonical_id(s)"` in a top-level field (the caller can strip it).
* Max lengths: question ≤ 500 chars; note ≤ 300.
* Closed lists: owner\_role/environment/lifecycle/answer\_type/target.kind as defined.

### P1 — *Profile scoping assistant*

**System/meta**: “You collect profile scope for IEC 62443-1-5. Validate against enums; normalize jurisdiction to ISO country/region codes if present; infer SL-T defaults (zones/conduits) from role/environment/lifecycle if omitted (leave null if uncertain).”

**User input**: free text + optional structured hints.

**Output (JSON only)**:

```json
{
  "profile": {"code":"AO-OT-OPS","name":"OT Asset Owner — SL2 Operations (62443)","description":"..."},
  "version": {"semver":"1.0.0-SL2","status":"draft","release_notes":""},
  "scope": {
    "owner_role":"AssetOwner",
    "environment":"OT",
    "lifecycle":"Operations",
    "jurisdiction":["EU"],
    "essential_service": false,
    "sl_t_zone": 2,
    "sl_t_conduit": 2,
    "overlays":["GDPR"],
    "zones":[{"name":"ControlRoom","sl_t":2},{"name":"CellA","sl_t":2}],
    "conduits":[{"name":"CR_to_CellA","from_zone":"ControlRoom","to_zone":"CellA","sl_t":2}]
  }
}
```

### P2 — *Rule compiler (deterministic selection)*

**System/meta**: “Compile scope into explicit controls. Use only `canonical_id` values from the provided catalog index. For filters, rely on catalog fields and confirmed mappings to IEC 62443-3-3 SR / 4-2 CR. If a filter matches nothing, return empty `controls` and include `"needs_human_review": "Filter matched 0 controls"`.”

**Inputs**: (a) validated `scope`, (b) `rules` array (include/exclude/set\_param/set\_weight), (c) catalog index (IDs + key facets).

**Output (JSON only)**:

```json
{
  "rules":[
    {"rule_kind":"include","criteria":{"env":"OT","min_sl":2,"mappings":{"framework_code":"IEC 62443-3-3","section_prefix":"SR 1."}}},
    {"rule_kind":"set_param","criteria":{"canonical_id":"C-AC-IA"},"action":{"param_values":{"password_length":"12"}}},
    {"rule_kind":"include","criteria":{"canonical_id":"C-NW-SEG","target":{"kind":"zone","ref":"CellA"}}}
  ],
  "controls":[
    {"canonical_id":"C-AC-IA","required":true,"weight":1.0,"param_values":{"password_length":"12"},"target":{"kind":"global"}},
    {"canonical_id":"C-NW-SEG","required":true,"weight":1.0,"param_values":{"mgmt_vlan_id":"200"},"target":{"kind":"zone","ref":"CellA"}},
    {"canonical_id":"C-MO-LOG","required":true,"weight":1.0,"param_values":{"retention_days":"180"},"target":{"kind":"conduit","ref":"CR_to_CellA"}}
  ]
}
```

### P3 — *Checklist specialization (≤2 items per control)*

**System/meta**: “For each control in the profile version, add up to **two** targeted checklist items reflecting the scope (SL-T, overlays, zone/conduit). Prefer concrete evidence (POLICY/CONFIG/LOG/TEST). **Never** restate existing catalog questions.”

**Input**: scope + explicit `controls` + existing base checklist items.

**Output (JSON only)**:

```json
{
  "checklist_extras":[
    {"canonical_id":"C-AC-IA","question":"Provide MFA enforcement config for operator role.","answer_type":"text","evidence_type_code":"CONFIG","note":"SL3 uplift"},
    {"canonical_id":"C-MO-LOG","question":"Show alert rule set for conduit CR_to_CellA.","answer_type":"text","evidence_type_code":"CONFIG","note":"Conduit-specific"}
  ]
}
```

---

# Governance, versioning, and traceability

* **States**: `draft` → `in_review` (peer + SME sign-off) → `released` (immutable) → `deprecated`. Use `profile_version.previous_version_id` to chain, and keep **release notes** for change rationale.
* **Inheritance & overlays**: Model derived profiles with `profile_inheritance` (mode=`inherit` for baseline → child; mode=`overlay` for additive constraints). The **resolved** effective set is always visible via `v_profile_controls_resolved` (child overrides win).
* **Traceability**:

  * Profile version → **rules** (`profile_rule`) → explicit **profile\_controls** (source + source\_profile\_version\_id)
  * Each control → **mappings** (via catalog `control_mapping` to 62443-3-3 SR / 4-2 CR)
  * Control → **checklist** (base `checklist_item` + `profile_checklist_extra`) → **evidence types**
    This provides a provable chain: **profile\_version → control → mapping → checklist → evidence**.
* **Diffs & deprecation**: Use `v_profile_control_diff` to show *added/removed/changed* between versions before promoting to `released`. When deprecating, keep the final artifacts (views/exports) for audit.

---

If you want, I can also hand you a tiny **export query** (CSV/JSON) for audit-ready checklists, or wire these tables into your existing E1–E3 pipeline scripts.
