import React, { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useLocalStorageState } from "../hooks/useLocalStorageState";
import { useAuth } from "./AuthContext";
import {
  clearAllCloudFoodLogs,
  clearAllCloudWeightLogs,
  clearCloudFoodLogsForDate,
  deleteCloudFoodLog,
  fetchCloudLogs,
  upsertCloudFoodLog,
  upsertCloudWeightLog,
} from "../supabaseDb";

const AppContext = createContext(null);

const ranges = {
  RIDAGEYR: ["Age", 1, 120],
  DR1TSUGR: ["Daily sugar", 0, 500],
  DR1TCARB: ["Carbohydrates", 0, 1000],
  DR1TTFAT: ["Total fat", 0, 500],
  DR1TKCAL: ["Calories", 0, 10000],
  DR1TCALC: ["Calcium", 0, 5000],
  DR1TPHOS: ["Phosphorus", 0, 5000],
  DR1TSFAT: ["Saturated fat", 0, 300],
  DBD895: ["Meals not home-cooked", 0, 21],
  DBD900: ["Fast food meals", 0, 21],
  DBD905: ["Ready-to-eat foods", 0, 21],
  DBD910: ["Frozen meals", 0, 21],
};

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

const DEFAULT_DIET_FROM_CALORIES = {
  calcium_mg: 800,
  phosphorus_mg: 700,
  saturatedFatRatio: 0.1,
  sugar_g: 40,
};

export function calculateNutritionPlan(source) {
  const w = Number(source.weight || 0);
  const h = Number(source.height || 0);
  const a = Number(source.RIDAGEYR || source.age || 0);
  if (!w || !h || !a) return null;

  const bmr = 10 * w + 6.25 * h - 5 * a + (String(source.RIAGENDR || source.gender) === "1" ? 5 : -161);
  const activityFactor = ACTIVITY_FACTORS[source.activity_level] || ACTIVITY_FACTORS.sedentary;
  const maintenance = Math.round(bmr * activityFactor);
  const goal = Number(source.goal_weight || w);
  const goalDate = source.goal_date ? new Date(source.goal_date) : null;
  const today = new Date();
  const daysToGoal = goalDate && goalDate > today
    ? Math.max(1, Math.ceil((goalDate - today) / 86400000))
    : 0;
  const kgDelta = goal - w;
  const dailyAdjustment = daysToGoal
    ? Math.max(-750, Math.min(500, Math.round((kgDelta * 7700) / daysToGoal)))
    : (goal < w ? -300 : goal > w ? 300 : 0);
  const target = Math.max(1200, Math.round(maintenance + dailyAdjustment));

  const protein = Math.round(w * (goal < w ? 1.8 : goal > w ? 1.7 : 1.5));
  const fat = Math.round((target * 0.28) / 9);
  const carbs = Math.max(80, Math.round((target - protein * 4 - fat * 9) / 4));
  const sugarLimit = Math.min(50, Math.round(target * 0.1 / 4));
  const fiber = Math.max(25, Math.round(target / 1000 * 14));

  return {
    maintenance,
    target,
    adjustment: dailyAdjustment,
    daysToGoal,
    macros: {
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      sugar_g: sugarLimit,
      fiber_g: fiber,
      calcium_mg: 1000,
    },
  };
}

function assessmentSourceWithDefaults(source) {
  const plan = calculateNutritionPlan(source);
  const calories = Number(source.DR1TKCAL || plan?.maintenance || 2000);
  const carbs = Number(source.DR1TCARB || Math.round((calories * 0.45) / 4));
  const fat = Number(source.DR1TTFAT || Math.round((calories * 0.3) / 9));
  return {
    ...source,
    DR1TKCAL: source.DR1TKCAL || String(calories),
    DR1TCARB: source.DR1TCARB || String(carbs),
    DR1TTFAT: source.DR1TTFAT || String(fat),
    DR1TSUGR: source.DR1TSUGR || String(DEFAULT_DIET_FROM_CALORIES.sugar_g),
    DR1TCALC: source.DR1TCALC || String(DEFAULT_DIET_FROM_CALORIES.calcium_mg),
    DR1TPHOS: source.DR1TPHOS || String(DEFAULT_DIET_FROM_CALORIES.phosphorus_mg),
    DR1TSFAT: source.DR1TSFAT || String(Math.round(calories * DEFAULT_DIET_FROM_CALORIES.saturatedFatRatio / 9)),
    DBD895: source.DBD895 || "3",
    DBD900: source.DBD900 || "1",
    DBD905: source.DBD905 || "2",
    DBD910: source.DBD910 || "1",
    SMD650: source.SMD650 || "0",
    SMD030: source.SMD030 || "0",
  };
}

