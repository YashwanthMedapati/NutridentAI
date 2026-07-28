import React from "react";
import { MetricCard } from "./MetricCard";

export function SummaryGrid({ analytics }) {
  return (
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
  );
}
