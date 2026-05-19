import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import { RiskBadge, ProbabilityBar, NutritionGrid, Alert, Spinner, Field } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const STEPS = [
  { id: "intro",   title: "Introduction" },
  { id: "profile", title: "Your Profile" },
  { id: "diet",    title: "Diet & Nutrition" },
  { id: "smoking", title: "Smoking Habits" },
  { id: "eating",  title: "Eating Habits" },
  { id: "food",    title: "Today's Food" },
  { id: "result",  title: "Your Results" },
];

const SUGAR_LIMIT = 50;
const CARB_LIMIT  = 275;

function ProgressStepper({ current }) {
  return (
    <div className="quiz-stepper">
      {STEPS.filter(s => s.id !== "intro").map((step, i) => {
        const idx = STEPS.findIndex(s => s.id === current);
        const done = i < idx - 1;
        const active = STEPS[idx]?.id === step.id;
        return (
          <div key={step.id} className={`quiz-step ${active ? "active" : ""} ${done ? "done" : ""}`}>
            <div className="quiz-step-dot">{done ? "✓" : i + 1}</div>
            <span className="quiz-step-label">{step.title}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Assess() {
  const { form, handleChange, result, loading, runAssessment, setForm } = useApp();
  const [step, setStep] = useState("intro");

  const next = (to) => setStep(to);

  const handleSubmit = () => {
    setStep("result");
    runAssessment();
  };

  const restart = () => {
    setStep("intro");
    setForm(f => ({ ...f }));
  };

  const prob    = result?.patient_risk?.risk_probability || 0;
  const gaugeColor = p => p > 0.7 ? "#ef4444" : p > 0.4 ? "#f59e0b" : "#22c55e";

  const riskBreakdownData = result?.patient_risk?.risk_breakdown
    ? Object.entries(result.patient_risk.risk_breakdown).map(([factor, value]) => ({ factor, value }))
    : [];

  const sugarPct = Math.min((Number(form.DR1TSUGR || 0) / SUGAR_LIMIT) * 100, 100);
  const carbPct  = Math.min((Number(form.DR1TCARB || 0) / CARB_LIMIT)  * 100, 100);

  const generateLifestyleCoach = () => {
    const reduce = [], increase = [], actions = [];
    if (Number(form.DR1TSUGR) > 50)  reduce.push("Daily sugar intake — aim for under 50g/day");
    if (Number(form.DR1TCARB) > 275) reduce.push("Carbohydrate load — reduce refined carbs");
    if (Number(form.DBD900) > 3)     reduce.push("Fast food frequency — limit to 1–2×/week");
    if (form.SMQ040 === "1")         reduce.push("Smoking — reduces saliva, increasing decay risk");
    if (Number(form.DR1TCALC) < 600) increase.push("Calcium intake — dairy, leafy greens, fortified foods");
    if (Number(form.DR1TPHOS) < 500) increase.push("Phosphorus — eggs, fish, nuts");
    if (Number(form.DBD895) > 10)    reduce.push("Meals outside home — harder to control sugar/carb content");
    if (reduce.length === 0 && increase.length === 0) {
      actions.push("✅ Your profile looks healthy — keep maintaining your current habits.");
    } else {
      if (reduce.length)   actions.push(...reduce.map(r => `🔻 Reduce: ${r}`));
      if (increase.length) actions.push(...increase.map(r => `🔺 Increase: ${r}`));
      actions.push("🪥 Brush twice daily with fluoride toothpaste");
      actions.push("🦷 Schedule a dental check-up every 6 months");
      actions.push("💧 Drink water after sugary meals to neutralise acid");
    }
    return actions;
  };

  return (
    <div className="page">
      {step !== "intro" && step !== "result" && <ProgressStepper current={step} />}

      {/* INTRO */}
      {step === "intro" && (
        <div className="quiz-intro">
          <div className="quiz-intro-icon">🦷</div>
          <h1 className="quiz-intro-title">Caries Risk Assessment</h1>
          <p className="quiz-intro-sub">
            We'll ask you a short series of questions about your lifestyle, diet, and smoking habits
            to estimate your rough dental caries risk. This takes about 2 minutes.
          </p>
          <div className="quiz-intro-bullets">
            {["Your age, gender, and body metrics", "What you typically eat and drink", "Smoking habits", "How often you eat outside the home"].map(b => (
              <div key={b} className="quiz-intro-bullet">✓ {b}</div>
            ))}
          </div>
          <p className="quiz-intro-disclaimer">
            ⚠️ For educational use only. Not a clinical diagnosis.
          </p>
          <button className="btn-primary large" onClick={() => next("profile")}>Start Assessment →</button>
        </div>
      )}

      {/* STEP: PROFILE */}
      {step === "profile" && (
        <div className="quiz-step-panel">
          <div className="quiz-step-header">
            <span className="quiz-step-tag">Step 1 of 5</span>
            <h2 className="quiz-step-title">Tell us about yourself</h2>
            <p className="quiz-step-sub">We use age and gender to calibrate the risk model.</p>
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
            <Field label="Weight (kg)">
              <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 70" />
            </Field>
            <Field label="Goal Weight (kg)">
              <input type="number" name="goal_weight" value={form.goal_weight} onChange={handleChange} placeholder="e.g. 65" />
            </Field>
          </div>
          <div className="quiz-nav">
            <button className="btn-ghost" onClick={() => next("intro")}>← Back</button>
            <button className="btn-primary" onClick={() => next("diet")}>Next: Diet →</button>
          </div>
        </div>
      )}

      {/* STEP: DIET */}
      {step === "diet" && (
        <div className="quiz-step-panel">
          <div className="quiz-step-header">
            <span className="quiz-step-tag">Step 2 of 5</span>
            <h2 className="quiz-step-title">Your daily diet</h2>
            <p className="quiz-step-sub">Estimate your typical daily intake. Rough values are fine.</p>
          </div>
          <div className="quiz-fields two-col">
            <Field label="Daily Sugar (g)">
              <input type="number" name="DR1TSUGR" value={form.DR1TSUGR} onChange={handleChange} placeholder="e.g. 60" />
            </Field>
            <Field label="Carbohydrates (g)">
              <input type="number" name="DR1TCARB" value={form.DR1TCARB} onChange={handleChange} placeholder="e.g. 200" />
            </Field>
            <Field label="Total Fat (g)">
              <input type="number" name="DR1TTFAT" value={form.DR1TTFAT} onChange={handleChange} placeholder="e.g. 65" />
            </Field>
            <Field label="Calories (kcal)">
              <input type="number" name="DR1TKCAL" value={form.DR1TKCAL} onChange={handleChange} placeholder="e.g. 2000" />
            </Field>
            <Field label="Calcium (mg) — from dairy, greens">
              <input type="number" name="DR1TCALC" value={form.DR1TCALC} onChange={handleChange} placeholder="e.g. 800" />
            </Field>
            <Field label="Phosphorus (mg) — from eggs, meat">
              <input type="number" name="DR1TPHOS" value={form.DR1TPHOS} onChange={handleChange} placeholder="e.g. 600" />
            </Field>
            <Field label="Saturated Fat (g)">
              <input type="number" name="DR1TSFAT" value={form.DR1TSFAT} onChange={handleChange} placeholder="e.g. 20" />
            </Field>
          </div>
          <div className="quiz-nav">
            <button className="btn-ghost" onClick={() => next("profile")}>← Back</button>
            <button className="btn-primary" onClick={() => next("smoking")}>Next: Smoking →</button>
          </div>
        </div>
      )}

      {/* STEP: SMOKING */}
      {step === "smoking" && (
        <div className="quiz-step-panel">
          <div className="quiz-step-header">
            <span className="quiz-step-tag">Step 3 of 5</span>
            <h2 className="quiz-step-title">Smoking habits</h2>
            <p className="quiz-step-sub">Smoking reduces saliva production and significantly raises caries risk.</p>
          </div>
          <div className="quiz-fields">
            <Field label="Do you currently smoke?">
              <select name="SMQ040" value={form.SMQ040} onChange={handleChange}>
                <option value="3">No — not at all</option>
                <option value="2">Some days</option>
                <option value="1">Yes — every day</option>
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
            <button className="btn-ghost" onClick={() => next("diet")}>← Back</button>
            <button className="btn-primary" onClick={() => next("eating")}>Next: Eating Habits →</button>
          </div>
        </div>
      )}

      {/* STEP: EATING HABITS */}
      {step === "eating" && (
        <div className="quiz-step-panel">
          <div className="quiz-step-header">
            <span className="quiz-step-tag">Step 4 of 5</span>
            <h2 className="quiz-step-title">Eating habits</h2>
            <p className="quiz-step-sub">How often you eat outside affects carb and sugar exposure.</p>
          </div>
          <div className="quiz-fields two-col">
            <Field label="Meals not home-cooked (per week)">
              <input type="number" name="DBD895" value={form.DBD895} onChange={handleChange} placeholder="0–21" />
            </Field>
            <Field label="Fast food meals (per week)">
              <input type="number" name="DBD900" value={form.DBD900} onChange={handleChange} placeholder="0–21" />
            </Field>
            <Field label="Ready-to-eat foods (per week)">
              <input type="number" name="DBD905" value={form.DBD905} onChange={handleChange} placeholder="0–21" />
            </Field>
            <Field label="Frozen meals (per week)">
              <input type="number" name="DBD910" value={form.DBD910} onChange={handleChange} placeholder="0–21" />
            </Field>
          </div>
          <div className="quiz-nav">
            <button className="btn-ghost" onClick={() => next("smoking")}>← Back</button>
            <button className="btn-primary" onClick={() => next("food")}>Next: Food Check →</button>
          </div>
        </div>
      )}

      {/* STEP: FOOD */}
      {step === "food" && (
        <div className="quiz-step-panel">
          <div className="quiz-step-header">
            <span className="quiz-step-tag">Step 5 of 5</span>
            <h2 className="quiz-step-title">Food check</h2>
            <p className="quiz-step-sub">Enter a food you're eating today to include its cariogenic score in your result.</p>
          </div>
          <div className="quiz-fields">
            <Field label="Food name">
              <input type="text" name="food_name" value={form.food_name} onChange={handleChange} placeholder="e.g. pizza, apple, chocolate cake" />
            </Field>
          </div>
          <div className="quiz-nav">
            <button className="btn-ghost" onClick={() => next("eating")}>← Back</button>
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? <><Spinner /> Calculating…</> : "Get My Results →"}
            </button>
          </div>
        </div>
      )}

      {/* STEP: RESULTS */}
      {step === "result" && (
        <div className="results-section">
          {loading && (
            <div className="result-loading">
              <Spinner />
              <span>Analysing your profile…</span>
            </div>
          )}

          {result?.error && <Alert type="error">{result.error}</Alert>}

          {result && !result.error && !loading && (
            <>
              <div className="results-section-header">
                <h2 className="results-title">Your Risk Assessment Results</h2>
                <button className="btn-ghost" onClick={restart}>Start Over</button>
              </div>

              {/* TOP ROW */}
              <div className="results-top-grid">
                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Patient Risk</span>
                    <RiskBadge risk={result.patient_risk?.prediction} />
                  </div>
                  <div className="result-metric">
                    <span className="micro-label">Risk Probability</span>
                    <ProbabilityBar value={result.patient_risk?.risk_probability} />
                  </div>
                  {result.patient_risk?.why?.length > 0 && (
                    <div className="why-block">
                      <span className="micro-label">Contributing Factors</span>
                      <ul className="reason-list">
                        {result.patient_risk.why.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="result-card center-card">
                  <div className="result-card-head"><span className="result-card-label">Risk Gauge</span></div>
                  <div className="gauge-wrap">
                    <CircularProgressbar
                      value={prob * 100}
                      text={`${(prob * 100).toFixed(0)}%`}
                      styles={buildStyles({
                        textColor: "var(--text)", pathColor: gaugeColor(prob),
                        trailColor: "var(--track)", textSize: "20px",
                      })}
                    />
                  </div>
                </div>

                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Food Risk</span>
                    <RiskBadge risk={result.food_risk?.risk?.food_risk_level} />
                  </div>
                  <div className="result-metric">
                    <span className="micro-label">Matched Food</span>
                    <span className="metric-value">{result.food_risk?.usda_match}</span>
                  </div>
                  <div className="result-metric">
                    <span className="micro-label">Risk Score</span>
                    <span className="metric-value mono">{result.food_risk?.risk?.food_risk_score}/10</span>
                  </div>
                  {result.food_risk?.risk?.reasons?.length > 0 && (
                    <div className="why-block">
                      <span className="micro-label">Reasons</span>
                      <ul className="reason-list">
                        {result.food_risk.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* CHARTS */}
              {riskBreakdownData.length > 0 && (
                <div className="charts-row">
                  <div className="result-card">
                    <div className="result-card-head"><span className="result-card-label">Risk Factor Breakdown</span></div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={riskBreakdownData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <XAxis dataKey="factor" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 12 }} />
                        <YAxis stroke="var(--text3)" domain={[0, 1]} tick={{ fill: "var(--text2)", fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {riskBreakdownData.map((e, i) => (
                            <Cell key={i} fill={e.value >= 0.8 ? "#ef4444" : e.value >= 0.5 ? "#f59e0b" : "#22c55e"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="result-card">
                    <div className="result-card-head"><span className="result-card-label">Daily Intake vs Limits</span></div>
                    <div className="limit-block">
                      <div className="limit-row">
                        <div className="limit-labels">
                          <span>Sugar</span>
                          <span className={Number(form.DR1TSUGR) > SUGAR_LIMIT ? "over-limit" : ""}>{form.DR1TSUGR || 0}g / {SUGAR_LIMIT}g</span>
                        </div>
                        <div className="limit-track"><div className="limit-fill sugar-fill" style={{ width: `${sugarPct}%` }} /></div>
                      </div>
                      <div className="limit-row">
                        <div className="limit-labels">
                          <span>Carbs</span>
                          <span className={Number(form.DR1TCARB) > CARB_LIMIT ? "over-limit" : ""}>{form.DR1TCARB || 0}g / {CARB_LIMIT}g</span>
                        </div>
                        <div className="limit-track"><div className="limit-fill carb-fill" style={{ width: `${carbPct}%` }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NUTRITION */}
              {result.food_risk?.nutrition && (
                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Food Nutrition — {result.food_risk.usda_match}</span>
                  </div>
                  <NutritionGrid nutrition={result.food_risk.nutrition} />
                </div>
              )}

              {/* AI LIFESTYLE COACH */}
              <div className="result-card coach-card">
                <div className="result-card-head">
                  <span className="result-card-label">🤖 AI Lifestyle Coach</span>
                </div>
                <p className="advice-text">{result.final_advice}</p>
                <div className="coach-actions">
                  {generateLifestyleCoach().map((action, i) => (
                    <div key={i} className="coach-action">{action}</div>
                  ))}
                </div>
                {result.food_risk?.risk?.consumption_advice && (
                  <div className="consumption-block">
                    <span className="micro-label">Food Guidance</span>
                    <p>{result.food_risk.risk.consumption_advice}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
