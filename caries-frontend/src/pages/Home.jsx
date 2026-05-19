import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { RiskBadge, ProbabilityBar, StatTile } from "../components/UI";

export default function Home() {
  const navigate = useNavigate();
  const { result, foodLog } = useApp();

  const totalCals     = foodLog.reduce((s, i) => s + (i.nutrition?.energy_kcal || 0), 0);
  const avgRisk       = foodLog.length
    ? (foodLog.reduce((s, i) => s + (i.risk?.food_risk_score || 0), 0) / foodLog.length).toFixed(1)
    : "—";
  const highRiskFoods = foodLog.filter(i => i.risk?.food_risk_level === "High").length;

  return (
    <div className="page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-tag">AI-Powered · NHANES Clinical Data · Real-time USDA Nutrition</div>
            <h1 className="hero-title">
              Know Your<br />
              <span className="accent-text">Caries Risk</span><br />
              Before It Starts
            </h1>
            <p className="hero-sub">
              NutriDent AI combines machine learning trained on 8,000+ clinical records with
              real-time food analysis to give you an evidence-based dental caries risk score —
              personalised to your diet, smoking habits, and lifestyle.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate("/food")}>
                📷 Analyze Food
              </button>
              <button className="btn-ghost" onClick={() => navigate("/assess")}>
                Start Risk Assessment
              </button>
            </div>
          </div>

          {/* Phone mockup visual */}
          <div className="hero-visual">
            <div className="phone-mockup">
              <div className="phone-screen">
                <div className="phone-cam">📷</div>
                <div className="phone-label">Scanning food…</div>
                <div className="phone-result">
                  <span className="phone-result-food">🍕 Pizza</span>
                  <span className="phone-result-badge badge badge-high">High Risk</span>
                </div>
                <div className="phone-bar">
                  <div className="phone-bar-fill" />
                </div>
                <div className="phone-note">High sugar · sticky carbs · avoid before sleep</div>
              </div>
            </div>
            <div className="hero-visual-glow" />
          </div>
        </div>
      </section>

      {/* WHAT IS CARIES */}
      <section className="explainer">
        <h2 className="section-heading">What is Dental Caries?</h2>
        <div className="explainer-grid">
          {[
            { icon: "🦠", title: "Bacterial Attack", desc: "Bacteria in your mouth feed on sugars and produce acids that dissolve tooth enamel over time." },
            { icon: "🍬", title: "Sugar & Carbs", desc: "Frequent sugar and fermentable carbohydrate intake provides constant fuel for bacteria, accelerating decay." },
            { icon: "🚬", title: "Smoking", desc: "Tobacco reduces saliva flow — your mouth's natural defence — dramatically increasing caries risk." },
            { icon: "🥛", title: "Protective Minerals", desc: "Calcium and phosphorus in your diet help remineralise enamel, partially reversing early decay." },
          ].map(({ icon, title, desc }) => (
            <div className="explainer-card" key={title}>
              <span className="explainer-icon">{icon}</span>
              <h3 className="explainer-title">{title}</h3>
              <p className="explainer-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats-row">
        <StatTile label="Calories Logged" value={totalCals > 0 ? `${Math.round(totalCals)} kcal` : "—"} sub="today's log" />
        <StatTile label="Foods Logged"    value={foodLog.length || "0"} sub="items tracked" />
        <StatTile label="Avg Risk Score"  value={avgRisk} sub="out of 10" accent={parseFloat(avgRisk) > 4} />
        <StatTile label="High-Risk Foods" value={highRiskFoods} sub="flagged items" accent={highRiskFoods > 0} />
      </section>

      {/* LAST RESULT */}
      {result && !result.error ? (
        <section className="home-results">
          <p className="section-label">Last Assessment</p>
          <div className="home-cards">
            <div className="home-card">
              <div className="home-card-head"><span>Patient Risk</span><RiskBadge risk={result.patient_risk?.prediction} /></div>
              <div className="home-card-body">
                <span className="micro-label">Risk Probability</span>
                <ProbabilityBar value={result.patient_risk?.risk_probability} />
              </div>
              {result.patient_risk?.why?.slice(0, 2).map((r, i) => (
                <div key={i} className="home-reason">{r}</div>
              ))}
            </div>
            <div className="home-card">
              <div className="home-card-head"><span>Food Risk</span><RiskBadge risk={result.food_risk?.risk?.food_risk_level} /></div>
              <div className="home-card-body">
                <span className="micro-label">Matched Food</span>
                <span className="home-food-name">{result.food_risk?.usda_match || "—"}</span>
              </div>
              <p className="home-advice">{result.final_advice}</p>
            </div>
          </div>
          <button className="btn-outline" onClick={() => navigate("/assess")}>Run New Assessment →</button>
        </section>
      ) : (
        <section className="empty-state">
          <div className="empty-icon">🦷</div>
          <h3>No assessment yet</h3>
          <p>Start by analyzing a food photo or running your risk assessment.</p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", marginTop:16 }}>
            <button className="btn-primary" onClick={() => navigate("/food")}>Analyze Food</button>
            <button className="btn-ghost"  onClick={() => navigate("/assess")}>Risk Assessment</button>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h2 className="section-heading">How NutriDent AI Works</h2>
        <div className="steps-row">
          {[
            { n:"01", icon:"📷", title:"Capture or Search Food",  desc:"Upload a photo, search by name, or enter manually." },
            { n:"02", icon:"🧬", title:"AI Analyses Nutrition",   desc:"Google Vision + USDA FoodData Central extracts full nutrition." },
            { n:"03", icon:"🦷", title:"Caries Risk Scored",      desc:"Our ML model (trained on NHANES data) calculates your dental risk." },
            { n:"04", icon:"💡", title:"Get Actionable Advice",   desc:"Receive specific steps to protect your teeth and improve your diet." },
          ].map(({ n, icon, title, desc }) => (
            <div className="step-card" key={n}>
              <span className="step-number">{n}</span>
              <span className="step-icon">{icon}</span>
              <h3 className="step-title">{title}</h3>
              <p className="step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="disclaimer">
        ⚠️ NutriDent AI is for educational and research use only. It is not a substitute for professional clinical dental diagnosis.
      </div>
    </div>
  );
}
