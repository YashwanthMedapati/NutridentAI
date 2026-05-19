import React, { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Shared patient form state
  const [form, setForm] = useState({
    RIDAGEYR: "", RIAGENDR: "1",
    DR1TSUGR: "", DR1TCARB: "", DR1TTFAT: "", DR1TKCAL: "",
    DR1TCALC: "", DR1TPHOS: "", DR1TSFAT: "",
    SMD650: "", SMQ040: "3", SMD030: "",
    DBD895: "", DBD900: "", DBD905: "", DBD910: "",
    food_name: "",
    height: "", weight: "", goal_weight: "",
  });

  // Assessment results
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);

  // Food log persists across pages
  const [foodLog, setFoodLog] = useState([]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const addToFoodLog = (entry) =>
    setFoodLog(prev => [...prev, { ...entry, timestamp: new Date().toISOString() }]);

  const removeFromLog = (index) =>
    setFoodLog(prev => prev.filter((_, i) => i !== index));

  const clearLog = () => setFoodLog([]);

  const runAssessment = async () => {
    try {
      setLoading(true);
      setResult(null);

      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) =>
          ["food_name", "height", "weight", "goal_weight"].includes(k)
            ? [k, v]
            : [k, Number(v)]
        )
      );

      const res  = await fetch("http://127.0.0.1:8000/combined-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);

      if (data.food_risk?.nutrition) {
        addToFoodLog(data.food_risk);
      }
    } catch {
      setResult({ error: "Cannot connect to backend. Make sure FastAPI is running on port 8000." });
    } finally {
      setLoading(false);
    }
  };

  // Calorie calculator (Mifflin-St Jeor)
  const calculateCalories = () => {
    const w = Number(form.weight   || 0);
    const h = Number(form.height   || 0);
    const a = Number(form.RIDAGEYR || 0);
    if (!w || !h || !a) return null;
    const bmr         = 10 * w + 6.25 * h - 5 * a + 5;
    const maintenance = Math.round(bmr * 1.2);
    const goal        = Number(form.goal_weight || w);
    let target = maintenance;
    if (goal < w) target -= 300;
    if (goal > w) target += 300;
    return { maintenance, target: Math.round(target) };
  };

  return (
    <AppContext.Provider value={{
      form, handleChange, setForm,
      result, setResult, loading,
      foodLog, addToFoodLog, removeFromLog, clearLog,
      runAssessment, calculateCalories,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