function validateAssessment(source) {
  for (const [key, [label, min, max]] of Object.entries(ranges)) {
    const value = Number(source[key]);
    if (!Number.isFinite(value)) return `${label} must be a number.`;
    if (value < min || value > max) return `${label} must be between ${min} and ${max}.`;
  }
  if (!["1", "2", "3"].includes(String(source.SMQ040))) return "Choose a valid smoking status.";
  if (String(source.SMQ040) !== "3") {
    const cigarettes = Number(source.SMD650);
    const startAge = Number(source.SMD030);
    const currentAge = Number(source.RIDAGEYR);
    if (!Number.isFinite(cigarettes) || cigarettes < 0 || cigarettes > 100) return "Cigarettes per day must be between 0 and 100.";
    if (!Number.isFinite(startAge) || startAge < 1 || startAge > currentAge) return "Smoking start age must be between 1 and your current age.";
  }
  return null;
}

export function AppProvider({ children }) {
  const { user, isSupabaseConfigured } = useAuth();
  const [form, setForm] = useLocalStorageState("nutrident.form", {
    RIDAGEYR: "", RIAGENDR: "1",
    DR1TSUGR: "", DR1TCARB: "", DR1TTFAT: "", DR1TKCAL: "",
    DR1TCALC: "", DR1TPHOS: "", DR1TSFAT: "",
    SMD650: "", SMQ040: "3", SMD030: "",
    DBD895: "", DBD900: "", DBD905: "", DBD910: "",
    food_name: "",
    height: "", weight: "", goal_weight: "",
    activity_level: "sedentary", goal_date: "",
  });

  const [result, setResult]           = useLocalStorageState("nutrident.latestResult", null);
  const [loading, setLoading]         = useState(false);
  const [foodLog, setFoodLog]         = useLocalStorageState("nutrident.foodLog", []);
  const [weightLog, setWeightLog]     = useLocalStorageState("nutrident.weightLog", []);
  const [previousResults, setPrev]    = useLocalStorageState("nutrident.previousResults", []);
  const [cloudSyncStatus, setCloudSyncStatus] = useState("local");
  const [cloudSyncError, setCloudSyncError] = useState(null);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setCloudSyncStatus("local");
      return;
    }

    let cancelled = false;
    setCloudSyncStatus("syncing");
    fetchCloudLogs(user.id)
      .then(({ foodLogs, weightLogs }) => {
        if (cancelled) return;
        if (foodLogs.length) setFoodLog(foodLogs);
        if (weightLogs.length) setWeightLog(weightLogs);
        setCloudSyncStatus("synced");
        setCloudSyncError(null);
      })
      .catch(error => {
        if (cancelled) return;
        setCloudSyncStatus("error");
        setCloudSyncError(error.message || "Cloud sync failed.");
      });

    return () => { cancelled = true; };
  }, [user, isSupabaseConfigured, setFoodLog, setWeightLog]);

  const syncCloud = async (operation) => {
    if (!user || !isSupabaseConfigured) return;
    try {
      setCloudSyncStatus("syncing");
      await operation();
      setCloudSyncStatus("synced");
      setCloudSyncError(null);
    } catch (error) {
      setCloudSyncStatus("error");
      setCloudSyncError(error.message || "Cloud sync failed.");
    }
  };

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const addToFoodLog = (entry) => {
    const now = new Date();
    const nextEntry = {
      ...entry,
      id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: now.toISOString(),
      loggedDate: now.toISOString().slice(0, 10),
    };
    setFoodLog(prev => [...prev, nextEntry]);
    syncCloud(() => upsertCloudFoodLog(nextEntry, user.id));
  };

  const updateFoodLog = (index, entry) =>
    setFoodLog(prev => {
      const updated = prev.map((item, i) => i === index ? { ...item, ...entry, updatedAt: new Date().toISOString() } : item);
      const changed = updated[index];
      if (changed) syncCloud(() => upsertCloudFoodLog(changed, user.id));
      return updated;
    });

  const removeFromLog = (index) =>
    setFoodLog(prev => {
      const removed = prev[index];
      if (removed) syncCloud(() => deleteCloudFoodLog(removed, user.id));
      return prev.filter((_, i) => i !== index);
    });

  const clearFoodLogForDate = (dateKey) => {
    setFoodLog(prev => prev.filter(item => (item.loggedDate || item.timestamp?.slice(0, 10)) !== dateKey));
    syncCloud(() => clearCloudFoodLogsForDate(dateKey, user.id));
  };

  const clearLog = () => {
    setFoodLog([]);
    syncCloud(async () => {
      await clearAllCloudFoodLogs(user.id);
      await clearAllCloudWeightLogs(user.id);
    });
  };

  const logWeight = (date, weight) => {
    const value = Number(weight);
    if (!date || !Number.isFinite(value) || value <= 0) return;
    const entry = { date, weight: value, timestamp: new Date().toISOString() };
    setWeightLog(prev => {
      const next = [
        ...prev.filter(item => item.date !== date),
        entry,
      ];
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
    setForm(prev => ({ ...prev, weight: String(value) }));
    syncCloud(() => upsertCloudWeightLog(entry, user.id));
  };

  const getWeightForDate = (date) =>
    weightLog.find(item => item.date === date)?.weight || "";

  const exportAppData = () => ({
    exportedAt: new Date().toISOString(),
    version: 1,
    form,
    result,
    foodLog,
    weightLog,
    previousResults,
  });

  const importAppData = (payload) => {
    if (!payload || typeof payload !== "object") {
      throw new Error("Import file is not valid JSON data.");
    }
    if (payload.form && typeof payload.form === "object") setForm(payload.form);
    if ("result" in payload) setResult(payload.result);
    if (Array.isArray(payload.foodLog)) setFoodLog(payload.foodLog);
    if (Array.isArray(payload.weightLog)) setWeightLog(payload.weightLog);
    if (Array.isArray(payload.previousResults)) setPrev(payload.previousResults);
  };

  const clearAllAppData = () => {
    setForm({
      RIDAGEYR: "", RIAGENDR: "1",
      DR1TSUGR: "", DR1TCARB: "", DR1TTFAT: "", DR1TKCAL: "",
      DR1TCALC: "", DR1TPHOS: "", DR1TSFAT: "",
      SMD650: "", SMQ040: "3", SMD030: "",
      DBD895: "", DBD900: "", DBD905: "", DBD910: "",
      food_name: "",
      height: "", weight: "", goal_weight: "",
      activity_level: "sedentary", goal_date: "",
    });
    setResult(null);
    setFoodLog([]);
    setWeightLog([]);
    setPrev([]);
    syncCloud(() => clearAllCloudFoodLogs(user.id));
  };

  const runAssessment = async (overrideForm) => {
    const source = assessmentSourceWithDefaults(overrideForm || form);
    try {
      setLoading(true);
      setResult(null);
      const validationError = validateAssessment(source);
      if (validationError) {
        setResult({ error: validationError });
        return;
      }
      const payload = Object.fromEntries(
        Object.entries(source).map(([k, v]) =>
          ["food_name","height","weight","goal_weight","activity_level","goal_date"].includes(k) ? [k, v] : [k, Number(v)]
        )
      );
      if (payload.SMQ040 === 3) {
        payload.SMD650 = 0;
        payload.SMD030 = 0;
      }
      const hasFood = Boolean(String(source.food_name || "").trim());
      const endpoint = hasFood ? "/combined-risk" : "/predict";
      const requestBody = hasFood
        ? payload
        : Object.fromEntries(Object.entries(payload).filter(([key]) => ranges[key] || ["SMQ040", "SMD650", "SMD030", "RIDAGEYR", "RIAGENDR"].includes(key)));
      const data = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const normalized = hasFood ? data : {
        patient_risk: data,
        food_risk: null,
        final_advice: "Review your calorie and macro plan in NutriDent Coach, then log foods from Analyze Food or Daily Log for item-level oral risk.",
        nutrition_plan: calculateNutritionPlan(source),
      };
      setResult(normalized);
      if (normalized && !normalized.error) {
        setPrev(prev => [{ ...normalized, timestamp: new Date().toISOString(), food_name: source.food_name || "Assessment only" }, ...prev]);
      }
    } catch (error) {
      setResult({ error: error.message || "Cannot connect to backend. Make sure FastAPI is running." });
    } finally {
      setLoading(false);
    }
  };

  const calculateCalories = (f) => {
    return calculateNutritionPlan(f || form);
  };

  return (
    <AppContext.Provider value={{
      form, handleChange, setForm,
      result, setResult, loading,
      foodLog, addToFoodLog, removeFromLog, clearLog, clearFoodLogForDate,
      updateFoodLog,
      weightLog, logWeight, getWeightForDate,
      cloudSyncStatus, cloudSyncError,
      previousResults,
      exportAppData, importAppData, clearAllAppData,
      runAssessment, calculateCalories,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
