"""
Normalize Indian recipe nutrition exports into Caries/data/indian_foods.json.

Expected input: a CSV export with one row per prepared food or recipe and at
least these columns:
  name, energy_kcal, carbs_g, protein_g, fat_g

Optional columns:
  aliases, category, portion_g, portion_label, sugar_g, fibre_g/fiber_g,
  calcium_mg, phosphorus_mg, sodium_mg, dental_tags

This script intentionally accepts CSV instead of raw XLSX so the serving API
does not need pandas/openpyxl. Export INDB/IFCT-derived sheets to CSV first,
then run:

  python tools/import_indian_food_dataset.py path/to/indb_export.csv
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "indian_foods.json"


def _number(row: dict, *names: str, default: float = 0.0) -> float:
    for name in names:
        value = row.get(name)
        if value not in (None, ""):
            try:
                return round(float(value), 2)
            except ValueError:
                return default
    return default


def _list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.replace("|", ";").split(";") if item.strip()]


def normalize_row(row: dict) -> dict | None:
    name = (row.get("name") or row.get("food_name") or row.get("final_food_name") or "").strip()
    if not name:
        return None

    portion_g = _number(row, "portion_g", "serving_g", "serving_size_g", default=150)
    nutrition = {
        "energy_kcal": _number(row, "energy_kcal", "Calories", "calories"),
        "sugar_g": _number(row, "sugar_g", "Free Sugar", "free_sugar_g", "freesugar_g"),
        "carbs_g": _number(row, "carbs_g", "Carbohydrates", "carb_g"),
        "fat_g": _number(row, "fat_g", "Fats", "fats_g"),
        "protein_g": _number(row, "protein_g", "Protein"),
        "calcium_mg": _number(row, "calcium_mg", "Calcium"),
        "phosphorus_mg": _number(row, "phosphorus_mg", "Phosphorus"),
        "fiber_g": _number(row, "fiber_g", "fibre_g", "Fibre"),
        "sodium_mg": _number(row, "sodium_mg", "Sodium"),
    }

    return {
        "name": name,
        "aliases": _list(row.get("aliases")),
        "category": (row.get("category") or row.get("Cuisine") or "indian food").strip().lower(),
        "portion_g": portion_g,
        "portion_label": row.get("portion_label") or f"Typical serving (~{round(portion_g)}g)",
        "nutrition_per_100g": nutrition,
        "dental_tags": _list(row.get("dental_tags")),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python tools/import_indian_food_dataset.py path/to/export.csv", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1])
    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        return 2

    with input_path.open("r", encoding="utf-8-sig", newline="") as handle:
        foods = [food for row in csv.DictReader(handle) if (food := normalize_row(row))]

    payload = {
        "metadata": {
            "name": "NutriDent Indian food nutrition dataset",
            "version": "generated",
            "basis": [
                "Imported from an INDB/IFCT-compatible CSV export",
                "Values are per 100g edible prepared food unless otherwise noted"
            ],
            "notes": [
                "Confirm source license and attribution before committing generated data.",
                "Users should review portions before logging because Indian recipes vary by preparation."
            ],
        },
        "foods": foods,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(foods)} foods to {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
