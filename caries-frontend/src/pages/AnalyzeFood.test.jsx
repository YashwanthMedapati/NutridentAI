import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("../api", () => ({
  apiFetch: mocks.apiFetchMock,
  API_BASE_URL: "http://127.0.0.1:8000",
}));

import { AuthProvider } from "../context/AuthContext";
import { AppProvider } from "../context/AppContext";
import AnalyzeFood from "./AnalyzeFood";

function renderAnalyzeFood() {
  return render(
    <AuthProvider>
      <AppProvider>
        <AnalyzeFood />
      </AppProvider>
    </AuthProvider>
  );
}

describe("AnalyzeFood barcode flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("looks up a manually entered barcode and renders the matched product", async () => {
    mocks.apiFetchMock.mockResolvedValueOnce({
      barcode: "5000112637922",
      product_name: "Chocolate Bar",
      usda_match: "Chocolate Bar",
      detected_food: "Chocolate Bar",
      brand: "TestBrand",
      nutrition: { energy_kcal: 220, sugar_g: 25, carbs_g: 30, fat_g: 12, protein_g: 3, portion_g: 45 },
      nutrition_per_100g: { energy_kcal: 500 },
      portion_estimate: { g: 45, label: "Label serving size (45g)", confidence: "High" },
      label_red_flags: [],
      risk: {
        food_risk_score: 6, food_risk_level: "High", exposure_score: 6, protective_score: 0,
        net_oral_risk_index: 6, net_oral_risk_label: "High", reasons: [], dentist_notes: [], action_plan: [],
        frequency_risk: { occasional_risk: "High", frequent_risk: "Very High", explanation: "" },
        consumption_advice: "Limit intake.",
      },
      source: "Open Food Facts",
    });

    renderAnalyzeFood();

    fireEvent.click(screen.getByText("📦 Barcode / QR"));

    const input = screen.getByPlaceholderText("e.g. 5000112637922");
    fireEvent.change(input, { target: { value: "5000112637922" } });
    fireEvent.click(screen.getByText("Look Up"));

    await waitFor(() => expect(mocks.apiFetchMock).toHaveBeenCalledTimes(1));

    expect(mocks.apiFetchMock).toHaveBeenCalledWith(
      "/barcode-food-risk",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ barcode: "5000112637922" }),
      })
    );

    await waitFor(() => {
      expect(screen.getAllByText("Chocolate Bar").length).toBeGreaterThan(0);
    });
  });

  test("rejects an invalid barcode locally without calling the API", async () => {
    renderAnalyzeFood();

    fireEvent.click(screen.getByText("📦 Barcode / QR"));

    const input = screen.getByPlaceholderText("e.g. 5000112637922");
    // Too short to be a valid EAN/UPC (the input already strips non-digit characters)
    fireEvent.change(input, { target: { value: "123" } });
    fireEvent.click(screen.getByText("Look Up"));

    expect(await screen.findByText(/valid barcode/i)).toBeInTheDocument();
    expect(mocks.apiFetchMock).not.toHaveBeenCalled();
  });

  test("surfaces a friendly error when the barcode lookup fails", async () => {
    mocks.apiFetchMock.mockRejectedValueOnce(new Error("No product found for barcode: 12345678"));

    renderAnalyzeFood();

    fireEvent.click(screen.getByText("📦 Barcode / QR"));
    const input = screen.getByPlaceholderText("e.g. 5000112637922");
    fireEvent.change(input, { target: { value: "12345678" } });
    fireEvent.click(screen.getByText("Look Up"));

    expect(await screen.findByText(/No product found for barcode/i)).toBeInTheDocument();
  });
});
