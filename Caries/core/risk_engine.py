# ── PORTION-AWARE FOOD RISK SCORING ───────────────────────────────────────────
from core.risk_actions import generate_action_plan
from core.risk_notes import generate_dentist_notes


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
    dentist_notes = generate_dentist_notes(nutrition, food_name, portion_g, risk_level)

    # ── PERSONALISED ACTION PLAN ──────────────────────────────────────────────
    action_plan = generate_action_plan(risk_level, nutrition, food_name, portion_g)

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
