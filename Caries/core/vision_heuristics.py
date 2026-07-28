# ── IMAGE-ANALYSIS HEURISTICS ──────────────────────────────────────────────────
# Pattern-matching over Google Vision's raw labels/objects/web entities: which
# food name to trust, which ingredients are visible, and how much is on the
# plate. Kept separate from core.vision (the API call itself) since the
# lookup tables here are the bulk of this analysis step.

from .portion import estimate_portion


def _visible_ingredients_from_terms(terms: list[str], food_name: str) -> list[dict]:
    joined = " ".join([food_name.lower(), *terms])
    ingredient_map = {
        "tomato": ["tomato", "tomatoes", "tomato sauce"],
        "salami/pepperoni": ["salami", "pepperoni", "sausage"],
        "olives": ["olive", "olives"],
        "bell pepper": ["bell pepper", "pepper", "capsicum"],
        "cheese": ["cheese", "mozzarella"],
        "basil/herbs": ["basil", "herb", "herbs"],
        "pizza crust": ["crust", "bread", "dough"],
        "mushroom": ["mushroom"],
        "ham": ["ham"],
        "onion": ["onion"],
    }
    ingredients = []
    for label, markers in ingredient_map.items():
        if any(marker in joined for marker in markers):
            confidence = "High" if label in {"cheese", "pizza crust"} and "pizza" in food_name.lower() else "Moderate"
            ingredients.append({"name": label, "confidence": confidence})
    return ingredients


def estimate_image_portion(food_name: str, ingredients: list[dict] | None = None,
                           terms: list[str] | None = None) -> dict:
    name = food_name.lower()
    joined_terms = " ".join(terms or [])
    ingredient_count = len(ingredients or [])

    if "pizza" in name:
        if "slice" in joined_terms and "whole" not in joined_terms:
            return {
                "g": 125,
                "label": "1 visible pizza slice (~125g)",
                "confidence": "Moderate",
                "basis": "Photo terms suggest a slice rather than a whole pizza.",
                "options": [
                    {"label": "1 slice", "g": 125},
                    {"label": "2 slices", "g": 250},
                    {"label": "3 slices", "g": 375},
                ],
            }
        if ingredient_count >= 3 or "whole" in joined_terms or "pizza-pizza" in joined_terms:
            return {
                "g": 760,
                "label": "Whole topped pizza visible (~760g)",
                "confidence": "Moderate",
                "basis": "The photo appears to show an entire topped pizza, not a plated serving.",
                "options": [
                    {"label": "1 slice", "g": 95},
                    {"label": "2 slices", "g": 190},
                    {"label": "Half pizza", "g": 380},
                    {"label": "Whole pizza", "g": 760},
                ],
            }
        return {
            "g": 250,
            "label": "2 pizza slices (~250g)",
            "confidence": "Low",
            "basis": "Pizza was detected, but the visible amount is uncertain.",
            "options": [
                {"label": "1 slice", "g": 125},
                {"label": "2 slices", "g": 250},
                {"label": "Half pizza", "g": 500},
            ],
        }

    base = estimate_portion(food_name)
    return {
        **base,
        "basis": "Estimated from detected food category.",
        "options": [
            {"label": "Small", "g": round((base["g"] or 150) * 0.65)},
            {"label": "Medium", "g": base["g"] or 150},
            {"label": "Large", "g": round((base["g"] or 150) * 1.4)},
        ],
    }


def _best_food_detection(vision_result: dict) -> str | None:
    candidates: list[tuple[str, float]] = []

    for label in vision_result.get("labelAnnotations", []):
        name = label.get("description", "")
        score = float(label.get("score", 0) or 0)
        candidates.append((name, score))

    for obj in vision_result.get("localizedObjectAnnotations", []):
        name = obj.get("name", "")
        score = float(obj.get("score", 0) or 0)
        candidates.append((name, score))

    web_detection = vision_result.get("webDetection", {}) or {}
    for entity in web_detection.get("webEntities", []):
        name = entity.get("description", "")
        score = float(entity.get("score", 0) or 0)
        candidates.append((name, min(score, 1.0)))

    if not candidates:
        return None

    skip = {
        "food","dish","cuisine","ingredient","tableware","recipe",
        "meal","plate","bowl","table","fork","knife","spoon",
        "drink","beverage","snack","fast food","produce","fruit",
        "vegetable","natural foods","whole food",
    }

    food_keywords = {
        "apple","banana","orange","grape","pizza","burger","sandwich",
        "bread","cake","cookie","donut","pasta","rice","noodle","salad",
        "chicken","beef","fish","egg","cheese","yogurt","ice cream",
        "cereal","soup","fries","potato","chocolate","candy","taco",
        "sushi","steak","oatmeal","pancake","waffle","muffin",
    }

    cleaned: list[tuple[str, float]] = []
    for raw_name, raw_score in candidates:
        name = (raw_name or "").lower().strip()
        if not name or name in skip:
            continue
        score = raw_score
        if any(keyword in name for keyword in food_keywords):
            score += 0.35
        cleaned.append((name, score))

    if not cleaned:
        return None

    cleaned.sort(key=lambda item: item[1], reverse=True)
    best_name, best_score = cleaned[0]
    if best_score < 0.45:
        return None
    return best_name
