import React, { useState } from "react";
import { useCoach, ALL_BADGES, TARGETS, getLevel } from "../context/CoachContext";
import { ProfilePanel } from "../components/coach/ProfilePanel";
import { DashboardTab } from "../components/coach/DashboardTab";
import { MealsTab } from "../components/coach/MealsTab";
import { WaterTab } from "../components/coach/WaterTab";
import { WeightTab } from "../components/coach/WeightTab";
import { BadgesTab } from "../components/coach/BadgesTab";
import { TrendsTab } from "../components/coach/TrendsTab";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "meals",     label: "Meals" },
  { id: "water",     label: "Hydration" },
  { id: "weight",    label: "Weight" },
  { id: "badges",    label: "Badges" },
  { id: "trends",    label: "Trends" },
];

export default function Coach() {
  const {
    profile, setProfile,
    todayTotal, todayMeals, todayWater, waterGoal,
    addGlass, removeGlass, setWaterGoal,
    addFoodToMeal, removeFoodFromMeal,
    weightLog, logWeight,
    earnedBadges, streaks,
    calorieTargets, dailyCarioLoad, wellnessScore,
    nutritionCompletion, coachInsights, smartSwaps, weeklyData,
  } = useCoach();

  const [activeTab, setActiveTab]   = useState("dashboard");
  const [weightInput, setWeightInput] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [nutritionOpen, setNutritionOpen] = useState(false);

  const ct      = calorieTargets();
  const cario   = dailyCarioLoad();
  const wScore  = wellnessScore();
  const nutPct  = nutritionCompletion();
  const insights = coachInsights();
  const swaps    = smartSwaps();
  const weekly   = weeklyData();
  const water    = todayWater();
  const meals    = todayMeals();
  const level    = getLevel(earnedBadges.length);

  const kcal    = todayTotal("energy_kcal");
  const protein = todayTotal("protein_g");
  const carbs   = todayTotal("carbs_g");
  const fat     = todayTotal("fat_g");
  const sugar   = todayTotal("sugar_g");
  const calcium = todayTotal("calcium_mg");
  const fiber   = todayTotal("fiber_g");

  const scoreColor = wScore >= 75 ? "var(--low)" : wScore >= 50 ? "var(--medium)" : "var(--high)";
  const carioColor = cario.label === "Low" ? "var(--low)" : cario.label === "Moderate" ? "var(--medium)" : "var(--high)";
  const macroTargets = {
    protein_g: Number(profile.protein_target_g) || TARGETS.protein_g,
    carbs_g: Number(profile.carbs_target_g) || TARGETS.carbs_g,
    fat_g: Number(profile.fat_target_g) || TARGETS.fat_g,
    sugar_g: Number(profile.sugar_limit_g) || TARGETS.sugar_g,
    fiber_g: Number(profile.fiber_target_g) || TARGETS.fiber_g,
  };
  const nutrientRings = [
    { label: "Calories", value: kcal, max: ct.target, unit: "kcal", color: "var(--medium)", size: 112 },
    { label: "Protein", value: protein, max: macroTargets.protein_g, unit: "g", color: "var(--mineral)" },
    { label: "Carbs", value: carbs, max: macroTargets.carbs_g, unit: "g", color: "var(--medium)" },
    { label: "Fat", value: fat, max: macroTargets.fat_g, unit: "g", color: "#a78bfa" },
    { label: "Sugar", value: sugar, max: macroTargets.sugar_g, unit: "g", color: sugar > macroTargets.sugar_g ? "var(--high)" : "var(--low)" },
    { label: "Calcium", value: calcium, max: TARGETS.calcium_mg, unit: "mg", color: "#22d3ee" },
    { label: "Fiber", value: fiber, max: macroTargets.fiber_g, unit: "g", color: "#86efac" },
  ];

  return (
    <div className="page">
      {/* PAGE HEADER */}
      <div className="coach-page-header">
        <div>
          <h1 className="page-title">NutriDent Coach</h1>
          <p className="page-sub">Your personal dental nutrition and wellness coach.</p>
        </div>
        <div className="coach-level-badge">
          <span className="level-emoji">{level.emoji}</span>
          <div>
            <span className="level-name">{level.name}</span>
            <span className="level-sub">{earnedBadges.length} badges earned</span>
          </div>
          <button className="btn-ghost-sm" onClick={() => setShowProfile(p => !p)}>
            {showProfile ? "Hide Profile" : "Edit Profile"}
          </button>
        </div>
      </div>

      {showProfile && <ProfilePanel profile={profile} setProfile={setProfile} />}

      {/* TAB BAR */}
      <div className="coach-tabs">
        {TABS.map(t => (
          <button key={t.id}
            className={`coach-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "dashboard" && (
        <DashboardTab
          wScore={wScore}
          scoreColor={scoreColor}
          cario={cario}
          carioColor={carioColor}
          water={water}
          waterGoal={waterGoal}
          nutritionOpen={nutritionOpen}
          setNutritionOpen={setNutritionOpen}
          kcal={kcal}
          ct={ct}
          nutPct={nutPct}
          nutrientRings={nutrientRings}
          streaks={streaks}
          insights={insights}
          swaps={swaps}
        />
      )}

      {activeTab === "meals" && (
        <MealsTab
          kcal={kcal}
          carioColor={carioColor}
          cario={cario}
          meals={meals}
          addFoodToMeal={addFoodToMeal}
          removeFoodFromMeal={removeFoodFromMeal}
        />
      )}

      {activeTab === "water" && (
        <WaterTab
          water={water}
          waterGoal={waterGoal}
          setWaterGoal={setWaterGoal}
          addGlass={addGlass}
          removeGlass={removeGlass}
          streaks={streaks}
        />
      )}

      {activeTab === "weight" && (
        <WeightTab
          weightInput={weightInput}
          setWeightInput={setWeightInput}
          logWeight={logWeight}
          profile={profile}
          weightLog={weightLog}
          ct={ct}
          macroTargets={macroTargets}
        />
      )}

      {activeTab === "badges" && (
        <BadgesTab level={level} earnedBadges={earnedBadges} allBadges={ALL_BADGES} />
      )}

      {activeTab === "trends" && (
        <TrendsTab weekly={weekly} weightLog={weightLog} sugarTargetG={TARGETS.sugar_g} />
      )}

    </div>
  );
}
