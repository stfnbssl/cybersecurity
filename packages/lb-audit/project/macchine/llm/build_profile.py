#!/usr/bin/env python3
import json, argparse, copy, csv
from pathlib import Path

def load(path): 
    with open(path, "r", encoding="utf-8") as f: 
        return json.load(f)

def save(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def find_profile(catalog, name):
    for p in catalog.get("profiles", []):
        if p["name"] == name:
            return copy.deepcopy(p)
    raise ValueError(f"Profile not found: {name}")

def idx_controls(catalog):
    return {c["canonical_id"]: c for c in catalog["controls"]}

def select_controls(machine, catalog):
    base = find_profile(catalog, "OT Asset Owner — SL2 Operations")
    selected = { pc["canonical_id"]: {"canonical_id": pc["canonical_id"], "required": True, "param_values": pc.get("param_values", {})}
                 for pc in base["controls"] }

    sl_t = (machine.get("targets") or {}).get("sl_t", 2)

    # Remote access
    if (machine.get("remote_access") or {}).get("exists"):
        for cid in ["LB-AC-001","LB-NW-002","LB-IR-002"]:
            selected.setdefault(cid, {"canonical_id": cid, "required": True, "param_values": {}})

    # Legacy OS
    legacy_ids = set(((machine.get("constraints") or {}).get("legacy_os") or []))
    for comp in machine.get("components", []):
        if comp.get("legacy_os") or comp.get("id") in legacy_ids:
            for cid in ["LB-PM-003","LB-NW-001","LB-LM-003"]:
                selected.setdefault(cid, {"canonical_id": cid, "required": True, "param_values": {}})

    # SL gaps
    for comp in machine.get("components", []):
        if comp.get("sl_c") is not None and comp["sl_c"] < sl_t:
            for cid in ["LB-NW-001","LB-AC-001","LB-LM-003","LB-BC-001"]:
                selected.setdefault(cid, {"canonical_id": cid, "required": True, "param_values": {}})

    # Critical zones -> unidirectional suggestion
    if any(z.get("critical") for z in machine.get("zones", [])):
        selected.setdefault("LB-NW-004", {"canonical_id":"LB-NW-004","required": False,"param_values": {}})

    return list(selected.values())

def build_profile(machine, catalog):
    ctx = machine.get("context") or {}
    sl_t = (machine.get("targets") or {}).get("sl_t", 2)

    controls = select_controls(machine, catalog)
    derived = {
        "name": f"{machine['machine']['name']} — Audit Profile (SL{sl_t})",
        "version": "0.1.0",
        "machine_ref": machine["machine"],
        "rules": {
            "scope":{"role":["AssetOwner"],"env":["OT"],"lifecycle":["Operation","Maintenance"]},
            "targets":{"sl":sl_t, "jurisdiction":"EU", "essential_service": ctx.get("essential_service", False)},
            "conditions":{"personal_data": ctx.get("personal_data", False), "safety_critical": ctx.get("safety_critical", True)},
            "language":"it"
        },
        "controls": controls
    }
    return derived

def build_checklist(derived_profile, catalog):
    idx = {c["canonical_id"]: c for c in catalog["controls"]}
    ev_allowed = [et["code"] for et in catalog["evidence_types"]]

    questions = []
    evidence_counter = {}

    for pc in derived_profile["controls"]:
        c = idx.get(pc["canonical_id"])
        if not c: 
            continue
        for item in c.get("checklist", []):
            q = {
                "canonical_id": c["canonical_id"],
                "risk_theme": c["risk_theme"],
                "question": item["question"],
                "answer_type": item["answer_type"],
                "evidence_type": item.get("evidence_type", [])
            }
            if q not in questions:
                questions.append(q)
            for et in item.get("evidence_type", []):
                evidence_counter[et] = evidence_counter.get(et, 0) + 1

    evidence_list = [{"code": code, "count": cnt} for code, cnt in sorted(evidence_counter.items(), key=lambda x: (-x[1], x[0]))]
    return questions, evidence_list, ev_allowed

def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--catalog", required=True)
    ap.add_argument("--input", required=True)
    ap.add_argument("--outdir", required=True)
    args = ap.parse_args()

    catalog = load(args.catalog)
    machine = load(args.input)

    derived = build_profile(machine, catalog)
    questions, evidence_list, ev_allowed = build_checklist(derived, catalog)

    outdir = Path(args.outdir); outdir.mkdir(parents=True, exist_ok=True)
    save(outdir/"derived_profile.json", derived)
    save(outdir/"checklist.json", {"questions": questions})
    save(outdir/"evidence_list.json", {"evidence": evidence_list, "allowed": ev_allowed})

    # CSV for evidence
    with open(outdir/"evidence_list.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["code","count"])
        w.writeheader()
        for r in evidence_list:
            w.writerow(r)

    print("OK")

if __name__ == "__main__":
    main()
