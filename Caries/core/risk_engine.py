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
            "This food appears lower in cariogenic factors based on its sugar, carbohydrate, and "
            "mineral profile. Consider it within your overall diet pattern and dental advice."
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
        actions.append({"category": "Frequency",  "action": "Lower-risk option in this analysis; monitor your overall diet pattern"})

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
