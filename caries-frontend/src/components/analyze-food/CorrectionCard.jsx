import React from "react";

export function CorrectionCard({
  correctedFoodName,
  setCorrectedFoodName,
  mealCategory,
  setMealCategory,
  portionG,
  onPortionChange,
  userIngredients,
  setUserIngredients,
  onApplyCorrections,
}) {
  return (
    <div className="correction-card">
      <div className="correction-head">
        <div>
          <span className="micro-label">Review Before Logging</span>
          <h3>Correct the analysis if the photo estimate is off</h3>
        </div>
        <span className="correction-note">These values are saved to your food log.</span>
      </div>
      <div className="correction-grid">
        <label className="field-label">
          Food name
          <input
            className="search-big-input"
            value={correctedFoodName}
            onChange={e => setCorrectedFoodName(e.target.value)}
            placeholder="e.g. vegetable salami pizza"
          />
        </label>
        <label className="field-label">
          Meal type
          <select
            className="search-big-input"
            value={mealCategory}
            onChange={e => setMealCategory(e.target.value)}
          >
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
            <option value="Meal">Meal</option>
          </select>
        </label>
        <label className="field-label">
          Portion weight
          <input
            type="number"
            className="search-big-input"
            value={portionG || ""}
            onChange={onPortionChange}
            min="10"
            max="2000"
            placeholder="grams"
          />
        </label>
        <label className="field-label correction-wide">
          Visible ingredients
          <textarea
            className="correction-textarea"
            value={userIngredients}
            onChange={e => setUserIngredients(e.target.value)}
            placeholder="e.g. cheese, tomato, olives, salami, peppers"
          />
        </label>
      </div>
      <div className="correction-actions">
        <button className="btn-primary" onClick={onApplyCorrections}>Apply Corrections</button>
        <span>Nutrition and risk recalculate from food name and portion weight.</span>
      </div>
    </div>
  );
}
