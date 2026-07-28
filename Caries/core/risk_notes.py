# ── DYNAMIC DENTIST NOTES ──────────────────────────────────────────────────────


def generate_dentist_notes(nutrition: dict, food_name: str,
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
