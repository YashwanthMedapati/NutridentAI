import React from "react";

export function WeekSummaryGrid({ weekSummary, selectedDate, onSelectDate }) {
  return (
    <div className="week-summary-grid">
      {weekSummary.map(day => (
        <button
          key={day.date}
          className={`week-summary-card ${selectedDate === day.date ? "active" : ""}`}
          onClick={() => onSelectDate(day.date)}
        >
          <strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</strong>
          <span>{day.calories} kcal / {day.count} foods</span>
          <span>{day.weight ? `${day.weight} kg` : "No weight"}</span>
          <small>C {day.carbs} g / S {day.sugar} g / P {day.protein} g</small>
        </button>
      ))}
    </div>
  );
}
