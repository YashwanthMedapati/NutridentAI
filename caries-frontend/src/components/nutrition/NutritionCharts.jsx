import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const tt = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

export function NutritionCharts({ pieData, macroPieData, macroData, hasDayLog }) {
  return (
    <div className="nt-charts">
      {pieData.length > 0 && (
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Risk Distribution</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((e) => (
                  <Cell key={e.name} fill={e.name === "High" ? "var(--high)" : e.name === "Medium" ? "var(--medium)" : "var(--low)"} />
                ))}
              </Pie>
              <Tooltip {...tt} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {macroPieData.length > 0 && (
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Macro Distribution</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={macroPieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={30} paddingAngle={3}>
                <Cell fill="var(--mineral)" />
                <Cell fill="var(--medium)" />
                <Cell fill="var(--low)" />
              </Pie>
              <Tooltip formatter={(v) => `${v} g`} {...tt} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasDayLog && (
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Macros vs Limits</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={macroData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis dataKey="name" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="value" name="Consumed" radius={[4, 4, 0, 0]}>
                {macroData.map((e, i) => <Cell key={i} fill={e.value > e.limit ? "var(--high)" : "var(--low)"} />)}
              </Bar>
              <Bar dataKey="limit" name="Limit" fill="var(--track)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
