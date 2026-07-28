import React from "react";
import { formatShortDate, RISK_COLORS } from "../../utils/behaviorAnalytics";

export function TopRiskFoodsCard({ topRiskFoods }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Highest Risk Foods</span></div>
      {topRiskFoods.length ? (
        <div className="top-risk-list">
          {topRiskFoods.map(item => (
            <div className="top-risk-item" key={item.id || `${item.name}-${item.date}`}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.meal} on {formatShortDate(item.date)} - {item.calories} kcal, {item.sugar}g sugar</span>
              </div>
              <span className="risk-score-pill" style={{ borderColor: RISK_COLORS[item.level], color: RISK_COLORS[item.level] }}>
                {item.risk}/10
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="analytics-muted">Risk-ranked foods will appear after more logged analyses.</p>
      )}
    </div>
  );
}
