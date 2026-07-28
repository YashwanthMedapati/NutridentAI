import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_STYLE } from "../../utils/behaviorAnalytics";

export function SugarVsWeightChart({ sugarWeightData }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Sugar vs Weight</span></div>
      {sugarWeightData.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={sugarWeightData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <YAxis yAxisId="left" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Line yAxisId="left" type="monotone" dataKey="sugar" name="Sugar (g)" stroke="var(--medium)" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#7c3aed" strokeWidth={2} connectNulls dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="analytics-muted">Log sugar-containing foods and weight to compare trends.</p>
      )}
    </div>
  );
}
