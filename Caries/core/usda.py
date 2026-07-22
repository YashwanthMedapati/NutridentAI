import requests
from fastapi import HTTPException

from .config import usda_api_key

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

VALID_DATA_TYPES = {"Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"}
INVALID_KEYWORDS = [
    "infant formula", "enteral", "medical food", "supplement",
    "nutrient database", "study", "research", "survey", "nhanes",
    "usda", "mixed dish", "recipe", "NFS", "not further specified"
]

NUTRIENT_MAP = {
    "sugar_g":       ["Total Sugars", "Sugars, total including NLEA", "Sugars, total"],
    "carbs_g":       ["Carbohydrate, by difference", "Carbohydrates"],
    "fat_g":         ["Total lipid (fat)", "Fat", "Total Fat"],
    "protein_g":     ["Protein"],
    "calcium_mg":    ["Calcium, Ca", "Calcium"],
    "phosphorus_mg": ["Phosphorus, P", "Phosphorus"],
    "energy_kcal":   ["Energy", "Energy (Atwater General Factors)", "Energy (Atwater Specific Factors)"],
    "fiber_g":       ["Fiber, total dietary", "Total Dietary Fiber"],
    "sodium_mg":     ["Sodium, Na", "Sodium"],
}


def is_valid_food_item(food: dict) -> bool:
    dtype = food.get("dataType", "")
    desc  = food.get("description", "").lower()
    if dtype not in VALID_DATA_TYPES:
        return False
    for kw in INVALID_KEYWORDS:
        if kw.lower() in desc:
            return False
    return True


def search_food(food_name: str, top_n: int = 10) -> dict | None:
    api_key = usda_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="USDA_API_KEY is not configured")
    params = {
        "query":    food_name,
        "api_key":  api_key,
        "pageSize": top_n,
    }
    response = requests.get(SEARCH_URL, params=params, timeout=30)
    response.raise_for_status()
    foods = response.json().get("foods", [])
    priority = {"Foundation": 0, "SR Legacy": 1, "Survey (FNDDS)": 2, "Branded": 3}
    valid = [f for f in foods if is_valid_food_item(f)]
    if not valid:
        valid = foods[:3]
    valid.sort(key=lambda f: priority.get(f.get("dataType", ""), 99))
    return valid[0] if valid else None


def extract_nutrients(food: dict) -> dict:
    """Extract per-100g nutrition values from a USDA food object."""
    raw = {}
    for item in food.get("foodNutrients", []):
        name  = (item.get("nutrientName") or item.get("name") or "").strip()
        value = item.get("value") or item.get("amount") or 0
        if name:
            raw[name.lower()] = float(value)

    result = {"food": food.get("description", "Unknown")}
    for key, candidates in NUTRIENT_MAP.items():
        val = 0.0
        for candidate in candidates:
            val = raw.get(candidate.lower(), 0.0)
            if val:
                break
        result[key] = round(val, 2)

    result["data_reliable"] = any([
        result["sugar_g"], result["carbs_g"],
        result["fat_g"],   result["energy_kcal"]
    ])
    return result
