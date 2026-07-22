import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mocks.upsertMock,
      delete: mocks.deleteMock,
    })),
  },
}));

import { supabase } from "./supabaseClient";
import { deleteCloudFoodLog, upsertCloudFoodLog } from "./supabaseDb";

describe("supabaseDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertMock.mockReturnValue({ error: null });
    mocks.eqMock.mockReturnThis();
    mocks.deleteMock.mockReturnValue({ eq: mocks.eqMock });
  });

  test("upserts food logs as user-owned rows", async () => {
    await upsertCloudFoodLog({
      id: "food-1",
      timestamp: "2026-07-22T12:30:00.000Z",
      mealCategory: "Lunch",
      food_name_entered: "pizza",
      usda_match: "Pizza with toppings",
      portion_estimate: { g: 250 },
      nutrition: { energy_kcal: 700, sugar_g: 6, carbs_g: 80, fat_g: 28, protein_g: 30 },
      risk: { food_risk_level: "High", food_risk_score: 6.5 },
    }, "user-123");

    expect(supabase.from).toHaveBeenCalledWith("food_logs");
    expect(mocks.upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      id: "food-1",
      user_id: "user-123",
      logged_date: "2026-07-22",
      meal_category: "Lunch",
      calories: 700,
      risk_level: "High",
    }));
  });

  test("deletes food logs with both user id and row id filters", async () => {
    await deleteCloudFoodLog({ id: "food-1" }, "user-123");

    expect(supabase.from).toHaveBeenCalledWith("food_logs");
    expect(mocks.deleteMock).toHaveBeenCalled();
    expect(mocks.eqMock).toHaveBeenCalledWith("user_id", "user-123");
    expect(mocks.eqMock).toHaveBeenCalledWith("id", "food-1");
  });
});
