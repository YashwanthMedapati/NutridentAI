import base64

import requests
from fastapi import HTTPException

from .config import google_api_key
from .portion import estimate_portion


def detect_food_from_image(image_bytes: bytes) -> str | None:
    return analyze_food_image(image_bytes).get("food_name")


def analyze_food_image(image_bytes: bytes, filename: str | None = None) -> dict:
    vision_result = _vision_result_from_image(image_bytes)
    food_name = _best_food_detection(vision_result)
    if not food_name:
        return {"food_name": None}

    terms = _vision_terms(vision_result, filename)
    ingredients = _visible_ingredients_from_terms(terms, food_name)
    portion_info = estimate_image_portion(food_name, ingredients, terms)

    return {
        "food_name": food_name,
        "detected_ingredients": ingredients,
        "visible_amount": portion_info,
        "observation_note": _image_observation_note(food_name, ingredients, portion_info),
        "source": "Google Vision labels plus NutriDent image heuristics",
    }


def _vision_result_from_image(image_bytes: bytes) -> dict:
    api_key = google_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="GOOGLE_API_KEY is not configured")

    url  = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    body = {
        "requests": [{
            "image":    {"content": base64.b64encode(image_bytes).decode()},
            "features": [
                {"type": "LABEL_DETECTION", "maxResults": 15},
                {"type": "WEB_DETECTION", "maxResults": 10},
                {"type": "OBJECT_LOCALIZATION", "maxResults": 10},
            ],
        }]
    }
    response = requests.post(url, json=body, timeout=30)
    response.raise_for_status()
    result   = response.json()

    if "error" in result:
        raise HTTPException(status_code=502, detail=f"Vision API error: {_google_error_message(result['error'])}")

    responses = result.get("responses", [])
    if not responses:
        raise HTTPException(status_code=502, detail="Vision API returned an empty response")

    vision_result = responses[0]
    if "error" in vision_result:
        raise HTTPException(status_code=502, detail=f"Vision API error: {_google_error_message(vision_result['error'])}")

    food_name = _best_food_detection(vision_result)
    if not food_name:
        return {}
    return vision_result


def _google_error_message(error: dict | str) -> str:
    if isinstance(error, str):
        return error
    message = error.get("message") or "Unknown Google Vision API error"
    status = error.get("status")
    code = error.get("code")
    prefix = f"{status}: " if status else ""
    suffix = f" (code {code})" if code else ""
    return f"{prefix}{message}{suffix}"


def _vision_terms(vision_result: dict, filename: str | None = None) -> list[str]:
    terms: list[str] = []
    for label in vision_result.get("labelAnnotations", []):
        terms.append(label.get("description", ""))
    for obj in vision_result.get("localizedObjectAnnotations", []):
        terms.append(obj.get("name", ""))
    web_detection = vision_result.get("webDetection", {}) or {}
    for entity in web_detection.get("webEntities", []):
        terms.append(entity.get("description", ""))
    if filename:
        terms.extend(filename.replace("_", "-").replace(".", "-").split("-"))
    return [term.lower().strip() for term in terms if term and term.strip()]


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


def _image_observation_note(food_name: str, ingredients: list[dict], portion_info: dict) -> str:
    ingredient_names = [item["name"] for item in ingredients]
    if ingredient_names:
        return (
            f"Detected {food_name} with visible toppings/ingredients: "
            f"{', '.join(ingredient_names)}. {portion_info.get('basis', '')}"
        ).strip()
    return f"Detected {food_name}. {portion_info.get('basis', '')}".strip()


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
