import React from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const tt = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

export function TrendsTab({ weekly, weightLog, sugarTargetG }) {
  return (
    <div className="trends-tab">
      <div className="trends-grid">

        {/* Calories chart */}
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Calories (7 days)</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="calories" name="kcal" radius={[4,4,0,0]}>
                {weekly.map((d, i) => <Cell key={i} fill={d.calories > 0 ? "var(--medium)" : "var(--track)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sugar chart */}
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Sugar Intake (7 days)</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="sugar" name="g sugar" radius={[4,4,0,0]}>
                {weekly.map((d, i) => <Cell key={i} fill={d.sugar > sugarTargetG ? "var(--high)" : d.sugar > 0 ? "var(--low)" : "var(--track)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hydration chart */}
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Hydration (7 days)</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip {...tt} />
              <Bar dataKey="water" name="glasses" radius={[4,4,0,0]}>
                {weekly.map((d, i) => <Cell key={i} fill="#38bdf8" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Oral risk trend */}
        <div className="result-card">
          <div className="result-card-head"><span className="result-card-label">Avg Oral Risk Score (7 days)</span></div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={weekly} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <YAxis stroke="var(--text3)" domain={[0, 10]} tick={{ fill: "var(--text2)", fontSize: 11 }} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="cario" name="risk score"
                stroke="var(--high)" strokeWidth={2}
                dot={{ fill: "var(--high)", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weight trend */}
        {weightLog.length > 0 && (
          <div className="result-card trends-full">
            <div className="result-card-head"><span className="result-card-label">Weight Trend</span></div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightLog}>
                <XAxis dataKey="date" stroke="var(--text3)"
                  tick={{ fill: "var(--text2)", fontSize: 11 }}
                  tickFormatter={d => d.slice(5)} />
                <YAxis stroke="var(--text3)" domain={["auto","auto"]} tick={{ fill: "var(--text2)", fontSize: 11 }} />
                <Tooltip {...tt} />
                <Line type="monotone" dataKey="weight" name="kg"
                  stroke="var(--medium)" strokeWidth={2}
                  dot={{ fill: "var(--medium)", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
