import sys
import unittest
import warnings
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))
warnings.filterwarnings(
    "ignore",
    message="Using `httpx` with `starlette.testclient` is deprecated.*",
    category=Warning,
)
from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

PATIENT_PAYLOAD = {
    "RIDAGEYR": 32, "RIAGENDR": 1,
    "DR1TSUGR": 40, "DR1TCARB": 200, "DR1TTFAT": 70, "DR1TKCAL": 2200,
    "DR1TCALC": 800, "DR1TPHOS": 700, "DR1TSFAT": 20,
    "SMD650": 0, "SMQ040": 3, "SMD030": 0,
    "DBD895": 3, "DBD900": 1, "DBD905": 1, "DBD910": 1,
}

USDA_FOOD = {
    "description": "Apple, raw",
    "dataType": "Foundation",
    "foodNutrients": [
        {"nutrientName": "Total Sugars", "value": 10.0},
        {"nutrientName": "Carbohydrate, by difference", "value": 14.0},
        {"nutrientName": "Total lipid (fat)", "value": 0.2},
        {"nutrientName": "Protein", "value": 0.3},
        {"nutrientName": "Calcium, Ca", "value": 6.0},
        {"nutrientName": "Energy", "value": 52.0},
    ],
}

OFF_PRODUCT = {
    "status": 1,
    "product": {
        "product_name": "Chocolate Bar",
        "brands": "TestBrand",
        "ingredients_text": "sugar, cocoa, glucose syrup, caramel",
        "categories": "snacks",
        "serving_size": "45 g",
        "nutriments": {
            "energy-kcal_100g": 500,
            "sugars_100g": 50,
            "carbohydrates_100g": 60,
            "fat_100g": 25,
            "proteins_100g": 5,
            "fiber_100g": 2,
            "sodium_100g": 0.1,
        },
    },
}


class FakeUSDAResponse:
    def __init__(self, foods):
        self._foods = foods

    def raise_for_status(self):
        return None

    def json(self):
        return {"foods": self._foods}


class FakeOFFResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise main.requests.HTTPError(f"status {self.status_code}")

    def json(self):
        return self._payload


class EndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    # ── /predict ──────────────────────────────────────────────────────────
    def test_predict_returns_risk_and_explanations(self):
        response = self.client.post("/predict", json=PATIENT_PAYLOAD)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn(body["prediction"], {"High Risk", "Low Risk"})
        self.assertIn("why", body)
        self.assertIn("risk_breakdown", body)

    def test_predict_rejects_out_of_range_field(self):
        payload = {**PATIENT_PAYLOAD, "RIDAGEYR": 500}
        response = self.client.post("/predict", json=payload)
        self.assertEqual(response.status_code, 422)

    # ── /food-risk ────────────────────────────────────────────────────────
    def test_food_risk_returns_404_when_no_usda_match(self):
        with patch.dict(main.os.environ, {"USDA_API_KEY": "test-key"}), \
             patch.object(main.requests, "get", return_value=FakeUSDAResponse([])):
            response = self.client.post("/food-risk", json={"food_name": "totally-unknown-food"})
        self.assertEqual(response.status_code, 404)

    def test_food_risk_scores_matched_food(self):
        with patch.dict(main.os.environ, {"USDA_API_KEY": "test-key"}), \
             patch.object(main.requests, "get", return_value=FakeUSDAResponse([USDA_FOOD])):
            response = self.client.post("/food-risk", json={"food_name": "apple"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["usda_match"], "Apple, raw")
        self.assertIn("analysis_quality", body)
        self.assertIn("calorie_breakdown", body)

    def test_food_risk_without_usda_key_returns_503(self):
        with patch.dict(main.os.environ, {}, clear=False):
            main.os.environ.pop("USDA_API_KEY", None)
            response = self.client.post("/food-risk", json={"food_name": "apple"})
        self.assertEqual(response.status_code, 503)

    # ── /combined-risk ────────────────────────────────────────────────────
    def test_combined_risk_merges_patient_and_food_results(self):
        payload = {**PATIENT_PAYLOAD, "food_name": "apple"}
        with patch.dict(main.os.environ, {"USDA_API_KEY": "test-key"}), \
             patch.object(main.requests, "get", return_value=FakeUSDAResponse([USDA_FOOD])):
            response = self.client.post("/combined-risk", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("patient_risk", body)
        self.assertIn("food_risk", body)
        self.assertIn("final_advice", body)

    # ── /barcode-food-risk ────────────────────────────────────────────────
    def test_barcode_food_risk_rejects_invalid_barcode_format(self):
        response = self.client.post("/barcode-food-risk", json={"barcode": "abc"})
        self.assertEqual(response.status_code, 422)

    def test_barcode_food_risk_returns_404_when_product_not_found(self):
        with patch.object(main.requests, "get", return_value=FakeOFFResponse({"status": 0})):
            response = self.client.post("/barcode-food-risk", json={"barcode": "12345678"})
        self.assertEqual(response.status_code, 404)

    def test_barcode_food_risk_scores_matched_product_and_flags_ingredients(self):
        with patch.object(main.requests, "get", return_value=FakeOFFResponse(OFF_PRODUCT)):
            response = self.client.post("/barcode-food-risk", json={"barcode": "12345678"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["product_name"], "Chocolate Bar")
        self.assertEqual(body["source"], "Open Food Facts")
        self.assertTrue(any("sticky" in flag.lower() or "🍬" in flag for flag in body["label_red_flags"]))
        self.assertEqual(body["portion_estimate"]["g"], 45)

    def test_barcode_food_risk_honors_user_supplied_portion(self):
        with patch.object(main.requests, "get", return_value=FakeOFFResponse(OFF_PRODUCT)):
            response = self.client.post(
                "/barcode-food-risk", json={"barcode": "12345678", "portion_g": 100}
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["portion_estimate"]["confidence"], "User")

    # ── /image-food-risk ──────────────────────────────────────────────────
    def test_image_food_risk_rejects_unsupported_content_type(self):
        response = self.client.post(
            "/image-food-risk",
            files={"file": ("note.txt", b"not an image", "text/plain")},
        )
        self.assertEqual(response.status_code, 415)

    def test_image_food_risk_requires_google_api_key(self):
        main.os.environ.pop("GOOGLE_API_KEY", None)
        response = self.client.post(
            "/image-food-risk",
            files={"file": ("pizza.jpg", b"\xff\xd8\xff fake jpeg bytes", "image/jpeg")},
        )
        self.assertEqual(response.status_code, 503)

    def test_image_food_risk_full_flow_with_mocked_vision_and_usda(self):
        vision_payload = {
            "responses": [{
                "labelAnnotations": [
                    {"description": "Pizza", "score": 0.95},
                    {"description": "Cheese", "score": 0.9},
                ],
                "webDetection": {"webEntities": [{"description": "pepperoni pizza", "score": 0.6}]},
            }]
        }

        class FakeVisionResponse:
            def raise_for_status(self):
                return None

            def json(self):
                return vision_payload

        pizza_food = {
            "description": "Pizza, cheese",
            "dataType": "Foundation",
            "foodNutrients": [
                {"nutrientName": "Total Sugars", "value": 3.0},
                {"nutrientName": "Carbohydrate, by difference", "value": 30.0},
                {"nutrientName": "Total lipid (fat)", "value": 10.0},
                {"nutrientName": "Energy", "value": 260.0},
            ],
        }

        with patch.dict(main.os.environ, {"GOOGLE_API_KEY": "test-key", "USDA_API_KEY": "test-key"}), \
             patch.object(main.requests, "post", return_value=FakeVisionResponse()), \
             patch.object(main.requests, "get", return_value=FakeUSDAResponse([pizza_food])):
            response = self.client.post(
                "/image-food-risk",
                files={"file": ("pizza.jpg", b"\xff\xd8\xff fake jpeg bytes", "image/jpeg")},
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        # "Pizza" (label score 0.95 + food-keyword boost) outranks the
        # "pepperoni pizza" web entity (score 0.6 + boost) in _best_food_detection.
        self.assertEqual(body["detected_food"], "pizza")
        self.assertTrue(body["analysis_quality"]["requires_user_review"])
        self.assertIn("image_insights", body)


    # ── rate limiting ─────────────────────────────────────────────────────
    def test_food_risk_is_rate_limited_after_repeated_requests(self):
        # Isolate this test's counters from the shared in-memory limiter
        # storage so it doesn't starve/leak into other tests in this run.
        main.limiter.reset()
        self.addCleanup(main.limiter.reset)

        with patch.dict(main.os.environ, {"USDA_API_KEY": "test-key"}), \
             patch.object(main.requests, "get", return_value=FakeUSDAResponse([USDA_FOOD])):
            statuses = []
            for _ in range(30):
                response = self.client.post("/food-risk", json={"food_name": "apple"})
                statuses.append(response.status_code)
                if response.status_code == 429:
                    break
        self.assertIn(429, statuses, f"expected a 429 among repeated requests, got {statuses}")


if __name__ == "__main__":
    unittest.main()
