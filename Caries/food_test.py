import os
import requests
from dotenv import load_dotenv

# Load .env file
load_dotenv()

API_KEY = os.getenv("USDA_API_KEY")

if not API_KEY:
    raise ValueError("USDA_API_KEY not found. Check your .env file.")

SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"


def search_food(food_name):
    params = {
        "query": food_name,
        "api_key": API_KEY,
        "pageSize": 1
    }

    response = requests.get(SEARCH_URL, params=params)
    response.raise_for_status()

    data = response.json()

    foods = data.get("foods", [])
    if not foods:
        return None

    return foods[0]


def extract_nutrients(food):
    nutrients = {}

    for item in food.get("foodNutrients", []):
        name = item.get("nutrientName")
        value = item.get("value", 0)

        if name:
            nutrients[name] = value

    return {
        "food": food.get("description", "Unknown"),
        "sugar_g": nutrients.get("Total Sugars", 0),
        "carbs_g": nutrients.get("Carbohydrate, by difference", 0),
        "fat_g": nutrients.get("Total lipid (fat)", 0),
        "protein_g": nutrients.get("Protein", 0),
        "calcium_mg": nutrients.get("Calcium, Ca", 0),
        "phosphorus_mg": nutrients.get("Phosphorus, P", 0),
        "energy_kcal": nutrients.get("Energy", 0)
    }


if __name__ == "__main__":
    food_name = input("Enter food name: ")

    food = search_food(food_name)

    if not food:
        print("No food found.")
    else:
        result = extract_nutrients(food)

        print("\nTop USDA match:\n")
        for k, v in result.items():
            print(f"{k}: {v}")