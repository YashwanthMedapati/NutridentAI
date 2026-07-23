import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useApp } from "../context/AppContext";

const DAY_MS = 24 * 60 * 60 * 1000;
const RISK_COLORS = {
  Low: "var(--low)",
  Medium: "var(--medium)",
  High: "var(--high)",
};

function dateKeyFor(item) {
  return item.loggedDate || item.timestamp?.slice(0, 10) || new Date().toISOString().slice(0, 10);
}

function formatShortDate(dateKey) {
  const [, month, day] = dateKey.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastDays(count) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getTime() - (count - index - 1) * DAY_MS);
    return localDateKey(date);
  });
}

function numberOrZero(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getFoodName(item, fallback = "Logged food") {
  return item.usda_match || item.food_name_entered || item.food_name || fallback;
}

function mealTimingBucket(item) {
  const hour = item.timestamp ? new Date(item.timestamp).getHours() : 12;
  if (hour < 11) return "Morning";
  if (hour < 15) return "Midday";
  if (hour < 20) return "Evening";
  return "Late";
}

function buildStreak(dailyData) {
  let streak = 0;
  for (let index = dailyData.length - 1; index >= 0; index -= 1) {
    if (dailyData[index].foods > 0) streak += 1;
    else break;
  }
  return streak;
}

export default function BehaviorAnalytics() {
  const { foodLog, weightLog } = useApp();

  const analytics = useMemo(() => {
    const days = lastDays(14);
    const weightsByDate = new Map(weightLog.map(item => [item.date, numberOrZero(item.weight)]));

    const dailyData = days.map(date => {
      const foods = foodLog.filter(item => dateKeyFor(item) === date);
      const riskItems = foods.filter(item => Number.isFinite(Number(item.risk?.food_risk_score)));
      const calories = foods.reduce((sum, item) => sum + numberOrZero(item.nutrition?.energy_kcal), 0);
      const sugar = foods.reduce((sum, item) => sum + numberOrZero(item.nutrition?.sugar_g), 0);
      const carbs = foods.reduce((sum, item) => sum + numberOrZero(item.nutrition?.carbs_g), 0);
      const avgRisk = riskItems.length
        ? riskItems.reduce((sum, item) => sum + numberOrZero(item.risk?.food_risk_score), 0) / riskItems.length
        : 0;
      const lateSugar = foods.filter(item => {
        const hour = item.timestamp ? new Date(item.timestamp).getHours() : 0;
        return hour >= 20 && numberOrZero(item.nutrition?.sugar_g) >= 8;
      }).length;

      return {
        date,
        label: formatShortDate(date),
        foods: foods.length,
        calories: Math.round(calories),
        sugar: Math.round(sugar),
        carbs: Math.round(carbs),
        avgRisk: Number(avgRisk.toFixed(1)),
        highRiskFoods: foods.filter(item => item.risk?.food_risk_level === "High").length,
        lateSugar,
        weight: weightsByDate.get(date) || null,
        consistency: foods.length > 0 || weightsByDate.has(date) ? 1 : 0,
      };
    });

    const loggedDays = dailyData.filter(day => day.foods > 0).length;
    const weightDays = dailyData.filter(day => day.weight).length;
    const consistencyScore = Math.round(((loggedDays + weightDays) / (dailyData.length * 2)) * 100);
    const foodDays = dailyData.filter(day => day.foods > 0);
    const avgCalories = foodDays.length
      ? Math.round(foodDays.reduce((sum, day) => sum + day.calories, 0) / foodDays.length)
      : 0;
    const riskDays = dailyData.filter(day => day.avgRisk > 0);
    const avgRisk = riskDays.length
      ? Number((riskDays.reduce((sum, day) => sum + day.avgRisk, 0) / riskDays.length).toFixed(1))
      : 0;
    const avgEatingEvents = foodDays.length
      ? Number((foodDays.reduce((sum, day) => sum + day.foods, 0) / foodDays.length).toFixed(1))
      : 0;

    const weightPoints = weightLog
      .filter(item => days.includes(item.date))
      .map(item => ({ ...item, weight: numberOrZero(item.weight) }))
      .filter(item => item.weight > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const weightDelta = weightPoints.length > 1
      ? Number((weightPoints[weightPoints.length - 1].weight - weightPoints[0].weight).toFixed(1))
      : null;

    const bestDay = foodDays.length
      ? [...foodDays].sort((a, b) => (a.avgRisk + a.sugar / 50) - (b.avgRisk + b.sugar / 50))[0]
      : null;
    const worstDay = foodDays.length
      ? [...foodDays].sort((a, b) => (b.avgRisk + b.sugar / 50) - (a.avgRisk + a.sugar / 50))[0]
      : null;
    const sugarWeightData = dailyData
      .filter(day => day.sugar > 0 || day.weight)
      .map(day => ({
        label: day.label,
        sugar: day.sugar,
        weight: day.weight,
      }));

    const mealMap = new Map();
    foodLog
      .filter(item => days.includes(dateKeyFor(item)))
      .forEach(item => {
        const meal = item.mealCategory || "Meal";
        const current = mealMap.get(meal) || { meal, count: 0, calories: 0, sugar: 0, riskTotal: 0, riskCount: 0 };
        current.count += 1;
        current.calories += numberOrZero(item.nutrition?.energy_kcal);
        current.sugar += numberOrZero(item.nutrition?.sugar_g);
        if (Number.isFinite(Number(item.risk?.food_risk_score))) {
          current.riskTotal += numberOrZero(item.risk?.food_risk_score);
          current.riskCount += 1;
        }
        mealMap.set(meal, current);
      });

    const mealData = Array.from(mealMap.values()).map(item => ({
      meal: item.meal,
      count: item.count,
      calories: Math.round(item.calories),
      sugar: Math.round(item.sugar),
      avgRisk: item.riskCount ? Number((item.riskTotal / item.riskCount).toFixed(1)) : 0,
    }));

    const topRiskFoods = foodLog
      .filter(item => days.includes(dateKeyFor(item)))
      .map(item => ({
        id: item.id,
        name: getFoodName(item),
        date: dateKeyFor(item),
        meal: item.mealCategory || "Meal",
        risk: numberOrZero(item.risk?.food_risk_score),
        level: item.risk?.food_risk_level || "Low",
        calories: Math.round(numberOrZero(item.nutrition?.energy_kcal)),
        sugar: Math.round(numberOrZero(item.nutrition?.sugar_g)),
      }))
      .sort((a, b) => b.risk - a.risk || b.sugar - a.sugar)
      .slice(0, 5);

    const timingMap = new Map(["Morning", "Midday", "Evening", "Late"].map(bucket => [bucket, {
      bucket,
      foods: 0,
      sugar: 0,
      highRisk: 0,
    }]));
    foodLog
      .filter(item => days.includes(dateKeyFor(item)))
      .forEach(item => {
        const bucket = mealTimingBucket(item);
        const current = timingMap.get(bucket);
        current.foods += 1;
        current.sugar += numberOrZero(item.nutrition?.sugar_g);
        if (item.risk?.food_risk_level === "High") current.highRisk += 1;
      });
    const timingData = Array.from(timingMap.values()).map(item => ({
      ...item,
      sugar: Math.round(item.sugar),
    }));

    const lateSugarEvents = dailyData.reduce((sum, day) => sum + day.lateSugar, 0);
    const highRiskEvents = dailyData.reduce((sum, day) => sum + day.highRiskFoods, 0);
    const streak = buildStreak(dailyData);

    const insights = [];
    if (streak >= 5) insights.push({ tone: "good", title: "Logging rhythm is strong", body: `You have a ${streak}-day food logging streak.` });
    if (consistencyScore < 45) insights.push({ tone: "watch", title: "Consistency needs attention", body: "A few more food and weight check-ins will make the trends more reliable." });
    if (avgEatingEvents >= 4) insights.push({ tone: "watch", title: "Frequent eating pattern", body: `Logged days average ${avgEatingEvents} eating events. More frequent exposure can raise oral risk.` });
    if (lateSugarEvents > 0) insights.push({ tone: "watch", title: "Late sugar exposure", body: `${lateSugarEvents} logged item${lateSugarEvents === 1 ? "" : "s"} had meaningful sugar after 8 PM.` });
    if (avgRisk >= 6) insights.push({ tone: "alert", title: "Oral risk is trending high", body: `Average food risk is ${avgRisk}/10 across logged days.` });
    if (weightDelta !== null) {
      const direction = weightDelta > 0 ? "up" : weightDelta < 0 ? "down" : "flat";
      insights.push({ tone: "neutral", title: "Weight trend", body: `Weight is ${direction} ${Math.abs(weightDelta)} kg across the visible period.` });
    }
    if (insights.length === 0) {
      insights.push({ tone: "neutral", title: "Keep building the baseline", body: "Log a few more meals and weights to unlock clearer behavior patterns." });
    }

    return {
      dailyData,
      loggedDays,
      weightDays,
      consistencyScore,
      avgCalories,
      avgRisk,
      avgEatingEvents,
      weightDelta,
      mealData,
      topRiskFoods,
      timingData,
      sugarWeightData,
      bestDay,
      worstDay,
      lateSugarEvents,
      highRiskEvents,
      streak,
      insights,
    };
  }, [foodLog, weightLog]);

  const hasData = foodLog.length > 0 || weightLog.length > 0;
  const tt = {
    contentStyle: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      color: "var(--text)",
    },
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Behavior Analytics</h1>
        <p className="page-sub">Weekly food behavior, weight change, consistency, and oral-risk trends.</p>
      </div>

      {!hasData ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No behavior data yet</h3>
          <p>Analyze food, add items to the daily log, and record weight to see trends here.</p>
          <div className="empty-actions">
            <Link className="btn-primary" to="/food">Analyze Food</Link>
            <Link className="btn-ghost" to="/nutrition">Open Daily Log</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="analytics-summary-grid">
            <MetricCard label="Consistency" value={`${analytics.consistencyScore}%`} detail={`${analytics.loggedDays}/14 food days, ${analytics.weightDays}/14 weight days`} />
            <MetricCard label="Current Streak" value={`${analytics.streak} days`} detail="Consecutive days with food logs" />
            <MetricCard label="Avg Calories" value={`${analytics.avgCalories || 0}`} detail="Per logged day" />
            <MetricCard label="Avg Oral Risk" value={`${analytics.avgRisk || 0}/10`} detail={`${analytics.highRiskEvents} high-risk items`} />
            <MetricCard
              label="Best Day"
              value={analytics.bestDay ? analytics.bestDay.label : "Need logs"}
              detail={analytics.bestDay ? `${analytics.bestDay.calories} kcal, ${analytics.bestDay.sugar}g sugar` : "Lowest sugar/risk day"}
            />
            <MetricCard
              label="Worst Day"
              value={analytics.worstDay ? analytics.worstDay.label : "Need logs"}
              detail={analytics.worstDay ? `${analytics.worstDay.avgRisk}/10 risk, ${analytics.worstDay.sugar}g sugar` : "Highest sugar/risk day"}
            />
            <MetricCard
              label="Weight Change"
              value={analytics.weightDelta === null ? "Need 2 logs" : `${analytics.weightDelta > 0 ? "+" : ""}${analytics.weightDelta} kg`}
              detail="Across the visible period"
            />
          </div>

          <div className="analytics-grid">
            <div className="result-card analytics-full">
              <div className="result-card-head">
                <span className="result-card-label">Calories and Sugar by Day</span>
                <span className="micro-label">Last 14 days</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="calories" name="Calories" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sugar" name="Sugar (g)" fill="var(--medium)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Oral Risk Trend</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.dailyData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis domain={[0, 10]} stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Line type="monotone" dataKey="avgRisk" name="Avg risk" stroke="var(--high)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Eating Events</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.dailyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Bar dataKey="foods" name="Logged foods" fill="#0f766e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Weight Trend</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics.dailyData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#7c3aed" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Sugar vs Weight</span></div>
              {analytics.sugarWeightData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={analytics.sugarWeightData} margin={{ top: 4, right: 10, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <YAxis yAxisId="left" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <Tooltip {...tt} />
                    <Line yAxisId="left" type="monotone" dataKey="sugar" name="Sugar (g)" stroke="var(--medium)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#7c3aed" strokeWidth={2} connectNulls dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="analytics-muted">Log sugar-containing foods and weight to compare trends.</p>
              )}
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Meal Category Pattern</span></div>
              {analytics.mealData.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.mealData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="meal" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                    <Tooltip {...tt} />
                    <Bar dataKey="count" name="Items" fill="#0891b2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgRisk" name="Avg risk" fill="var(--high)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="analytics-muted">Add logged foods with meal categories to see this pattern.</p>
              )}
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Meal Timing Pattern</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.timingData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="bucket" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis allowDecimals={false} stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Bar dataKey="foods" name="Foods" fill="#0891b2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="highRisk" name="High-risk foods" fill="var(--high)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Behavior Insights</span></div>
              <div className="analytics-insight-list">
                {analytics.insights.map(insight => (
                  <div className={`analytics-insight ${insight.tone}`} key={`${insight.title}-${insight.body}`}>
                    <strong>{insight.title}</strong>
                    <span>{insight.body}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Highest Risk Foods</span></div>
              {analytics.topRiskFoods.length ? (
                <div className="top-risk-list">
                  {analytics.topRiskFoods.map(item => (
                    <div className="top-risk-item" key={item.id || `${item.name}-${item.date}`}>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.meal} on {formatShortDate(item.date)} - {item.calories} kcal, {item.sugar}g sugar</span>
                      </div>
                      <span className="risk-score-pill" style={{ borderColor: RISK_COLORS[item.level], color: RISK_COLORS[item.level] }}>
                        {item.risk}/10
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="analytics-muted">Risk-ranked foods will appear after more logged analyses.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="analytics-stat-card">
      <span className="analytics-stat-label">{label}</span>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
