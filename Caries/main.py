from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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
SEARCH_URL   = "https://api.nal.usda.gov/fdc/v1/foods/search"

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
    portion_g: Optional[float] = None   # user-supplied or AI-estimated portion in grams

class BarcodeInput(BaseModel):
    barcode: str                     # EAN-13, UPC-A, UPC-E etc.
    portion_g: Optional[float] = None  # user override; falls back to serving size on label

class CombinedInput(BaseModel):
    RIDAGEYR: float; RIAGENDR: float
    DR1TSUGR: float; DR1TCARB: float; DR1TTFAT: float; DR1TKCAL: float
    DR1TCALC: float; DR1TPHOS: float; DR1TSFAT: float
    SMD650: float;   SMQ040: float;   SMD030: float
    DBD895: float;   DBD900: float;   DBD905: float; DBD910: float
    food_name: str
    portion_g: Optional[float] = None


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


# ── USDA FILTERING ─────────────────────────────────────────────────────────────

VALID_DATA_TYPES = {"Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"}
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
        "query":    food_name,
        "api_key":  USDA_API_KEY,
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


# ── NUTRITION EXTRACTION ───────────────────────────────────────────────────────

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


# ── PORTION-AWARE FOOD RISK SCORING ───────────────────────────────────────────

def food_risk_score(nutrition: dict, portion_g: float = 100.0) -> dict:
    """
    Score caries risk using portion-scaled nutrition values.
    nutrition should already be scaled to portion_g before calling,
    OR we scale internally if portion_g != 100.

    Returns rich dict with:
    - food_risk_score (0-10)
    - food_risk_level (Low/Medium/High)
    - exposure_score  (harmful factors)
    - protective_score (calcium, phosphorus, fiber)
    - net_oral_risk_index (exposure - protective, 0-10)
    - net_oral_risk_label
    - reasons, warning, consumption_advice
    - frequency_risk (single vs frequent)
    - dentist_notes (dynamic, always populated)
    - action_plan (personalised)
    """
    sugar      = nutrition.get("sugar_g",      0) or 0
    carbs      = nutrition.get("carbs_g",      0) or 0
    fat        = nutrition.get("fat_g",        0) or 0
    calcium    = nutrition.get("calcium_mg",   0) or 0
    phosphorus = nutrition.get("phosphorus_mg",0) or 0
    fiber      = nutrition.get("fiber_g",      0) or 0
    kcal       = nutrition.get("energy_kcal",  0) or 0
    food_name  = nutrition.get("food", "").lower()

    reasons = []
    warning = None

    # ── EXPOSURE SCORING (0-10) ───────────────────────────────────────────────
    exposure = 0.0

    # Sugar contribution (0-4 pts)
    if sugar >= 30:
        exposure += 4.0; reasons.append(f"Very high sugar content ({sugar}g per serving)")
        warning = "High sugar — strong cariogenic potential"
    elif sugar >= 20:
        exposure += 3.0; reasons.append(f"High sugar content ({sugar}g per serving)")
    elif sugar >= 12:
        exposure += 2.0; reasons.append(f"Moderate-high sugar ({sugar}g per serving)")
    elif sugar >= 6:
        exposure += 1.0; reasons.append(f"Moderate sugar ({sugar}g per serving)")
    elif sugar >= 2:
        exposure += 0.5

    # Fermentable carbs (0-3 pts)
    if carbs >= 60:
        exposure += 3.0; reasons.append(f"Very high fermentable carbohydrates ({carbs}g)")
    elif carbs >= 35:
        exposure += 2.0; reasons.append(f"High fermentable carbohydrates ({carbs}g)")
    elif carbs >= 18:
        exposure += 1.0; reasons.append(f"Moderate carbohydrates ({carbs}g)")
    elif carbs >= 8:
        exposure += 0.5

    # Sticky/starchy texture proxy (0-2 pts)
    sticky_keywords = ["pasta","bread","cracker","chip","cookie","cake",
                       "pizza","cereal","rice","noodle","pastry","donut","pretzel"]
    is_sticky = carbs >= 15 and fat >= 5
    is_known_sticky = any(k in food_name for k in sticky_keywords)
    if is_known_sticky or is_sticky:
        exposure += 1.5; reasons.append("Starchy or sticky texture — adheres to teeth longer")
    elif carbs >= 10 and fat >= 3:
        exposure += 0.5

    # Portion size effect — large portions increase acid exposure time
    if portion_g >= 350:
        exposure += 1.0; reasons.append(f"Large portion ({portion_g}g) increases total acid exposure")
    elif portion_g >= 250:
        exposure += 0.5

    # ── PROTECTIVE SCORING (0-4 pts) ─────────────────────────────────────────
    protective = 0.0
    protective_reasons = []

    if calcium >= 200:
        protective += 2.0; protective_reasons.append(f"High calcium ({calcium}mg) — remineralises enamel")
    elif calcium >= 100:
        protective += 1.0; protective_reasons.append(f"Good calcium content ({calcium}mg)")
    elif calcium >= 50:
        protective += 0.5

    if phosphorus >= 200:
        protective += 1.5; protective_reasons.append(f"High phosphorus ({phosphorus}mg) — strengthens enamel")
    elif phosphorus >= 100:
        protective += 0.75; protective_reasons.append(f"Good phosphorus ({phosphorus}mg)")

    if fiber >= 5:
        protective += 0.5; protective_reasons.append(f"Dietary fiber ({fiber}g) — slows sugar absorption")

    reasons.extend(protective_reasons)

    # ── NET ORAL RISK INDEX ───────────────────────────────────────────────────
    exposure_capped  = min(round(exposure,  2), 10.0)
    protective_capped = min(round(protective, 2), 4.0)
    net_raw = max(exposure_capped - protective_capped, 0)
    net_oral_risk = min(round(net_raw, 1), 10.0)

    if net_oral_risk <= 1.5:
        net_label = "Low"
    elif net_oral_risk <= 4.0:
        net_label = "Moderate"
    elif net_oral_risk <= 6.5:
        net_label = "High"
    else:
        net_label = "Very High"

    # Final food risk classification (based on exposure for headline badge)
    food_score = min(round(exposure_capped, 1), 10.0)
    if food_score <= 1.5:
        risk_level = "Low"
    elif food_score <= 4.5:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # ── FREQUENCY RISK ────────────────────────────────────────────────────────
    def freq_risk_label(base_score):
        # Repeated exposure multiplies acid attack cycles
        freq_score = min(base_score * 1.6, 10.0)
        if freq_score <= 2:   return "Low"
        elif freq_score <= 5: return "Moderate"
        elif freq_score <= 7: return "High"
        else:                 return "Very High"

    frequency_risk = {
        "occasional_risk": risk_level,
        "frequent_risk":   freq_risk_label(food_score),
        "explanation": (
            "Each eating occasion creates a 20-minute acid attack on enamel. "
            "Frequent consumption multiplies this exposure significantly."
        )
    }

    # ── DYNAMIC DENTIST NOTES ─────────────────────────────────────────────────
    dentist_notes = _generate_dentist_notes(nutrition, food_name, portion_g, risk_level)

    # ── PERSONALISED ACTION PLAN ──────────────────────────────────────────────
    action_plan = _generate_action_plan(risk_level, nutrition, food_name, portion_g)

    # ── CONSUMPTION ADVICE ────────────────────────────────────────────────────
    advice_map = {
        "High":   "Limit to occasional consumption. Avoid before sleep. Rinse mouth immediately after.",
        "Medium": "Consume in moderation. Avoid as a frequent snack. Rinse after eating.",
        "Low":    "Generally safe. Maintain normal brushing and hydration habits.",
    }

    if not reasons:
        reasons.append("Nutritional profile shows minimal cariogenic factors")

    return {
        "food_risk_score":      food_score,
        "food_risk_level":      risk_level,
        "exposure_score":       exposure_capped,
        "protective_score":     protective_capped,
        "net_oral_risk_index":  net_oral_risk,
        "net_oral_risk_label":  net_label,
        "portion_g":            portion_g,
        "reasons":              reasons,
        "warning":              warning,
        "consumption_advice":   advice_map[risk_level],
        "frequency_risk":       frequency_risk,
        "dentist_notes":        dentist_notes,
        "action_plan":          action_plan,
    }


