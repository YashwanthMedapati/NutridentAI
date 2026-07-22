import React from "react";

export const RiskBadge = ({ risk }) => {
  const labelSource = (risk || "").toLowerCase();
  const cls = labelSource.includes("high") ? "badge-high" : labelSource.includes("medium") ? "badge-medium" : "badge-low";
  const label = labelSource.includes("high") ? "High Risk" : labelSource.includes("medium") ? "Medium Risk" : "Low Risk";
  return <span className={`badge ${cls}`}>{label}</span>;
};

export const ProbabilityBar = ({ value }) => {
  const pct = Math.round((parseFloat(value) || 0) * 100);
  const cls = pct >= 70 ? "bar-high" : pct >= 40 ? "bar-medium" : "bar-low";
  return (
    <div className="prob-wrap">
      <div className="prob-track">
        <div className={`prob-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="prob-label">{pct}%</span>
    </div>
  );
};

export const SectionCard = ({ icon, title, children, className = "" }) => (
  <div className={`section-card ${className}`}>
    <div className="section-header">
      <span className="section-icon">{icon}</span>
      <h2 className="section-title">{title}</h2>
    </div>
    {children}
  </div>
);

export const Field = ({ label, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
);

export const StatTile = ({ label, value, sub, accent, icon }) => (
  <div className={`stat-tile ${accent ? "stat-accent" : ""}`}>
    {icon && <span className="stat-icon">{icon}</span>}
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
    {sub && <span className="stat-sub">{sub}</span>}
  </div>
);

function formatValue(value, unit = "") {
  if (value === undefined || value === null || value === "") return "-";
  const number = Number(value);
  const clean = Number.isFinite(number) ? Math.round(number * 10) / 10 : value;
  return unit ? `${clean} ${unit}` : clean;
}

export const NutritionGrid = ({ nutrition }) => {
  if (!nutrition) return null;
  const items = [
    { label: "Calories", value: formatValue(nutrition.energy_kcal, "kcal") },
    { label: "Sugar", value: formatValue(nutrition.sugar_g, "g") },
    { label: "Carbs", value: formatValue(nutrition.carbs_g, "g") },
    { label: "Fat", value: formatValue(nutrition.fat_g, "g") },
    { label: "Protein", value: formatValue(nutrition.protein_g, "g") },
    { label: "Calcium", value: formatValue(nutrition.calcium_mg, "mg") },
    { label: "Phosphorus", value: formatValue(nutrition.phosphorus_mg, "mg") },
  ];
  return (
    <div className="nutrition-grid">
      {items.map(({ label, value }) => (
        <div className="nutrition-item" key={label}>
          <span className="nutrition-label">{label}</span>
          <span className="nutrition-value">{value}</span>
        </div>
      ))}
    </div>
  );
};

export const MacroAnalysis = ({ nutrition }) => {
  if (!nutrition) return null;
  const calories = Number(nutrition.energy_kcal || 0);
  const macros = [
    { label: "Carbs", value: Number(nutrition.carbs_g || 0), kcalPerGram: 4, className: "macro-carb" },
    { label: "Protein", value: Number(nutrition.protein_g || 0), kcalPerGram: 4, className: "macro-protein" },
    { label: "Fat", value: Number(nutrition.fat_g || 0), kcalPerGram: 9, className: "macro-fat" },
    { label: "Sugar", value: Number(nutrition.sugar_g || 0), kcalPerGram: 4, className: "macro-sugar" },
  ];
  return (
    <div className="macro-analysis">
      {macros.map(item => {
        const macroCalories = item.value * item.kcalPerGram;
        const pct = calories ? Math.min(Math.round((macroCalories / calories) * 100), 100) : 0;
        return (
          <div className="macro-row" key={item.label}>
            <div className="macro-row-head">
              <span>{item.label}</span>
              <strong>{formatValue(item.value, "g")}</strong>
              <small>{Math.round(macroCalories)} kcal est.</small>
            </div>
            <div className="macro-track">
              <div className={`macro-fill ${item.className}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Spinner = () => <span className="spinner" />;

export const Alert = ({ type = "error", children }) => (
  <div className={`alert alert-${type}`}>{children}</div>
);

export const RiskBar = ({ score = 0, level }) => {
  const percentage = Math.min((Number(score || 0) / 10) * 100, 100);
  let color = "#22c55e";
  if (level === "Medium") color = "#f59e0b";
  if (level === "High") color = "#ef4444";

  return (
    <div className="risk-mini-bar">
      <div className="risk-mini-track">
        <div style={{ width: `${percentage}%`, background: color }} />
      </div>
      <span>{level || "Low"} Risk</span>
    </div>
  );
};
