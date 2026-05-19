from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
import requests
import base64
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USDA_API_KEY = os.getenv("USDA_API_KEY")
SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

model    = joblib.load("caries_model.pkl")
features = joblib.load("feature_names.pkl")


# ── PYDANTIC MODELS ────────────────────────────────────────────────────────────

class PatientInput(BaseModel):
    RIDAGEYR: float; RIAGENDR: float
    DR1TSUGR: float; DR1TCARB: float; DR1TTFAT: float; DR1TKCAL: float
    DR1TCALC: float; DR1TPHOS: float; DR1TSFAT: float
    SMD650: float;   SMQ040: float;   SMD030: float
    DBD895: float;   DBD900: float;   DBD905: float; DBD910: float

class FoodInput(BaseModel):
    food_name: str

class CombinedInput(BaseModel):
    RIDAGEYR: float; RIAGENDR: float
    DR1TSUGR: float; DR1TCARB: float; DR1TTFAT: float; DR1TKCAL: float
    DR1TCALC: float; DR1TPHOS: float; DR1TSFAT: float
    SMD650: float;   SMQ040: float;   SMD030: float
    DBD895: float;   DBD900: float;   DBD905: float; DBD910: float
    food_name: str


# ── USDA — STRICT FILTERING ────────────────────────────────────────────────────

# Data types that are actual food entries (not research papers, survey data, etc.)
VALID_DATA_TYPES = {
    "Foundation",
    "SR Legacy",
    "Survey (FNDDS)",
    "Branded",
}

# Keywords that indicate non-food / irrelevant results
INVALID_KEYWORDS = [
    "infant formula", "enteral", "medical food", "supplement",
    "nutrient database", "study", "research", "survey", "nhanes",
    "usda", "mixed dish", "recipe", "NFS", "not further specified"
]

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
    if not USDA_API_KEY:
        raise ValueError("USDA_API_KEY not found in .env file")

    params = {
        "query": food_name,
        "api_key": USDA_API_KEY,
        "pageSize": top_n,
    }

    response = requests.get(SEARCH_URL, params=params, timeout=30)
    response.raise_for_status()
    foods = response.json().get("foods", [])

    # Priority order
    priority = {"Foundation": 0, "SR Legacy": 1, "Survey (FNDDS)": 2, "Branded": 3}

    valid = []

    for f in foods:
        if not is_valid_food_item(f):
            continue

        name = f.get("description", "").lower()

        # 🚫 filter bad matches
        if any(word in name for word in ["candied", "sweetened", "dessert", "frosting", "syrup"]):
            continue

        valid.append(f)

    if not valid:
        return None

    valid.sort(key=lambda f: priority.get(f.get("dataType", ""), 99))

    return valid[0]


# ── NUTRITION EXTRACTION — ROBUST ──────────────────────────────────────────────

# Map multiple possible USDA nutrient name variants to canonical keys
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

def extract_nutrients(food: dict) -> dict:
    # Build a flat lookup: nutrientName (lower) -> value
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

    # Sanity-check: if all macros are zero, mark as unreliable
    result["data_reliable"] = any([
        result["sugar_g"], result["carbs_g"],
        result["fat_g"],   result["energy_kcal"]
    ])

    return result


# ── FOOD RISK SCORING ──────────────────────────────────────────────────────────

def food_risk_score(nutrition: dict):
    sugar = nutrition.get("sugar_g", 0)
    carbs = nutrition.get("carbs_g", 0)
    fat = nutrition.get("fat_g", 0)
    calcium = nutrition.get("calcium_mg", 0)
    phosphorus = nutrition.get("phosphorus_mg", 0)

    score = 0
    reasons = []
    warning = None

    # 🔴 SUGAR (adjusted for realism)
    if sugar >= 35:
        score += 4
        reasons.append("Extremely high sugar content")
        warning = "Very high sugar — strong cariogenic potential"
    elif sugar >= 25:
        score += 3
        reasons.append("Very high sugar content")
    elif sugar >= 15:
        score += 2
        reasons.append("High sugar content")
    elif sugar >= 10:
        score += 1
        reasons.append("Moderate sugar")
    elif sugar >= 5:
        score += 0.5
        reasons.append("Low sugar")

    # 🟡 CARBS (stronger now)
    if carbs >= 50:
        score += 3
        reasons.append("Very high carbohydrate load")
    elif carbs >= 25:
        score += 2
        reasons.append("High carbohydrates")
    elif carbs >= 15:
        score += 1
        reasons.append("Moderate carbohydrates")

    # 🍕 STICKY EFFECT (important for pizza)
    if carbs >= 15 and fat >= 8:
        score += 2
        reasons.append("Likely sticky or starchy texture")

    # 🟢 PROTECTION (reduced strength)
    if calcium >= 200:
        score -= 1
        reasons.append("Calcium provides slight protection")

    if phosphorus >= 200:
        score -= 1

    score = max(score, 0)

    # 🎯 FINAL CLASSIFICATION
    if score <= 1:
        risk = "Low"
    elif score <= 4:
        risk = "Medium"
    else:
        risk = "High"

    # 💡 ADVICE
    if risk == "High":
        consumption_advice = "Limit frequent intake. Avoid before sleep. Rinse or brush after eating."
    elif risk == "Medium":
        consumption_advice = "Consume in moderation and avoid frequent snacking."
    else:
        consumption_advice = "Relatively safer, but frequency still matters."

    return {
        "food_risk_score": score,
        "food_risk_level": risk,
        "reasons": reasons,
        "warning": warning,
        "consumption_advice": consumption_advice
    }


