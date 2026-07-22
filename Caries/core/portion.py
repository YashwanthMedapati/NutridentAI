# ── PORTION SIZE HEURISTICS ────────────────────────────────────────────────────
# USDA values are per 100g. We estimate realistic serving size from food category.
# Returns: { grams, label, confidence }

PORTION_DB = {
    # Staples
    "pasta":          {"g": 280, "label": "Medium bowl (~280g)", "confidence": "Moderate"},
    "spaghetti":      {"g": 280, "label": "Medium bowl (~280g)", "confidence": "Moderate"},
    "rice":           {"g": 200, "label": "Medium portion (~200g)", "confidence": "Moderate"},
    "bread":          {"g": 60,  "label": "2 slices (~60g)",       "confidence": "High"},
    "pizza":          {"g": 250, "label": "2 slices (~250g)",      "confidence": "Moderate"},
    "burger":         {"g": 220, "label": "1 standard burger (~220g)", "confidence": "Moderate"},
    "sandwich":       {"g": 200, "label": "1 sandwich (~200g)",   "confidence": "Moderate"},
    # Fruits & Veg
    "apple":          {"g": 182, "label": "1 medium apple (~182g)", "confidence": "High"},
    "banana":         {"g": 118, "label": "1 medium banana (~118g)", "confidence": "High"},
    "orange":         {"g": 131, "label": "1 medium orange (~131g)", "confidence": "High"},
    "grapes":         {"g": 150, "label": "1 cup grapes (~150g)",  "confidence": "Moderate"},
    "salad":          {"g": 200, "label": "Side salad (~200g)",    "confidence": "Low"},
    "broccoli":       {"g": 150, "label": "1 cup broccoli (~150g)", "confidence": "Moderate"},
    # Sweets & Snacks
    "chocolate":      {"g": 40,  "label": "1 standard bar (~40g)", "confidence": "Moderate"},
    "cake":           {"g": 120, "label": "1 slice (~120g)",       "confidence": "Moderate"},
    "cookie":         {"g": 30,  "label": "1 cookie (~30g)",       "confidence": "Moderate"},
    "chips":          {"g": 50,  "label": "Small bag (~50g)",      "confidence": "Moderate"},
    "ice cream":      {"g": 130, "label": "1 scoop (~130g)",       "confidence": "Low"},
    "donut":          {"g": 60,  "label": "1 donut (~60g)",        "confidence": "High"},
    "candy":          {"g": 40,  "label": "Small handful (~40g)",  "confidence": "Low"},
    # Proteins
    "chicken":        {"g": 200, "label": "1 breast (~200g)",      "confidence": "Moderate"},
    "beef":           {"g": 200, "label": "Medium steak (~200g)",  "confidence": "Moderate"},
    "fish":           {"g": 180, "label": "1 fillet (~180g)",      "confidence": "Moderate"},
    "egg":            {"g": 50,  "label": "1 large egg (~50g)",    "confidence": "High"},
    "oatmeal":        {"g": 240, "label": "1 cup cooked (~240g)",  "confidence": "High"},
    # Dairy
    "milk":           {"g": 244, "label": "1 cup (~244ml)",        "confidence": "High"},
    "yogurt":         {"g": 200, "label": "1 cup (~200g)",         "confidence": "High"},
    "cheese":         {"g": 30,  "label": "1 slice (~30g)",        "confidence": "Moderate"},
    # Drinks
    "juice":          {"g": 240, "label": "1 cup (~240ml)",        "confidence": "High"},
    "soda":           {"g": 355, "label": "1 can (~355ml)",        "confidence": "High"},
    "coffee":         {"g": 240, "label": "1 cup (~240ml)",        "confidence": "High"},
}

DEFAULT_PORTION = {"g": 150, "label": "Estimated serving (~150g)", "confidence": "Low"}


def estimate_portion(food_name: str) -> dict:
    """Return portion estimate for a food name by keyword matching."""
    name = food_name.lower()
    for keyword, data in PORTION_DB.items():
        if keyword in name:
            return data
    return DEFAULT_PORTION


def scale_nutrition(nutrition_per_100g: dict, portion_g: float) -> dict:
    """
    USDA values are per 100g. Scale them to the actual portion size.
    Returns a new nutrition dict with scaled values + portion metadata.
    """
    factor = portion_g / 100.0
    scaled = {}
    numeric_keys = ["sugar_g","carbs_g","fat_g","protein_g",
                    "calcium_mg","phosphorus_mg","energy_kcal",
                    "fiber_g","sodium_mg"]
    for key in numeric_keys:
        val = nutrition_per_100g.get(key, 0) or 0
        scaled[key] = round(val * factor, 2)

    scaled["food"]         = nutrition_per_100g.get("food", "Unknown")
    scaled["data_reliable"] = nutrition_per_100g.get("data_reliable", True)
    scaled["per_100g"]     = {k: nutrition_per_100g.get(k, 0) for k in numeric_keys}
    scaled["portion_g"]    = round(portion_g, 1)
    return scaled
