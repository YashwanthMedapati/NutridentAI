import json
import re
from functools import lru_cache
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "indian_foods.json"
INDIAN_DATA_SOURCE = "NutriDent Indian food dataset"
INDIAN_DATASET_CITATION = (
    "Local Indian recipe/ingredient fallback structured for INDB and IFCT expansion; "
    "values are per 100g estimates and should be reviewed by the user."
)


def _normalize(value: str) -> str:
    text = value.lower().strip()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _tokens(value: str) -> set[str]:
    stop = {"and", "with", "the", "indian", "style", "food", "dish"}
    return {token for token in _normalize(value).split() if token and token not in stop}


@lru_cache(maxsize=1)
def load_indian_foods() -> dict:
    with DATA_PATH.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload


def _entry_names(entry: dict) -> list[str]:
    return [entry["name"], *entry.get("aliases", [])]


def _score_match(query: str, candidate: str) -> float:
    q_norm = _normalize(query)
    c_norm = _normalize(candidate)
    if not q_norm or not c_norm:
        return 0.0
    if q_norm == c_norm:
        return 1.0
    if q_norm in c_norm or c_norm in q_norm:
        return 0.92

    q_tokens = _tokens(q_norm)
    c_tokens = _tokens(c_norm)
    if not q_tokens or not c_tokens:
        return 0.0

    overlap = len(q_tokens & c_tokens)
    if overlap == 0:
        return 0.0
    precision = overlap / len(q_tokens)
    recall = overlap / len(c_tokens)
    return (precision * 0.6) + (recall * 0.4)


def search_indian_food(food_name: str) -> dict | None:
    """Return the best local Indian food match, or None if confidence is weak."""
    best_entry = None
    best_score = 0.0
    best_alias = None

    for entry in load_indian_foods().get("foods", []):
        for alias in _entry_names(entry):
            score = _score_match(food_name, alias)
            if score > best_score:
                best_score = score
                best_entry = entry
                best_alias = alias

    if not best_entry or best_score < 0.72:
        return None

    return {
        **best_entry,
        "match_score": round(best_score, 3),
        "matched_alias": best_alias,
        "source": INDIAN_DATA_SOURCE,
        "citation": INDIAN_DATASET_CITATION,
    }


def extract_indian_nutrients(food: dict) -> dict:
    nutrients = food.get("nutrition_per_100g", {})
    result = {
        "food": food.get("name", "Unknown Indian food"),
        "source": food.get("source", INDIAN_DATA_SOURCE),
        "source_citation": food.get("citation", INDIAN_DATASET_CITATION),
        "matched_alias": food.get("matched_alias"),
        "match_score": food.get("match_score"),
        "category": food.get("category"),
        "dental_tags": food.get("dental_tags", []),
        "data_reliable": True,
    }
    for key in [
        "energy_kcal",
        "sugar_g",
        "carbs_g",
        "fat_g",
        "protein_g",
        "calcium_mg",
        "phosphorus_mg",
        "fiber_g",
        "sodium_mg",
    ]:
        result[key] = round(float(nutrients.get(key, 0) or 0), 2)
    return result


def indian_portion_info(food: dict) -> dict:
    grams = float(food.get("portion_g") or 150)
    return {
        "g": grams,
        "label": food.get("portion_label") or f"Indian dataset serving (~{round(grams)}g)",
        "confidence": "Moderate",
        "basis": "Default serving from the local Indian nutrition dataset.",
        "options": [
            {"label": "Small", "g": round(grams * 0.65)},
            {"label": "Typical", "g": round(grams)},
            {"label": "Large", "g": round(grams * 1.35)},
        ],
    }


def indian_dataset_summary() -> dict:
    payload = load_indian_foods()
    foods = payload.get("foods", [])
    return {
        "name": payload.get("metadata", {}).get("name", INDIAN_DATA_SOURCE),
        "version": payload.get("metadata", {}).get("version"),
        "food_count": len(foods),
        "categories": sorted({food.get("category") for food in foods if food.get("category")}),
    }
