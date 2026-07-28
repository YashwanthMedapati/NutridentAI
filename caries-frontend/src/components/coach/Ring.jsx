import React from "react";

// Shared circular progress indicator used across the Dashboard and Water
// tabs (wellness score, hydration, nutrient rings).
export function Ring({ value, max, color, size = 80, label, sub }) {
  const pct    = Math.min(value / max, 1);
  const r      = (size - 10) / 2;
  const circ   = 2 * Math.PI * r;
  const dash   = pct * circ;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--track)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="ring-center">
        <span className="ring-label">{label}</span>
        {sub && <span className="ring-sub">{sub}</span>}
      </div>
    </div>
  );
}
