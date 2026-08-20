// Pure helpers shared by the Analyze Food page — no React, no side effects,
// so they're trivial to unit test in isolation from rendering.

export function riskColor(label) {
  if (!label) return "var(--low)";
  const l = label.toLowerCase();
  if (l.includes("very high")) return "var(--high)";
  if (l.includes("high"))      return "var(--high)";
  if (l.includes("moderate"))  return "var(--medium)";
  return "var(--low)";
}

export const CAT_COLORS = {
  Immediate:   "var(--high)",
  Frequency:   "var(--medium)",
  Pairing:     "var(--mineral)",
  Portion:     "#9584a3",
  Hydration:   "#4f95a3",
  "Dental Care": "var(--low)",
};

const INGREDIENT_CALORIE_WEIGHTS = {
  cheese: 0.24,
  salami: 0.18,
  pepperoni: 0.18,
  sausage: 0.18,
  ham: 0.12,
  "pizza crust": 0.35,
  crust: 0.35,
  dough: 0.35,
  tomato: 0.06,
  olives: 0.06,
  peppers: 0.05,
  mushrooms: 0.04,
  basil: 0.01,
};

export function ingredientCalorieBreakdown(ingredients = [], nutrition) {
  const total = Number(nutrition?.energy_kcal || 0);
  if (!total || !ingredients.length) return [];
  const normalized = ingredients.map(item => {
    const name = typeof item === "string" ? item : item.name;
    const key = String(name || "").toLowerCase();
    const weight = INGREDIENT_CALORIE_WEIGHTS[key] || 0.08;
    return { name, confidence: item.confidence || "User", weight };
  }).filter(item => item.name);
  const totalWeight = normalized.reduce((sum, item) => sum + item.weight, 0) || 1;
  return normalized.map(item => ({
    ...item,
    calories: Math.round(total * (item.weight / totalWeight)),
    percent: Math.round((item.weight / totalWeight) * 100),
  }));
}

export function foodKindFor(name = "") {
  const lower = name.toLowerCase();
  if (lower.includes("pizza")) return "pizza";
  if (/(rice|pasta|noodle|spaghetti|oatmeal|cereal|bowl)/.test(lower)) return "bowl";
  if (/(soda|juice|milk|coffee|tea|smoothie|shake|drink)/.test(lower)) return "drink";
  if (/(sandwich|burger|wrap|taco|burrito)/.test(lower)) return "handheld";
  return "generic";
}

export const GUIDED_DEFAULTS = {
  pizza: {
    slices: "2",
    pizzaSize: "medium",
    crust: "regular",
    cheese: "regular cheese",
    plateSize: "medium plate",
    visibleAmount: "most",
    density: "standard",
    toppings: ["cheese", "tomato sauce"],
  },
  bowl: {
    bowlSize: "medium bowl",
    density: "standard",
    plateSize: "medium plate",
    visibleAmount: "most",
    toppings: [],
  },
  drink: {
    volumeMl: "355",
    sugarLevel: "regular",
    toppings: [],
  },
  handheld: {
    count: "1",
    size: "standard",
    visibleAmount: "all",
    density: "standard",
    toppings: [],
  },
  generic: {
    serving: "1",
    size: "medium",
    plateSize: "medium plate",
    visibleAmount: "most",
    density: "standard",
    toppings: [],
  },
};

export const TOPPING_OPTIONS = {
  pizza: ["cheese", "tomato sauce", "salami", "pepperoni", "olives", "tomatoes", "peppers", "mushrooms", "extra cheese"],
  bowl: ["rice", "pasta", "sauce", "cheese", "chicken", "egg", "vegetables", "nuts", "oil"],
  drink: ["sugar", "milk", "cream", "syrup", "protein powder", "fruit"],
  handheld: ["cheese", "sauce", "meat", "vegetables", "egg", "extra spread"],
  generic: ["sauce", "cheese", "meat", "vegetables", "oil", "sugar"],
};

function portionConfidenceMultiplier(answers = {}) {
  const visible = {
    quarter: 0.25,
    half: 0.5,
    most: 0.85,
    all: 1,
    more: 1.25,
  };
  const plate = {
    "small plate": 0.86,
    "medium plate": 1,
    "large plate": 1.16,
  };
  const density = {
    light: 0.88,
    standard: 1,
    dense: 1.16,
  };
  return (
    (visible[answers.visibleAmount] || 1) *
    (plate[answers.plateSize] || 1) *
    (density[answers.density] || 1)
  );
}

export function guidedEstimate(kind, answers) {
  if (kind === "pizza") {
    const baseBySize = { small: 95, medium: 125, large: 155 };
    const crustMultiplier = { thin: 0.82, regular: 1, thick: 1.22 };
    const cheeseMultiplier = { "light cheese": 0.94, "regular cheese": 1, "extra cheese": 1.1 };
    const slices = Math.max(1, Number(answers.slices || 1));
    const grams = Math.round(
      slices *
      (baseBySize[answers.pizzaSize] || baseBySize.medium) *
      (crustMultiplier[answers.crust] || 1) *
      (cheeseMultiplier[answers.cheese] || 1) *
      portionConfidenceMultiplier(answers)
    );
    return { grams, label: `${slices} ${answers.pizzaSize || "medium"} ${answers.crust || "regular"} pizza slice${slices === 1 ? "" : "s"}` };
  }
  if (kind === "bowl") {
    const base = { "small bowl": 180, "medium bowl": 280, "large bowl": 420 };
    const density = { light: 0.85, standard: 1, dense: 1.18 };
    const grams = Math.round((base[answers.bowlSize] || 280) * (density[answers.density] || 1) * portionConfidenceMultiplier(answers));
    return { grams, label: answers.bowlSize || "medium bowl" };
  }
  if (kind === "drink") {
    const grams = Math.max(30, Math.round(Number(answers.volumeMl || 355)));
    return { grams, label: `${grams} ml drink` };
  }
  if (kind === "handheld") {
    const base = { small: 150, standard: 220, large: 320 };
    const count = Math.max(1, Number(answers.count || 1));
    const grams = Math.round(count * (base[answers.size] || 220) * portionConfidenceMultiplier(answers));
    return { grams, label: `${count} ${answers.size || "standard"} item${count === 1 ? "" : "s"}` };
  }
  const base = { small: 100, medium: 150, large: 250 };
  const serving = Math.max(0.25, Number(answers.serving || 1));
  const grams = Math.round(serving * (base[answers.size] || 150) * portionConfidenceMultiplier(answers));
  return { grams, label: `${serving} ${answers.size || "medium"} serving${serving === 1 ? "" : "s"}` };
}
