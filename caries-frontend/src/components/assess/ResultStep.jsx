import React from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import { Alert, ProbabilityBar, RiskBadge, Spinner } from "../UI";

export function ResultStep({
  result,
  loading,
  plan,
  prob,
  gaugeColor,
  modelConfidence,
  confidenceLabel,
  riskBreakdownData,
  onRestart,
  onOpenCoach,
}) {
  return (
    <div className="results-section">
      {loading && (
        <div className="result-loading">
          <Spinner />
          <span>Analysing your profile...</span>
        </div>
      )}

      {result?.error && <Alert type="error">{result.error}</Alert>}

      {result && !result.error && !loading && (
        <>
          <div className="results-section-header">
            <h2 className="results-title">Your Risk Assessment Results</h2>
            <div className="result-actions">
              <button className="btn-ghost" onClick={onRestart}>Start Over</button>
              <button className="btn-primary" onClick={onOpenCoach}>Open Coach Plan →</button>
            </div>
          </div>

          <div className="results-top-grid">
            <div className="result-card">
              <div className="result-card-head">
                <span className="result-card-label">Baseline Caries Risk</span>
                <RiskBadge risk={result.patient_risk?.prediction} />
              </div>
              <div className="result-metric">
                <span className="micro-label">Risk Probability</span>
                <ProbabilityBar value={result.patient_risk?.risk_probability} />
              </div>
              {result.patient_risk?.why?.length > 0 && (
                <div className="why-block">
                  <span className="micro-label">Contributing Factors</span>
                  <ul className="reason-list">
                    {result.patient_risk.why.map((reason, index) => <li key={index}>{reason}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="result-card">
              <div className="result-card-head">
                <span className="result-card-label">Model Confidence</span>
                <Link className="explain-inline-link" to="/explain">Why this score?</Link>
              </div>
              <h3 className="confidence-title">{confidenceLabel}</h3>
              <div className="confidence-meter">
                <span style={{ width: `${Math.round(modelConfidence * 100)}%` }} />
              </div>
              <p className="fine-print">
                Confidence reflects how decisive the patient model is from your age, diet,
                smoking, minerals, and eating-frequency inputs.
              </p>
            </div>

            <div className="result-card center-card">
              <div className="result-card-head"><span className="result-card-label">Risk Gauge</span></div>
              <div className="gauge-wrap">
                <CircularProgressbar
                  value={prob * 100}
                  text={`${(prob * 100).toFixed(0)}%`}
                  styles={buildStyles({
                    textColor: "var(--text)",
                    pathColor: gaugeColor(prob),
                    trailColor: "var(--track)",
                    textSize: "20px",
                  })}
                />
              </div>
            </div>

            <div className="result-card">
              <div className="result-card-head">
                <span className="result-card-label">Coach Targets</span>
              </div>
              {plan ? (
                <div className="coach-target-list">
                  <div><span>Maintenance</span><strong>{plan.maintenance} kcal</strong></div>
                  <div><span>Daily target</span><strong>{plan.target} kcal</strong></div>
                  <div><span>Protein</span><strong>{plan.macros.protein_g} g</strong></div>
                  <div><span>Carbs</span><strong>{plan.macros.carbs_g} g</strong></div>
                  <div><span>Fat</span><strong>{plan.macros.fat_g} g</strong></div>
                  <div><span>Sugar limit</span><strong>{plan.macros.sugar_g} g</strong></div>
                </div>
              ) : (
                <p className="fr-empty">Add height, weight, age, and activity to calculate calorie targets.</p>
              )}
            </div>
          </div>

          {riskBreakdownData.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Risk Factor Breakdown</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={riskBreakdownData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="factor" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 12 }} />
                  <YAxis stroke="var(--text3)" domain={[0, 1]} tick={{ fill: "var(--text2)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {riskBreakdownData.map((entry, index) => (
                      <Cell key={index} fill={entry.value >= 0.8 ? "var(--high)" : entry.value >= 0.5 ? "var(--medium)" : "var(--low)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="result-card coach-card">
            <div className="result-card-head">
              <span className="result-card-label">Next Step</span>
            </div>
            <p className="advice-text">{result.final_advice}</p>
            <div className="coach-actions">
              <div className="coach-action">Open Coach to see your daily calorie and macro targets.</div>
              <div className="coach-action">Use Analyze Food when you want food-specific nutrition and oral risk.</div>
              <div className="coach-action">Log meals over time so Daily Log and Analytics can show behavior patterns.</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