def _generate_dentist_notes(nutrition: dict, food_name: str,
                             portion_g: float, risk_level: str) -> list[str]:
    """
    Always generates at least 2-3 dentist notes.
    Dynamic, based on actual nutrient values.
    """
    notes = []
    sugar  = nutrition.get("sugar_g",      0) or 0
    carbs  = nutrition.get("carbs_g",      0) or 0
    fat    = nutrition.get("fat_g",        0) or 0
    calc   = nutrition.get("calcium_mg",   0) or 0
    phos   = nutrition.get("phosphorus_mg",0) or 0
    fiber  = nutrition.get("fiber_g",      0) or 0
    kcal   = nutrition.get("energy_kcal",  0) or 0

    # Sugar note
    if sugar >= 20:
        notes.append(
            f"This food contains {sugar}g of sugar per serving. Oral bacteria (Streptococcus mutans) "
            f"metabolise sugars rapidly, producing lactic acid that demineralises enamel within minutes."
        )
    elif sugar >= 8:
        notes.append(
            f"Moderate sugar content ({sugar}g). While not extreme, regular consumption gives bacteria "
            f"frequent fuel for acid production. Timing and frequency matter more than single intake."
        )
    else:
        notes.append(
            f"Low sugar content ({sugar}g per serving) — a positive indicator for oral health. "
            f"Bacteria have less fuel for acid production."
        )

    # Carbs / fermentable starch note
    starchy_names = ["pasta","bread","rice","cracker","chip","cereal","noodle","pastry","pretzel","pizza"]
    is_starchy = any(k in food_name for k in starchy_names)
    if carbs >= 30 and is_starchy:
        notes.append(
            f"Although this food may not taste sweet, refined starch ({carbs}g) is broken down by "
            f"salivary amylase into fermentable sugars within seconds of eating. This makes starchy "
            f"foods just as cariogenic as sweet ones when consumed frequently."
        )
    elif carbs >= 20:
        notes.append(
            f"Fermentable carbohydrates ({carbs}g) are present. These are converted to sugars by "
            f"salivary enzymes and contribute to oral acid production."
        )

    # Sticky texture note
    if fat >= 8 and carbs >= 15:
        notes.append(
            "The combination of fat and carbohydrates in this food suggests a sticky or soft texture. "
            "Sticky foods adhere to tooth surfaces and fissures, prolonging acid contact beyond the "
            "typical 20-minute clearance window."
        )

    # Protective mineral note
    if calc >= 100:
        notes.append(
            f"Calcium ({calc}mg per serving) is a key component of hydroxyapatite — the mineral that "
            f"makes up tooth enamel. Adequate calcium intake supports remineralisation of early lesions."
        )
    if phos >= 100:
        notes.append(
            f"Phosphorus ({phos}mg) works synergistically with calcium to strengthen enamel. "
            f"This food contributes positively to your enamel mineral balance."
        )

    # Fiber note
    if fiber >= 3:
        notes.append(
            f"Dietary fibre ({fiber}g) helps slow the absorption of sugars and stimulates saliva "
            f"production. Saliva is your mouth's natural defence — it buffers acid and delivers "
            f"protective minerals to tooth surfaces."
        )

    # Portion-specific note
    if portion_g >= 300:
        notes.append(
            f"The estimated portion size ({portion_g}g) is relatively large. Larger portions "
            f"extend the duration of sugar and acid exposure in the mouth."
        )

    # Calorie density
    if kcal >= 400:
        notes.append(
            f"This is a calorie-dense food ({kcal} kcal/serving). Calorie-dense foods often carry "
            f"higher sugar or refined carb loads. Consider portion control to limit cariogenic exposure."
        )

    # Generic low-risk note if nothing concerning found
    if risk_level == "Low" and len(notes) < 2:
        notes.append(
            "This food has a low cariogenic profile based on its sugar, carbohydrate, and mineral "
            "content. It is suitable for regular consumption within a balanced diet."
        )

    return notes[:6]  # cap at 6 notes for readability


