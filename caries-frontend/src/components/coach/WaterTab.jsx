import React from "react";
import { Ring } from "./Ring";

export function WaterTab({ water, waterGoal, setWaterGoal, addGlass, removeGlass, streaks }) {
  return (
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
  );
}
