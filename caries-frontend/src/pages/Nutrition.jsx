import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { RiskBadge, Alert, Spinner, NutritionGrid, RiskBar } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Nutrition() {
  const { foodLog, removeFromLog, clearLog, calculateCalories, form } = useApp();
  const [searchName, setSearchName]     = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching]       = useState(false);
  const [expanded, setExpanded]         = useState(null);

  const totalCals    = foodLog.reduce((s, i) => s + (i.nutrition?.energy_kcal || 0), 0);
  const totalSugar   = foodLog.reduce((s, i) => s + (i.nutrition?.sugar_g || 0), 0);
  const totalCarbs   = foodLog.reduce((s, i) => s + (i.nutrition?.carbs_g || 0), 0);
  const totalFat     = foodLog.reduce((s, i) => s + (i.nutrition?.fat_g || 0), 0);
  const totalProtein = foodLog.reduce((s, i) => s + (i.nutrition?.protein_g || 0), 0);
  const cals = calculateCalories();
  const caloricProgress = cals ? Math.min(Math.round((totalCals / cals.target) * 100), 150) : null;

  const riskDist = {
    Low:    foodLog.filter(i => i.risk?.food_risk_level === "Low").length,
    Medium: foodLog.filter(i => i.risk?.food_risk_level === "Medium").length,
    High:   foodLog.filter(i => i.risk?.food_risk_level === "High").length,
  };
  const pieData = Object.entries(riskDist).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const macroData = [
    { name: "Sugar",   value: Math.round(totalSugar),   limit: 50  },
    { name: "Carbs",   value: Math.round(totalCarbs),   limit: 275 },
    { name: "Fat",     value: Math.round(totalFat),     limit: 65  },
    { name: "Protein", value: Math.round(totalProtein), limit: 50  },
  ];
  const macroPieData = [
    { name: "Carbs",   value: Math.round(totalCarbs) },
    { name: "Fat",     value: Math.round(totalFat) },
    { name: "Protein", value: Math.round(totalProtein) },
  ].filter(d => d.value > 0);

  const insights = [];
  if (totalSugar > 50)              insights.push({ icon: "⚠️", text: "High sugar intake today — increases caries risk" });
  if (riskDist.High > 1)            insights.push({ icon: "⚠️", text: "Multiple high-risk foods consumed today" });
  if (cals && totalCals > cals.target) insights.push({ icon: "⚠️", text: "You exceeded your calorie target" });
  if (totalProtein > 50)            insights.push({ icon: "✅", text: "Good protein intake today" });
  if (foodLog.length >= 5)          insights.push({ icon: "⚠️", text: "Frequent eating/snacking may increase caries risk" });

  const handleQuickSearch = async () => {
    if (!searchName.trim()) return;
    try {
      setSearching(true);
      const res = await fetch("http://127.0.0.1:8000/food-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_name: searchName }),
      });
      const data = await res.json();
      setSearchResult(data);
    } catch { setSearchResult({ error: "Could not reach backend." }); }
    finally { setSearching(false); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Nutrition Tracker</h1>
        <p className="page-sub">Track daily food intake, calorie targets, and cariogenic risk across your diet.</p>
      </div>

      {/* SUMMARY STATS */}
      <div className="nt-summary-row">
        <div className="nt-stat">
          <span className="nt-stat-value">{Math.round(totalCals)}</span>
          <span className="nt-stat-label">kcal consumed</span>
          {cals && <span className="nt-stat-sub">target: {cals.target} kcal</span>}
        </div>
        <div className="nt-stat">
          <span className="nt-stat-value">{foodLog.length}</span>
          <span className="nt-stat-label">foods logged</span>
        </div>
        <div className="nt-stat">
          <span className="nt-stat-value">{Math.round(totalSugar)} g</span>
          <span className="nt-stat-label">total sugar</span>
          <span className={`nt-stat-sub ${totalSugar > 50 ? "over" : ""}`}>limit: 50 g</span>
        </div>
        <div className={`nt-stat ${riskDist.High > 0 ? "nt-stat-danger" : ""}`}>
          <span className="nt-stat-value">{riskDist.High}</span>
          <span className="nt-stat-label">high-risk foods</span>
        </div>
      </div>

      {/* CALORIE PROGRESS */}
      {cals && (
        <div className="result-card mb-16">
          <div className="result-card-head">
            <span className="result-card-label">Calorie Progress</span>
            <span className="micro-label">{Math.round(totalCals)} / {cals.target} kcal target</span>
          </div>
          <div className="calorie-progress-track">
            <div className={`calorie-progress-fill ${caloricProgress > 100 ? "over-cal" : ""}`}
              style={{ width: `${Math.min(caloricProgress, 100)}%` }} />
          </div>
          <div className="calorie-progress-labels">
            <span>0</span>
            <span>{cals.maintenance} kcal maintenance</span>
            <span className={caloricProgress > 100 ? "over-limit" : ""}>{cals.target} kcal target</span>
          </div>
        </div>
      )}

      <div className="nt-main-grid">
        {/* FOOD LOG */}
        <div className="result-card nt-log-card">
          <div className="result-card-head">
            <span className="result-card-label">Today's Food Log</span>
            {foodLog.length > 0 && <button className="btn-ghost-sm" onClick={clearLog}>Clear All</button>}
          </div>
          {foodLog.length === 0 ? (
            <div className="nt-empty">
              <span>🍽️</span>
              <p>No foods logged yet. Analyze a food or run an assessment to start tracking.</p>
            </div>
          ) : (
            <div className="food-log-list">
              {foodLog.map((item, i) => (
                <div key={i} className="food-log-item">
                  <div className="fli-top">
                    <div className="fli-info">
                      <span className="fli-name">{item.usda_match || item.food_name_entered}</span>
                      <span className="fli-kcal">{item.nutrition?.energy_kcal ?? "—"} kcal</span>
                      <RiskBar score={item.risk?.food_risk_score} level={item.risk?.food_risk_level} />
                    </div>
                    <div className="fli-actions">
                      <RiskBadge risk={item.risk?.food_risk_level} />
                      <button className="fli-expand" onClick={() => setExpanded(expanded === i ? null : i)}>
                        {expanded === i ? "▲" : "▼"}
                      </button>
                      <button className="fli-remove" onClick={() => removeFromLog(i)}>✕</button>
                    </div>
                  </div>
                  {expanded === i && (
                    <div className="fli-details">
                      <NutritionGrid nutrition={item.nutrition} />
                      {item.risk?.consumption_advice && <p className="fli-advice">{item.risk.consumption_advice}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHARTS */}
        <div className="nt-charts">
          {pieData.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Risk Distribution</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((e) => (
                      <Cell key={e.name} fill={e.name === "High" ? "#ef4444" : e.name === "Medium" ? "#f59e0b" : "#22c55e"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {macroPieData.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Macro Distribution</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={macroPieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={3}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#22c55e" />
                  </Pie>
                  <Tooltip formatter={(v) => `${v} g`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {foodLog.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Macros vs Limits</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={macroData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" name="Consumed" radius={[4, 4, 0, 0]}>
                    {macroData.map((e, i) => <Cell key={i} fill={e.value > e.limit ? "#ef4444" : "#22c55e"} />)}
                  </Bar>
                  <Bar dataKey="limit" name="Limit" fill="var(--track)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* INSIGHTS */}
      {insights.length > 0 && (
        <div className="result-card mt-16">
          <div className="result-card-head"><span className="result-card-label">Daily Insights</span></div>
          <div className="insight-list">
            {insights.map((ins, i) => (
              <div key={i} className="insight-item">
                <span>{ins.icon}</span><span>{ins.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUICK FOOD SEARCH */}
      <div className="result-card mt-16">
        <div className="result-card-head"><span className="result-card-label">Quick Food Lookup</span></div>
        <div className="quick-search-row">
          <input className="quick-search-input" type="text"
            placeholder="Search any food… e.g. banana, pizza, oatmeal"
            value={searchName} onChange={e => setSearchName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleQuickSearch()} />
          <button className="btn-primary" onClick={handleQuickSearch} disabled={searching}>
            {searching ? <><Spinner /> Searching…</> : "Look Up"}
          </button>
        </div>
        {searchResult && !searchResult.error && (
          <div className="search-result-block">
            <div className="search-result-head">
              <span className="fli-name">{searchResult.usda_match}</span>
              <RiskBadge risk={searchResult.risk?.food_risk_level} />
            </div>
            <RiskBar score={searchResult.risk?.food_risk_score} level={searchResult.risk?.food_risk_level} />
            <NutritionGrid nutrition={searchResult.nutrition} />
            {searchResult.risk?.reasons?.length > 0 && (
              <ul className="reason-list mt-8">{searchResult.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
            {searchResult.risk?.consumption_advice && <p className="fli-advice">{searchResult.risk.consumption_advice}</p>}
            {searchResult.risk?.warning && <Alert type="warning">{searchResult.risk.warning}</Alert>}
          </div>
        )}
        {searchResult?.error && <Alert type="error">{searchResult.error}</Alert>}
      </div>
    </div>
  );
}
