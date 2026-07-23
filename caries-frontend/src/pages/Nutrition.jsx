import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { RiskBadge, Alert, Spinner, NutritionGrid, MacroAnalysis, RiskBar } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { apiFetch } from "../api";

export default function Nutrition() {
  const {
    foodLog, addToFoodLog, removeFromLog, clearLog, clearFoodLogForDate,
    calculateCalories, updateFoodLog,
    weightLog, logWeight, getWeightForDate,
    cloudSyncStatus, cloudSyncError,
  } = useApp();
  const [searchName, setSearchName]     = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching]       = useState(false);
  const [expanded, setExpanded]         = useState(null);
  const [portionDrafts, setPortionDrafts] = useState({});
  const [portionErrors, setPortionErrors] = useState({});
  const [updatingIndex, setUpdatingIndex] = useState(null);
  const todayKey = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [weightInput, setWeightInput] = useState("");
  const [viewMode, setViewMode] = useState("day");

  const dateKeyFor = (item) => item.loggedDate || item.timestamp?.slice(0, 10) || todayKey;
  const timeFor = (item) => item.timestamp
    ? new Date(item.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "Time not saved";
  const dayLog = foodLog
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter(item => dateKeyFor(item) === selectedDate)
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  const dayOptions = (() => {
    const keys = new Set([todayKey, selectedDate]);
    foodLog.forEach(item => keys.add(dateKeyFor(item)));
    weightLog.forEach(item => keys.add(item.date));
    return [...keys].filter(Boolean).sort((a, b) => b.localeCompare(a)).slice(0, 14);
  })();
  const selectedWeight = getWeightForDate(selectedDate);
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const weekDays = (() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date.toISOString().slice(0, 10);
    });
  })();

  const totalCals    = dayLog.reduce((s, i) => s + (i.nutrition?.energy_kcal || 0), 0);
  const totalSugar   = dayLog.reduce((s, i) => s + (i.nutrition?.sugar_g || 0), 0);
  const totalCarbs   = dayLog.reduce((s, i) => s + (i.nutrition?.carbs_g || 0), 0);
  const totalFat     = dayLog.reduce((s, i) => s + (i.nutrition?.fat_g || 0), 0);
  const totalProtein = dayLog.reduce((s, i) => s + (i.nutrition?.protein_g || 0), 0);
  const cals = calculateCalories();
  const caloricProgress = cals ? Math.min(Math.round((totalCals / cals.target) * 100), 150) : null;

  const riskDist = {
    Low:    dayLog.filter(i => i.risk?.food_risk_level === "Low").length,
    Medium: dayLog.filter(i => i.risk?.food_risk_level === "Medium").length,
    High:   dayLog.filter(i => i.risk?.food_risk_level === "High").length,
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
  if (dayLog.length >= 5)           insights.push({ icon: "⚠️", text: "Frequent eating/snacking may increase caries risk" });

  const handleWeightSave = () => {
    const value = Number(weightInput || selectedWeight);
    if (!Number.isFinite(value) || value <= 0) return;
    logWeight(selectedDate, value);
    setWeightInput("");
  };

  const daySummaryFor = (date) => {
    const foods = foodLog.filter(item => dateKeyFor(item) === date);
    return {
      calories: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.energy_kcal || 0), 0)),
      sugar: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.sugar_g || 0), 0)),
      carbs: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.carbs_g || 0), 0)),
      protein: Math.round(foods.reduce((sum, item) => sum + (item.nutrition?.protein_g || 0), 0)),
      count: foods.length,
      weight: getWeightForDate(date),
      highRisk: foods.filter(item => item.risk?.food_risk_level === "High").length,
    };
  };

  const timelineEvents = (() => {
    const foodEvents = dayLog.map(item => ({
      type: "food",
      time: item.timestamp ? new Date(item.timestamp) : new Date(`${selectedDate}T12:00:00`),
      label: item.usda_match || item.food_name_entered || "Logged food",
      detail: `${item.mealCategory || "Meal"} / ${Math.round(item.nutrition?.energy_kcal || 0)} kcal`,
    }));
    const weightEvents = weightLog
      .filter(item => item.date === selectedDate)
      .map(item => ({
        type: "weight",
        time: item.timestamp ? new Date(item.timestamp) : new Date(`${selectedDate}T08:00:00`),
        label: "Weight logged",
        detail: `${item.weight} kg`,
      }));
    return [...foodEvents, ...weightEvents].sort((a, b) => a.time - b.time);
  })();

  const weekSummary = weekDays.map(date => ({ date, ...daySummaryFor(date) }));

  const monthDays = (() => {
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
        summary: daySummaryFor(key),
      };
    });
  })();

  const exportRows = (rows, filename) => {
    const headers = ["date", "time", "meal", "food", "calories", "sugar_g", "carbs_g", "risk_level", "weight_kg"];
    const csv = [
      headers.join(","),
      ...rows.map(item => {
        const date = dateKeyFor(item);
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
  };

  const handleQuickSearch = async () => {
    if (!searchName.trim()) return;
    try {
      setSearching(true);
      const data = await apiFetch("/food-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ food_name: searchName }),
      });
      setSearchResult(data);
    } catch (error) { setSearchResult({ error: error.message || "Could not reach backend." }); }
    finally { setSearching(false); }
  };

  const handlePortionDraft = (index, value) => {
    setPortionDrafts(prev => ({ ...prev, [index]: value }));
  };

  const handleUpdatePortion = async (index, item) => {
    const portion = Number(portionDrafts[index] || item.portion_estimate?.g || item.nutrition?.portion_g || 100);
    if (!Number.isFinite(portion) || portion < 1 || portion > 2000) {
      setPortionErrors(prev => ({ ...prev, [index]: "Portion must be between 1 g and 2000 g." }));
      return;
    }

    try {
      setUpdatingIndex(index);
      setPortionErrors(prev => ({ ...prev, [index]: null }));
      const path = item.barcode ? "/barcode-food-risk" : "/food-risk";
      const body = item.barcode
        ? { barcode: item.barcode, portion_g: portion }
        : { food_name: item.food_name_entered || item.usda_match, portion_g: portion };
      const updated = await apiFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      updateFoodLog(index, {
        ...updated,
        food_name_entered: item.food_name_entered || updated.product_name || updated.usda_match,
        timestamp: item.timestamp,
      });
    } catch (error) {
      setPortionErrors(prev => ({ ...prev, [index]: error.message || "Could not update portion." }));
    } finally {
      setUpdatingIndex(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Nutrition Tracker</h1>
        <p className="page-sub">Track daily food intake, calorie targets, and cariogenic risk across your diet.</p>
      </div>

      <div className="daily-journal-card">
        <div className="daily-journal-head">
          <div>
            <span className="result-card-label">Daily Journal</span>
            <h2 className="daily-journal-title">{selectedDateLabel}</h2>
            <span className={`sync-pill sync-${cloudSyncStatus}`}>
              {cloudSyncStatus === "synced" ? "Cloud synced" : cloudSyncStatus === "syncing" ? "Syncing" : cloudSyncStatus === "error" ? "Sync issue" : "Local only"}
            </span>
          </div>
          <input
            className="journal-date-input"
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value || todayKey)}
          />
        </div>
        {cloudSyncError && <Alert type="warning">{cloudSyncError}</Alert>}

        <div className="journal-view-tabs">
          {[
            { key: "day", label: "Day" },
            { key: "week", label: "Week" },
            { key: "month", label: "Month" },
          ].map(option => (
            <button
              key={option.key}
              className={`journal-view-tab ${viewMode === option.key ? "active" : ""}`}
              onClick={() => setViewMode(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {viewMode !== "month" && <div className="journal-date-strip">
          {dayOptions.map(date => {
            const foodCount = foodLog.filter(item => dateKeyFor(item) === date).length;
            const weight = getWeightForDate(date);
            return (
              <button
                key={date}
                className={`journal-date-chip ${selectedDate === date ? "active" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span>{new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                <small>{foodCount} foods{weight ? ` - ${weight}kg` : ""}</small>
              </button>
            );
          })}
        </div>}

        {viewMode === "day" && (
          <div className="day-timeline-card">
            <div className="result-card-head">
              <span className="result-card-label">24 Hour Timeline</span>
              <span className="micro-label">{timelineEvents.length} logged events</span>
            </div>
            <div className="day-timeline">
              {Array.from({ length: 24 }, (_, hour) => {
                const events = timelineEvents.filter(event => event.time.getHours() === hour);
                return (
                  <div className="timeline-hour" key={hour}>
                    <span className="timeline-hour-label">{String(hour).padStart(2, "0")}:00</span>
                    <div className="timeline-hour-events">
                      {events.length === 0 ? (
                        <span className="timeline-empty-line" />
                      ) : events.map((event, index) => (
                        <div className={`timeline-event ${event.type}`} key={`${event.type}-${hour}-${index}`}>
                          <strong>{event.label}</strong>
                          <span>{event.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} / {event.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="week-summary-grid">
            {weekSummary.map(day => (
              <button
                key={day.date}
                className={`week-summary-card ${selectedDate === day.date ? "active" : ""}`}
                onClick={() => setSelectedDate(day.date)}
              >
                <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</strong>
                <span>{day.calories} kcal / {day.count} foods</span>
                <span>{day.weight ? `${day.weight} kg` : "No weight"}</span>
                <small>C {day.carbs} g / S {day.sugar} g / P {day.protein} g</small>
              </button>
            ))}
          </div>
        )}

        {viewMode === "month" && <div className="journal-calendar">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <span key={day} className="calendar-weekday">{day}</span>
          ))}
          {monthDays.map(({ key, day, currentMonth, summary }) => (
            <button
              key={key}
              className={`calendar-day ${currentMonth ? "" : "muted"} ${selectedDate === key ? "active" : ""} ${summary.highRisk ? "risk-day" : ""}`}
              onClick={() => setSelectedDate(key)}
            >
              <span className="calendar-day-num">{day}</span>
              {summary.count > 0 && <span className="calendar-day-meta">{summary.count} foods</span>}
              {summary.calories > 0 && <span className="calendar-day-meta">{summary.calories} kcal</span>}
              {summary.weight && <span className="calendar-day-meta">{summary.weight}kg</span>}
              {(summary.carbs > 0 || summary.sugar > 0) && (
                <span className="calendar-day-meta">C {summary.carbs} g / S {summary.sugar} g</span>
              )}
            </button>
          ))}
        </div>}

        <div className="journal-metrics-grid">
          <div className="journal-metric">
            <span className="journal-metric-label">Weight</span>
            <strong>{selectedWeight ? `${selectedWeight} kg` : "Not logged"}</strong>
          </div>
          <div className="journal-metric">
            <span className="journal-metric-label">Calories</span>
            <strong>{Math.round(totalCals)} kcal</strong>
          </div>
          <div className="journal-metric">
            <span className="journal-metric-label">Eating Times</span>
            <strong>{dayLog.length}</strong>
          </div>
        </div>

        <div className="journal-weight-row">
          <input
            type="number"
            className="weight-input"
            min="1"
            step="0.1"
            placeholder="Enter weight in kg"
            value={weightInput}
            onChange={e => setWeightInput(e.target.value)}
          />
          <button className="btn-primary" onClick={handleWeightSave}>
            {selectedWeight ? "Update Weight" : "Log Weight"}
          </button>
          <button className="btn-ghost" onClick={() => exportRows(dayLog, `nutrident-${selectedDate}.csv`)} disabled={dayLog.length === 0}>
            Export Day CSV
          </button>
          <button className="btn-ghost" onClick={() => exportRows(foodLog, "nutrident-all-food-logs.csv")} disabled={foodLog.length === 0}>
            Export All CSV
          </button>
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div className="nt-summary-row">
        <div className="nt-stat">
          <span className="nt-stat-value">{Math.round(totalCals)}</span>
          <span className="nt-stat-label">kcal consumed</span>
          {cals && <span className="nt-stat-sub">target: {cals.target} kcal</span>}
        </div>
        <div className="nt-stat">
          <span className="nt-stat-value">{dayLog.length}</span>
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
            <span className="result-card-label">Food Log for {selectedDateLabel}</span>
            <div className="journal-log-actions">
              {dayLog.length > 0 && <button className="btn-ghost-sm" onClick={() => clearFoodLogForDate(selectedDate)}>Clear Day</button>}
              {foodLog.length > 0 && <button className="btn-ghost-sm" onClick={clearLog}>Clear All</button>}
            </div>
          </div>
          {dayLog.length === 0 ? (
            <div className="nt-empty">
              <span>🍽️</span>
              <p>No foods logged for this day. Analyze a food to add it to your daily timeline.</p>
            </div>
          ) : (
            <div className="food-log-list">
              {dayLog.map((item) => (
                <div key={item.id || `${item.originalIndex}-${item.timestamp || item.usda_match}`} className="food-log-item">
                  <div className="fli-top">
                    <div className="fli-time-col">
                      <span className="fli-time">{timeFor(item)}</span>
                    </div>
                    <div className="fli-info">
                      <span className="fli-name">{item.usda_match || item.food_name_entered}</span>
                      <span className="fli-kcal">{item.mealCategory || "Meal"} - {item.nutrition?.energy_kcal ?? "—"} kcal</span>
                      <RiskBar score={item.risk?.food_risk_score} level={item.risk?.food_risk_level} />
                    </div>
                    <div className="fli-actions">
                      <RiskBadge risk={item.risk?.food_risk_level} />
                      <button className="fli-expand" onClick={() => setExpanded(expanded === item.originalIndex ? null : item.originalIndex)}>
                        {expanded === item.originalIndex ? "▲" : "▼"}
                      </button>
                      <button className="fli-remove" onClick={() => removeFromLog(item.originalIndex)}>✕</button>
                    </div>
                  </div>
                  {expanded === item.originalIndex && (
                    <div className="fli-details">
                      <NutritionGrid nutrition={item.nutrition} />
                      <MacroAnalysis nutrition={item.nutrition} />
                      <div className="portion-custom-row mt-8">
                        <input
                          type="number"
                          className="portion-input"
                          min="1"
                          max="2000"
                          value={portionDrafts[item.originalIndex] ?? item.portion_estimate?.g ?? item.nutrition?.portion_g ?? ""}
                          onChange={e => handlePortionDraft(item.originalIndex, e.target.value)}
                        />
                        <button className="btn-primary" onClick={() => handleUpdatePortion(item.originalIndex, item)} disabled={updatingIndex === item.originalIndex}>
                          {updatingIndex === item.originalIndex ? <><Spinner /> Updating</> : "Update Portion"}
                        </button>
                      </div>
                      {portionErrors[item.originalIndex] && <Alert type="error">{portionErrors[item.originalIndex]}</Alert>}
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
                      <Cell key={e.name} fill={e.name === "High" ? "var(--high)" : e.name === "Medium" ? "var(--medium)" : "var(--low)"} />
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
                    <Cell fill="var(--mineral)" />
                    <Cell fill="var(--medium)" />
                    <Cell fill="var(--low)" />
                  </Pie>
                  <Tooltip formatter={(v) => `${v} g`} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {dayLog.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Macros vs Limits</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={macroData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" name="Consumed" radius={[4, 4, 0, 0]}>
                    {macroData.map((e, i) => <Cell key={i} fill={e.value > e.limit ? "var(--high)" : "var(--low)"} />)}
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
            <MacroAnalysis nutrition={searchResult.nutrition} />
            {searchResult.risk?.reasons?.length > 0 && (
              <ul className="reason-list mt-8">{searchResult.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
            )}
            {searchResult.risk?.consumption_advice && <p className="fli-advice">{searchResult.risk.consumption_advice}</p>}
            {searchResult.risk?.warning && <Alert type="warning">{searchResult.risk.warning}</Alert>}
            <button
              className="btn-primary mt-12"
              onClick={() => addToFoodLog({ ...searchResult, food_name_entered: searchName || searchResult.usda_match })}
            >
              + Add to Food Log
            </button>
          </div>
        )}
        {searchResult?.error && <Alert type="error">{searchResult.error}</Alert>}
      </div>
    </div>
  );
}
