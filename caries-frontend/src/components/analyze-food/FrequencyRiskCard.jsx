import React from "react";
import { riskColor } from "../../utils/foodAnalysis";

export function FrequencyRiskCard({ frequencyRisk }) {
  return (
    <div className="freq-risk-card">
      <div className="fr-card-head">
        <span className="fr-card-icon freq-icon-pulse">R</span>
        <h3 className="fr-card-title">Food Frequency Risk</h3>
      </div>
      <p className="freq-explanation">{frequencyRisk.explanation}</p>
      <div className="freq-comparison">
        <div className="freq-item">
          <span className="freq-icon">1x</span>
          <span className="freq-label">Occasional intake</span>
          <span
            className="freq-badge"
            style={{ color: riskColor(frequencyRisk.occasional_risk) }}
          >
            {frequencyRisk.occasional_risk} Risk
          </span>
          <p className="freq-note">Eating 1-2 times per week creates fewer acid exposure cycles.</p>
        </div>
        <div className="freq-divider">-&gt;</div>
        <div className="freq-item">
          <span className="freq-icon">7x</span>
          <span className="freq-label">Frequent intake</span>
          <span
            className="freq-badge"
            style={{ color: riskColor(frequencyRisk.frequent_risk) }}
          >
            {frequencyRisk.frequent_risk} Risk
          </span>
          <p className="freq-note">Eating daily or multiple times per day repeats acid attacks.</p>
        </div>
      </div>
    </div>
  );
}
