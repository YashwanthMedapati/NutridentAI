import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_STYLE } from "../../utils/behaviorAnalytics";

export function MealTimingChart({ timingData }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Meal Timing Pattern</span></div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={timingData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="bucket" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <YAxis allowDecimals={false} stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
          <Tooltip {...TOOLTIP_STYLE} />
          <Bar dataKey="foods" name="Foods" fill="#0891b2" radius={[4, 4, 0, 0]} />
          <Bar dataKey="highRisk" name="High-risk foods" fill="var(--high)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
