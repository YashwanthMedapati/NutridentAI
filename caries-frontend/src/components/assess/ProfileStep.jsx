import React from "react";
import { Field } from "../UI";

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Light activity",
  moderate: "Moderate activity",
  active: "Active",
  athlete: "Very active",
};

export function ProfileStep({ form, handleChange, plan, onBack, onNext }) {
  return (
    <div className="quiz-step-panel">
      <div className="quiz-step-header">
        <span className="quiz-step-tag">Step 1 of 4</span>
        <h2 className="quiz-step-title">Tell us about yourself</h2>
        <p className="quiz-step-sub">We use this to estimate maintenance calories and personalize your Coach targets.</p>
      </div>
      <div className="quiz-fields two-col">
        <Field label="Age (years)">
          <input type="number" name="RIDAGEYR" value={form.RIDAGEYR} onChange={handleChange} placeholder="e.g. 28" />
        </Field>
        <Field label="Gender">
          <select name="RIAGENDR" value={form.RIAGENDR} onChange={handleChange}>
            <option value="1">Male</option>
            <option value="2">Female</option>
          </select>
        </Field>
        <Field label="Height (cm)">
          <input type="number" name="height" value={form.height} onChange={handleChange} placeholder="e.g. 170" />
        </Field>
        <Field label="Current Weight (kg)">
          <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 70" />
        </Field>
        <Field label="Goal Weight (kg)">
          <input type="number" name="goal_weight" value={form.goal_weight} onChange={handleChange} placeholder="e.g. 65" />
        </Field>
        <Field label="Reach goal by">
          <input type="date" name="goal_date" value={form.goal_date || ""} onChange={handleChange} />
        </Field>
        <Field label="Physical activity">
          <select name="activity_level" value={form.activity_level || "sedentary"} onChange={handleChange}>
            {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
      </div>
      {plan && (
        <div className="assessment-plan-card">
          <span className="micro-label">Estimated from your profile</span>
          <strong>{plan.maintenance} kcal maintenance</strong>
          <p>{plan.target} kcal daily target with {plan.macros.protein_g} g protein, {plan.macros.carbs_g} g carbs, and {plan.macros.fat_g} g fat.</p>
        </div>
      )}
      <div className="quiz-nav">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Next: Nutrition →</button>
      </div>
    </div>
  );
}