# ── PATIENT RISK ───────────────────────────────────────────────────────────────

def build_patient_features(raw: dict):
    age     = raw["RIDAGEYR"]
    smq040  = raw["SMQ040"]
    smd030  = raw["SMD030"]
    sugar   = raw["DR1TSUGR"]
    carbs   = raw["DR1TCARB"]
    ff      = raw["DBD900"]

    smoker_flag   = 1 if smq040 == 1 else 0
    smoker_years  = max(age - smd030, 0)
    sugar_per_year = sugar / (age + 1)
    age_group = 0 if age <= 18 else (1 if age <= 35 else (2 if age <= 50 else 3))
    diet_risk_score = sugar * 0.4 + carbs * 0.3 + ff * 0.3

    full_input = {
        **{k: raw[k] for k in [
            "RIDAGEYR","RIAGENDR","DR1TSUGR","DR1TCARB","DR1TTFAT",
            "DR1TKCAL","DR1TCALC","DR1TPHOS","DR1TSFAT",
            "SMD650","SMQ040","DBD895","DBD900","DBD905","DBD910"
        ]},
        "smoker_flag":    smoker_flag,
        "smoker_years":   smoker_years,
        "sugar_per_year": sugar_per_year,
        "age_group":      age_group,
        "diet_risk_score": diet_risk_score,
    }

    engineered = {
        "smoker_flag":     smoker_flag,
        "smoker_years":    round(float(smoker_years), 2),
        "sugar_per_year":  round(float(sugar_per_year), 3),
        "age_group":       age_group,
        "diet_risk_score": round(float(diet_risk_score), 2),
    }
    return full_input, engineered


def predict_patient_risk(raw: dict) -> dict:
    full_input, engineered = build_patient_features(raw)
    input_array = np.array([full_input[f] for f in features]).reshape(1, -1)

    prediction  = model.predict(input_array)[0]
    probability = model.predict_proba(input_array)[0][1]

    # ── AGE-BIAS CORRECTION ────────────────────────────────────────────────────
    # The model can over-rely on age. We apply a soft correction: if age is
    # young (<30) but diet/smoking signals are bad, nudge probability up.
    # If age is old (>55) but lifestyle is clean, nudge probability down.
    age          = raw["RIDAGEYR"]
    sugar        = raw["DR1TSUGR"]
    smq040       = raw["SMQ040"]
    diet_signals = (sugar > 80) or (raw["DBD900"] > 4) or (smq040 == 1)

    if age < 30 and diet_signals:
        probability = min(probability + 0.08, 0.99)
    if age > 55 and not diet_signals and sugar < 50:
        probability = max(probability - 0.07, 0.01)

    result_label = "High Risk" if probability >= 0.5 else "Low Risk"

    return {
        "prediction":         result_label,
        "risk_probability":   round(float(probability), 3),
        "engineered_features": engineered,
    }


def generate_explanations(data):
    reasons = []
    risk_breakdown = {
        "Sugar": 0.0,
        "Carbs": 0.0,
        "Smoking": 0.0,
        "Calcium": 0.0,
        "Fast Food": 0.0
    }

    # Sugar
    if data["DR1TSUGR"] > 120:
        reasons.append("Extremely high sugar intake")
        risk_breakdown["Sugar"] = 1.0
    elif data["DR1TSUGR"] > 80:
        reasons.append("High sugar intake")
        risk_breakdown["Sugar"] = 0.8
    elif data["DR1TSUGR"] > 50:
        reasons.append("Moderately high sugar intake")
        risk_breakdown["Sugar"] = 0.5

    # Carbs
    if data["DR1TCARB"] > 300:
        reasons.append("High carbohydrate consumption")
        risk_breakdown["Carbs"] = 0.8
    elif data["DR1TCARB"] > 200:
        risk_breakdown["Carbs"] = 0.5

    # Smoking
    if data["SMQ040"] == 1:
        reasons.append("Frequent smoking increases caries risk")
        risk_breakdown["Smoking"] = 0.8
    elif data["SMQ040"] == 2:
        reasons.append("Occasional smoking may increase caries risk")
        risk_breakdown["Smoking"] = 0.5

    # Calcium
    if data["DR1TCALC"] < 400:
        reasons.append("Very low calcium intake may weaken enamel")
        risk_breakdown["Calcium"] = 0.8
    elif data["DR1TCALC"] < 600:
        reasons.append("Low calcium intake weakens enamel")
        risk_breakdown["Calcium"] = 0.5
    else:
        risk_breakdown["Calcium"] = 0.2

    # Fast food
    if data["DBD900"] > 5:
        reasons.append("Very frequent fast food consumption")
        risk_breakdown["Fast Food"] = 0.8
    elif data["DBD900"] > 3:
        reasons.append("Frequent fast food consumption")
        risk_breakdown["Fast Food"] = 0.5

    if not reasons:
        reasons.append("No major risk factors detected")

    return {
        "why": reasons,
        "risk_breakdown": risk_breakdown
    }


