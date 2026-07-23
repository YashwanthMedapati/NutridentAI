import { expect, test } from "@playwright/test";

const mockFoodResponse = {
  food_name_entered: "banana",
  usda_match: "Bananas, raw",
  nutrition: {
    energy_kcal: 105,
    sugar_g: 14,
    carbs_g: 27,
    fat_g: 0.4,
    protein_g: 1.3,
    calcium_mg: 6,
    phosphorus_mg: 26,
  },
  nutrition_per_100g: {
    energy_kcal: 89,
    sugar_g: 12,
    carbs_g: 23,
    fat_g: 0.3,
    protein_g: 1.1,
  },
  portion_estimate: { g: 118, label: "1 medium banana (~118g)", confidence: "High" },
  analysis_quality: {
    confidence: "High",
    confidence_score: 0.91,
    source: "USDA food search",
    notes: ["USDA match and high-confidence portion estimate."],
    requires_user_review: false,
  },
  risk: {
    food_risk_score: 3,
    food_risk_level: "Low",
    exposure_score: 3,
    protective_score: 1,
    net_oral_risk_index: 3,
    net_oral_risk_label: "Low",
    reasons: ["Moderate natural sugar exposure"],
    dentist_notes: [],
    action_plan: ["Rinse with water after eating."],
    frequency_risk: { occasional_risk: "Low", frequent_risk: "Medium", explanation: "Frequency changes exposure." },
    consumption_advice: "Good option when eaten with meals.",
  },
  source: "USDA",
};

test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:8000/**", async route => {
    const url = new URL(route.request().url());
    if (url.pathname === "/food-risk") {
      await route.fulfill({ json: mockFoodResponse });
      return;
    }
    if (url.pathname === "/model-info") {
      await route.fulfill({
        json: {
          model_type: "RandomForestClassifier",
          feature_count: 15,
          model_version: "e2e",
          training_data: "NHANES 2017-2018",
          limitations: ["Educational use only"],
        },
      });
      return;
    }
    await route.fulfill({ status: 200, json: { status: "ok" } });
  });
});

test("app loads and navigation renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByAltText("NutriDent AI").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Analyze Food" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Why This Score" })).toBeVisible();
});

test("login screen renders safe auth copy", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /Cloud accounts are waiting for Supabase|Sign In/ })).toBeVisible();
});

test("analyze food search works with mocked backend", async ({ page }) => {
  await page.goto("/food");
  await page.getByRole("button", { name: /Search Food/ }).click();
  await page.getByPlaceholder(/food name/).fill("banana");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page.getByText("Bananas, raw")).toBeVisible();
  await expect(page.getByText("Why this score?")).toBeVisible();
});

test("daily log renders seeded food and weight history", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("nutrident.foodLog", JSON.stringify([{
      id: "seed-food",
      timestamp: new Date().toISOString(),
      loggedDate: new Date().toISOString().slice(0, 10),
      mealCategory: "Breakfast",
      food_name_entered: "Banana",
      usda_match: "Bananas, raw",
      nutrition: { energy_kcal: 105, sugar_g: 14, carbs_g: 27, fat_g: 0.4, protein_g: 1.3 },
      risk: { food_risk_score: 3, food_risk_level: "Low" },
    }]));
    localStorage.setItem("nutrident.weightLog", JSON.stringify([{
      date: new Date().toISOString().slice(0, 10),
      weight: 70,
      timestamp: new Date().toISOString(),
    }]));
  });

  await page.goto("/nutrition");
  await expect(page.getByText("Nutrition Tracker")).toBeVisible();
  await expect(page.getByText("Bananas, raw").first()).toBeVisible();
});

test("coach renders today's nutrition section", async ({ page }) => {
  await page.goto("/coach");
  await expect(page.getByText("NutriDent Coach")).toBeVisible();
  await expect(page.getByText("Today's Nutrition")).toBeVisible();
});
