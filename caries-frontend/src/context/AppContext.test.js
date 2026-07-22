import { describe, expect, test } from "vitest";
import { calculateNutritionPlan } from "./AppContext";

describe("calculateNutritionPlan", () => {
  test("calculates maintenance and deficit targets from profile data", () => {
    const plan = calculateNutritionPlan({
      RIDAGEYR: 30,
      RIAGENDR: 1,
      height: 180,
      weight: 85,
      goal_weight: 78,
      activity_level: "moderate",
      goal_date: "2026-10-20",
    });

    expect(plan.maintenance).toBeGreaterThan(2400);
    expect(plan.target).toBeLessThan(plan.maintenance);
    expect(plan.macros.protein_g).toBeGreaterThan(120);
    expect(plan.macros.carbs_g).toBeGreaterThan(150);
  });

  test("uses custom manual calorie and macro targets when supplied", () => {
    const plan = calculateNutritionPlan({
      RIDAGEYR: 25,
      RIAGENDR: 2,
      height: 165,
      weight: 62,
      activity_level: "light",
      goal_weight: 62,
    });

    expect(plan.target).toBe(plan.maintenance);
    expect(plan.macros.fat_g).toBeGreaterThan(35);
    expect(plan.macros.sugar_g).toBeLessThanOrEqual(50);
    expect(plan.macros.fiber_g).toBeGreaterThanOrEqual(25);
  });
});
