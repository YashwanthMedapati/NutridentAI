import React from "react";

export function DayTimeline({ timelineEvents }) {
  return (
    <div className="day-timeline-card">
      <div className="result-card-head">
        <span className="result-card-label">24 Hour Timeline</span>
        <span className="micro-label">{timelineEvents.length} logged events</span>
      </div>
      <div className="day-timeline">
        {Array.from({ length: 24 }, (_, hour) => {
          const events = timelineEvents.filter(event => event.time.getHours() === hour);
          return (
            <div className="timeline-hour" key={hour}>
              <span className="timeline-hour-label">{String(hour).padStart(2, "0")}:00</span>
              <div className="timeline-hour-events">
                {events.length === 0 ? (
                  <span className="timeline-empty-line" />
                ) : events.map((event, index) => (
                  <div className={`timeline-event ${event.type}`} key={`${event.type}-${hour}-${index}`}>
                    <strong>{event.label}</strong>
                    <span>{event.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} / {event.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
