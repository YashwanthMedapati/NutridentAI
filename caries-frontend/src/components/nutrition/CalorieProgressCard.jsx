import React from "react";

export function CalorieProgressCard({ cals, totalCals, caloricProgress }) {
  return (
    <div className="result-card mb-16">
      <div className="result-card-head">
        <span className="result-card-label">Calorie Progress</span>
        <span className="micro-label">{Math.round(totalCals)} / {cals.target} kcal target</span>
      </div>
      <div className="calorie-progress-track">
        <div className={`calorie-progress-fill ${caloricProgress > 100 ? "over-cal" : ""}`}
          style={{ width: `${Math.min(caloricProgress, 100)}%` }} />
      </div>
      <div className="calorie-progress-labels">
        <span>0</span>
        <span>{cals.maintenance} kcal maintenance</span>
        <span className={caloricProgress > 100 ? "over-limit" : ""}>{cals.target} kcal target</span>
      </div>
    </div>
  );
}
