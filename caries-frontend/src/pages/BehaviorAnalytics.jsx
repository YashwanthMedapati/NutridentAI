import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { computeBehaviorAnalytics } from "../utils/behaviorAnalytics";
import { SummaryGrid } from "../components/analytics/SummaryGrid";
import { CaloriesSugarChart } from "../components/analytics/CaloriesSugarChart";
import { OralRiskTrendChart } from "../components/analytics/OralRiskTrendChart";
import { EatingEventsChart } from "../components/analytics/EatingEventsChart";
import { WeightTrendChart } from "../components/analytics/WeightTrendChart";
import { SugarVsWeightChart } from "../components/analytics/SugarVsWeightChart";
import { MealCategoryChart } from "../components/analytics/MealCategoryChart";
import { MealTimingChart } from "../components/analytics/MealTimingChart";
import { BehaviorInsightsCard } from "../components/analytics/BehaviorInsightsCard";
import { TopRiskFoodsCard } from "../components/analytics/TopRiskFoodsCard";

export default function BehaviorAnalytics() {
  const { foodLog, weightLog } = useApp();

  const analytics = useMemo(
    () => computeBehaviorAnalytics(foodLog, weightLog),
    [foodLog, weightLog]
  );

  const hasData = foodLog.length > 0 || weightLog.length > 0;

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
          <SummaryGrid analytics={analytics} />

          <div className="analytics-grid">
            <CaloriesSugarChart dailyData={analytics.dailyData} />
            <OralRiskTrendChart dailyData={analytics.dailyData} />
            <EatingEventsChart dailyData={analytics.dailyData} />
            <WeightTrendChart dailyData={analytics.dailyData} />
            <SugarVsWeightChart sugarWeightData={analytics.sugarWeightData} />
            <MealCategoryChart mealData={analytics.mealData} />
            <MealTimingChart timingData={analytics.timingData} />
            <BehaviorInsightsCard insights={analytics.insights} />
            <TopRiskFoodsCard topRiskFoods={analytics.topRiskFoods} />
          </div>
        </>
      )}
    </div>
  );
}
