import React from "react";

export function MetricCard({ label, value, detail }) {
  return (
    <div className="analytics-stat-card">
      <span className="analytics-stat-label">{label}</span>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}
