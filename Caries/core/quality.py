def _confidence_to_score(label: str | None) -> float:
    value = (label or "").lower()
    if value == "user":
        return 1.0
    if value == "high":
        return 0.9
    if value == "moderate":
        return 0.65
    if value == "low":
        return 0.35
    return 0.5


def nutrition_quality(nutrition: dict, portion_info: dict | None = None,
                      source: str = "USDA", image_based: bool = False) -> dict:
    """
    Explain how trustworthy the calorie estimate is. This is not a clinical
    confidence score; it summarizes data completeness, portion certainty, and
    whether the result came from a photo heuristic.
    """
    required = ["energy_kcal", "carbs_g", "fat_g", "protein_g"]
    present = [key for key in required if nutrition.get("per_100g", {}).get(key) or nutrition.get(key)]
    completeness = len(present) / len(required)
    portion_confidence = _confidence_to_score((portion_info or {}).get("confidence"))
    data_reliable = bool(nutrition.get("data_reliable", True))

    score = completeness * 0.55 + portion_confidence * 0.35 + (0.10 if data_reliable else 0)
    if image_based:
        score -= 0.12
    score = max(0.05, min(score, 1.0))

    if score >= 0.78:
        label = "High"
    elif score >= 0.52:
        label = "Moderate"
    else:
        label = "Low"

    notes = []
    if image_based:
        notes.append("Photo results identify likely foods and visible ingredients, but cannot measure exact mass.")
    if portion_confidence < 0.7:
        notes.append("Portion size should be reviewed before logging.")
    if not data_reliable or completeness < 0.75:
        notes.append("The matched nutrition record is incomplete, so totals may be less reliable.")
    if not notes:
        notes.append("Calories are based on the matched nutrition record scaled to the selected portion.")

    return {
        "source": source,
        "confidence": label,
        "confidence_score": round(score, 2),
        "data_completeness": round(completeness, 2),
        "portion_confidence": (portion_info or {}).get("confidence", "Unknown"),
        "requires_user_review": image_based or portion_confidence < 0.7 or not data_reliable,
        "notes": notes,
    }


INGREDIENT_CALORIE_WEIGHTS = {
    "cheese": 0.24,
    "salami/pepperoni": 0.18,
    "salami": 0.18,
    "pepperoni": 0.18,
    "sausage": 0.18,
    "ham": 0.12,
    "pizza crust": 0.35,
    "crust": 0.35,
    "dough": 0.35,
    "tomato": 0.06,
    "olives": 0.06,
    "bell pepper": 0.05,
    "peppers": 0.05,
    "mushroom": 0.04,
    "basil/herbs": 0.01,
}


def ingredient_calorie_breakdown(ingredients: list[dict] | None, nutrition: dict) -> list[dict]:
    total = float(nutrition.get("energy_kcal") or 0)
    if total <= 0 or not ingredients:
        return []

    rows = []
    for item in ingredients:
        name = item.get("name") if isinstance(item, dict) else str(item)
        if not name:
            continue
        key = name.lower()
        rows.append({
            "name": name,
            "confidence": item.get("confidence", "Estimated") if isinstance(item, dict) else "Estimated",
            "weight": INGREDIENT_CALORIE_WEIGHTS.get(key, 0.08),
        })

    total_weight = sum(row["weight"] for row in rows) or 1
    breakdown = []
    running_total = 0
    for index, row in enumerate(rows):
        if index == len(rows) - 1:
            calories = round(total) - running_total
        else:
            calories = round(total * (row["weight"] / total_weight))
            running_total += calories
        breakdown.append({
            "name": row["name"],
            "confidence": row["confidence"],
            "calories": calories,
            "percent": round((row["weight"] / total_weight) * 100),
            "method": "Estimated share of matched food calories, not direct ingredient measurement",
        })
    return breakdown


def attach_analysis_metadata(payload: dict, portion_info: dict, nutrition: dict,
                             source: str, image_based: bool = False,
                             ingredients: list[dict] | None = None) -> dict:
    payload["analysis_quality"] = nutrition_quality(
        nutrition,
        portion_info=portion_info,
        source=source,
        image_based=image_based,
    )
    payload["calorie_breakdown"] = {
        "total_kcal": nutrition.get("energy_kcal", 0),
        "portion_g": nutrition.get("portion_g", portion_info.get("g")),
        "per_100g_kcal": nutrition.get("per_100g", {}).get("energy_kcal", 0),
        "ingredient_estimates": ingredient_calorie_breakdown(ingredients, nutrition),
        "method": "Nutrition totals come from the matched food database record scaled by selected portion.",
    }
    return payload
