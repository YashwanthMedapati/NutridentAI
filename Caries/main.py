import os

import requests
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from core.config import RATE_LIMIT_EXTERNAL, split_origins
from core.errors import internal_error, read_validated_image
from core.indian_foods import (
    extract_indian_nutrients,
    indian_dataset_summary,
    indian_portion_info,
    search_indian_food,
)
from core.middleware import add_security_headers, log_requests
from core.openfoodfacts import (
    build_label_red_flags,
    extract_off_nutrition,
    fetch_off_product,
    get_off_serving_g,
)

# The following are unused directly in this file but are re-exported so that
# `main.X` keeps working for test_core.py, which imports this module and
# reaches into its internals (main.build_patient_features, main.scale_nutrition,
# main._best_food_detection, etc.) rather than importing from core.* directly.
from core.patient_model import (
    build_patient_features,  # noqa: F401
    combined_recommendation,
    features,
    generate_explanations,
    model,
    predict_patient_risk,
)
from core.portion import estimate_portion, scale_nutrition
from core.quality import (  # noqa: F401
    attach_analysis_metadata,
    ingredient_calorie_breakdown,
    nutrition_quality,
)
from core.rate_limit import limiter
from core.risk_engine import food_risk_score
from core.schemas import BarcodeInput, CombinedInput, FoodInput, MealInput, PatientInput
from core.usda import extract_nutrients, search_food
from core.vision import (  # noqa: F401
    _vision_terms,
    analyze_food_image,
    detect_food_from_image,
)
from core.vision_heuristics import (  # noqa: F401
    _best_food_detection,
    _visible_ingredients_from_terms,
    estimate_image_portion,
)

app = FastAPI()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=split_origins(os.getenv("CORS_ORIGINS")),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.middleware("http")(add_security_headers)
app.middleware("http")(log_requests)
app.add_middleware(SlowAPIMiddleware)


def _food_lookup(food_name: str) -> tuple[dict, dict, dict | None, str]:
    indian_food = search_indian_food(food_name)
    if indian_food:
        return (
            indian_food,
            extract_indian_nutrients(indian_food),
            indian_portion_info(indian_food),
            "Indian nutrition dataset",
        )

    food = search_food(food_name)
    if not food:
        raise HTTPException(status_code=404, detail=f"No food match found for: {food_name}")
    return food, extract_nutrients(food), None, "USDA FoodData Central"


def _portion_for_food(food_name: str, portion_g: float | None, dataset_portion: dict | None) -> tuple[dict, float]:
    if portion_g and portion_g > 0:
        return {"g": portion_g, "label": f"User-specified ({portion_g}g)", "confidence": "User"}, portion_g
    portion_info = dataset_portion or estimate_portion(food_name)
    return portion_info, portion_info["g"]


def _append_dataset_notes(risk: dict, nutrition_per_100g: dict) -> dict:
    tags = nutrition_per_100g.get("dental_tags") or []
    if tags:
        risk["reasons"] = risk.get("reasons", []) + [
            f"Indian dataset note: {tag}" for tag in tags[:3]
        ]
    return risk


def _source_details(source: str, nutrition_per_100g: dict, lookup: dict | None = None) -> dict:
    details = {
        "name": source,
        "record": nutrition_per_100g.get("food") or (lookup or {}).get("description") or "Unknown",
        "data_reliable": bool(nutrition_per_100g.get("data_reliable", True)),
        "citation": nutrition_per_100g.get("source_citation"),
        "matched_alias": nutrition_per_100g.get("matched_alias"),
        "match_score": nutrition_per_100g.get("match_score"),
        "category": nutrition_per_100g.get("category"),
    }
    return {key: value for key, value in details.items() if value not in (None, "", [])}