def _generate_action_plan(risk_level: str, nutrition: dict,
                           food_name: str, portion_g: float) -> list[dict]:
    """
    Returns list of { category, action } dicts for personalised recommendations.
    """
    sugar = nutrition.get("sugar_g", 0) or 0
    carbs = nutrition.get("carbs_g", 0) or 0
    fat   = nutrition.get("fat_g",   0) or 0
    fiber = nutrition.get("fiber_g", 0) or 0

    actions = []

    # Immediate oral hygiene
    if risk_level == "High":
        actions.append({"category": "Immediate", "action": "💧 Rinse mouth with water immediately after eating"})
        actions.append({"category": "Immediate", "action": "⏱️ Wait 30 minutes then brush with fluoride toothpaste"})
        actions.append({"category": "Immediate", "action": "🌙 Never consume this food right before sleep without brushing"})
    elif risk_level == "Medium":
        actions.append({"category": "Immediate", "action": "💧 Rinse mouth with water after consuming"})
        actions.append({"category": "Immediate", "action": "🪥 Brush teeth within 60 minutes"})
    else:
        actions.append({"category": "Immediate", "action": "✅ Normal routine — brush twice daily with fluoride toothpaste"})

    # Sticky food specific
    is_sticky = (fat >= 8 and carbs >= 15) or any(k in food_name for k in ["caramel","toffee","gummy","dried fruit"])
    if is_sticky:
        actions.append({"category": "Immediate", "action": "🧵 Floss after eating — sticky foods lodge in tooth fissures"})

    # Frequency guidance
    if risk_level == "High":
        actions.append({"category": "Frequency",  "action": "📉 Limit to 1–2 times per week maximum"})
        actions.append({"category": "Frequency",  "action": "⏰ Eat as part of a main meal — not as a standalone snack"})
    elif risk_level == "Medium":
        actions.append({"category": "Frequency",  "action": "📅 Avoid daily consumption — treat as occasional food"})
        actions.append({"category": "Frequency",  "action": "⏰ Avoid snacking on this between meals"})
    else:
        actions.append({"category": "Frequency",  "action": "✅ Safe for regular consumption — monitor overall diet pattern"})

    # Pairing recommendations
    actions.append({"category": "Pairing", "action": "🥛 Pair with dairy or calcium-rich food to help neutralise oral acid"})
    if sugar >= 15:
        actions.append({"category": "Pairing", "action": "🧀 Follow with a small piece of cheese — raises mouth pH naturally"})

    # Portion advice
    if portion_g >= 300:
        actions.append({"category": "Portion", "action": f"📏 Consider reducing portion — current estimate {portion_g}g is large"})

    # Water advice
    actions.append({"category": "Hydration", "action": "💧 Drink water with meals to promote saliva and rinse teeth"})

    # Dental care
    actions.append({"category": "Dental Care", "action": "🦷 Schedule check-ups every 6 months for early caries detection"})

    return actions


