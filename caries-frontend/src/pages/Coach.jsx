import React, { useState } from "react";
import { useCoach, ALL_BADGES, TARGETS, getLevel } from "../context/CoachContext";
import { Alert, Spinner } from "../components/UI";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { apiFetch } from "../api";

// ── RING PROGRESS ──────────────────────────────────────────────────────────────
function Ring({ value, max, color, size = 80, label, sub }) {
  const pct    = Math.min(value / max, 1);
  const r      = (size - 10) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = pct * circ;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--track)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-label">{label}</span>
        {sub && <span className="ring-sub">{sub}</span>}
      </div>
    </div>
  );
}

// ── PROGRESS BAR ──────────────────────────────────────────────────────────────
// ── MEAL SECTION ──────────────────────────────────────────────────────────────
function MealSection({ mealName, items, onRemove, onAdd, icon }) {
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching]   = useState(false);
  const [open, setOpen]             = useState(false);
  const [error, setError]           = useState(null);

  const mealKcal = items.reduce((s, f) => s + (f.nutrition?.energy_kcal || 0), 0);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    try {
      setSearching(true);
      setError(null);
      const data = await apiFetch("/food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ food_name: searchText }),
      });
      onAdd(mealName, { ...data, food_name_entered: searchText });
      setSearchText("");
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not add this food.");
    }
    finally { setSearching(false); }
  };

  return (
    <div className="meal-section">
      <div className="meal-section-head" onClick={() => setOpen(o => !o)}>
        <div className="meal-section-title">
          <span className="meal-icon">{icon}</span>
          <span className="meal-name">{mealName}</span>
          {items.length > 0 && <span className="meal-count">{items.length} items · {Math.round(mealKcal)} kcal</span>}
        </div>
        <span className="meal-toggle">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="meal-body">
          {/* Food items */}
          {items.length > 0 ? (
            <div className="meal-items">
              {items.map(item => (
                <div key={item.id} className="meal-item">
                  <div className="meal-item-info">
                    <span className="meal-item-name">{item.usda_match || item.food_name_entered}</span>
                    <span className="meal-item-kcal">{item.nutrition?.energy_kcal ?? "—"} kcal</span>
                    <span className="meal-item-macros">
                      P:{item.nutrition?.protein_g ?? 0}g · C:{item.nutrition?.carbs_g ?? 0}g · F:{item.nutrition?.fat_g ?? 0}g
                    </span>
                  </div>
                  <div className="meal-item-right">
                    {item.risk?.food_risk_level && (
                      <span className={`meal-risk-dot risk-${item.risk.food_risk_level.toLowerCase()}`}>
                        {item.risk.food_risk_level}
                      </span>
                    )}
                    <button className="meal-remove" onClick={() => onRemove(mealName, item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="meal-empty">No foods logged yet for {mealName.toLowerCase()}.</p>
          )}

          {/* Add food */}
          <div className="meal-add-row">
            <input
              className="meal-search-input"
              type="text"
              placeholder={`Add food to ${mealName.toLowerCase()}…`}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button className="btn-primary btn-sm" onClick={handleSearch} disabled={searching}>
              {searching ? <Spinner /> : "+ Add"}
            </button>
          </div>
          {error && <Alert type="error">{error}</Alert>}
        </div>
      )}
    </div>
  );
}

// ── MAIN COACH PAGE ────────────────────────────────────────────────────────────
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

  const MEAL_ICONS = { Breakfast: "🌅", Lunch: "☀️", Dinner: "🌙", Snacks: "🍎" };

  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "meals",     label: "Meals" },
    { id: "water",     label: "Hydration" },
    { id: "weight",    label: "Weight" },
    { id: "badges",    label: "Badges" },
    { id: "trends",    label: "Trends" },
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

      {/* PROFILE PANEL */}
      {showProfile && (
        <div className="profile-panel">
          <h3 className="profile-title">Your Profile</h3>
          <div className="profile-grid">
            {[
              { label: "Age",           name: "age",         placeholder: "e.g. 28",  type: "number" },
              { label: "Height (cm)",   name: "height",      placeholder: "e.g. 170", type: "number" },
              { label: "Weight (kg)",   name: "weight",      placeholder: "e.g. 70",  type: "number" },
              { label: "Goal (kg)",     name: "goal_weight", placeholder: "e.g. 65",  type: "number" },
              { label: "Goal Date",     name: "goal_date",   placeholder: "",         type: "date" },
            ].map(({ label, name, placeholder, type }) => (
              <div className="field" key={name}>
                <label className="field-label">{label}</label>
                <input type={type} placeholder={placeholder}
                  value={profile[name] || ""}
                  onChange={e => setProfile(p => ({ ...p, [name]: e.target.value }))} />
              </div>
            ))}
            <div className="field">
              <label className="field-label">Gender</label>
              <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}>
                <option value="1">Male</option>
                <option value="2">Female</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Physical Activity</label>
              <select value={profile.activity_level || "sedentary"} onChange={e => setProfile(p => ({ ...p, activity_level: e.target.value }))}>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light activity</option>
                <option value="moderate">Moderate activity</option>
                <option value="active">Active</option>
                <option value="athlete">Very active</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label">Goal</label>
              <select value={profile.goal_type} onChange={e => setProfile(p => ({ ...p, goal_type: e.target.value }))}>
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB BAR */}
      <div className="coach-tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={`coach-tab ${activeTab === t.id ? "active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ DASHBOARD TAB ═══════════════════ */}
      {activeTab === "dashboard" && (
        <div className="coach-dashboard">

          {/* Wellness Score + Cario Load row */}
          <div className="coach-hero-row">
            <div className="coach-score-card">
              <span className="coach-score-label">Wellness Score</span>
              <Ring value={wScore} max={100} color={scoreColor} size={100}
                label={`${wScore}`} sub="/100" />
              <span className="coach-score-sub">
                {wScore >= 75 ? "Excellent day!" : wScore >= 50 ? "Good progress" : "Room to improve"}
              </span>
            </div>

            <div className="coach-score-card">
              <span className="coach-score-label">Daily Cariogenic Load</span>
              <div className="cario-display">
                <span className="cario-score" style={{ color: carioColor }}>{cario.label}</span>
                {cario.score > 0 && <span className="cario-subscore">{cario.score}/10 avg risk</span>}
              </div>
              <span className="coach-score-sub">Oral health impact</span>
            </div>

            <div className="coach-score-card">
              <span className="coach-score-label">Hydration</span>
              <Ring value={water} max={waterGoal} color="var(--low)" size={100}
                label={`${water}/${waterGoal}`} sub="glasses" />
              <span className="coach-score-sub">Daily water goal</span>
            </div>
          </div>

          {/* Collapsible nutrient rings */}
          <div className={`coach-macro-section ${nutritionOpen ? "open" : "collapsed"}`}>
            <button className="coach-macro-header collapsible-head" onClick={() => setNutritionOpen(open => !open)}>
              <div>
                <h3 className="coach-section-title">Today's Nutrition</h3>
                <span className="coach-section-sub">Detailed calorie and nutrient progress</span>
              </div>
              <div className="coach-macro-head-right">
                <span className="coach-cal-summary">
                  {Math.round(kcal)} / {ct.target} kcal
                </span>
                <span className="collapse-indicator">{nutritionOpen ? "Hide" : "Show"}</span>
              </div>
            </button>

            {!nutritionOpen && (
              <div className="coach-macro-collapsed-row">
                <Ring value={nutPct} max={100} color="var(--low)" size={84}
                  label={`${nutPct}%`} sub="targets" />
                <div>
                  <strong>Daily nutrient targets stay visible.</strong>
                  <p>Open this section to inspect calories, macros, sugar, calcium, and fiber as individual circle graphs.</p>
                </div>
              </div>
            )}

            {nutritionOpen && (
              <div className="nutrient-ring-grid">
                {nutrientRings.map(item => (
                  <div className="nutrient-ring-card" key={item.label}>
                    <Ring
                      value={item.value}
                      max={item.max}
                      color={item.color}
                      size={item.size || 96}
                      label={`${Math.round(item.value)}`}
                      sub={item.unit}
                    />
                    <span className="nutrient-ring-label">{item.label}</span>
                    <span className="nutrient-ring-target">Target {item.max}{item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Streaks */}
          <div className="coach-streaks-row">
            {[
              { label: "Logging Streak",   value: streaks.logging,   unit: "days", icon: "📋" },
              { label: "Sugar Goal",       value: streaks.sugar,     unit: "days", icon: "⚔️" },
              { label: "Hydration Streak", value: streaks.hydration, unit: "days", icon: "💧" },
              { label: "Oral Health",      value: streaks.oral,      unit: "days", icon: "🦷" },
            ].map(({ label, value, unit, icon }) => (
              <div className="streak-card" key={label}>
                <span className="streak-icon">{icon}</span>
                <span className="streak-value">{value}</span>
                <span className="streak-unit">{unit}</span>
                <span className="streak-label">{label}</span>
              </div>
            ))}
          </div>

          {/* AI Coach Insights */}
          <div className="coach-insights-card">
            <h3 className="coach-section-title">🤖 AI Coach Insights</h3>
            <div className="insights-list">
              {insights.map((ins, i) => (
                <div key={i} className={`insight-item insight-${ins.type}`}>
                  <span className="insight-dot" />
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Food Swaps */}
          <div className="coach-swaps-card">
            <h3 className="coach-section-title">🔄 Smart Food Swaps</h3>
            <div className="swaps-list">
              {swaps.map((s, i) => (
                <div key={i} className="swap-item">
                  <span className="swap-from">❌ {s.from}</span>
                  <span className="swap-arrow">→</span>
                  <span className="swap-to">✅ {s.to}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ═══════════════════ MEALS TAB ═══════════════════ */}
      {activeTab === "meals" && (
        <div className="meals-tab">
          <div className="meals-summary-row">
            <div className="meals-stat"><span className="ms-val">{Math.round(kcal)}</span><span className="ms-lab">kcal today</span></div>
            <div className="meals-stat"><span className="ms-val" style={{ color: carioColor }}>{cario.label}</span><span className="ms-lab">cariogenic load</span></div>
            <div className="meals-stat"><span className="ms-val">{Object.values(meals).flat().length}</span><span className="ms-lab">items logged</span></div>
          </div>

          {Object.entries(MEAL_ICONS).map(([mealName, icon]) => (
            <MealSection
              key={mealName}
              mealName={mealName}
              icon={icon}
              items={meals[mealName] || []}
              onAdd={addFoodToMeal}
              onRemove={removeFoodFromMeal}
            />
          ))}
        </div>
      )}

      {/* ═══════════════════ WATER TAB ═══════════════════ */}
      {activeTab === "water" && (
        <div className="water-tab">
          <div className="water-hero">
            <Ring value={water} max={waterGoal} color="#38bdf8" size={140}
              label={`${water}`} sub={`/ ${waterGoal} glasses`} />
            <div className="water-hero-info">
              <h3 className="coach-section-title">Daily Hydration</h3>
              <p className="water-tip">💡 Each glass of water supports saliva production — your mouth's natural defence against caries.</p>
              <div className="water-controls">
                <button className="btn-water-remove" onClick={removeGlass} disabled={water === 0}>−</button>
                <span className="water-count">{water} glasses</span>
                <button className="btn-water-add" onClick={addGlass}>+</button>
              </div>
              <div className="water-goal-row">
                <label className="field-label">Daily Goal (glasses)</label>
                <input type="number" min="1" max="20"
                  className="water-goal-input"
                  value={waterGoal}
                  onChange={e => setWaterGoal(Number(e.target.value) || 8)} />
              </div>
              {water >= waterGoal && (
                <div className="water-goal-achieved">🎉 Daily hydration goal achieved!</div>
              )}
            </div>
          </div>

          {/* Glass visualiser */}
          <div className="water-glasses-grid">
            {Array.from({ length: waterGoal }).map((_, i) => (
              <div key={i} className={`water-glass ${i < water ? "filled" : ""}`}>
                <span className="glass-icon">{i < water ? "💧" : "🫙"}</span>
              </div>
            ))}
          </div>

          {/* Streak */}
          <div className="water-streak-card">
            <span className="streak-icon">🔥</span>
            <span className="streak-value">{streaks.hydration}</span>
            <span className="streak-label">day hydration streak</span>
          </div>
        </div>
      )}

      {/* ═══════════════════ WEIGHT TAB ═══════════════════ */}
      {activeTab === "weight" && (
        <div className="weight-tab">
          <div className="weight-log-card">
            <h3 className="coach-section-title">Log Today's Weight</h3>
            <div className="weight-entry-row">
              <input type="number" className="weight-input" placeholder="e.g. 72.5 kg"
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)} />
              <button className="btn-primary" onClick={() => { if (weightInput) { logWeight(weightInput); setWeightInput(""); } }}>
                Log Weight
              </button>
            </div>
            {profile.goal_weight && profile.weight && (
              <div className="weight-goal-display">
                <div className="wg-item"><span className="wg-label">Current</span><span className="wg-val">{profile.weight} kg</span></div>
                <div className="wg-arrow">→</div>
                <div className="wg-item"><span className="wg-label">Goal</span><span className="wg-val">{profile.goal_weight} kg</span></div>
                <div className="wg-item">
                  <span className="wg-label">Gap</span>
                  <span className="wg-val" style={{ color: "var(--medium)" }}>
                    {Math.abs(Number(profile.weight) - Number(profile.goal_weight)).toFixed(1)} kg
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Weight trend chart */}
          {weightLog.length > 1 && (
            <div className="result-card mt-16">
              <div className="result-card-head">
                <span className="result-card-label">Weight Trend</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightLog}>
                  <XAxis dataKey="date" stroke="var(--text3)"
                    tick={{ fill: "var(--text2)", fontSize: 11 }}
                    tickFormatter={d => d.slice(5)} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }}
                    domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="weight" stroke="var(--medium)"
                    strokeWidth={2} dot={{ fill: "var(--medium)", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Calorie plan */}
          {ct.target > 0 && (
            <div className="calorie-plan-card">
              <h3 className="coach-section-title">Your Calorie Plan</h3>
              <div className="calorie-plan-grid">
                <div className="cp-item"><span className="cp-label">Maintenance</span><strong className="cp-val">{ct.maintenance} kcal</strong></div>
                <div className="cp-item"><span className="cp-label">Your Target</span><strong className="cp-val" style={{ color: "var(--low)" }}>{ct.target} kcal</strong></div>
                <div className="cp-item"><span className="cp-label">Goal</span><strong className="cp-val">{profile.goal_type}</strong></div>
                {profile.goal_date && <div className="cp-item"><span className="cp-label">By</span><strong className="cp-val">{profile.goal_date}</strong></div>}
              </div>
              <div className="calorie-plan-grid">
                <div className="cp-item"><span className="cp-label">Protein</span><strong className="cp-val">{macroTargets.protein_g} g</strong></div>
                <div className="cp-item"><span className="cp-label">Carbs</span><strong className="cp-val">{macroTargets.carbs_g} g</strong></div>
                <div className="cp-item"><span className="cp-label">Fat</span><strong className="cp-val">{macroTargets.fat_g} g</strong></div>
                <div className="cp-item"><span className="cp-label">Sugar Limit</span><strong className="cp-val">{macroTargets.sugar_g} g</strong></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ BADGES TAB ═══════════════════ */}
      {activeTab === "badges" && (
        <div className="badges-tab">
          <div className="level-display-card">
            <span className="level-big-emoji">{level.emoji}</span>
            <div>
              <h3 className="level-display-name">{level.name}</h3>
              <p className="level-display-sub">{earnedBadges.length} / {ALL_BADGES.length} badges earned</p>
            </div>
            <div className="level-progress-bar-wrap">
              <div className="level-progress-track">
                <div className="level-progress-fill"
                  style={{ width: `${(earnedBadges.length / ALL_BADGES.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {["Nutrition","Oral Health","Consistency","Weight"].map(cat => (
            <div key={cat} className="badge-category">
              <h3 className="badge-cat-title">{cat}</h3>
              <div className="badge-grid">
                {ALL_BADGES.filter(b => b.category === cat).map(badge => {
                  const earned = earnedBadges.includes(badge.id);
                  return (
                    <div key={badge.id} className={`badge-card ${earned ? "earned" : "locked"}`}>
                      <span className="badge-emoji" style={{ opacity: earned ? 1 : 0.3 }}>
                        {badge.emoji}
                      </span>
                      <span className="badge-name">{badge.name}</span>
                      <span className="badge-desc">{badge.desc}</span>
                      {earned && <span className="badge-earned-tag">✓ Earned</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ TRENDS TAB ═══════════════════ */}
      {activeTab === "trends" && (
        <div className="trends-tab">
          <div className="trends-grid">

            {/* Calories chart */}
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Calories (7 days)</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="calories" name="kcal" radius={[4,4,0,0]}>
                    {weekly.map((d, i) => <Cell key={i} fill={d.calories > 0 ? "var(--medium)" : "var(--track)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sugar chart */}
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Sugar Intake (7 days)</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="sugar" name="g sugar" radius={[4,4,0,0]}>
                    {weekly.map((d, i) => <Cell key={i} fill={d.sugar > TARGETS.sugar_g ? "var(--high)" : d.sugar > 0 ? "var(--low)" : "var(--track)"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Hydration chart */}
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Hydration (7 days)</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="water" name="glasses" radius={[4,4,0,0]}>
                    {weekly.map((d, i) => <Cell key={i} fill="#38bdf8" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Oral risk trend */}
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Avg Oral Risk Score (7 days)</span></div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" domain={[0, 10]} tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="cario" name="risk score"
                    stroke="var(--high)" strokeWidth={2}
                    dot={{ fill: "var(--high)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Weight trend */}
            {weightLog.length > 0 && (
              <div className="result-card trends-full">
                <div className="result-card-head"><span className="result-card-label">Weight Trend</span></div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={weightLog}>
                    <XAxis dataKey="date" stroke="var(--text3)"
                      tick={{ fill: "var(--text2)", fontSize: 11 }}
                      tickFormatter={d => d.slice(5)} />
                    <YAxis stroke="var(--text3)" domain={["auto","auto"]} tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="weight" name="kg"
                      stroke="var(--medium)" strokeWidth={2}
                      dot={{ fill: "var(--medium)", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
