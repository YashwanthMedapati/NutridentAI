import React from "react";
import { Alert, MacroAnalysis, NutritionGrid, RiskBadge, RiskBar, Spinner } from "../UI";
import { timeFor } from "../../utils/journal";

export function FoodLogCard({
  dayLog,
  selectedDateLabel,
  onClearDay,
  onClearAll,
  foodLogLength,
  expanded,
  setExpanded,
  onRemove,
  portionDrafts,
  onPortionDraft,
  onUpdatePortion,
  updatingIndex,
  portionErrors,
}) {
  return (
    <div className="result-card nt-log-card">
      <div className="result-card-head">
        <span className="result-card-label">Food Log for {selectedDateLabel}</span>
        <div className="journal-log-actions">
          {dayLog.length > 0 && <button className="btn-ghost-sm" onClick={onClearDay}>Clear Day</button>}
          {foodLogLength > 0 && <button className="btn-ghost-sm" onClick={onClearAll}>Clear All</button>}
        </div>
      </div>
      {dayLog.length === 0 ? (
        <div className="nt-empty">
          <span>🍽️</span>
          <p>No foods logged for this day. Analyze a food to add it to your daily timeline.</p>
        </div>
      ) : (
        <div className="food-log-list">
          {dayLog.map((item) => (
            <div key={item.id || `${item.originalIndex}-${item.timestamp || item.usda_match}`} className="food-log-item">
              <div className="fli-top">
                <div className="fli-time-col">
                  <span className="fli-time">{timeFor(item)}</span>
                </div>
                <div className="fli-info">
                  <span className="fli-name">{item.usda_match || item.food_name_entered}</span>
                  <span className="fli-kcal">{item.mealCategory || "Meal"} - {item.nutrition?.energy_kcal ?? "—"} kcal</span>
                  <RiskBar score={item.risk?.food_risk_score} level={item.risk?.food_risk_level} />
                </div>
                <div className="fli-actions">
                  <RiskBadge risk={item.risk?.food_risk_level} />
                  <button className="fli-expand" onClick={() => setExpanded(expanded === item.originalIndex ? null : item.originalIndex)}>
                    {expanded === item.originalIndex ? "▲" : "▼"}
                  </button>
                  <button className="fli-remove" onClick={() => onRemove(item.originalIndex)}>✕</button>
                </div>
              </div>
              {expanded === item.originalIndex && (
                <div className="fli-details">
                  <NutritionGrid nutrition={item.nutrition} />
                  <MacroAnalysis nutrition={item.nutrition} />
                  <div className="portion-custom-row mt-8">
                    <input
                      type="number"
                      className="portion-input"
                      min="1"
                      max="2000"
                      value={portionDrafts[item.originalIndex] ?? item.portion_estimate?.g ?? item.nutrition?.portion_g ?? ""}
                      onChange={e => onPortionDraft(item.originalIndex, e.target.value)}
                    />
                    <button className="btn-primary" onClick={() => onUpdatePortion(item.originalIndex, item)} disabled={updatingIndex === item.originalIndex}>
                      {updatingIndex === item.originalIndex ? <><Spinner /> Updating</> : "Update Portion"}
                    </button>
                  </div>
                  {portionErrors[item.originalIndex] && <Alert type="error">{portionErrors[item.originalIndex]}</Alert>}
                  {item.risk?.consumption_advice && <p className="fli-advice">{item.risk.consumption_advice}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
