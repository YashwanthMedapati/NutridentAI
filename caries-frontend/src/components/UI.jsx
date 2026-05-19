import React from "react";

// ── RISK BADGE ─────────────────────────────────────────────────────────────────
export const RiskBadge = ({ risk }) => {
  const l = (risk || "").toLowerCase();
  const cls   = l.includes("high") ? "badge-high" : l.includes("medium") ? "badge-medium" : "badge-low";
  const label = l.includes("high") ? "High Risk"  : l.includes("medium") ? "Medium Risk"  : "Low Risk";
  return <span className={`badge ${cls}`}>{label}</span>;
};

// ── PROBABILITY BAR ────────────────────────────────────────────────────────────
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

// ── SECTION CARD ───────────────────────────────────────────────────────────────
export const SectionCard = ({ icon, title, children, className = "" }) => (
  <div className={`section-card ${className}`}>
    <div className="section-header">
      <span className="section-icon">{icon}</span>
      <h2 className="section-title">{title}</h2>
    </div>
    {children}
  </div>
);

// ── FIELD ──────────────────────────────────────────────────────────────────────
export const Field = ({ label, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
);

// ── STAT TILE ──────────────────────────────────────────────────────────────────
export const StatTile = ({ label, value, sub, accent }) => (
  <div className={`stat-tile ${accent ? "stat-accent" : ""}`}>
    <span className="stat-value">{value}</span>
    <span className="stat-label">{label}</span>
    {sub && <span className="stat-sub">{sub}</span>}
  </div>
);

// ── NUTRITION ROW ──────────────────────────────────────────────────────────────
export const NutritionGrid = ({ nutrition }) => {
  if (!nutrition) return null;
  const items = [
    { label: "Calories",    value: `${nutrition.energy_kcal ?? "—"} kcal` },
    { label: "Sugar",       value: `${nutrition.sugar_g ?? "—"} g` },
    { label: "Carbs",       value: `${nutrition.carbs_g ?? "—"} g` },
    { label: "Fat",         value: `${nutrition.fat_g ?? "—"} g` },
    { label: "Protein",     value: `${nutrition.protein_g ?? "—"} g` },
    { label: "Calcium",     value: `${nutrition.calcium_mg ?? "—"} mg` },
    { label: "Phosphorus",  value: `${nutrition.phosphorus_mg ?? "—"} mg` },
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

// ── SPINNER ────────────────────────────────────────────────────────────────────
export const Spinner = () => <span className="spinner" />;

// ── ALERT ──────────────────────────────────────────────────────────────────────
export const Alert = ({ type = "error", children }) => (
  <div className={`alert alert-${type}`}>{children}</div>
);

export const RiskBar = ({ score, level }) => {
  const maxScore = 10; // since your max is ~9
  const percentage = (score / maxScore) * 100;

  let color = "#22c55e"; // green
  if (level === "Medium") color = "#f59e0b"; // yellow
  if (level === "High") color = "#ef4444"; // red

  return (
    <div style={{ marginTop: "6px" }}>
      <div
        style={{
          height: "8px",
          background: "#333",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: color,
            transition: "0.3s",
          }}
        />
      </div>
      <span style={{ fontSize: "12px", color: "#ccc" }}>
        {level} Risk
      </span>
    </div>
  );
};