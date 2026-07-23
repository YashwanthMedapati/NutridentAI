import React from "react";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

const appState = vi.hoisted(() => ({
  value: {
    result: null,
  },
}));

vi.mock("../context/AppContext", () => ({
  useApp: () => appState.value,
}));

import Explainability from "./Explainability";

function renderPage() {
  return render(
    <BrowserRouter>
      <Explainability />
    </BrowserRouter>
  );
}

describe("Explainability", () => {
  test("shows an empty state when no analysis exists", () => {
    appState.value = { result: null };

    renderPage();

    expect(screen.getByText("No analysis to explain yet")).toBeInTheDocument();
    expect(screen.getByText("Analyze Food")).toBeInTheDocument();
  });

  test("renders confidence, reasons, and portion review details for a food result", () => {
    appState.value = {
      result: {
        usda_match: "Pepperoni pizza",
        source: "Google Vision + USDA",
        portion_estimate: { label: "Whole topped pizza visible (~760g)", confidence: "Moderate" },
        analysis_quality: {
          confidence_score: 0.62,
          source: "Image analysis",
          requires_user_review: true,
        },
        risk: {
          exposure_score: 8,
          protective_score: 1,
          net_oral_risk_index: 7,
          food_risk_score: 7,
          reasons: ["High fermentable carbohydrate exposure", "Review portion estimate"],
        },
      },
    };

    renderPage();

    expect(screen.getByText("Medium confidence: mixed or incomplete signals")).toBeInTheDocument();
    expect(screen.getByText("Whole topped pizza visible (~760g)")).toBeInTheDocument();
    expect(screen.getByText("High fermentable carbohydrate exposure")).toBeInTheDocument();
    expect(screen.getByText("Review portion estimate")).toBeInTheDocument();
  });
});
