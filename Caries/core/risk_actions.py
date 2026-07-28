# ── PERSONALISED ACTION PLAN ───────────────────────────────────────────────────


def generate_action_plan(risk_level: str, nutrition: dict,
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
