import React from "react";

export function SummaryStats({ totalCals, cals, dayLogLength, totalSugar, highRiskCount }) {
  return (
    <div className="nt-summary-row">
      <div className="nt-stat">
        <span className="nt-stat-value">{Math.round(totalCals)}</span>
        <span className="nt-stat-label">kcal consumed</span>
        {cals && <span className="nt-stat-sub">target: {cals.target} kcal</span>}
      </div>
      <div className="nt-stat">
        <span className="nt-stat-value">{dayLogLength}</span>
        <span className="nt-stat-label">foods logged</span>
      </div>
      <div className="nt-stat">
        <span className="nt-stat-value">{Math.round(totalSugar)} g</span>
        <span className="nt-stat-label">total sugar</span>
        <span className={`nt-stat-sub ${totalSugar > 50 ? "over" : ""}`}>limit: 50 g</span>
      </div>
      <div className={`nt-stat ${highRiskCount > 0 ? "nt-stat-danger" : ""}`}>
        <span className="nt-stat-value">{highRiskCount}</span>
        <span className="nt-stat-label">high-risk foods</span>
      </div>
    </div>
  );
}
