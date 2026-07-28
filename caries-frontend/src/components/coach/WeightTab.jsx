import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export function WeightTab({
  weightInput,
  setWeightInput,
  logWeight,
  profile,
  weightLog,
  ct,
  macroTargets,
}) {
  return (
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
  );
}
