import React, { createContext, useContext } from "react";
import { useLocalStorageState } from "../hooks/useLocalStorageState";

const CoachContext = createContext(null);

// ── BADGE DEFINITIONS ──────────────────────────────────────────────────────────
export const ALL_BADGES = [
  // Nutrition
  { id: "balanced_day",      emoji: "🥗", name: "Balanced Day",        desc: "Hit all 4 macro targets in one day",          category: "Nutrition" },
  { id: "calcium_champion",  emoji: "🦴", name: "Calcium Champion",    desc: "Hit calcium target 3 days in a row",          category: "Nutrition" },
  { id: "sugar_slayer",      emoji: "⚔️", name: "Sugar Slayer",        desc: "Stay under sugar limit 5 days in a row",      category: "Nutrition" },
  { id: "protein_power",     emoji: "💪", name: "Protein Power",       desc: "Hit protein target 3 days in a row",          category: "Nutrition" },
  // Oral Health
  { id: "low_cario_day",     emoji: "🦷", name: "Low Cariogenic Day",  desc: "Keep daily oral risk load Low",               category: "Oral Health" },
  { id: "oral_guardian",     emoji: "🛡️", name: "Oral Guardian",       desc: "5 consecutive low cariogenic days",           category: "Oral Health" },
  // Consistency
  { id: "streak_7",          emoji: "🔥", name: "7 Day Streak",        desc: "Log food for 7 days in a row",               category: "Consistency" },
  { id: "streak_30",         emoji: "🏆", name: "30 Day Champion",     desc: "Log food for 30 days in a row",              category: "Consistency" },
  { id: "hydration_streak",  emoji: "💧", name: "Hydration Hero",      desc: "Hit water goal 7 days in a row",             category: "Consistency" },
  // Weight
  { id: "goal_milestone",    emoji: "🎯", name: "Goal Milestone",      desc: "Reached 50% of your weight goal",            category: "Weight" },
  { id: "first_log",         emoji: "📋", name: "First Log",           desc: "Logged your first food item",                category: "Consistency" },
  { id: "hydration_first",   emoji: "🚿", name: "Hydrated",            desc: "Hit your water goal for the first time",     category: "Oral Health" },
];

// ── LEVEL THRESHOLDS ───────────────────────────────────────────────────────────
export const LEVELS = [
  { name: "Tooth Rookie",    min: 0,   emoji: "🦷" },
  { name: "Smile Builder",   min: 3,   emoji: "😁" },
  { name: "Oral Guardian",   min: 6,   emoji: "🛡️" },
  { name: "NutriDent Pro",   min: 10,  emoji: "🏆" },
];

export function getLevel(badgeCount) {
  return [...LEVELS].reverse().find(l => badgeCount >= l.min) || LEVELS[0];
}

// ── DAILY NUTRIENT TARGETS ─────────────────────────────────────────────────────
export const TARGETS = {
  calories:   2000,
  protein_g:  50,
  carbs_g:    275,
  fat_g:      65,
  sugar_g:    50,   // limit
  calcium_mg: 1000,
  fiber_g:    28,
};

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