# ── PATIENT RISK ───────────────────────────────────────────────────────────────

def build_patient_features(raw: dict):
    age    = raw["RIDAGEYR"]
    smq040 = raw["SMQ040"]
    smd030 = raw["SMD030"]
    sugar  = raw["DR1TSUGR"]
    carbs  = raw["DR1TCARB"]
    ff     = raw["DBD900"]

    smoker_flag    = 1 if smq040 == 1 else 0
    smoker_years   = max(age - smd030, 0)
    sugar_per_year = sugar / (age + 1)
    age_group      = 0 if age <= 18 else (1 if age <= 35 else (2 if age <= 50 else 3))
    diet_risk_score = sugar * 0.4 + carbs * 0.3 + ff * 0.3

    full_input = {
        **{k: raw[k] for k in [
            "RIDAGEYR","RIAGENDR","DR1TSUGR","DR1TCARB","DR1TTFAT",
            "DR1TKCAL","DR1TCALC","DR1TPHOS","DR1TSFAT",
            "SMD650","SMQ040","DBD895","DBD900","DBD905","DBD910"
        ]},
        "smoker_flag":     smoker_flag,
        "smoker_years":    smoker_years,
        "sugar_per_year":  sugar_per_year,
        "age_group":       age_group,
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

    # Age-bias soft correction
    age  = raw["RIDAGEYR"]
    sugar = raw["DR1TSUGR"]
    smq040 = raw["SMQ040"]
    diet_signals = (sugar > 80) or (raw["DBD900"] > 4) or (smq040 == 1)
    if age < 30 and diet_signals:
        probability = min(probability + 0.08, 0.99)
    if age > 55 and not diet_signals and sugar < 50:
        probability = max(probability - 0.07, 0.01)

    result_label = "High Risk" if probability >= 0.5 else "Low Risk"
    return {
        "prediction":          result_label,
        "risk_probability":    round(float(probability), 3),
        "engineered_features": engineered,
    }


def generate_explanations(data: dict) -> dict:
    reasons = []
    risk_breakdown = {"Sugar": 0.0, "Carbs": 0.0, "Smoking": 0.0, "Calcium": 0.0, "Fast Food": 0.0}

    if data["DR1TSUGR"] > 120:
        reasons.append("Extremely high daily sugar intake"); risk_breakdown["Sugar"] = 1.0
    elif data["DR1TSUGR"] > 80:
        reasons.append("High daily sugar intake"); risk_breakdown["Sugar"] = 0.8
    elif data["DR1TSUGR"] > 50:
        reasons.append("Moderately elevated sugar intake"); risk_breakdown["Sugar"] = 0.5

    if data["DR1TCARB"] > 300:
        reasons.append("High carbohydrate consumption"); risk_breakdown["Carbs"] = 0.8
    elif data["DR1TCARB"] > 200:
        risk_breakdown["Carbs"] = 0.5

    if data["SMQ040"] == 1:
        reasons.append("Daily smoking increases caries risk"); risk_breakdown["Smoking"] = 0.8
    elif data["SMQ040"] == 2:
        reasons.append("Occasional smoking may increase caries risk"); risk_breakdown["Smoking"] = 0.4

    if data["DR1TCALC"] < 400:
        reasons.append("Very low calcium — weakened enamel risk"); risk_breakdown["Calcium"] = 0.8
    elif data["DR1TCALC"] < 600:
        reasons.append("Low calcium intake"); risk_breakdown["Calcium"] = 0.5
    else:
        risk_breakdown["Calcium"] = 0.2

    if data["DBD900"] > 5:
        reasons.append("Very frequent fast food consumption"); risk_breakdown["Fast Food"] = 0.8
    elif data["DBD900"] > 3:
        reasons.append("Frequent fast food consumption"); risk_breakdown["Fast Food"] = 0.5

    if not reasons:
        reasons.append("No major risk factors detected in current inputs")

    return {"why": reasons, "risk_breakdown": risk_breakdown}


def combined_recommendation(patient_pred: str, food_level: str) -> str:
    combos = {
        ("High Risk","High"):   "High baseline risk and high-risk food. Strongly limit this food and maintain strict oral hygiene.",
        ("High Risk","Medium"): "High baseline risk. This food adds moderate caries load — watch portion size and timing.",
        ("High Risk","Low"):    "High baseline risk, but this food is relatively safer. Focus on overall diet patterns.",
        ("Low Risk", "High"):   "Good baseline health, but this food is highly cariogenic. Limit frequency and rinse after eating.",
        ("Low Risk", "Medium"): "Baseline risk is low. Moderate-risk food — consume in moderation.",
        ("Low Risk", "Low"):    "Both baseline and food risk appear low. Maintain current habits and regular check-ups.",
    }
    return combos.get((patient_pred, food_level), "Maintain good oral hygiene and regular dental check-ups.")


# ── ENDPOINTS ──────────────────────────────────────────────────────────────────

@app.get("/")
def home():
    return {"message": "NutriDent AI API is running"}


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

        nutrition_per_100g = extract_nutrients(food)

        # Determine portion: user override → AI estimate → 100g fallback
        if data.portion_g and data.portion_g > 0:
            portion_info = {"g": data.portion_g, "label": f"User-specified ({data.portion_g}g)", "confidence": "User"}
            portion_g    = data.portion_g
        else:
            portion_info = estimate_portion(data.food_name)
            portion_g    = portion_info["g"]

        nutrition = scale_nutrition(nutrition_per_100g, portion_g)
        risk      = food_risk_score(nutrition, portion_g)

        return {
            "food_name_entered":  data.food_name,
            "usda_match":         nutrition["food"],
            "nutrition":          nutrition,
            "nutrition_per_100g": nutrition_per_100g,
            "portion_estimate":   portion_info,
            "risk":               risk,
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

        nutrition_per_100g = extract_nutrients(food)

        if raw.get("portion_g") and raw["portion_g"] > 0:
            portion_info = {"g": raw["portion_g"], "label": f"User-specified ({raw['portion_g']}g)", "confidence": "User"}
            portion_g    = raw["portion_g"]
        else:
            portion_info = estimate_portion(raw["food_name"])
            portion_g    = portion_info["g"]

        nutrition  = scale_nutrition(nutrition_per_100g, portion_g)
        food_result = food_risk_score(nutrition, portion_g)

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
                "food_name_entered":  raw["food_name"],
                "usda_match":         nutrition["food"],
                "nutrition":          nutrition,
                "nutrition_per_100g": nutrition_per_100g,
                "portion_estimate":   portion_info,
                "risk":               food_result,
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
            return {"detected_food": food_name, "error": f"Detected '{food_name}' but no USDA match found."}

        nutrition_per_100g = extract_nutrients(food)
        portion_info       = estimate_portion(food_name)
        portion_g          = portion_info["g"]
        nutrition          = scale_nutrition(nutrition_per_100g, portion_g)
        risk               = food_risk_score(nutrition, portion_g)

        if not nutrition["data_reliable"]:
            risk["warning"] = "Nutrition data may be incomplete for this item."

        return {
            "detected_food":      food_name,
            "usda_match":         nutrition["food"],
            "nutrition":          nutrition,
            "nutrition_per_100g": nutrition_per_100g,
            "portion_estimate":   portion_info,
            "risk":               risk,
        }
    except Exception as e:
        return {"error": str(e)}


# ── OPEN FOOD FACTS — BARCODE LOOKUP ──────────────────────────────────────────
# Open Food Facts is free, no API key required.
# Docs: https://world.openfoodfacts.org/data

OFF_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"

def fetch_off_product(barcode: str) -> dict | None:
    """
    Fetch a product from Open Food Facts by barcode.
    Returns the raw product dict or None if not found.
    """
    url = OFF_URL.format(barcode=barcode.strip())
    try:
        resp = requests.get(url, timeout=15,
                            headers={"User-Agent": "NutriDentAI/1.0"})
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") != 1:
            return None
        return data.get("product", None)
    except Exception:
        return None


def extract_off_nutrition(product: dict, portion_g: float) -> dict:
    """
    Extract nutrition from Open Food Facts nutriments block.
    OFF gives values per 100g. We scale to portion_g just like USDA.
    Returns the same dict shape as scale_nutrition() so the rest of the
    pipeline (food_risk_score, dentist notes, action plan) works unchanged.
    """
    nm = product.get("nutriments", {})
    factor = portion_g / 100.0

    def get(key, fallback=0.0):
        # OFF stores both _100g and _serving; prefer _100g for consistency
        return float(nm.get(f"{key}_100g") or nm.get(key) or fallback)

    per_100g = {
        "energy_kcal":   get("energy-kcal"),
        "sugar_g":       get("sugars"),
        "carbs_g":       get("carbohydrates"),
        "fat_g":         get("fat"),
        "protein_g":     get("proteins"),
        "fiber_g":       get("fiber"),
        "sodium_mg":     round(get("sodium") * 1000, 2),  # OFF gives sodium in g
        "calcium_mg":    round(get("calcium") * 1000, 2) if nm.get("calcium_100g") else 0.0,
        "phosphorus_mg": 0.0,   # OFF rarely has phosphorus; leave 0
    }

    product_name = (
        product.get("product_name_en")
        or product.get("product_name")
        or product.get("abbreviated_product_name")
        or "Unknown product"
    )

    scaled = {k: round(v * factor, 2) for k, v in per_100g.items()}
    scaled["food"]          = product_name
    scaled["data_reliable"] = any([per_100g["energy_kcal"], per_100g["sugar_g"],
                                    per_100g["carbs_g"],     per_100g["fat_g"]])
    scaled["per_100g"]      = per_100g
    scaled["portion_g"]     = round(portion_g, 1)
    return scaled


def get_off_serving_g(product: dict) -> float:
    """
    Extract declared serving size in grams from the OFF product.
    Falls back to 100g if not parseable.
    """
    raw = product.get("serving_size", "") or ""
    import re
    # Match patterns like "30g", "30 g", "1 serving (30g)"
    m = re.search(r"(\d+(?:\.\d+)?)\s*g", raw, re.IGNORECASE)
    if m:
        return float(m.group(1))
    # Try ml — treat 1ml ≈ 1g for beverages
    m2 = re.search(r"(\d+(?:\.\d+)?)\s*ml", raw, re.IGNORECASE)
    if m2:
        return float(m2.group(1))
    return 100.0  # safe fallback


def build_label_red_flags(product: dict, nutrition: dict) -> list[str]:
    """
    Check for packaged-food-specific oral-health red flags.
    Returns a list of plain-English warning strings.
    """
    flags = []
    name        = (product.get("product_name", "") or "").lower()
    categories  = (product.get("categories", "")   or "").lower()
    ingredients = (product.get("ingredients_text", "") or "").lower()
    sugar_100   = nutrition.get("per_100g", {}).get("sugar_g", 0) or 0
    carbs_100   = nutrition.get("per_100g", {}).get("carbs_g", 0) or 0
    kcal_100    = nutrition.get("per_100g", {}).get("energy_kcal", 0) or 0

    # Acidic beverage
    acidic_markers = ["citric acid", "phosphoric acid", "acetic acid",
                      "tartaric acid", "malic acid", "carbona"]
    if any(m in ingredients for m in acidic_markers):
        flags.append("⚗️ Contains acidic ingredients — may erode enamel directly, independent of sugar content")

    # Sticky candies
    sticky_markers = ["glucose syrup", "corn syrup", "caramel", "toffee",
                      "gummy", "jelly", "gelatine", "gelatin", "starch syrup"]
    if any(m in ingredients for m in sticky_markers):
        flags.append("🍬 Contains sticky/syrup ingredients — adheres to teeth, prolonging acid exposure")

    # Hidden sugars (multiple sugar aliases)
    hidden_sugar_markers = [
        "dextrose", "fructose", "maltose", "lactose", "sucrose",
        "maltodextrin", "invert sugar", "honey", "agave", "molasses",
        "glucose-fructose", "high fructose"
    ]
    hidden = [m for m in hidden_sugar_markers if m in ingredients]
    if len(hidden) >= 2:
        flags.append(f"🔍 Hidden sugars detected in ingredients: {', '.join(hidden[:3])}")

    # Processed refined carbs
    refined_markers = ["white flour", "refined flour", "enriched flour",
                       "modified starch", "wheat starch", "corn starch",
                       "potato starch", "rice flour"]
    if any(m in ingredients for m in refined_markers):
        flags.append("🌾 Contains refined starch — broken down rapidly to fermentable sugars by salivary enzymes")

    # Very high sugar density
    if sugar_100 >= 50:
        flags.append(f"⚠️ Very high sugar density: {sugar_100}g per 100g — bacteria have abundant fuel")

    # Energy drink / sports drink category
    energy_cats = ["energy drink", "sports drink", "carbonated drink", "soft drink", "soda"]
    if any(c in categories for c in energy_cats):
        flags.append("🥤 Carbonated or energy drink — combination of acid and sugar is particularly harmful to enamel")

    return flags


# ── BARCODE ENDPOINT ───────────────────────────────────────────────────────────

@app.post("/barcode-food-risk")
def barcode_food_risk(data: BarcodeInput):
    """
    Look up a packaged food by barcode (EAN-13 / UPC) using Open Food Facts.
    Runs through the same food_risk_score engine as photo and text search.
    Returns the same response shape so the frontend can reuse the same result cards.
    """
    try:
        barcode = data.barcode.strip()
        if not barcode:
            return {"error": "Barcode cannot be empty"}

        product = fetch_off_product(barcode)
        if not product:
            return {"error": f"No product found for barcode: {barcode}. "
                             f"Try searching by name instead."}

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
            return {
                "error": "Nutrition data is missing or incomplete for this product. "
                         "Try searching by food name instead.",
                "product_name": nutrition["food"],
                "barcode": barcode,
            }

        risk  = food_risk_score(nutrition, portion_g)
        flags = build_label_red_flags(product, nutrition)

        # Add flags to risk reasons so they appear in the existing reasons list
        if flags:
            risk["reasons"] = risk.get("reasons", []) + flags

        product_name = nutrition["food"]

        return {
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

    skip = {
        "food","dish","cuisine","ingredient","tableware","recipe",
        "meal","plate","bowl","table","fork","knife","spoon",
        "drink","beverage","snack","fast food",
    }
    for label in labels:
        name  = label.get("description","").lower().strip()
        score = label.get("score", 0)
        if name and name not in skip and score > 0.7:
            return name

    return labels[0].get("description","").lower() or None
