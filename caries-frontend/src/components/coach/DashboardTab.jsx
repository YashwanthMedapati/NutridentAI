import React from "react";
import { Ring } from "./Ring";

export function DashboardTab({
  wScore,
  scoreColor,
  cario,
  carioColor,
  water,
  waterGoal,
  nutritionOpen,
  setNutritionOpen,
  kcal,
  ct,
  nutPct,
  nutrientRings,
  streaks,
  insights,
  swaps,
}) {
  return (
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
  );
}
