import joblib
import numpy as np

from .config import BASE_DIR

model    = joblib.load(BASE_DIR / "caries_model.pkl")
features = joblib.load(BASE_DIR / "feature_names.pkl")


# ── PATIENT RISK ───────────────────────────────────────────────────────────────

def build_patient_features(raw: dict):
    age    = raw["RIDAGEYR"]
    smq040 = raw["SMQ040"]
    smd030 = raw["SMD030"]
    sugar  = raw["DR1TSUGR"]
    carbs  = raw["DR1TCARB"]
    ff     = raw["DBD900"]

    smoker_flag    = 1 if smq040 == 1 else 0
    smoker_years   = max(age - smd030, 0) if smq040 in (1, 2) and smd030 > 0 else 0
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
