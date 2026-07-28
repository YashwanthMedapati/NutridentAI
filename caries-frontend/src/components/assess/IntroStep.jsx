import React from "react";

const BULLETS = [
  "Maintenance calories from your body metrics and activity",
  "Optional manual nutrition if you already track macros",
  "Smoking and eating-frequency risk factors",
  "Coach handoff with calorie and macro targets",
];

export function IntroStep({ onStart }) {
  return (
    <div className="quiz-intro">
      <div className="quiz-intro-icon">🦷</div>
      <h1 className="quiz-intro-title">Caries Risk Assessment</h1>
      <p className="quiz-intro-sub">
        This assessment estimates your baseline dental caries risk from your profile, smoking,
        eating habits, and optional nutrition data. Food-by-food analysis now lives in Analyze Food.
      </p>
      <div className="quiz-intro-bullets">
        {BULLETS.map(item => <div key={item} className="quiz-intro-bullet">✓ {item}</div>)}
      </div>
      <p className="quiz-intro-disclaimer">For educational use only. Not a clinical diagnosis.</p>
      <button className="btn-primary large" onClick={onStart}>Start Assessment →</button>
    </div>
  );
}
