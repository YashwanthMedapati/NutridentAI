import React from "react";
import { useApp } from "../context/AppContext";

export default function PreviousResults() {
  const { previousResults } = useApp();

  if (!previousResults || previousResults.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Previous Results</h1>
          <p className="page-sub">Your assessment history saved in this browser.</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No results yet</h3>
          <p>Run a risk assessment to see your history here. Results are stored locally in this browser.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Previous Results</h1>
        <p className="page-sub">{previousResults.length} saved assessment{previousResults.length !== 1 ? "s" : ""} in this browser.</p>
      </div>
      <div className="prev-results-list">
        {previousResults.map((r, i) => (
          <div className="prev-result-card" key={i}>
            <div className="prev-result-header">
              <div>
                <span className="prev-result-num">Assessment #{previousResults.length - i}</span>
                <span className="prev-result-time">{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {r.patient_risk?.prediction && (
                  <span className={`badge ${r.patient_risk.prediction.toLowerCase().includes("high") ? "badge-high" : "badge-low"}`}>
                    {r.patient_risk.prediction}
                  </span>
                )}
                {r.food_risk?.risk?.food_risk_level && (
                  <span className={`badge ${r.food_risk.risk.food_risk_level === "High" ? "badge-high" : r.food_risk.risk.food_risk_level === "Medium" ? "badge-medium" : "badge-low"}`}>
                    {r.food_risk.risk.food_risk_level} Food
                  </span>
                )}
              </div>
            </div>
            <div className="prev-result-body">
              <div className="prev-result-col">
                <span className="micro-label">Risk Probability</span>
                <div className="prob-wrap">
                  <div className="prob-track">
                    <div className={`prob-fill ${(r.patient_risk?.risk_probability || 0) >= 0.7 ? "bar-high" : (r.patient_risk?.risk_probability || 0) >= 0.4 ? "bar-medium" : "bar-low"}`}
                      style={{ width: `${((r.patient_risk?.risk_probability || 0) * 100)}%` }} />
                  </div>
                  <span className="prob-label">{Math.round((r.patient_risk?.risk_probability || 0) * 100)}%</span>
                </div>
              </div>
              {r.food_name && (
                <div className="prev-result-col">
                  <span className="micro-label">Food Analysed</span>
                  <span className="metric-value">{r.food_risk?.usda_match || r.food_name}</span>
                </div>
              )}
            </div>
            {r.patient_risk?.why?.length > 0 && (
              <div className="prev-result-why">
                {r.patient_risk.why.slice(0, 2).map((w, j) => (
                  <span key={j} className="prev-why-chip">{w}</span>
                ))}
              </div>
            )}
            {r.final_advice && <p className="prev-result-advice">{r.final_advice}</p>}
          </div>
        ))}
      </div>
      <p className="session-note">Note: Results are saved in this browser unless you delete NutriDent data from Settings or clear site data.</p>
    </div>
  );
}
