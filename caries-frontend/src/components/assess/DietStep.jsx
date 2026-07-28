import React from "react";
import { Field } from "../UI";

export function DietStep({ form, handleChange, plan, manualNutrition, setManualNutrition, onBack, onNext }) {
  return (
    <div className="quiz-step-panel">
      <div className="quiz-step-header">
        <span className="quiz-step-tag">Step 2 of 4</span>
        <h2 className="quiz-step-title">Nutrition details</h2>
        <p className="quiz-step-sub">Skip this if you do not track macros. We will use maintenance-based estimates instead.</p>
      </div>
      <div className="choice-row">
        <button className={`choice-card ${!manualNutrition ? "active" : ""}`} onClick={() => setManualNutrition(false)}>
          <strong>Skip nutrition details</strong>
          <span>Use safe defaults based on your profile and maintenance calories.</span>
        </button>
        <button className={`choice-card ${manualNutrition ? "active" : ""}`} onClick={() => setManualNutrition(true)}>
          <strong>Enter manually</strong>
          <span>I track calories/macros and want the risk model to use my numbers.</span>
        </button>
      </div>
      {manualNutrition && (
        <div className="quiz-fields two-col">
          <Field label="Daily Sugar (g)">
            <input type="number" name="DR1TSUGR" value={form.DR1TSUGR} onChange={handleChange} placeholder="e.g. 45" />
          </Field>
          <Field label="Carbohydrates (g)">
            <input type="number" name="DR1TCARB" value={form.DR1TCARB} onChange={handleChange} placeholder="e.g. 220" />
          </Field>
          <Field label="Total Fat (g)">
            <input type="number" name="DR1TTFAT" value={form.DR1TTFAT} onChange={handleChange} placeholder="e.g. 65" />
          </Field>
          <Field label="Calories (kcal)">
            <input type="number" name="DR1TKCAL" value={form.DR1TKCAL} onChange={handleChange} placeholder={String(plan?.maintenance || 2000)} />
          </Field>
          <Field label="Calcium (mg)">
            <input type="number" name="DR1TCALC" value={form.DR1TCALC} onChange={handleChange} placeholder="e.g. 800" />
          </Field>
          <Field label="Phosphorus (mg)">
            <input type="number" name="DR1TPHOS" value={form.DR1TPHOS} onChange={handleChange} placeholder="e.g. 700" />
          </Field>
          <Field label="Saturated Fat (g)">
            <input type="number" name="DR1TSFAT" value={form.DR1TSFAT} onChange={handleChange} placeholder="e.g. 20" />
          </Field>
        </div>
      )}
      <div className="quiz-nav">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn-primary" onClick={onNext}>Next: Smoking →</button>
      </div>
    </div>
  );
}
