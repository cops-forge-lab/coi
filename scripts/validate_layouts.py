#!/usr/bin/env python3
import json
from pathlib import Path
p = Path(__file__).resolve().parents[1] / "configs" / "layouts.example.json"
data = json.loads(p.read_text(encoding="utf-8"))
required = {"normal", "incident", "crisis", "maintenance"}
ids = {x.get("id") for x in data.get("presets", [])}
missing = required - ids
if missing:
    raise SystemExit(f"Presets ausentes: {sorted(missing)}")
print("OK: configuracao de layouts valida")
