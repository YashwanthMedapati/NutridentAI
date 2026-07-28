import React from "react";
import { Field } from "../UI";

export function SmokingStep({ form, handleChange, onBack, onNext }) {
  return (
    <div className="quiz-step-panel">
      <div className="quiz-step-header">
        <span className="quiz-step-tag">Step 3 of 4</span>
        <h2 className="quiz-step-title">Smoking habits</h2>
        <p className="quiz-step-sub">Smoking reduces saliva production and can raise caries risk.</p>
      </div>
      <div className="quiz-fields">
        <Field label="Do you currently smoke?">
          <select name="SMQ040" value={form.SMQ040} onChange={handleChange}>
            <option value="3">No - not at all</option>
            <option value="2">Some days</option>
            <option value="1">Yes - every day</option>
          </select>
        </Field>
        {form.SMQ040 !== "3" && (
          <>
            <Field label="Cigarettes per day">
              <input type="number" name="SMD650" value={form.SMD650} onChange={handleChange} placeholder="e.g. 10" />
            </Field>
            <Field label="Age you started smoking">
              <input type="number" name="SMD030" value={form.SMD030} onChange={handleChange} placeholder="e.g. 18" />
            </Field>
          </>
        )}
      </div>
      <div className="quiz-nav">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Next: Eating Habits →</button>
      </div>
    </div>
  );
}