def combined_recommendation(patient_pred: str, food_level: str) -> str:
    combos = {
        ("High Risk", "High"):   "High baseline risk and high-risk food. Strongly limit this food and maintain strict oral hygiene.",
        ("High Risk", "Medium"): "High baseline risk. This food adds moderate caries load — watch portion size and timing.",
        ("High Risk", "Low"):    "High baseline risk, but this food is relatively safer. Focus on overall diet patterns.",
        ("Low Risk",  "High"):   "Good baseline health, but this food is highly cariogenic. Limit frequency and rinse after eating.",
        ("Low Risk",  "Medium"): "Baseline risk is low. Moderate-risk food — consume in moderation.",
        ("Low Risk",  "Low"):    "Both baseline and food risk appear low. Maintain current habits and regular check-ups.",
    }
    return combos.get((patient_pred, food_level),
                      "Maintain good oral hygiene and regular dental check-ups.")


# ── ENDPOINTS ──────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "Caries Risk API is running"}


@app.post("/predict")
def predict(data: PatientInput):
    try:
        result = predict_patient_risk(data.model_dump())
        expl   = generate_explanations(data.model_dump())
        result.update(expl)
        return result
    except Exception as e:
        return {"error": str(e)}


@app.post("/food-risk")
def get_food_risk(data: FoodInput):
    try:
        food = search_food(data.food_name)
        if not food:
            return {"error": f"No food match found for: {data.food_name}"}

        nutrition = extract_nutrients(food)
        risk      = food_risk_score(nutrition)

        return {
            "food_name_entered": data.food_name,
            "usda_match":        nutrition["food"],
            "nutrition":         nutrition,
            "risk":              risk,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/combined-risk")
def get_combined_risk(data: CombinedInput):
    try:
        raw = data.model_dump()

        patient_result = predict_patient_risk(raw)
        expl           = generate_explanations(raw)
        patient_result.update(expl)

        food = search_food(raw["food_name"])
        if not food:
            return {"error": f"No USDA match found for: {raw['food_name']}"}

        nutrition  = extract_nutrients(food)
        food_result = food_risk_score(nutrition)

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
            "food_risk": {
                "food_name_entered": raw["food_name"],
                "usda_match":        nutrition["food"],
                "nutrition":         nutrition,
                "risk":              food_result,
            },
            "final_advice": advice,
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/image-food-risk")
async def image_food_risk(file: UploadFile = File(...)):
    try:
        contents  = await file.read()
        food_name = detect_food_from_image(contents)

        if not food_name:
            return {"error": "Could not detect food from image"}

        food = search_food(food_name)
        if not food:
            return {
                "detected_food": food_name,
                "error": f"Food detected as '{food_name}' but no USDA match found.",
            }

        nutrition = extract_nutrients(food)
        risk      = food_risk_score(nutrition)

        if not nutrition["data_reliable"]:
            risk["warning"] = "Nutrition data may be incomplete for this item."

        return {
            "detected_food": food_name,
            "usda_match":    nutrition["food"],
            "nutrition":     nutrition,
            "risk":          risk,
        }
    except Exception as e:
        return {"error": str(e)}


def detect_food_from_image(image_bytes: bytes) -> str | None:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in .env file")

    url  = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
    body = {
        "requests": [{
            "image":    {"content": base64.b64encode(image_bytes).decode()},
            "features": [{"type": "LABEL_DETECTION", "maxResults": 10}],
        }]
    }

    response = requests.post(url, json=body, timeout=30)
    result   = response.json()

    if "error" in result:
        raise ValueError(f"Vision API error: {result['error']}")

    responses = result.get("responses", [])
    if not responses or "error" in responses[0]:
        raise ValueError("Vision API returned no usable response")

    labels = responses[0].get("labelAnnotations", [])
    if not labels:
        raise ValueError("No labels detected in image")

    # Skip generic non-food labels
    skip = {
        "food", "dish", "cuisine", "ingredient", "tableware", "recipe",
        "meal", "plate", "bowl", "table", "fork", "knife", "spoon",
        "drink", "beverage", "snack", "fast food",
    }

    for label in labels:
        name  = label.get("description", "").lower().strip()
        score = label.get("score", 0)
        if name and name not in skip and score > 0.7:
            return name

    # Fallback to first label
    return labels[0].get("description", "").lower() or None
