import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useCoach } from "../context/CoachContext";
import "react-circular-progressbar/dist/styles.css";
import { buildCoachProfile } from "../utils/assessProfile";
import { ProgressStepper } from "../components/assess/ProgressStepper";
import { IntroStep } from "../components/assess/IntroStep";
import { ProfileStep } from "../components/assess/ProfileStep";
import { DietStep } from "../components/assess/DietStep";
import { SmokingStep } from "../components/assess/SmokingStep";
import { EatingStep } from "../components/assess/EatingStep";
import { ResultStep } from "../components/assess/ResultStep";

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

      {step === "intro" && <IntroStep onStart={() => setStep("profile")} />}

      {step === "profile" && (
        <ProfileStep
          form={form}
          handleChange={handleChange}
          plan={plan}
          onBack={() => setStep("intro")}
          onNext={() => setStep("diet")}
        />
      )}

      {step === "diet" && (
        <DietStep
          form={form}
          handleChange={handleChange}
          plan={plan}
          manualNutrition={manualNutrition}
          setManualNutrition={setManualNutrition}
          onBack={() => setStep("profile")}
          onNext={() => { if (!manualNutrition) setDietDefaults(); setStep("smoking"); }}
        />
      )}

      {step === "smoking" && (
        <SmokingStep
          form={form}
          handleChange={handleChange}
          onBack={() => setStep("diet")}
          onNext={() => setStep("eating")}
        />
      )}

      {step === "eating" && (
        <EatingStep
          form={form}
          handleChange={handleChange}
          onBack={() => setStep("smoking")}
          onSubmit={submitAssessment}
          loading={loading}
        />
      )}

      {step === "result" && (
        <ResultStep
          result={result}
          loading={loading}
          plan={plan}
          prob={prob}
          gaugeColor={gaugeColor}
          modelConfidence={modelConfidence}
          confidenceLabel={confidenceLabel}
          riskBreakdownData={riskBreakdownData}
          onRestart={restart}
          onOpenCoach={() => navigate("/coach")}
        />
      )}
    </div>
  );
}