def _nutrition_payload(food_name: str, portion_g: float | None = None) -> dict:
    lookup, nutrition_per_100g, dataset_portion, source = _food_lookup(food_name)
    portion_info, actual_portion_g = _portion_for_food(food_name, portion_g, dataset_portion)
    nutrition = scale_nutrition(nutrition_per_100g, actual_portion_g)
    return {
        "lookup": lookup,
        "nutrition_per_100g": nutrition_per_100g,
        "portion_info": portion_info,
        "portion_g": actual_portion_g,
        "nutrition": nutrition,
        "source": source,
        "source_details": _source_details(source, nutrition_per_100g, lookup),
    }


def _aggregate_meal_nutrition(items: list[dict]) -> tuple[dict, dict]:
    numeric_keys = [
        "sugar_g", "carbs_g", "fat_g", "protein_g", "calcium_mg",
        "phosphorus_mg", "energy_kcal", "fiber_g", "sodium_mg",
    ]
    total_g = round(sum(item["portion_g"] for item in items), 1)
    totals = {key: round(sum(item["nutrition"].get(key, 0) or 0 for item in items), 2) for key in numeric_keys}
    per_100g = {
        key: round((value / total_g) * 100, 2) if total_g else 0
        for key, value in totals.items()
    }
    per_100g.update({
        "food": "Combo meal",
        "data_reliable": all(item["nutrition"].get("data_reliable", True) for item in items),
    })
    totals.update({
        "food": "Combo meal",
        "data_reliable": per_100g["data_reliable"],
        "per_100g": {key: per_100g.get(key, 0) for key in numeric_keys},
        "portion_g": total_g,
    })
    return totals, per_100g


def _meal_source_summary(items: list[dict]) -> str:
    sources = []
    for item in items:
        source = item["source"]
        if source not in sources:
            sources.append(source)
    return " + ".join(sources)


# ── ENDPOINTS ──────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "NutriDent AI API is running"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "services": {
            "model_loaded": model is not None and features is not None,
            "usda_configured": bool(os.getenv("USDA_API_KEY")),
            "google_vision_configured": bool(os.getenv("GOOGLE_API_KEY")),
            "open_food_facts": "available",
            "indian_food_dataset": indian_dataset_summary(),
        },
    }


@app.get("/model-info")
def model_info():
    return {
        "model_type": type(model).__name__,
        "feature_count": len(features),
        "model_version": os.getenv("MODEL_VERSION", "local-dev"),
        "training_data": "NHANES 2017-2018 dental examination, dietary recall, and lifestyle questionnaire features",
        "limitations": [
            "Educational and research use only",
            "Not a clinical diagnosis",
            "Risk estimates depend on self-reported diet and lifestyle inputs",
        ],
    }


@app.post("/predict")
def predict(data: PatientInput):
    try:
        result = predict_patient_risk(data.model_dump())
        expl   = generate_explanations(data.model_dump())
        result.update(expl)
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise internal_error("Patient risk prediction", e) from e


@app.post("/food-risk")
@limiter.limit(RATE_LIMIT_EXTERNAL)
def get_food_risk(request: Request, data: FoodInput):
    try:
        food_data = _nutrition_payload(data.food_name, data.portion_g)
        nutrition_per_100g = food_data["nutrition_per_100g"]
        portion_info = food_data["portion_info"]
        portion_g = food_data["portion_g"]
        nutrition = food_data["nutrition"]
        source = food_data["source"]
        risk = _append_dataset_notes(food_risk_score(nutrition, portion_g), nutrition_per_100g)

        return attach_analysis_metadata({
            "food_name_entered": data.food_name,
            "usda_match": nutrition["food"],
            "nutrition": nutrition,
            "nutrition_per_100g": nutrition_per_100g,
            "portion_estimate": portion_info,
            "risk": risk,
            "source": source,
            "source_details": food_data["source_details"],
        }, portion_info, nutrition, source=source)

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"USDA lookup failed: {e}") from e
    except Exception as e:
        raise internal_error("Food risk lookup", e) from e


