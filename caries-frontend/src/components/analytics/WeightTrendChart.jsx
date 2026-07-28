import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_STYLE } from "../../utils/behaviorAnalytics";

export function WeightTrendChart({ dailyData }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Weight Trend</span></div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dailyData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#7c3aed" strokeWidth={2} connectNulls dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
