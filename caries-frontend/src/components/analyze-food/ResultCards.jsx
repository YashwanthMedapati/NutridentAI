import React from "react";
import { Alert, MacroAnalysis, NutritionGrid, RiskBadge } from "../UI";
import { ScoreBar } from "./ScoreBar";
import { CAT_COLORS, riskColor } from "../../utils/foodAnalysis";

export function ResultCards({
  risk,
  riskLevel,
  nutrition,
  portionG,
  portionInfo,
  ingredientCalories,
  nutritionPer100g,
}) {
  return (
    <div className="food-results-grid">

      {/* 1. CARIES RISK */}
      <div className="fr-card fr-card-risk">
        <div className="fr-card-head">
          <span className="fr-card-icon">🦷</span>
          <h3 className="fr-card-title">Caries Risk</h3>
          <RiskBadge risk={riskLevel} />
        </div>
        <div className="fr-risk-score">
          <span className="fr-score-num">{risk?.food_risk_score ?? "—"}</span>
          <span className="fr-score-denom">/10</span>
        </div>

        {/* Score bars */}
        <div className="score-bars">
          <ScoreBar
            label="Exposure Score"
            value={risk?.exposure_score ?? 0}
            max={10}
            color="var(--high)"
          />
          <ScoreBar
            label="Protective Score"
            value={risk?.protective_score ?? 0}
            max={4}
            color="var(--low)"
          />
        </div>

        {/* Net Oral Risk Index */}
        {risk?.net_oral_risk_index !== undefined && (
          <div className="nori-block">
            <span className="nori-label">Net Oral Risk Index</span>
            <div className="nori-value-row">
              <span
                className="nori-value"
                style={{ color: riskColor(risk.net_oral_risk_label) }}
              >
                {risk.net_oral_risk_index}
                <span className="nori-denom">/10</span>
              </span>
              <span
                className="nori-badge"
                style={{ color: riskColor(risk.net_oral_risk_label) }}
              >
                {risk.net_oral_risk_label}
              </span>
            </div>
            <div className="nori-track">
              <div
                className="nori-fill"
                style={{
                  width: `${(risk.net_oral_risk_index / 10) * 100}%`,
                  background: riskColor(risk.net_oral_risk_label),
                }}
              />
            </div>
            <p className="nori-explanation">
              Exposure ({risk.exposure_score}) minus protective factors ({risk.protective_score})
              = net oral caries risk.
            </p>
          </div>
        )}

        {risk?.reasons?.length > 0 && (
          <div className="why-block mt-12">
            <span className="micro-label">Risk Factors</span>
            <ul className="reason-list">
              {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {risk?.warning && <Alert type="warning">{risk.warning}</Alert>}
      </div>

      {/* 2. CALORIES & NUTRITION */}
      <div className="fr-card">
        <div className="fr-card-head">
          <span className="fr-card-icon">🥗</span>
          <h3 className="fr-card-title">Calories & Nutrition</h3>
          <span className="fr-kcal">{nutrition?.energy_kcal ?? "—"} kcal</span>
        </div>
        <div className="portion-tag">
          For {portionG || portionInfo?.g || 100} g serving
        </div>
        <NutritionGrid nutrition={nutrition} />
        <div className="macro-detail-card">
          <div className="macro-detail-head">
            <span className="micro-label">Detailed Macro Analysis</span>
            <strong>{nutrition?.energy_kcal ?? "-"} kcal total</strong>
          </div>
          <MacroAnalysis nutrition={nutrition} />
        </div>

        {ingredientCalories.length > 0 && (
          <div className="ingredient-calorie-card">
            <div className="macro-detail-head">
              <span className="micro-label">Ingredient Calorie Breakdown</span>
              <strong>{nutrition?.energy_kcal ?? "-"} kcal total</strong>
            </div>
            <p>
              Total calories are calculated from the matched USDA food and your portion size.
              This table estimates how visible ingredients contribute to that total; it is not a direct ingredient-by-ingredient measurement.
            </p>
            <div className="ingredient-calorie-list">
              {ingredientCalories.map(item => (
                <div className="ingredient-calorie-row" key={item.name}>
                  <span>{item.name}<small>{item.confidence}</small></span>
                  <div className="ingredient-calorie-track">
                    <div style={{ width: `${item.percent}%` }} />
                  </div>
                  <strong>{item.calories} kcal</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Per 100 g comparison */}
        {nutritionPer100g && (
          <div className="per100g-note">
            <span className="micro-label">Per 100 g reference</span>
            <div className="per100g-row">
              <span>
                <small>Calories</small>
                <strong>{nutritionPer100g.energy_kcal ?? "-"} kcal</strong>
              </span>
              <span>
                <small>Sugar</small>
                <strong>{nutritionPer100g.sugar_g ?? "-"} g</strong>
              </span>
              <span>
                <small>Carbs</small>
                <strong>{nutritionPer100g.carbs_g ?? "-"} g</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. AI DENTIST NOTES */}
      <div className="fr-card">
        <div className="fr-card-head">
          <span className="fr-card-icon">🩺</span>
          <h3 className="fr-card-title">Oral Health Notes</h3>
        </div>
        {risk?.dentist_notes?.length > 0
          ? (
            <ul className="dentist-notes">
              {risk.dentist_notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )
          : <p className="fr-empty">No specific dental concerns for this food.</p>
        }
      </div>

      {/* 4. ACTION PLAN */}
      <div className={`fr-card fr-action-${(riskLevel || "low").toLowerCase()}`}>
        <div className="fr-card-head">
          <span className="fr-card-icon">📋</span>
          <h3 className="fr-card-title">Action Plan</h3>
        </div>

        {risk?.action_plan?.length > 0
          ? (
            <div className="action-plan-list">
              {risk.action_plan.map((item, i) => (
                <div key={i} className="action-plan-item">
                  <span
                    className="action-cat-dot"
                    style={{ background: CAT_COLORS[item.category] || "#94a3b8" }}
                  />
                  <div>
                    <span className="action-cat-label">{item.category}</span>
                    <span className="action-text">{item.action}</span>
                  </div>
                </div>
              ))}
            </div>
          )
          : (
            <ul className="action-list">
              <li>✅ Maintain regular brushing and flossing</li>
              <li>💧 Stay hydrated to promote saliva production</li>
              <li>🦷 Schedule dental check-ups every 6 months</li>
            </ul>
          )
        }

        {risk?.consumption_advice && (
          <div className="consumption-note">{risk.consumption_advice}</div>
        )}
      </div>
    </div>
  );
}
