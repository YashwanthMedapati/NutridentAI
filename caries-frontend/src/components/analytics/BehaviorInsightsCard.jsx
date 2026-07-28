import React from "react";

export function BehaviorInsightsCard({ insights }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Behavior Insights</span></div>
      <div className="analytics-insight-list">
        {insights.map(insight => (
          <div className={`analytics-insight ${insight.tone}`} key={`${insight.title}-${insight.body}`}>
            <strong>{insight.title}</strong>
            <span>{insight.body}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
