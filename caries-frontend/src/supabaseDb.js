import { supabase } from "./supabaseClient";

function foodRow(entry, userId) {
  const loggedAt = entry.timestamp || new Date().toISOString();
  return {
    id: entry.id,
    user_id: userId,
    logged_at: loggedAt,
    logged_date: entry.loggedDate || loggedAt.slice(0, 10),
    meal_category: entry.mealCategory || "Meal",
    food_name: entry.food_name_entered || entry.detected_food || entry.usda_match || "Unknown food",
    usda_match: entry.usda_match || null,
    source: entry.source || entry.image_insights?.source || null,
    portion_g: entry.portion_estimate?.g || entry.nutrition?.portion_g || null,
    calories: entry.nutrition?.energy_kcal || 0,
    sugar_g: entry.nutrition?.sugar_g || 0,
    carbs_g: entry.nutrition?.carbs_g || 0,
    fat_g: entry.nutrition?.fat_g || 0,
    protein_g: entry.nutrition?.protein_g || 0,
    risk_level: entry.risk?.food_risk_level || null,
    risk_score: entry.risk?.food_risk_score || null,
    raw_result: entry,
  };
}

function foodEntry(row) {
  return {
    ...(row.raw_result || {}),
    id: row.id,
    timestamp: row.logged_at,
    loggedDate: row.logged_date,
    mealCategory: row.meal_category,
    food_name_entered: row.food_name,
    usda_match: row.usda_match || row.food_name,
  };
}

export async function fetchCloudLogs(userId) {
  if (!supabase || !userId) return { foodLogs: [], weightLogs: [] };

  const [{ data: foods, error: foodError }, { data: weights, error: weightError }] = await Promise.all([
    supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: true }),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_date", { ascending: true }),
  ]);

  if (foodError) throw foodError;
  if (weightError) throw weightError;

  return {
    foodLogs: (foods || []).map(foodEntry),
    weightLogs: (weights || []).map(row => ({
      date: row.logged_date,
      weight: row.weight_kg,
      timestamp: row.created_at,
    })),
  };
}

export async function upsertCloudFoodLog(entry, userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("food_logs").upsert(foodRow(entry, userId));
  if (error) throw error;
}

export async function deleteCloudFoodLog(entry, userId) {
  if (!supabase || !userId || !entry?.id) return;
  const { error } = await supabase.from("food_logs").delete().eq("user_id", userId).eq("id", entry.id);
  if (error) throw error;
}

export async function clearCloudFoodLogsForDate(date, userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("food_logs").delete().eq("user_id", userId).eq("logged_date", date);
  if (error) throw error;
}

export async function clearAllCloudFoodLogs(userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("food_logs").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function clearAllCloudWeightLogs(userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("weight_logs").delete().eq("user_id", userId);
  if (error) throw error;
}

export async function upsertCloudWeightLog(entry, userId) {
  if (!supabase || !userId) return;
  const { error } = await supabase.from("weight_logs").upsert({
    user_id: userId,
    logged_date: entry.date,
    weight_kg: entry.weight,
  }, { onConflict: "user_id,logged_date" });
  if (error) throw error;
}
