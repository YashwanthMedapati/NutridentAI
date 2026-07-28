import base64

import requests
from fastapi import HTTPException

from .config import google_api_key
from .vision_heuristics import _best_food_detection, _visible_ingredients_from_terms, estimate_image_portion


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


def _image_observation_note(food_name: str, ingredients: list[dict], portion_info: dict) -> str:
    ingredient_names = [item["name"] for item in ingredients]
    if ingredient_names:
        return (
            f"Detected {food_name} with visible toppings/ingredients: "
            f"{', '.join(ingredient_names)}. {portion_info.get('basis', '')}"
        ).strip()
    return f"Detected {food_name}. {portion_info.get('basis', '')}".strip()
