import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { apiFetch } from "../api";
import {
  dateKeyFor,
  daySummaryFor,
  exportRowsToCsv,
  getMonthDays,
  getWeekDays,
} from "../utils/journal";
import { DailyJournalCard } from "../components/nutrition/DailyJournalCard";
import { SummaryStats } from "../components/nutrition/SummaryStats";
import { CalorieProgressCard } from "../components/nutrition/CalorieProgressCard";
import { FoodLogCard } from "../components/nutrition/FoodLogCard";
import { NutritionCharts } from "../components/nutrition/NutritionCharts";
import { InsightsCard } from "../components/nutrition/InsightsCard";
import { QuickSearchCard } from "../components/nutrition/QuickSearchCard";

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

  const dayLog = foodLog
    .map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter(item => dateKeyFor(item, todayKey) === selectedDate)
    .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
  const dayOptions = (() => {
    const keys = new Set([todayKey, selectedDate]);
    foodLog.forEach(item => keys.add(dateKeyFor(item, todayKey)));
    weightLog.forEach(item => keys.add(item.date));
    return [...keys].filter(Boolean).sort((a, b) => b.localeCompare(a)).slice(0, 14);
  })();
  const selectedWeight = getWeightForDate(selectedDate);
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

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

  const daySummaryContext = { foodLog, getWeightForDate, todayKey };
  const weekSummary = getWeekDays(selectedDate).map(date => ({
    date,
    ...daySummaryFor(date, daySummaryContext),
  }));
  const monthDays = getMonthDays(selectedDate).map(day => ({
    ...day,
    summary: daySummaryFor(day.key, daySummaryContext),
  }));

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

      <DailyJournalCard
        selectedDateLabel={selectedDateLabel}
        cloudSyncStatus={cloudSyncStatus}
        cloudSyncError={cloudSyncError}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        todayKey={todayKey}
        viewMode={viewMode}
        setViewMode={setViewMode}
        dayOptions={dayOptions}
        dateFoodCount={(date) => foodLog.filter(item => dateKeyFor(item, todayKey) === date).length}
        getWeightForDate={getWeightForDate}
        timelineEvents={timelineEvents}
        weekSummary={weekSummary}
        monthDays={monthDays}
        selectedWeight={selectedWeight}
        totalCals={totalCals}
        dayLogLength={dayLog.length}
        weightInput={weightInput}
        setWeightInput={setWeightInput}
        onSaveWeight={handleWeightSave}
        onExportDay={() => exportRowsToCsv(dayLog, `nutrident-${selectedDate}.csv`, { getWeightForDate, todayKey })}
        onExportAll={() => exportRowsToCsv(foodLog, "nutrident-all-food-logs.csv", { getWeightForDate, todayKey })}
        canExportDay={dayLog.length > 0}
        canExportAll={foodLog.length > 0}
      />

      <SummaryStats
        totalCals={totalCals}
        cals={cals}
        dayLogLength={dayLog.length}
        totalSugar={totalSugar}
        highRiskCount={riskDist.High}
      />

      {cals && (
        <CalorieProgressCard cals={cals} totalCals={totalCals} caloricProgress={caloricProgress} />
      )}

      <div className="nt-main-grid">
        <FoodLogCard
          dayLog={dayLog}
          selectedDateLabel={selectedDateLabel}
          onClearDay={() => clearFoodLogForDate(selectedDate)}
          onClearAll={clearLog}
          foodLogLength={foodLog.length}
          expanded={expanded}
          setExpanded={setExpanded}
          onRemove={removeFromLog}
          portionDrafts={portionDrafts}
          onPortionDraft={handlePortionDraft}
          onUpdatePortion={handleUpdatePortion}
          updatingIndex={updatingIndex}
          portionErrors={portionErrors}
        />

        <NutritionCharts
          pieData={pieData}
          macroPieData={macroPieData}
          macroData={macroData}
          hasDayLog={dayLog.length > 0}
        />
      </div>

      {insights.length > 0 && <InsightsCard insights={insights} />}

      <QuickSearchCard
        searchName={searchName}
        setSearchName={setSearchName}
        searching={searching}
        onSearch={handleQuickSearch}
        searchResult={searchResult}
        onAddToLog={() => addToFoodLog({ ...searchResult, food_name_entered: searchName || searchResult.usda_match })}
      />
    </div>
  );
}