@app.post("/meal-risk")
@limiter.limit(RATE_LIMIT_EXTERNAL)
def get_meal_risk(request: Request, data: MealInput):
    try:
        resolved_items = []
        for item in data.items:
            food_data = _nutrition_payload(item.food_name, item.portion_g)
            nutrition_per_100g = food_data["nutrition_per_100g"]
            item_risk = _append_dataset_notes(
                food_risk_score(food_data["nutrition"], food_data["portion_g"]),
                nutrition_per_100g,
            )
            resolved_items.append({
                "food_name_entered": item.food_name,
                "matched_food": food_data["nutrition"]["food"],
                "nutrition": food_data["nutrition"],
                "nutrition_per_100g": nutrition_per_100g,
                "portion_estimate": food_data["portion_info"],
                "portion_g": food_data["portion_g"],
                "risk": item_risk,
                "source": food_data["source"],
                "source_details": food_data["source_details"],
            })

        nutrition, nutrition_per_100g = _aggregate_meal_nutrition(resolved_items)
        portion_info = {
            "g": nutrition["portion_g"],
            "label": f"Combined meal ({nutrition['portion_g']}g total)",
            "confidence": "User" if all(item.portion_g for item in data.items) else "Moderate",
            "basis": "Total of each meal item portion.",
        }
        risk = food_risk_score(nutrition, nutrition["portion_g"])
        risk["reasons"] = [
            f"{item['matched_food']}: {item['nutrition']['energy_kcal']} kcal, {item['nutrition']['carbs_g']}g carbs"
            for item in resolved_items
        ] + risk.get("reasons", [])
        source = _meal_source_summary(resolved_items)

        return attach_analysis_metadata({
            "food_name_entered": " + ".join(item.food_name for item in data.items),
            "detected_food": "Combo meal",
            "usda_match": "Combo meal",
            "meal_items": resolved_items,
            "nutrition": nutrition,
            "nutrition_per_100g": nutrition_per_100g,
            "portion_estimate": portion_info,
            "risk": risk,
            "source": source,
            "source_details": {
                "name": source,
                "record": "Combo meal",
                "data_reliable": nutrition["data_reliable"],
                "item_count": len(resolved_items),
            },
        }, portion_info, nutrition, source=source)

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Meal nutrition lookup failed: {e}") from e
    except Exception as e:
        raise internal_error("Meal risk lookup", e) from e


@app.post("/combined-risk")
@limiter.limit(RATE_LIMIT_EXTERNAL)
def get_combined_risk(request: Request, data: CombinedInput):
    try:
        raw = data.model_dump()

        patient_result = predict_patient_risk(raw)
        expl           = generate_explanations(raw)
        patient_result.update(expl)

        food_data = _nutrition_payload(raw["food_name"], raw.get("portion_g"))
        nutrition_per_100g = food_data["nutrition_per_100g"]
        portion_info = food_data["portion_info"]
        portion_g = food_data["portion_g"]
        nutrition = food_data["nutrition"]
        source = food_data["source"]
        food_result = _append_dataset_notes(food_risk_score(nutrition, portion_g), nutrition_per_100g)

        if not nutrition["data_reliable"]:
            food_result["warning"] = (
                (food_result["warning"] or "") +
                " Note: nutrition data may be incomplete for this food."
            ).strip()

        advice = combined_recommendation(
            patient_result["prediction"],
            food_result["food_risk_level"],
        )

        return {
            "patient_risk": patient_result,
            "food_risk": attach_analysis_metadata({
                "food_name_entered": raw["food_name"],
                "usda_match": nutrition["food"],
                "nutrition": nutrition,
                "nutrition_per_100g": nutrition_per_100g,
                "portion_estimate": portion_info,
                "risk": food_result,
                "source": source,
                "source_details": food_data["source_details"],
            }, portion_info, nutrition, source=source),
            "final_advice": advice,
        }

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"USDA lookup failed: {e}") from e
    except Exception as e:
        raise internal_error("Combined risk lookup", e) from e