export function CoachProvider({ children }) {
  // ── PROFILE ────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useLocalStorageState("nutrident.coach.profile", {
    weight: "",         // kg, current
    goal_weight: "",    // kg
    goal_type: "maintain", // lose | gain | maintain
    height: "",         // cm
    age: "",
    gender: "1",        // 1=male 2=female
    activity_level: "sedentary",
    goal_date: "",
    calorie_target: "",
    maintenance_calories: "",
    protein_target_g: "",
    carbs_target_g: "",
    fat_target_g: "",
    sugar_limit_g: "",
    fiber_target_g: "",
  });

  // ── MEALS LOG — keyed by date string ──────────────────────────────────────
  // Structure: { "2025-04-24": { Breakfast: [...], Lunch: [...], Dinner: [...], Snacks: [...] } }
  const [mealLog, setMealLog] = useLocalStorageState("nutrident.coach.mealLog", {});

  // ── WATER TRACKER ─────────────────────────────────────────────────────────
  const [waterLog, setWaterLog]   = useLocalStorageState("nutrident.coach.waterLog", {});   // { "2025-04-24": number_of_glasses }
  const [waterGoal, setWaterGoal] = useLocalStorageState("nutrident.coach.waterGoal", 8);    // glasses per day

  // ── WEIGHT LOG ────────────────────────────────────────────────────────────
  const [weightLog, setWeightLog] = useLocalStorageState("nutrident.coach.weightLog", []);   // [{ date, weight }]

  // ── BADGES ────────────────────────────────────────────────────────────────
  const [earnedBadges, setEarnedBadges] = useLocalStorageState("nutrident.coach.earnedBadges", []);  // array of badge ids

  // ── STREAKS ───────────────────────────────────────────────────────────────
  const [streaks, setStreaks] = useLocalStorageState("nutrident.coach.streaks", {
    logging:   0,
    sugar:     0,
    hydration: 0,
    oral:      0,
  });

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const todayKey = () => new Date().toISOString().slice(0, 10);

  // Get today's meals
  const todayMeals = () => mealLog[todayKey()] || { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };

  // Flat list of all today's food items
  const todayFoods = () => {
    const meals = todayMeals();
    return Object.values(meals).flat();
  };

  // Sum a nutrient across today's foods
  const todayTotal = (key) => todayFoods().reduce((s, f) => s + (f.nutrition?.[key] || 0), 0);

  // Today's water count
  const todayWater = () => waterLog[todayKey()] || 0;

  // ── ADD FOOD TO MEAL ──────────────────────────────────────────────────────
  const addFoodToMeal = (meal, foodEntry) => {
    const key = todayKey();
    setMealLog(prev => {
      const day   = prev[key] || { Breakfast: [], Lunch: [], Dinner: [], Snacks: [] };
      const mealArr = [...(day[meal] || []), { ...foodEntry, id: Date.now() }];
      return { ...prev, [key]: { ...day, [meal]: mealArr } };
    });
    // Award first log badge
    awardBadge("first_log");
  };

  // ── REMOVE FOOD FROM MEAL ─────────────────────────────────────────────────
  const removeFoodFromMeal = (meal, itemId) => {
    const key = todayKey();
    setMealLog(prev => {
      const day = prev[key] || {};
      return {
        ...prev,
        [key]: { ...day, [meal]: (day[meal] || []).filter(f => f.id !== itemId) },
      };
    });
  };

  // ── WATER ─────────────────────────────────────────────────────────────────
  const addGlass = () => {
    const key = todayKey();
    setWaterLog(prev => {
      const newVal = (prev[key] || 0) + 1;
      if (newVal >= waterGoal) {
        awardBadge("hydration_first");
        setStreaks(s => ({ ...s, hydration: s.hydration + 1 }));
        if (streaks.hydration + 1 >= 7) awardBadge("hydration_streak");
      }
      return { ...prev, [key]: newVal };
    });
  };

  const removeGlass = () => {
    const key = todayKey();
    setWaterLog(prev => ({ ...prev, [key]: Math.max((prev[key] || 0) - 1, 0) }));
  };

  // ── WEIGHT ────────────────────────────────────────────────────────────────
  const logWeight = (kg) => {
    const entry = { date: todayKey(), weight: Number(kg) };
    setWeightLog(prev => {
      const filtered = prev.filter(e => e.date !== todayKey());
      return [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date));
    });
    setProfile(p => ({ ...p, weight: String(kg) }));
    // Check goal milestone
    const goal = Number(profile.goal_weight);
    const start = Number(weightLog[0]?.weight || kg);
    if (goal && start) {
      const totalDiff  = Math.abs(start - goal);
      const currentDiff = Math.abs(Number(kg) - goal);
      if (totalDiff > 0 && currentDiff / totalDiff <= 0.5) awardBadge("goal_milestone");
    }
  };

  // ── AWARD BADGE ───────────────────────────────────────────────────────────
  const awardBadge = (id) => {
    setEarnedBadges(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  // ── CALORIE TARGETS ───────────────────────────────────────────────────────
  const calorieTargets = () => {
    const w = Number(profile.weight || 0);
    const h = Number(profile.height || 0);
    const a = Number(profile.age    || 0);
    if (!w || !h || !a) return { maintenance: TARGETS.calories, target: TARGETS.calories };
    const bmr = 10 * w + 6.25 * h - 5 * a + (profile.gender === "1" ? 5 : -161);
    const activityFactor = ACTIVITY_FACTORS[profile.activity_level] || ACTIVITY_FACTORS.sedentary;
    const maintenance = Math.round(Number(profile.maintenance_calories) || bmr * activityFactor);
    let target = Number(profile.calorie_target) || maintenance;
    if (!profile.calorie_target) {
      const goal = Number(profile.goal_weight || w);
      const goalDate = profile.goal_date ? new Date(profile.goal_date) : null;
      const today = new Date();
      const daysToGoal = goalDate && goalDate > today ? Math.max(1, Math.ceil((goalDate - today) / 86400000)) : 0;
      if (daysToGoal) target += Math.max(-750, Math.min(500, Math.round(((goal - w) * 7700) / daysToGoal)));
      else if (profile.goal_type === "lose") target -= 300;
      else if (profile.goal_type === "gain") target += 300;
    }
    return { maintenance, target: Math.round(target) };
  };

  // ── DAILY CARIOGENIC LOAD ─────────────────────────────────────────────────
  const dailyCarioLoad = () => {
    const foods = todayFoods();
    if (!foods.length) return { label: "—", score: 0 };
    const totalScore = foods.reduce((s, f) => s + (f.risk?.food_risk_score || 0), 0);
    const avg = totalScore / foods.length;
    const label = avg <= 2 ? "Low" : avg <= 5 ? "Moderate" : "High";
    return { label, score: Math.round(avg * 10) / 10 };
  };

  // ── WELLNESS SCORE /100 ───────────────────────────────────────────────────
  const wellnessScore = () => {
    const ct      = calorieTargets();
    const kcal    = todayTotal("energy_kcal");
    const sugar   = todayTotal("sugar_g");
    const water   = todayWater();
    const cario   = dailyCarioLoad();
    const protein = todayTotal("protein_g");
    const calcium = todayTotal("calcium_mg");

    // Each component 0-100, then weighted average
    const calScore  = kcal > 0 ? Math.max(0, 100 - Math.abs(kcal - ct.target) / ct.target * 100) : 0;
    const sugarScore = sugar <= TARGETS.sugar_g ? 100 : Math.max(0, 100 - (sugar - TARGETS.sugar_g) / TARGETS.sugar_g * 100);
    const waterScore = Math.min((water / waterGoal) * 100, 100);
    const carioScore = cario.label === "Low" ? 100 : cario.label === "Moderate" ? 60 : 20;
    const nutScore   = Math.min(((protein / TARGETS.protein_g) + (calcium / TARGETS.calcium_mg)) / 2 * 100, 100);

    const score = (calScore * 0.25 + sugarScore * 0.25 + waterScore * 0.2 + carioScore * 0.2 + nutScore * 0.1);
    return Math.round(score);
  };

  // ── NUTRITION COMPLETION % ────────────────────────────────────────────────
  const nutritionCompletion = () => {
    const ct   = calorieTargets();
    const vals = [
      Math.min(todayTotal("energy_kcal") / ct.target, 1),
      Math.min(todayTotal("protein_g")   / (Number(profile.protein_target_g) || TARGETS.protein_g), 1),
      Math.min(todayTotal("carbs_g")     / (Number(profile.carbs_target_g) || TARGETS.carbs_g), 1),
      Math.min(todayTotal("fat_g")       / (Number(profile.fat_target_g) || TARGETS.fat_g), 1),
      Math.min(todayTotal("calcium_mg")  / TARGETS.calcium_mg, 1),
      Math.min(todayTotal("fiber_g")     / (Number(profile.fiber_target_g) || TARGETS.fiber_g), 1),
    ];
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100);
  };

  // ── AI COACH INSIGHTS ─────────────────────────────────────────────────────
  const coachInsights = () => {
    const insights = [];
    const sugar   = todayTotal("sugar_g");
    const calcium = todayTotal("calcium_mg");
    const water   = todayWater();
    const cario   = dailyCarioLoad();
    const kcal    = todayTotal("energy_kcal");
    const ct      = calorieTargets();

    if (sugar > TARGETS.sugar_g * 1.5) insights.push({ type: "warn", text: "Sugar intake is significantly above the daily limit. Consider replacing a sweet snack with fruit or nuts." });
    else if (sugar <= TARGETS.sugar_g)  insights.push({ type: "good", text: `Great sugar control today — ${Math.round(sugar)}g vs ${TARGETS.sugar_g}g limit.` });

    if (calcium < TARGETS.calcium_mg * 0.5) insights.push({ type: "warn", text: "Low calcium today. Add dairy, leafy greens, or fortified milk to strengthen enamel." });
    else if (calcium >= TARGETS.calcium_mg)  insights.push({ type: "good", text: "Excellent calcium intake — your enamel remineralisation is well supported." });

    if (water < waterGoal * 0.5) insights.push({ type: "warn", text: "Low hydration today. Saliva depends on water intake — drink more to protect your teeth." });
    else if (water >= waterGoal)  insights.push({ type: "good", text: "Hydration goal reached! Saliva production is supported." });

    if (cario.label === "High") insights.push({ type: "warn", text: "High daily cariogenic load. Rinse with water after meals and avoid eating within 1 hour of sleep." });
    else if (cario.label === "Low") insights.push({ type: "good", text: "Low cariogenic day — excellent food choices for oral health." });

    if (kcal > ct.target * 1.2) insights.push({ type: "warn", text: `Calories are ${Math.round(kcal - ct.target)} above your target. Consider a lighter dinner.` });
    else if (kcal > 0 && kcal < ct.target * 0.6) insights.push({ type: "warn", text: "Calorie intake is very low today. Make sure you're eating enough to meet energy needs." });

    if (streaks.logging >= 7) insights.push({ type: "good", text: `${streaks.logging} day logging streak — consistency is the key to results!` });

    if (insights.length === 0) insights.push({ type: "info", text: "Start logging meals to see personalised coaching insights here." });
    return insights;
  };

  // ── SMART FOOD SWAPS ──────────────────────────────────────────────────────
  const smartSwaps = () => {
    const swaps = [];
    const sugar  = todayTotal("sugar_g");
    const cario  = dailyCarioLoad();
    if (sugar > TARGETS.sugar_g) swaps.push({ from: "Sweet snack", to: "Apple or pear — natural sugars with fibre slow acid production" });
    if (cario.label === "High")  swaps.push({ from: "Sticky candy / toffee", to: "Dark chocolate (70%+) — less sugar, contains protective compounds" });
    const foods = todayFoods();
    const hasSoda = foods.some(f => (f.food_name_entered || "").toLowerCase().includes("soda") || (f.usda_match || "").toLowerCase().includes("cola"));
    if (hasSoda) swaps.push({ from: "Soda / cola", to: "Sparkling water with lemon — hydrating without acid + sugar attack" });
    if (swaps.length === 0) swaps.push({ from: "Keep it up", to: "Your food choices today look great for oral health" });
    return swaps;
  };

  // ── WEEKLY DATA for charts (last 7 days) ──────────────────────────────────
  const weeklyData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en", { weekday: "short" });
      const meals = mealLog[key] || {};
      const foods = Object.values(meals).flat();
      const kcal  = foods.reduce((s, f) => s + (f.nutrition?.energy_kcal || 0), 0);
      const sugar = foods.reduce((s, f) => s + (f.nutrition?.sugar_g || 0), 0);
      const avgCario = foods.length
        ? foods.reduce((s, f) => s + (f.risk?.food_risk_score || 0), 0) / foods.length
        : 0;
      days.push({
        date: key, label,
        calories: Math.round(kcal),
        sugar:    Math.round(sugar),
        water:    waterLog[key] || 0,
        cario:    Math.round(avgCario * 10) / 10,
        weight:   weightLog.find(w => w.date === key)?.weight || null,
      });
    }
    return days;
  };

  return (
    <CoachContext.Provider value={{
      profile, setProfile,
      mealLog, todayMeals, todayFoods, todayTotal,
      addFoodToMeal, removeFoodFromMeal,
      waterLog, waterGoal, setWaterGoal, todayWater, addGlass, removeGlass,
      weightLog, logWeight,
      streaks, setStreaks,
      earnedBadges, awardBadge,
      calorieTargets, dailyCarioLoad, wellnessScore, nutritionCompletion,
      coachInsights, smartSwaps, weeklyData,
    }}>
      {children}
    </CoachContext.Provider>
  );
}

export const useCoach = () => useContext(CoachContext);
