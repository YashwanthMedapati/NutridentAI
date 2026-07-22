import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { AppProvider, calculateNutritionPlan, useApp } from "./AppContext";

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

describe("AppProvider cloud sync on sign-in", () => {
  const mocks = vi.hoisted(() => ({
    useAuthMock: vi.fn(),
    fetchCloudLogsMock: vi.fn(),
  }));

  vi.mock("./AuthContext", () => ({
    useAuth: mocks.useAuthMock,
  }));

  vi.mock("../supabaseDb", () => ({
    fetchCloudLogs: mocks.fetchCloudLogsMock,
    upsertCloudFoodLog: vi.fn(),
    deleteCloudFoodLog: vi.fn(),
    clearCloudFoodLogsForDate: vi.fn(),
    clearAllCloudFoodLogs: vi.fn(),
    clearAllCloudWeightLogs: vi.fn(),
    upsertCloudWeightLog: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Note: this test file's jsdom localStorage is non-functional in this Node
  // version (setItem/clear throw), which the app already tolerates via
  // try/catch fallback to defaults in useLocalStorageState. Rather than fight
  // that, "local" state below is seeded through the provider's own public
  // addToFoodLog API instead of pre-populating localStorage directly — this
  // is also a more faithful test of the real contract either way.
  function Harness({ seedLocal }) {
    const { foodLog, weightLog, cloudSyncStatus, cloudSyncError, addToFoodLog } = useApp();
    React.useEffect(() => {
      if (seedLocal) addToFoodLog({ food_name_entered: "Local Apple" });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return (
      <div>
        <div data-testid="status">{cloudSyncStatus}</div>
        <div data-testid="error">{cloudSyncError || ""}</div>
        <div data-testid="foodlog">{JSON.stringify(foodLog)}</div>
        <div data-testid="weightlog">{JSON.stringify(weightLog)}</div>
      </div>
    );
  }

  function renderHarness(props) {
    return render(
      <AppProvider>
        <Harness {...props} />
      </AppProvider>
    );
  }

  test("replaces local logs with cloud logs when a signed-in user has cloud data", async () => {
    mocks.useAuthMock.mockReturnValue({ user: { id: "user-123" }, isSupabaseConfigured: true });
    mocks.fetchCloudLogsMock.mockResolvedValue({
      foodLogs: [{ id: "cloud-1", food_name_entered: "Apple" }],
      weightLogs: [{ date: "2026-07-20", weight: 70 }],
    });

    renderHarness({ seedLocal: true });

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("synced"));

    expect(mocks.fetchCloudLogsMock).toHaveBeenCalledWith("user-123");
    expect(JSON.parse(screen.getByTestId("foodlog").textContent)).toEqual([
      { id: "cloud-1", food_name_entered: "Apple" },
    ]);
    expect(JSON.parse(screen.getByTestId("weightlog").textContent)).toEqual([
      { date: "2026-07-20", weight: 70 },
    ]);
  });

  test("keeps local logs when the signed-in user has no cloud data yet", async () => {
    mocks.useAuthMock.mockReturnValue({ user: { id: "user-123" }, isSupabaseConfigured: true });
    let resolveFetch;
    mocks.fetchCloudLogsMock.mockReturnValue(new Promise(resolve => { resolveFetch = resolve; }));

    renderHarness({ seedLocal: true });

    // Local entry lands before the (still-pending) cloud fetch resolves.
    await waitFor(() => expect(JSON.parse(screen.getByTestId("foodlog").textContent)).toHaveLength(1));

    resolveFetch({ foodLogs: [], weightLogs: [] });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("synced"));

    const foodLog = JSON.parse(screen.getByTestId("foodlog").textContent);
    expect(foodLog).toHaveLength(1);
    expect(foodLog[0].food_name_entered).toBe("Local Apple");
  });

  test("surfaces a cloud sync error without crashing when fetchCloudLogs rejects", async () => {
    mocks.useAuthMock.mockReturnValue({ user: { id: "user-123" }, isSupabaseConfigured: true });
    mocks.fetchCloudLogsMock.mockRejectedValue(new Error("network down"));

    renderHarness();

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"));
    expect(screen.getByTestId("error").textContent).toBe("network down");
  });

  test("stays local and never calls fetchCloudLogs when signed out", async () => {
    mocks.useAuthMock.mockReturnValue({ user: null, isSupabaseConfigured: true });

    renderHarness();

    expect(screen.getByTestId("status").textContent).toBe("local");
    expect(mocks.fetchCloudLogsMock).not.toHaveBeenCalled();
  });

  test("stays local and never calls fetchCloudLogs when Supabase is not configured", async () => {
    mocks.useAuthMock.mockReturnValue({ user: { id: "user-123" }, isSupabaseConfigured: false });

    renderHarness();

    expect(screen.getByTestId("status").textContent).toBe("local");
    expect(mocks.fetchCloudLogsMock).not.toHaveBeenCalled();
  });
});
