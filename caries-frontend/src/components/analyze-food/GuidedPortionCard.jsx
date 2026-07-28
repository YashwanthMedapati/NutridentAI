import React from "react";
import { TOPPING_OPTIONS } from "../../utils/foodAnalysis";

export function GuidedPortionCard({
  guidedKind,
  guidedAnswers,
  updateGuidedAnswer,
  toggleGuidedTopping,
  guidedEstimatePreview,
  onApplyGuidedEstimate,
}) {
  return (
    <div className="guided-confirm-card">
      <div className="guided-confirm-head">
        <div>
          <span className="micro-label">Guided Portion Check</span>
          <h3>Answer a few food-specific questions before logging</h3>
        </div>
        <strong>{guidedEstimatePreview.grams} g estimate</strong>
      </div>

      {guidedKind === "pizza" && (
        <div className="guided-grid">
          <label className="field-label">
            Slices eaten
            <input
              type="number"
              min="1"
              max="12"
              className="search-big-input"
              value={guidedAnswers.slices || "2"}
              onChange={e => updateGuidedAnswer("slices", e.target.value)}
            />
          </label>
          <label className="field-label">
            Pizza size
            <select className="search-big-input" value={guidedAnswers.pizzaSize || "medium"} onChange={e => updateGuidedAnswer("pizzaSize", e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <label className="field-label">
            Crust
            <select className="search-big-input" value={guidedAnswers.crust || "regular"} onChange={e => updateGuidedAnswer("crust", e.target.value)}>
              <option value="thin">Thin</option>
              <option value="regular">Regular</option>
              <option value="thick">Thick</option>
            </select>
          </label>
          <label className="field-label">
            Cheese
            <select className="search-big-input" value={guidedAnswers.cheese || "regular cheese"} onChange={e => updateGuidedAnswer("cheese", e.target.value)}>
              <option value="light cheese">Light cheese</option>
              <option value="regular cheese">Regular cheese</option>
              <option value="extra cheese">Extra cheese</option>
            </select>
          </label>
        </div>
      )}

      {guidedKind === "bowl" && (
        <div className="guided-grid">
          <label className="field-label">
            Bowl size
            <select className="search-big-input" value={guidedAnswers.bowlSize || "medium bowl"} onChange={e => updateGuidedAnswer("bowlSize", e.target.value)}>
              <option value="small bowl">Small bowl</option>
              <option value="medium bowl">Medium bowl</option>
              <option value="large bowl">Large bowl</option>
            </select>
          </label>
          <label className="field-label">
            Density
            <select className="search-big-input" value={guidedAnswers.density || "standard"} onChange={e => updateGuidedAnswer("density", e.target.value)}>
              <option value="light">Light / mostly vegetables</option>
              <option value="standard">Standard</option>
              <option value="dense">Dense / oily / creamy</option>
            </select>
          </label>
        </div>
      )}

      {guidedKind === "drink" && (
        <div className="guided-grid">
          <label className="field-label">
            Volume
            <select className="search-big-input" value={guidedAnswers.volumeMl || "355"} onChange={e => updateGuidedAnswer("volumeMl", e.target.value)}>
              <option value="240">240 ml cup</option>
              <option value="355">355 ml can</option>
              <option value="500">500 ml bottle</option>
              <option value="700">700 ml large drink</option>
            </select>
          </label>
          <label className="field-label">
            Sugar level
            <select className="search-big-input" value={guidedAnswers.sugarLevel || "regular"} onChange={e => updateGuidedAnswer("sugarLevel", e.target.value)}>
              <option value="unsweetened">Unsweetened</option>
              <option value="regular">Regular</option>
              <option value="extra sweet">Extra sweet / syrup</option>
            </select>
          </label>
        </div>
      )}

      {guidedKind === "handheld" && (
        <div className="guided-grid">
          <label className="field-label">
            Count
            <input
              type="number"
              min="1"
              max="6"
              className="search-big-input"
              value={guidedAnswers.count || "1"}
              onChange={e => updateGuidedAnswer("count", e.target.value)}
            />
          </label>
          <label className="field-label">
            Size
            <select className="search-big-input" value={guidedAnswers.size || "standard"} onChange={e => updateGuidedAnswer("size", e.target.value)}>
              <option value="small">Small</option>
              <option value="standard">Standard</option>
              <option value="large">Large</option>
            </select>
          </label>
        </div>
      )}

      {guidedKind === "generic" && (
        <div className="guided-grid">
          <label className="field-label">
            Servings eaten
            <input
              type="number"
              min="0.25"
              step="0.25"
              max="8"
              className="search-big-input"
              value={guidedAnswers.serving || "1"}
              onChange={e => updateGuidedAnswer("serving", e.target.value)}
            />
          </label>
          <label className="field-label">
            Serving size
            <select className="search-big-input" value={guidedAnswers.size || "medium"} onChange={e => updateGuidedAnswer("size", e.target.value)}>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
        </div>
      )}

      <div className="guided-toppings">
        <span className="micro-label">Ingredients and extras included in analysis notes</span>
        <div className="guided-chip-row">
          {(TOPPING_OPTIONS[guidedKind] || TOPPING_OPTIONS.generic).map(name => (
            <button
              key={name}
              type="button"
              className={`guided-chip ${(guidedAnswers.toppings || []).includes(name) ? "active" : ""}`}
              onClick={() => toggleGuidedTopping(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className="guided-actions">
        <p>
          Preview: {guidedEstimatePreview.label}. This recalculates calories from the matched food,
          selected portion, and enriched food description before logging.
        </p>
        <button className="btn-primary" onClick={onApplyGuidedEstimate}>Use Guided Estimate</button>
      </div>
    </div>
  );
}
