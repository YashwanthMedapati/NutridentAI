// Pure date/summary/export helpers shared by the Daily Log page's Day,
// Week, and Month views — no React, so they're trivial to unit test or
// reuse on their own.

export function timeFor(item) {
  return item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "Time not saved";
}

export function dateKeyFor(item, todayKey) {
  return item.loggedDate || item.timestamp?.slice(0, 10) || todayKey;
}

export function daySummaryFor(date, { foodLog, getWeightForDate, todayKey }) {
  const foods = foodLog.filter(item => dateKeyFor(item, todayKey) === date);
  return {
    calories: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.energy_kcal || 0), 0)),
    sugar: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.sugar_g || 0), 0)),
    carbs: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.carbs_g || 0), 0)),
    protein: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.protein_g || 0), 0)),
    count: foods.length,
    weight: getWeightForDate(date),
    highRisk: foods.filter(item => item.risk?.food_risk_level === "High").length,
  };
}

export function getWeekDays(selectedDate) {
  const base = new Date(`${selectedDate}T12:00:00`);
  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

export function getMonthDays(selectedDate) {
  const base = new Date(`${selectedDate}T12:00:00`);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      day: date.getDate(),
      currentMonth: date.getMonth() === base.getMonth(),
    };
  });
}

export function exportRowsToCsv(rows, filename, { getWeightForDate, todayKey }) {
  const headers = ["date", "time", "meal", "food", "calories", "sugar_g", "carbs_g", "risk_level", "weight_kg"];
  const csv = [
    headers.join(","),
    ...rows.map(item => {
      const date = dateKeyFor(item, todayKey);
      const values = [
        date,
        timeFor(item),
        item.mealCategory || "Meal",
        item.usda_match || item.food_name_entered || "",
        Math.round(item.nutrition?.energy_kcal || 0),
        item.nutrition?.sugar_g || 0,
        item.nutrition?.carbs_g || 0,
        item.risk?.food_risk_level || "",
        getWeightForDate(date) || "",
      ];
      return values.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",");
    }),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
