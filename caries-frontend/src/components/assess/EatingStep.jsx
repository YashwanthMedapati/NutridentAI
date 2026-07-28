import React from "react";
import { Field, Spinner } from "../UI";

export function EatingStep({ form, handleChange, onBack, onSubmit, loading }) {
  return (
    <div className="quiz-step-panel">
      <div className="quiz-step-header">
        <span className="quiz-step-tag">Step 4 of 4</span>
        <h2 className="quiz-step-title">Eating habits</h2>
        <p className="quiz-step-sub">Frequency matters because every eating occasion can create an acid exposure window.</p>
      </div>
      <div className="quiz-fields two-col">
        <Field label="Meals not home-cooked (per week)">
          <input type="number" name="DBD895" value={form.DBD895} onChange={handleChange} placeholder="0-21" />
        </Field>
        <Field label="Fast food meals (per week)">
          <input type="number" name="DBD900" value={form.DBD900} onChange={handleChange} placeholder="0-21" />
        </Field>
        <Field label="Ready-to-eat foods (per week)">
          <input type="number" name="DBD905" value={form.DBD905} onChange={handleChange} placeholder="0-21" />
        </Field>
        <Field label="Frozen meals (per week)">
          <input type="number" name="DBD910" value={form.DBD910} onChange={handleChange} placeholder="0-21" />
        </Field>
      </div>
      <div className="quiz-nav">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onSubmit} disabled={loading}>
          {loading ? <><Spinner /> Calculating...</> : "Get My Results →"}
        </button>
      </div>
    </div>
  );
}
