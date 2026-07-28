import React from "react";
import { Alert } from "../UI";
import { DayTimeline } from "./DayTimeline";
import { WeekSummaryGrid } from "./WeekSummaryGrid";
import { MonthCalendar } from "./MonthCalendar";

const VIEW_OPTIONS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export function DailyJournalCard({
  selectedDateLabel,
  cloudSyncStatus,
  cloudSyncError,
  selectedDate,
  setSelectedDate,
  todayKey,
  viewMode,
  setViewMode,
  dayOptions,
  dateFoodCount,
  getWeightForDate,
  timelineEvents,
  weekSummary,
  monthDays,
  selectedWeight,
  totalCals,
  dayLogLength,
  weightInput,
  setWeightInput,
  onSaveWeight,
  onExportDay,
  onExportAll,
  canExportDay,
  canExportAll,
}) {
  return (
    <div className="daily-journal-card">
      <div className="daily-journal-head">
        <div>
          <span className="result-card-label">Daily Journal</span>
          <h2 className="daily-journal-title">{selectedDateLabel}</h2>
          <span className={`sync-pill sync-${cloudSyncStatus}`}>
            {cloudSyncStatus === "synced" ? "Cloud synced" : cloudSyncStatus === "syncing" ? "Syncing" : cloudSyncStatus === "error" ? "Sync issue" : "Local only"}
          </span>
        </div>
        <input
          className="journal-date-input"
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value || todayKey)}
        />
      </div>
      {cloudSyncError && <Alert type="warning">{cloudSyncError}</Alert>}

      <div className="journal-view-tabs">
        {VIEW_OPTIONS.map(option => (
          <button
            key={option.key}
            className={`journal-view-tab ${viewMode === option.key ? "active" : ""}`}
            onClick={() => setViewMode(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {viewMode !== "month" && (
        <div className="journal-date-strip">
          {dayOptions.map(date => {
            const foodCount = dateFoodCount(date);
            const weight = getWeightForDate(date);
            return (
              <button
                key={date}
                className={`journal-date-chip ${selectedDate === date ? "active" : ""}`}
                onClick={() => setSelectedDate(date)}
              >
                <span>{new Date(`${date}T12:00:00`).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                <small>{foodCount} foods{weight ? ` - ${weight}kg` : ""}</small>
              </button>
            );
          })}
        </div>
      )}

      {viewMode === "day" && <DayTimeline timelineEvents={timelineEvents} />}
      {viewMode === "week" && (
        <WeekSummaryGrid weekSummary={weekSummary} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      )}
      {viewMode === "month" && (
        <MonthCalendar monthDays={monthDays} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
      )}

      <div className="journal-metrics-grid">
        <div className="journal-metric">
          <span className="journal-metric-label">Weight</span>
          <strong>{selectedWeight ? `${selectedWeight} kg` : "Not logged"}</strong>
        </div>
        <div className="journal-metric">
          <span className="journal-metric-label">Calories</span>
          <strong>{Math.round(totalCals)} kcal</strong>
        </div>
        <div className="journal-metric">
          <span className="journal-metric-label">Eating Times</span>
          <strong>{dayLogLength}</strong>
        </div>
      </div>

      <div className="journal-weight-row">
        <input
          type="number"
          className="weight-input"
          min="1"
          step="0.1"
          placeholder="Enter weight in kg"
          value={weightInput}
          onChange={e => setWeightInput(e.target.value)}
        />
        <button className="btn-primary" onClick={onSaveWeight}>
          {selectedWeight ? "Update Weight" : "Log Weight"}
        </button>
        <button className="btn-ghost" onClick={onExportDay} disabled={!canExportDay}>
          Export Day CSV
        </button>
        <button className="btn-ghost" onClick={onExportAll} disabled={!canExportAll}>
          Export All CSV
        </button>
      </div>
    </div>
  );
}