@app.post("/image-food-risk")
@limiter.limit(RATE_LIMIT_EXTERNAL)
async def image_food_risk(request: Request, file: UploadFile = File(...)):
    try:
        contents  = await read_validated_image(file)
        image_analysis = analyze_food_image(contents, file.filename)
        food_name = image_analysis.get("food_name")

        if not food_name:
            raise HTTPException(status_code=422, detail="Could not detect food from image")

        lookup, nutrition_per_100g, dataset_portion, source = _food_lookup(food_name)
        portion_info = image_analysis.get("visible_amount") or dataset_portion or estimate_portion(food_name)
        portion_g = portion_info["g"]
        nutrition = scale_nutrition(nutrition_per_100g, portion_g)
        risk = _append_dataset_notes(food_risk_score(nutrition, portion_g), nutrition_per_100g)

        if not nutrition["data_reliable"]:
            risk["warning"] = "Nutrition data may be incomplete for this item."

        return attach_analysis_metadata({
            "detected_food": food_name,
            "usda_match": nutrition["food"],
            "image_insights": image_analysis,
            "nutrition": nutrition,
            "nutrition_per_100g": nutrition_per_100g,
            "portion_estimate": portion_info,
            "risk": risk,
            "source": f"{source} + Google Vision",
            "source_details": _source_details(source, nutrition_per_100g, lookup),
        }, portion_info, nutrition, source=f"{source} + Google Vision", image_based=True,
           ingredients=image_analysis.get("detected_ingredients"))

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Food image analysis failed: {e}") from e
    except Exception as e:
        raise internal_error("Image food analysis", e) from e


@app.post("/barcode-food-risk")
@limiter.limit(RATE_LIMIT_EXTERNAL)
def barcode_food_risk(request: Request, data: BarcodeInput):
    """
    Look up a packaged food by barcode (EAN-13 / UPC) using Open Food Facts.
    Runs through the same food_risk_score engine as photo and text search.
    Returns the same response shape so the frontend can reuse the same result cards.
    """
    try:
        barcode = data.barcode.strip()
        if not barcode:
            raise HTTPException(status_code=422, detail="Barcode cannot be empty")

        product = fetch_off_product(barcode)
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"No product found for barcode: {barcode}. Try searching by name instead.",
            )

        # Determine portion: user override → label serving size → 100g
        if data.portion_g and data.portion_g > 0:
            portion_g    = data.portion_g
            portion_info = {
                "g": portion_g,
                "label": f"User-specified ({portion_g}g)",
                "confidence": "User"
            }
        else:
            label_g = get_off_serving_g(product)
            portion_g = label_g
            portion_info = {
                "g": portion_g,
                "label": f"Label serving size ({portion_g}g)",
                "confidence": "High" if label_g != 100.0 else "Low"
            }

        nutrition = extract_off_nutrition(product, portion_g)

        if not nutrition["data_reliable"]:
            raise HTTPException(
                status_code=422,
                detail="Nutrition data is missing or incomplete for this product. Try searching by food name instead.",
            )

        risk  = food_risk_score(nutrition, portion_g)
        flags = build_label_red_flags(product, nutrition)

        # Add flags to risk reasons so they appear in the existing reasons list
        if flags:
            risk["reasons"] = risk.get("reasons", []) + flags

        product_name = nutrition["food"]

        return attach_analysis_metadata({
            "barcode":            barcode,
            "product_name":       product_name,
            "detected_food":      product_name,   # keep same key as image endpoint
            "usda_match":         product_name,   # reuse same display key on frontend
            "brand":              product.get("brands", ""),
            "ingredients":        product.get("ingredients_text", ""),
            "nutrition":          nutrition,
            "nutrition_per_100g": nutrition["per_100g"],
            "portion_estimate":   portion_info,
            "label_red_flags":    flags,
            "risk":               risk,
            "source":             "Open Food Facts",
            "source_details": {
                "name": "Open Food Facts",
                "record": product_name,
                "data_reliable": nutrition["data_reliable"],
                "brand": product.get("brands", ""),
            },
        }, portion_info, nutrition, source="Open Food Facts")

    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Open Food Facts lookup failed: {e}") from e
    except Exception as e:
        raise internal_error("Barcode food lookup", e) from e
