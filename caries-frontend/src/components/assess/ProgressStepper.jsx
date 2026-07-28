import React from "react";

export const STEPS = [
  { id: "profile", title: "Profile" },
  { id: "diet", title: "Nutrition" },
  { id: "smoking", title: "Smoking" },
  { id: "eating", title: "Eating Habits" },
];

export function ProgressStepper({ current }) {
  const idx = STEPS.findIndex(step => step.id === current);
  return (
    <div className="quiz-stepper">
      {STEPS.map((step, i) => (
        <div key={step.id} className={`quiz-step ${i === idx ? "active" : ""} ${i < idx ? "done" : ""}`}>
          <div className="quiz-step-dot">{i < idx ? "✓" : i + 1}</div>
          <span className="quiz-step-label">{step.title}</span>
        </div>
      ))}
    </div>
  );
}
