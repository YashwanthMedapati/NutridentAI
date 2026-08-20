import React from "react";
import { Spinner } from "../UI";

export function MealPanel({
  items,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onAnalyze,
  loading,
}) {
  return (
    <div className="meal-panel">
      <div className="meal-panel-head">
        <div>
          <h3>Analyze a combo meal</h3>
          <p>Add each item separately so calories, macros, and dental risk are calculated from the whole plate.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={onAddItem}>
          + Add item
        </button>
      </div>

      <div className="meal-item-list">
        {items.map((item, index) => (
          <div className="meal-item-row" key={index}>
            <input
              className="search-big-input"
              type="text"
              placeholder={index === 0 ? "e.g. chana masala" : "e.g. garlic naan"}
              value={item.food_name}
              onChange={event => onItemChange(index, "food_name", event.target.value)}
            />
            <input
              className="meal-grams-input"
              type="number"
              min="1"
              max="2000"
              placeholder="grams"
              value={item.portion_g}
              onChange={event => onItemChange(index, "portion_g", event.target.value)}
            />
            <button
              className="meal-remove-btn"
              type="button"
              onClick={() => onRemoveItem(index)}
              disabled={items.length <= 1}
              aria-label={`Remove meal item ${index + 1}`}
            >
              x
            </button>
          </div>
        ))}
      </div>

      <div className="meal-panel-actions">
        <span>Tip: leave grams blank if you want NutriDent to estimate a typical serving.</span>
        <button className="btn-primary" type="button" onClick={onAnalyze} disabled={loading}>
          {loading ? <><Spinner /> Analyzing meal...</> : "Analyze Meal"}
        </button>
      </div>
    </div>
  );
}
