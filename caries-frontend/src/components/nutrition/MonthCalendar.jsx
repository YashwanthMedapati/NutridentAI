import React from "react";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({ monthDays, selectedDate, onSelectDate }) {
  return (
    <div className="journal-calendar">
      {WEEKDAY_LABELS.map(day => (
        <span key={day} className="calendar-weekday">{day}</span>
      ))}
      {monthDays.map(({ key, day, currentMonth, summary }) => (
        <button
          key={key}
          className={`calendar-day ${currentMonth ? "" : "muted"} ${selectedDate === key ? "active" : ""} ${summary.highRisk ? "risk-day" : ""}`}
          onClick={() => onSelectDate(key)}
        >
          <span className="calendar-day-num">{day}</span>
          {summary.count > 0 && <span className="calendar-day-meta">{summary.count} foods</span>}
          {summary.calories > 0 && <span className="calendar-day-meta">{summary.calories} kcal</span>}
          {summary.weight && <span className="calendar-day-meta">{summary.weight}kg</span>}
          {(summary.carbs > 0 || summary.sugar > 0) && (
            <span className="calendar-day-meta">C {summary.carbs} g / S {summary.sugar} g</span>
          )}
        </button>
      ))}
    </div>
  );
}
