import React from "react";
import { Link } from "react-router-dom";

export function DetectionSummary({ result, analysisQuality, imageInsights }) {
  return (
    <>
      {/* Detected / matched banner */}
      <div className="detected-food-banner">
        {result.detected_food && (
          <span>🔍 Detected: <strong>{result.detected_food}</strong></span>
        )}
        <span className="detected-match">
          USDA match: <em>{result.usda_match}</em>
        </span>
      </div>

      {analysisQuality && (
        <div className={`analysis-quality-card quality-${(analysisQuality.confidence || "low").toLowerCase()}`}>
          <div>
            <span className="micro-label">Analysis Confidence</span>
            <h3>{analysisQuality.confidence} confidence calorie estimate</h3>
            <p>{analysisQuality.notes?.[0]}</p>
          </div>
          <div className="analysis-quality-meta">
            <span>{Math.round((analysisQuality.confidence_score || 0) * 100)}% score</span>
            <span>{analysisQuality.source}</span>
            {analysisQuality.requires_user_review && <strong>Review before logging</strong>}
            <Link className="explain-inline-link" to="/explain">Why this score?</Link>
          </div>
        </div>
      )}

      {imageInsights && (
        <div className="image-insights-card">
          <div className="image-insights-head">
            <span className="micro-label">Photo Observations</span>
            <span className="label-source-badge">{imageInsights.source || "Image analysis"}</span>
          </div>
          {imageInsights.observation_note && (
            <p className="image-observation-note">{imageInsights.observation_note}</p>
          )}
          {imageInsights.detected_ingredients?.length > 0 && (
            <div className="ingredient-chip-row">
              {imageInsights.detected_ingredients.map((item) => (
                <span key={item.name} className="ingredient-chip">
                  {item.name}
                  <small>{item.confidence}</small>
                </span>
              ))}
            </div>
          )}
          {imageInsights.visible_amount?.basis && (
            <p className="image-basis-note">{imageInsights.visible_amount.basis}</p>
          )}
        </div>
      )}
    </>
  );
}
