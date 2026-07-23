import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useCoach } from "../context/CoachContext";
import { RiskBadge, ProbabilityBar, Alert, Spinner, Field } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const STEPS = [
  { id: "profile", title: "Profile" },
  { id: "diet", title: "Nutrition" },
  { id: "smoking", title: "Smoking" },
  { id: "eating", title: "Eating Habits" },
];

const ACTIVITY_LABELS = {
  sedentary: "Sedentary",
  light: "Light activity",
  moderate: "Moderate activity",
  active: "Active",
  athlete: "Very active",
};

function ProgressStepper({ current }) {
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

function buildCoachProfile(form, plan) {
  const current = Number(form.weight || 0);
  const goal = Number(form.goal_weight || current);
  return {
    age: form.RIDAGEYR || "",
    gender: form.RIAGENDR || "1",
    height: form.height || "",
    weight: form.weight || "",
    goal_weight: form.goal_weight || "",
    goal_type: goal < current ? "lose" : goal > current ? "gain" : "maintain",
    activity_level: form.activity_level || "sedentary",
    goal_date: form.goal_date || "",
    maintenance_calories: plan?.maintenance ? String(plan.maintenance) : "",
    calorie_target: plan?.target ? String(plan.target) : "",
    protein_target_g: plan?.macros?.protein_g ? String(plan.macros.protein_g) : "",
    carbs_target_g: plan?.macros?.carbs_g ? String(plan.macros.carbs_g) : "",
    fat_target_g: plan?.macros?.fat_g ? String(plan.macros.fat_g) : "",
    sugar_limit_g: plan?.macros?.sugar_g ? String(plan.macros.sugar_g) : "",
    fiber_target_g: plan?.macros?.fiber_g ? String(plan.macros.fiber_g) : "",
  };
}

export default function Assess() {
  const navigate = useNavigate();
  const { form, handleChange, result, loading, runAssessment, setForm, calculateCalories } = useApp();
  const { setProfile } = useCoach();
  const [step, setStep] = useState("intro");
  const [manualNutrition, setManualNutrition] = useState(false);

  const plan = useMemo(() => calculateCalories(form), [calculateCalories, form]);
  const prob = result?.patient_risk?.risk_probability || 0;
  const gaugeColor = value => value > 0.7 ? "var(--high)" : value > 0.4 ? "var(--medium)" : "var(--low)";
  const modelConfidence = prob ? Math.max(prob, 1 - prob) : 0;
  const confidenceLabel = modelConfidence >= 0.82
    ? "High confidence: strong pattern match"
    : modelConfidence >= 0.58
      ? "Medium confidence: mixed diet/smoking signals"
      : "Review needed: add more complete inputs";
  const riskBreakdownData = result?.patient_risk?.risk_breakdown
    ? Object.entries(result.patient_risk.risk_breakdown).map(([factor, value]) => ({ factor, value }))
    : [];

  const setDietDefaults = () => {
    const calories = plan?.maintenance || 2000;
    setForm(prev => ({
      ...prev,
      DR1TKCAL: prev.DR1TKCAL || String(calories),
      DR1TCARB: prev.DR1TCARB || String(Math.round((calories * 0.45) / 4)),
      DR1TTFAT: prev.DR1TTFAT || String(Math.round((calories * 0.3) / 9)),
      DR1TSFAT: prev.DR1TSFAT || String(Math.round((calories * 0.1) / 9)),
      DR1TSUGR: prev.DR1TSUGR || "40",
      DR1TCALC: prev.DR1TCALC || "800",
      DR1TPHOS: prev.DR1TPHOS || "700",
    }));
  };

  const submitAssessment = () => {
    setDietDefaults();
    const nextPlan = calculateCalories(form);
    setProfile(prev => ({ ...prev, ...buildCoachProfile(form, nextPlan) }));
    setStep("result");
    runAssessment();
  };

  const restart = () => setStep("intro");

  return (
    <div className="page assess-page">
      {step !== "intro" && step !== "result" && <ProgressStepper current={step} />}

      {step === "intro" && (
        <div className="quiz-intro">
          <div className="quiz-intro-icon">🦷</div>
          <h1 className="quiz-intro-title">Caries Risk Assessment</h1>
          <p className="quiz-intro-sub">
            This assessment estimates your baseline dental caries risk from your profile, smoking,
            eating habits, and optional nutrition data. Food-by-food analysis now lives in Analyze Food.
          </p>
          <div className="quiz-intro-bullets">
            {[
              "Maintenance calories from your body metrics and activity",
              "Optional manual nutrition if you already track macros",
              "Smoking and eating-frequency risk factors",
              "Coach handoff with calorie and macro targets",
            ].map(item => <div key={item} className="quiz-intro-bullet">✓ {item}</div>)}
          </div>
          <p className="quiz-intro-disclaimer">For educational use only. Not a clinical diagnosis.</p>
          <button className="btn-primary large" onClick={() => setStep("profile")}>Start Assessment →</button>
        </div>
      )}

      {step === "profile" && (
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
            <button className="btn-ghost" onClick={() => setStep("intro")}>← Back</button>
            <button className="btn-primary" onClick={() => setStep("diet")}>Next: Nutrition →</button>
          </div>
        </div>
      )}

      {step === "diet" && (
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
            <button className="btn-ghost" onClick={() => setStep("profile")}>← Back</button>
            <button className="btn-primary" onClick={() => { if (!manualNutrition) setDietDefaults(); setStep("smoking"); }}>Next: Smoking →</button>
          </div>
        </div>
      )}

      {step === "smoking" && (
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
            <button className="btn-ghost" onClick={() => setStep("diet")}>← Back</button>
            <button className="btn-primary" onClick={() => setStep("eating")}>Next: Eating Habits →</button>
          </div>
        </div>
      )}

      {step === "eating" && (
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
            <button className="btn-ghost" onClick={() => setStep("smoking")}>← Back</button>
            <button className="btn-primary" onClick={submitAssessment} disabled={loading}>
              {loading ? <><Spinner /> Calculating...</> : "Get My Results →"}
            </button>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="results-section">
          {loading && (
            <div className="result-loading">
              <Spinner />
              <span>Analysing your profile...</span>
            </div>
          )}

          {result?.error && <Alert type="error">{result.error}</Alert>}

          {result && !result.error && !loading && (
            <>
              <div className="results-section-header">
                <h2 className="results-title">Your Risk Assessment Results</h2>
                <div className="result-actions">
                  <button className="btn-ghost" onClick={restart}>Start Over</button>
                  <button className="btn-primary" onClick={() => navigate("/coach")}>Open Coach Plan →</button>
                </div>
              </div>

              <div className="results-top-grid">
                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Baseline Caries Risk</span>
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
                        {result.patient_risk.why.map((reason, index) => <li key={index}>{reason}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Model Confidence</span>
                    <Link className="explain-inline-link" to="/explain">Why this score?</Link>
                  </div>
                  <h3 className="confidence-title">{confidenceLabel}</h3>
                  <div className="confidence-meter">
                    <span style={{ width: `${Math.round(modelConfidence * 100)}%` }} />
                  </div>
                  <p className="fine-print">
                    Confidence reflects how decisive the patient model is from your age, diet,
                    smoking, minerals, and eating-frequency inputs.
                  </p>
                </div>

                <div className="result-card center-card">
                  <div className="result-card-head"><span className="result-card-label">Risk Gauge</span></div>
                  <div className="gauge-wrap">
                    <CircularProgressbar
                      value={prob * 100}
                      text={`${(prob * 100).toFixed(0)}%`}
                      styles={buildStyles({
                        textColor: "var(--text)",
                        pathColor: gaugeColor(prob),
                        trailColor: "var(--track)",
                        textSize: "20px",
                      })}
                    />
                  </div>
                </div>

                <div className="result-card">
                  <div className="result-card-head">
                    <span className="result-card-label">Coach Targets</span>
                  </div>
                  {plan ? (
                    <div className="coach-target-list">
                      <div><span>Maintenance</span><strong>{plan.maintenance} kcal</strong></div>
                      <div><span>Daily target</span><strong>{plan.target} kcal</strong></div>
                      <div><span>Protein</span><strong>{plan.macros.protein_g} g</strong></div>
                      <div><span>Carbs</span><strong>{plan.macros.carbs_g} g</strong></div>
                      <div><span>Fat</span><strong>{plan.macros.fat_g} g</strong></div>
                      <div><span>Sugar limit</span><strong>{plan.macros.sugar_g} g</strong></div>
                    </div>
                  ) : (
                    <p className="fr-empty">Add height, weight, age, and activity to calculate calorie targets.</p>
                  )}
                </div>
              </div>

              {riskBreakdownData.length > 0 && (
                <div className="result-card">
                  <div className="result-card-head"><span className="result-card-label">Risk Factor Breakdown</span></div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={riskBreakdownData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <XAxis dataKey="factor" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 12 }} />
                      <YAxis stroke="var(--text3)" domain={[0, 1]} tick={{ fill: "var(--text2)", fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {riskBreakdownData.map((entry, index) => (
                          <Cell key={index} fill={entry.value >= 0.8 ? "var(--high)" : entry.value >= 0.5 ? "var(--medium)" : "var(--low)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="result-card coach-card">
                <div className="result-card-head">
                  <span className="result-card-label">Next Step</span>
                </div>
                <p className="advice-text">{result.final_advice}</p>
                <div className="coach-actions">
                  <div className="coach-action">Open Coach to see your daily calorie and macro targets.</div>
                  <div className="coach-action">Use Analyze Food when you want food-specific nutrition and oral risk.</div>
                  <div className="coach-action">Log meals over time so Daily Log and Analytics can show behavior patterns.</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
