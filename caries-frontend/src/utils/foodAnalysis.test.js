import { describe, expect, test } from "vitest";
import { guidedEstimate } from "./foodAnalysis";

describe("guidedEstimate", () => {
  test("adjusts pizza portions using photo confirmation inputs", () => {
    const standard = guidedEstimate("pizza", {
      slices: "2",
      pizzaSize: "medium",
      crust: "regular",
      cheese: "regular cheese",
      visibleAmount: "all",
      plateSize: "medium plate",
      density: "standard",
    });

    const heavier = guidedEstimate("pizza", {
      slices: "2",
      pizzaSize: "medium",
      crust: "thick",
      cheese: "extra cheese",
      visibleAmount: "more",
      plateSize: "large plate",
      density: "dense",
    });

    expect(standard.grams).toBe(250);
    expect(heavier.grams).toBeGreaterThan(standard.grams);
  });

  test("reduces generic portions when only half a small plate was eaten", () => {
    const estimate = guidedEstimate("generic", {
      serving: "1",
      size: "medium",
      visibleAmount: "half",
      plateSize: "small plate",
      density: "light",
    });

    expect(estimate.grams).toBeLessThan(100);
  });
});
