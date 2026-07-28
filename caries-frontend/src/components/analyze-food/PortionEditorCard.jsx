import React from "react";
import { Alert } from "../UI";

export function PortionEditorCard({
  portionInfo,
  portionEdited,
  portionG,
  portionOptions,
  onPresetSelect,
  onPortionChange,
  onPortionApply,
  portionError,
}) {
  return (
    <div className="portion-editor-card">
      <div className="portion-editor-head">
        <span className="portion-editor-title">⚖️ Portion Size</span>
        <span className={`portion-confidence conf-${(portionInfo.confidence || "low").toLowerCase()}`}>
          {portionInfo.confidence} confidence
        </span>
      </div>
      <p className="portion-estimate-label">
        {portionEdited
          ? `Using your portion: ${portionG} g`
          : `AI estimate: ${portionInfo.label}`
        }
      </p>
      <p className="portion-note">
        ℹ️ USDA values are per 100 g. All nutrition and risk values below are scaled to your portion.
      </p>
      <div className="portion-input-row">
        <div className="portion-presets">
          {portionOptions.map(({ label, g }) => (
            <button
              key={label}
              className={`portion-preset-btn ${portionG === g ? "active" : ""}`}
              onClick={() => onPresetSelect(g)}
            >
              {label} ({g} g)
            </button>
          ))}
        </div>
        <div className="portion-custom-row">
          <input
            type="number"
            className="portion-input"
            value={portionG || ""}
            onChange={onPortionChange}
            min="10"
            max="2000"
            placeholder="grams"
          />
          <button className="btn-primary" onClick={onPortionApply}>
            Recalculate
          </button>
        </div>
      </div>
      {portionError && <Alert type="error">{portionError}</Alert>}
    </div>
  );
}
