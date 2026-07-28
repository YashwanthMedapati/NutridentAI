import React from "react";

export function ScoreBar({ label, value, max = 10, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="score-bar-row">
      <div className="score-bar-labels">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
