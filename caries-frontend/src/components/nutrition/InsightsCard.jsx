import React from "react";

export function InsightsCard({ insights }) {
  return (
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
  );
}
