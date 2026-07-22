import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent))
import main


class CoreBehaviorTests(unittest.TestCase):
    def test_non_smoker_has_zero_smoker_years(self):
        raw = {
            "RIDAGEYR": 40,
            "RIAGENDR": 1,
            "DR1TSUGR": 40,
            "DR1TCARB": 200,
            "DR1TTFAT": 70,
            "DR1TKCAL": 2200,
            "DR1TCALC": 800,
            "DR1TPHOS": 700,
            "DR1TSFAT": 20,
            "SMD650": 0,
            "SMQ040": 3,
            "SMD030": 0,
            "DBD895": 3,
            "DBD900": 1,
            "DBD905": 1,
            "DBD910": 1,
        }

        _, engineered = main.build_patient_features(raw)

        self.assertEqual(engineered["smoker_flag"], 0)
        self.assertEqual(engineered["smoker_years"], 0)

    def test_food_risk_score_marks_high_sugar_food_high_risk(self):
        risk = main.food_risk_score({
            "food": "sticky candy",
            "sugar_g": 35,
            "carbs_g": 70,
            "fat_g": 6,
            "calcium_mg": 0,
            "phosphorus_mg": 0,
            "fiber_g": 0,
            "energy_kcal": 420,
        }, 100)

        self.assertEqual(risk["food_risk_level"], "High")
        self.assertGreaterEqual(risk["food_risk_score"], 5)
        self.assertGreater(risk["net_oral_risk_index"], 0)

    def test_open_food_facts_serving_size_parses_grams_and_ml(self):
        self.assertEqual(main.get_off_serving_g({"serving_size": "1 bar (45 g)"}), 45)
        self.assertEqual(main.get_off_serving_g({"serving_size": "250 ml"}), 250)
        self.assertEqual(main.get_off_serving_g({"serving_size": ""}), 100)

    def test_patient_input_rejects_smoking_start_after_age(self):
        with self.assertRaises(ValidationError):
            main.PatientInput(
                RIDAGEYR=20,
                RIAGENDR=1,
                DR1TSUGR=40,
                DR1TCARB=200,
                DR1TTFAT=70,
                DR1TKCAL=2200,
                DR1TCALC=800,
                DR1TPHOS=700,
                DR1TSFAT=20,
                SMD650=5,
                SMQ040=1,
                SMD030=25,
                DBD895=3,
                DBD900=1,
                DBD905=1,
                DBD910=1,
            )

    def test_health_endpoint_reports_model_status(self):
        response = main.health()

        self.assertEqual(response["status"], "ok")
        self.assertTrue(response["services"]["model_loaded"])

    def test_model_info_endpoint_reports_feature_count(self):
        body = main.model_info()

        self.assertEqual(body["feature_count"], len(main.features))
        self.assertIn("limitations", body)

    def test_vision_response_error_is_actionable(self):
        class FakeResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return {
                    "responses": [{
                        "error": {
                            "code": 403,
                            "status": "PERMISSION_DENIED",
                            "message": "Cloud Vision API has not been used in this project.",
                        }
                    }]
                }

        with patch.dict(main.os.environ, {"GOOGLE_API_KEY": "test-key"}), \
             patch.object(main.requests, "post", return_value=FakeResponse()):
            with self.assertRaises(HTTPException) as ctx:
                main.detect_food_from_image(b"not-a-real-image")

        self.assertEqual(ctx.exception.status_code, 502)
        self.assertIn("Cloud Vision API", ctx.exception.detail)

    def test_vision_web_detection_can_identify_food(self):
        result = main._best_food_detection({
            "labelAnnotations": [
                {"description": "Food", "score": 0.98},
                {"description": "Tableware", "score": 0.93},
            ],
            "webDetection": {
                "webEntities": [
                    {"description": "pepperoni pizza", "score": 0.52},
                ]
            },
        })

        self.assertEqual(result, "pepperoni pizza")

    def test_pizza_photo_terms_detect_toppings_and_whole_pizza_portion(self):
        terms = main._vision_terms(
            {
                "labelAnnotations": [
                    {"description": "Pizza", "score": 0.97},
                    {"description": "Cheese", "score": 0.91},
                ],
                "webDetection": {
                    "webEntities": [
                        {"description": "salami pizza with olives", "score": 0.62},
                    ]
                },
            },
            "pizza-pizza-filled-with-tomatoes-salami-olives.jpg",
        )
        ingredients = main._visible_ingredients_from_terms(terms, "pizza")
        portion = main.estimate_image_portion("pizza", ingredients, terms)

        ingredient_names = {item["name"] for item in ingredients}
        self.assertIn("tomato", ingredient_names)
        self.assertIn("salami/pepperoni", ingredient_names)
        self.assertIn("olives", ingredient_names)
        self.assertEqual(portion["g"], 760)
        self.assertIn("Whole pizza", [option["label"] for option in portion["options"]])

    def test_analysis_quality_flags_image_portion_for_review(self):
        nutrition = main.scale_nutrition({
            "food": "pizza",
            "energy_kcal": 260,
            "carbs_g": 30,
            "fat_g": 10,
            "protein_g": 12,
            "sugar_g": 4,
            "calcium_mg": 150,
            "phosphorus_mg": 180,
            "fiber_g": 2,
            "sodium_mg": 500,
            "data_reliable": True,
        }, 760)
        portion = {"g": 760, "label": "Whole topped pizza visible (~760g)", "confidence": "Moderate"}

        quality = main.nutrition_quality(nutrition, portion, image_based=True)

        self.assertEqual(quality["confidence"], "Moderate")
        self.assertTrue(quality["requires_user_review"])
        self.assertIn("Photo results", quality["notes"][0])

    def test_ingredient_calorie_breakdown_sums_to_total(self):
        nutrition = {"energy_kcal": 1000}
        breakdown = main.ingredient_calorie_breakdown([
            {"name": "pizza crust", "confidence": "High"},
            {"name": "cheese", "confidence": "High"},
            {"name": "olives", "confidence": "Moderate"},
        ], nutrition)

        self.assertEqual(sum(item["calories"] for item in breakdown), 1000)
        self.assertTrue(all("method" in item for item in breakdown))


if __name__ == "__main__":
    unittest.main()
