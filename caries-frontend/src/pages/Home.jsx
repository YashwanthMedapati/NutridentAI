import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useTheme } from "../context/ThemeContext";
import { RiskBadge, ProbabilityBar, StatTile } from "../components/UI";

export default function Home() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const { result, foodLog } = useApp();
  const logoSrc = dark ? "/assets/nutrident-logo.png" : "/assets/nutrident-logo-light.png";

  const totalCals = foodLog.reduce((sum, item) => sum + (item.nutrition?.energy_kcal || 0), 0);
  const avgRisk = foodLog.length
    ? (foodLog.reduce((sum, item) => sum + (item.risk?.food_risk_score || 0), 0) / foodLog.length).toFixed(1)
    : "-";
  const highRiskFoods = foodLog.filter(item => item.risk?.food_risk_level === "High").length;

  return (
    <div className="page home-page">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-text">
            <img className="hero-brand-logo" src={logoSrc} alt="NutriDent AI" />
            <div className="hero-tag">AI-powered food analysis / dental risk intelligence</div>
            <h1 className="hero-title">
              Smarter food choices for<br />
              <span className="accent-text">healthier smiles</span>
            </h1>
            <p className="hero-sub">
              NutriDent AI estimates nutrition, portion size, and caries risk from food photos,
              search, barcode data, and lifestyle inputs, then turns it into practical dental advice.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => navigate("/food")}>📷 Analyze Food</button>
              <button className="btn-ghost" onClick={() => navigate("/assess")}>🦷 Start Risk Assessment</button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-product-card">
              <div className="hero-preview-head">
                <img src={logoSrc} alt="NutriDent AI" />
                <span>Live scan preview</span>
              </div>
              <div className="hero-scan-core">
                <div className="hero-scan-orb">
                  <span>🍕</span>
                </div>
                <div>
                  <span className="micro-label">Detected food</span>
                  <strong>Pizza slice</strong>
                  <p>Portion-aware nutrition and oral-risk estimate.</p>
                </div>
              </div>
              <div className="hero-risk-meter">
                <div>
                  <span>Food risk</span>
                  <strong>High</strong>
                </div>
                <div className="hero-risk-track"><span /></div>
              </div>
              <div className="hero-preview-grid">
                <div><span>Calories</span><strong>312 kcal</strong></div>
                <div><span>Carbs</span><strong>32 g</strong></div>
                <div><span>Sugar</span><strong>5 g</strong></div>
                <div><span>Fat</span><strong>12 g</strong></div>
              </div>
              <div className="hero-insight-strip">
                <span>🍞 Sticky carbs</span>
                <span>💧 Rinse after eating</span>
                <span>🌙 Avoid before sleep</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="explainer">
        <h2 className="section-heading">What NutriDent Watches</h2>
        <div className="explainer-grid">
          {[
            { icon: "🦠", title: "Bacterial Acid", desc: "Sugar and starch feed oral bacteria that produce enamel-damaging acids." },
            { icon: "⏱️", title: "Food Frequency", desc: "Repeated snacks create repeated acid windows, even when each item looks moderate." },
            { icon: "⚖️", title: "Portion Size", desc: "Large portions extend exposure and can shift a food into a higher-risk range." },
            { icon: "🥛", title: "Protective Nutrients", desc: "Calcium, phosphorus, hydration, and balanced meals support remineralization." },
          ].map(({ icon, title, desc }) => (
            <div className="explainer-card" key={title}>
              <span className="explainer-icon">{icon}</span>
              <h3 className="explainer-title">{title}</h3>
              <p className="explainer-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-row">
        <StatTile icon="🔥" label="Calories Logged" value={totalCals > 0 ? `${Math.round(totalCals)} kcal` : "-"} sub="today's log" />
        <StatTile icon="🍽️" label="Foods Logged" value={foodLog.length || "0"} sub="items tracked" />
        <StatTile icon="📈" label="Avg Risk Score" value={avgRisk} sub="out of 10" accent={parseFloat(avgRisk) > 4} />
        <StatTile icon="⚠️" label="High-Risk Foods" value={highRiskFoods} sub="flagged items" accent={highRiskFoods > 0} />
      </section>

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
              {result.patient_risk?.why?.slice(0, 2).map((reason, index) => (
                <div key={index} className="home-reason">{reason}</div>
              ))}
            </div>
            <div className="home-card">
              <div className="home-card-head"><span>Food Risk</span><RiskBadge risk={result.food_risk?.risk?.food_risk_level} /></div>
              <div className="home-card-body">
                <span className="micro-label">Matched Food</span>
                <span className="home-food-name">{result.food_risk?.usda_match || "-"}</span>
              </div>
              <p className="home-advice">{result.final_advice}</p>
            </div>
          </div>
          <button className="btn-outline" onClick={() => navigate("/assess")}>Run New Assessment</button>
        </section>
      ) : (
        <section className="empty-state">
          <div className="empty-icon home-empty-icon">🦷</div>
          <h3>No assessment yet</h3>
          <p>Start by analyzing a food photo or running your risk assessment.</p>
          <div className="empty-actions">
            <button className="btn-primary" onClick={() => navigate("/food")}>📷 Analyze Food</button>
            <button className="btn-ghost" onClick={() => navigate("/assess")}>🧪 Risk Assessment</button>
          </div>
        </section>
      )}

      <section className="how-it-works">
        <h2 className="section-heading">How NutriDent AI Works</h2>
        <div className="steps-row">
          {[
            { n: "01", icon: "📷", title: "Capture or Search Food", desc: "Upload a photo, search by name, or scan a barcode." },
            { n: "02", icon: "🧠", title: "AI Analyses Nutrition", desc: "Vision and USDA data estimate nutrition, ingredients, and portion size." },
            { n: "03", icon: "🦷", title: "Caries Risk Scored", desc: "The risk engine weighs sugar, carbs, minerals, texture, and frequency." },
            { n: "04", icon: "💡", title: "Get Actionable Advice", desc: "Receive specific steps to protect your teeth and improve your diet." },
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
        NutriDent AI is for educational and research use only. It is not a substitute for professional clinical dental diagnosis.
      </div>
    </div>
  );
}
