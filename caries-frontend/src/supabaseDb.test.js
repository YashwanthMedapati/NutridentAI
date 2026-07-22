import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertMock: vi.fn(),
  deleteMock: vi.fn(),
  eqMock: vi.fn(),
  selectEqMock: vi.fn(),
  orderMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({
  supabase: {
    from: mocks.fromMock,
  },
}));

import { supabase } from "./supabaseClient";
import {
  clearAllCloudFoodLogs,
  clearAllCloudWeightLogs,
  clearCloudFoodLogsForDate,
  deleteCloudFoodLog,
  fetchCloudLogs,
  upsertCloudFoodLog,
  upsertCloudWeightLog,
} from "./supabaseDb";

describe("supabaseDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertMock.mockReturnValue({ error: null });
    mocks.eqMock.mockReturnThis();
    mocks.deleteMock.mockReturnValue({ eq: mocks.eqMock });
    mocks.orderMock.mockResolvedValue({ data: [], error: null });
    mocks.selectEqMock.mockReturnValue({ order: mocks.orderMock });
    mocks.selectMock.mockReturnValue({ eq: mocks.selectEqMock });
    mocks.fromMock.mockReturnValue({
      upsert: mocks.upsertMock,
      delete: mocks.deleteMock,
      select: mocks.selectMock,
    });
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

  test("fetchCloudLogs maps food and weight rows into app-shaped entries", async () => {
    mocks.orderMock
      .mockResolvedValueOnce({
        data: [{
          id: "food-1",
          logged_at: "2026-07-20T08:00:00.000Z",
          logged_date: "2026-07-20",
          meal_category: "Breakfast",
          food_name: "Oatmeal",
          usda_match: "Oatmeal, cooked",
          raw_result: { nutrition: { energy_kcal: 300 } },
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ logged_date: "2026-07-20", weight_kg: 70.2, created_at: "2026-07-20T08:05:00.000Z" }],
        error: null,
      });

    const result = await fetchCloudLogs("user-123");

    expect(supabase.from).toHaveBeenCalledWith("food_logs");
    expect(supabase.from).toHaveBeenCalledWith("weight_logs");
    expect(result.foodLogs).toHaveLength(1);
    expect(result.foodLogs[0]).toMatchObject({
      id: "food-1",
      mealCategory: "Breakfast",
      food_name_entered: "Oatmeal",
      nutrition: { energy_kcal: 300 },
    });
    expect(result.weightLogs).toEqual([
      { date: "2026-07-20", weight: 70.2, timestamp: "2026-07-20T08:05:00.000Z" },
    ]);
  });

  test("fetchCloudLogs returns empty logs without querying when userId is missing", async () => {
    const result = await fetchCloudLogs(null);

    expect(result).toEqual({ foodLogs: [], weightLogs: [] });
    expect(mocks.fromMock).not.toHaveBeenCalled();
  });

  test("fetchCloudLogs surfaces a Supabase error instead of swallowing it", async () => {
    mocks.orderMock.mockResolvedValueOnce({ data: null, error: new Error("food query failed") });

    await expect(fetchCloudLogs("user-123")).rejects.toThrow("food query failed");
  });

  test("upsertCloudWeightLog upserts on the user/date conflict key", async () => {
    await upsertCloudWeightLog({ date: "2026-07-20", weight: 71.5 }, "user-123");

    expect(supabase.from).toHaveBeenCalledWith("weight_logs");
    expect(mocks.upsertMock).toHaveBeenCalledWith(
      { user_id: "user-123", logged_date: "2026-07-20", weight_kg: 71.5 },
      { onConflict: "user_id,logged_date" }
    );
  });

  test("clearCloudFoodLogsForDate scopes the delete to user and date", async () => {
    await clearCloudFoodLogsForDate("2026-07-20", "user-123");

    expect(supabase.from).toHaveBeenCalledWith("food_logs");
    expect(mocks.eqMock).toHaveBeenCalledWith("user_id", "user-123");
    expect(mocks.eqMock).toHaveBeenCalledWith("logged_date", "2026-07-20");
  });

  test("clearAllCloudFoodLogs and clearAllCloudWeightLogs scope the delete to the user only", async () => {
    await clearAllCloudFoodLogs("user-123");
    expect(supabase.from).toHaveBeenCalledWith("food_logs");

    await clearAllCloudWeightLogs("user-123");
    expect(supabase.from).toHaveBeenCalledWith("weight_logs");

    expect(mocks.eqMock).toHaveBeenCalledWith("user_id", "user-123");
  });

  test("write helpers no-op when userId is missing", async () => {
    await upsertCloudFoodLog({ id: "x" }, null);
    await deleteCloudFoodLog({ id: "x" }, null);
    await clearAllCloudFoodLogs(null);

    expect(mocks.fromMock).not.toHaveBeenCalled();
  });
});
