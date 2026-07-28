import React, { useState } from "react";
import { Alert, Spinner } from "../UI";
import { apiFetch } from "../../api";

// One collapsible meal (Breakfast/Lunch/Dinner/Snacks) with its own inline
// food search — self-contained since search text and open/closed state
// don't need to be shared with the rest of the Meals tab.
export function MealSection({ mealName, items, onRemove, onAdd, icon }) {
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching]   = useState(false);
  const [open, setOpen]             = useState(false);
  const [error, setError]           = useState(null);

  const mealKcal = items.reduce((s, f) => s + (f.nutrition?.energy_kcal || 0), 0);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    try {
      setSearching(true);
      setError(null);
      const data = await apiFetch("/food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ food_name: searchText }),
      });
      onAdd(mealName, { ...data, food_name_entered: searchText });
      setSearchText("");
      setOpen(false);
    } catch (err) {
      setError(err.message || "Could not add this food.");
    }
    finally { setSearching(false); }
  };

  return (
    <div className="meal-section">
      <div className="meal-section-head" onClick={() => setOpen(o => !o)}>
        <div className="meal-section-title">
          <span className="meal-icon">{icon}</span>
          <span className="meal-name">{mealName}</span>
          {items.length > 0 && <span className="meal-count">{items.length} items · {Math.round(mealKcal)} kcal</span>}
        </div>
        <span className="meal-toggle">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="meal-body">
          {/* Food items */}
          {items.length > 0 ? (
            <div className="meal-items">
              {items.map(item => (
                <div key={item.id} className="meal-item">
                  <div className="meal-item-info">
                    <span className="meal-item-name">{item.usda_match || item.food_name_entered}</span>
                    <span className="meal-item-kcal">{item.nutrition?.energy_kcal ?? "—"} kcal</span>
                    <span className="meal-item-macros">
                      P:{item.nutrition?.protein_g ?? 0}g · C:{item.nutrition?.carbs_g ?? 0}g · F:{item.nutrition?.fat_g ?? 0}g
                    </span>
                  </div>
                  <div className="meal-item-right">
                    {item.risk?.food_risk_level && (
                      <span className={`meal-risk-dot risk-${item.risk.food_risk_level.toLowerCase()}`}>
                        {item.risk.food_risk_level}
                      </span>
                    )}
                    <button className="meal-remove" onClick={() => onRemove(mealName, item.id)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="meal-empty">No foods logged yet for {mealName.toLowerCase()}.</p>
          )}

          {/* Add food */}
          <div className="meal-add-row">
            <input
              className="meal-search-input"
              type="text"
              placeholder={`Add food to ${mealName.toLowerCase()}…`}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button className="btn-primary btn-sm" onClick={handleSearch} disabled={searching}>
              {searching ? <Spinner /> : "+ Add"}
            </button>
          </div>
          {error && <Alert type="error">{error}</Alert>}
        </div>
      )}
    </div>
  );
}
