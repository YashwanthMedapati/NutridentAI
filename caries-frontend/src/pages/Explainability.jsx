import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "../context/AppContext";

const MODEL_METRICS = [
  { label: "Held-out accuracy", value: "72.04%" },
  { label: "95% CI", value: "69.95-74.19%" },
  { label: "ROC-AUC", value: "0.798" },
  { label: "Kappa", value: "0.438" },
];

function confidenceLabel(score) {
  if (score >= 0.82) return "High confidence: strong pattern match";
  if (score >= 0.58) return "Medium confidence: mixed or incomplete signals";
  return "Review needed: inputs or portion estimate may be uncertain";
}

function riskColor(value) {
  if (value >= 0.8) return "var(--high)";
  if (value >= 0.5) return "var(--medium)";
  return "var(--low)";
}

function normalizeBreakdown(result) {
  const patientBreakdown = result?.patient_risk?.risk_breakdown || result?.risk_breakdown;
  if (patientBreakdown) {
    return Object.entries(patientBreakdown).map(([factor, value]) => ({
      factor,
      value: Number(value || 0),
    }));
  }

  const risk = result?.food_risk?.risk || result?.risk;
  if (!risk) return [];
  return [
    { factor: "Exposure", value: Number(risk.exposure_score || 0) / 10 },
    { factor: "Protective minerals", value: Number(risk.protective_score || 0) / 4 },
    { factor: "Net oral risk", value: Number(risk.net_oral_risk_index || risk.food_risk_score || 0) / 10 },
  ];
}

function getFoodResult(result) {
  return result?.food_risk || (result?.risk ? result : null);
}

function getPatientResult(result) {
  return result?.patient_risk || (result?.prediction ? result : null);
}

export default function Explainability() {
  const { result } = useApp();

  const summary = useMemo(() => {
    const food = getFoodResult(result);
    const patient = getPatientResult(result);
    const quality = result?.analysis_quality || food?.analysis_quality;
    const portion = result?.portion_estimate || food?.portion_estimate;
    const nutritionPlan = result?.nutrition_plan;
    const probability = Number(patient?.risk_probability || 0);
    const qualityScore = Number(quality?.confidence_score || 0);
    const confidenceScore = qualityScore || (patient ? Math.max(probability, 1 - probability) : 0);
    const breakdown = normalizeBreakdown(result);

    return {
      food,
      patient,
      quality,
      portion,
      nutritionPlan,
      confidenceScore,
      confidenceText: confidenceLabel(confidenceScore),
      breakdown,
      reasons: [
        ...(patient?.why || []),
        ...(food?.risk?.reasons || result?.risk?.reasons || []),
      ],
    };
  }, [result]);

  if (!result || result.error) {
    return (
      <div className="page explain-page">
        <div className="page-header">
          <h1 className="page-title">Why This Score?</h1>
          <p className="page-sub">Run a food scan or risk assessment to see the evidence behind the latest result.</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">🔎</div>
          <h3>No analysis to explain yet</h3>
          <p>The explainability view uses your latest food scan or assessment result.</p>
          <div className="empty-actions">
            <Link className="btn-primary" to="/food">Analyze Food</Link>
            <Link className="btn-ghost" to="/assess">Risk Assessment</Link>
          </div>
        </div>
      </div>
    );
  }

  const tt = {
    contentStyle: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      color: "var(--text)",
    },
    formatter: value => `${Math.round(Number(value) * 100)}% contribution`,
  };

  return (
    <div className="page explain-page">
      <div className="page-header explain-header">
        <div>
          <h1 className="page-title">Why This Score?</h1>
          <p className="page-sub">A plain-language breakdown of the latest NutriDent AI result.</p>
        </div>
        <Link className="btn-ghost" to="/coach">Open Coach</Link>
      </div>

      <div className="explain-grid">
        <div className="result-card explain-hero-card">
          <span className="micro-label">Model Confidence</span>
          <h2>{summary.confidenceText}</h2>
          <p>
            Confidence combines available nutrition fields, portion certainty, source reliability,
            and how decisive the model output is. It is a review signal, not a medical certainty.
          </p>
          <div className="confidence-meter">
            <span style={{ width: `${Math.round(summary.confidenceScore * 100)}%` }} />
          </div>
          <div className="confidence-foot">
            <strong>{Math.round(summary.confidenceScore * 100)}%</strong>
            <span>{summary.quality?.source || summary.food?.source || "Patient model"}</span>
          </div>
        </div>

        <div className="result-card">
          <span className="micro-label">Model Validation</span>
          <div className="model-metric-grid">
            {MODEL_METRICS.map(item => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <p className="fine-print">These are held-out evaluation metrics from the current NHANES-trained Random Forest artifact.</p>
        </div>

        {summary.breakdown.length > 0 && (
          <div className="result-card explain-wide">
            <div className="result-card-head">
              <span className="result-card-label">Risk Contribution Breakdown</span>
              <span className="micro-label">Higher bars need more review</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={summary.breakdown} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="factor" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <YAxis domain={[0, 1]} stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <Tooltip {...tt} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                  {summary.breakdown.map(item => <Cell key={item.factor} fill={riskColor(item.value)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="result-card">
          <span className="micro-label">Input Quality</span>
          <div className="explain-list">
            <div><span>Portion basis</span><strong>{summary.portion?.label || "Not available"}</strong></div>
            <div><span>Portion confidence</span><strong>{summary.portion?.confidence || "Unknown"}</strong></div>
            <div><span>Review needed</span><strong>{summary.quality?.requires_user_review ? "Yes" : "No"}</strong></div>
          </div>
          <p className="fine-print">If a photo estimate looks wrong, correct grams and ingredients before logging.</p>
        </div>

        <div className="result-card">
          <span className="micro-label">Coach Context</span>
          {summary.nutritionPlan ? (
            <div className="explain-list">
              <div><span>Maintenance</span><strong>{summary.nutritionPlan.maintenance} kcal</strong></div>
              <div><span>Target</span><strong>{summary.nutritionPlan.target} kcal</strong></div>
              <div><span>Protein</span><strong>{summary.nutritionPlan.macros?.protein_g} g</strong></div>
              <div><span>Sugar limit</span><strong>{summary.nutritionPlan.macros?.sugar_g} g</strong></div>
            </div>
          ) : (
            <p className="fine-print">Complete the risk assessment profile to attach calorie and macro targets.</p>
          )}
        </div>

        <div className="result-card explain-wide">
          <span className="micro-label">Main Reasons</span>
          {summary.reasons.length ? (
            <div className="reason-chip-grid">
              {summary.reasons.slice(0, 10).map((reason, index) => (
                <span key={`${reason}-${index}`}>{reason}</span>
              ))}
            </div>
          ) : (
            <p className="fine-print">No detailed reasons were returned for this result.</p>
          )}
        </div>
      </div>
    </div>
  );
}
