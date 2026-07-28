import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_STYLE } from "../../utils/behaviorAnalytics";

export function CaloriesSugarChart({ dailyData }) {
  return (
    <div className="result-card analytics-full">
      <div className="result-card-head">
        <span className="result-card-label">Calories and Sugar by Day</span>
        <span className="micro-label">Last 14 days</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="calories" name="Calories" fill="#2563eb" radius={[4, 4, 0, 0]} />
          <Bar dataKey="sugar" name="Sugar (g)" fill="var(--medium)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
