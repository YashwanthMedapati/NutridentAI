import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TOOLTIP_STYLE } from "../../utils/behaviorAnalytics";

export function MealCategoryChart({ mealData }) {
  return (
    <div className="result-card">
      <div className="result-card-head"><span className="result-card-label">Meal Category Pattern</span></div>
      {mealData.length ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={mealData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="meal" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Items" fill="#0891b2" radius={[4, 4, 0, 0]} />
            <Bar dataKey="avgRisk" name="Avg risk" fill="var(--high)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="analytics-muted">Add logged foods with meal categories to see this pattern.</p>
      )}
    </div>
  );
}
