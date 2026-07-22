import re

import requests

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
    resp = requests.get(url, timeout=15,
                        headers={"User-Agent": "NutriDentAI/1.0"})
    resp.raise_for_status()
    data = resp.json()
    if data.get("status") != 1:
        return None
    return data.get("product", None)


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
    categories  = (product.get("categories", "")   or "").lower()
    ingredients = (product.get("ingredients_text", "") or "").lower()
    sugar_100   = nutrition.get("per_100g", {}).get("sugar_g", 0) or 0

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
