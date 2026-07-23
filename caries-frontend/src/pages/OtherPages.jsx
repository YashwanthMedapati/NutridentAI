// src/pages/Charts.jsx
import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { apiFetch } from "../api";

export function Charts() {
  const { foodLog, calculateCalories } = useApp();
  const cals = calculateCalories();

  const totalCals    = foodLog.reduce((s, i) => s + (i.nutrition?.energy_kcal || 0), 0);
  const totalSugar   = foodLog.reduce((s, i) => s + (i.nutrition?.sugar_g || 0), 0);
  const totalCarbs   = foodLog.reduce((s, i) => s + (i.nutrition?.carbs_g || 0), 0);
  const totalFat     = foodLog.reduce((s, i) => s + (i.nutrition?.fat_g || 0), 0);
  const totalProtein = foodLog.reduce((s, i) => s + (i.nutrition?.protein_g || 0), 0);

  const riskDist = {
    Low:    foodLog.filter(i => i.risk?.food_risk_level === "Low").length,
    Medium: foodLog.filter(i => i.risk?.food_risk_level === "Medium").length,
    High:   foodLog.filter(i => i.risk?.food_risk_level === "High").length,
  };
  const pieRisk = Object.entries(riskDist).filter(([,v]) => v > 0).map(([name, value]) => ({ name, value }));
  const macroPie = [
    { name: "Carbs",   value: Math.round(totalCarbs) },
    { name: "Fat",     value: Math.round(totalFat) },
    { name: "Protein", value: Math.round(totalProtein) },
  ].filter(d => d.value > 0);

  const macroBar = [
    { name: "Sugar",   value: Math.round(totalSugar),   limit: 50 },
    { name: "Carbs",   value: Math.round(totalCarbs),   limit: 275 },
    { name: "Fat",     value: Math.round(totalFat),     limit: 65 },
    { name: "Protein", value: Math.round(totalProtein), limit: 50 },
  ];

  const foodRiskBar = foodLog.map((item, i) => ({
    name: (item.usda_match || item.food_name_entered || `Food ${i+1}`).slice(0, 12),
    score: item.risk?.food_risk_score || 0,
    level: item.risk?.food_risk_level || "Low",
  }));

  const calProgress = cals ? Math.min(Math.round((totalCals / cals.target) * 100), 150) : 0;

  const tt = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 } };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Charts & Analytics</h1>
        <p className="page-sub">Visual breakdown of your nutrition, calorie, and caries risk data from this session.</p>
      </div>

      {foodLog.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No data yet</h3>
          <p>Log foods via the Analyze Food page or run an assessment to see charts here.</p>
        </div>
      ) : (
        <div className="charts-page-grid">
          {/* Calorie Progress */}
          {cals && (
            <div className="result-card charts-full">
              <div className="result-card-head">
                <span className="result-card-label">Calorie Progress</span>
                <span className="micro-label">{Math.round(totalCals)} / {cals.target} kcal</span>
              </div>
              <div className="calorie-progress-track">
                <div className={`calorie-progress-fill ${calProgress > 100 ? "over-cal" : ""}`}
                  style={{ width: `${Math.min(calProgress, 100)}%` }} />
              </div>
              <div className="calorie-progress-labels">
                <span>0</span>
                <span>{cals.maintenance} maintenance</span>
                <span>{cals.target} target</span>
              </div>
            </div>
          )}

          {/* Food Risk Bars */}
          {foodRiskBar.length > 0 && (
            <div className="result-card charts-full">
              <div className="result-card-head"><span className="result-card-label">Individual Food Risk Scores</span></div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={foodRiskBar} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <YAxis stroke="var(--text3)" domain={[0, 10]} tick={{ fill: "var(--text2)", fontSize: 11 }} />
                  <Tooltip {...tt} />
                  <Bar dataKey="score" name="Risk Score" radius={[4, 4, 0, 0]}>
                    {foodRiskBar.map((e, i) => (
                      <Cell key={i} fill={e.level === "High" ? "var(--high)" : e.level === "Medium" ? "var(--medium)" : "var(--low)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Risk Distribution Pie */}
          {pieRisk.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Food Risk Distribution</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieRisk} dataKey="value" cx="50%" cy="50%" outerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {pieRisk.map(e => (
                      <Cell key={e.name} fill={e.name === "High" ? "var(--high)" : e.name === "Medium" ? "var(--medium)" : "var(--low)"} />
                    ))}
                  </Pie>
                  <Tooltip {...tt} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Macro Pie */}
          {macroPie.length > 0 && (
            <div className="result-card">
              <div className="result-card-head"><span className="result-card-label">Macro Distribution</span></div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={macroPie} dataKey="value" cx="50%" cy="50%" outerRadius={60} innerRadius={32} paddingAngle={3}>
                    <Cell fill="var(--mineral)" /><Cell fill="var(--medium)" /><Cell fill="var(--low)" />
                  </Pie>
                  <Tooltip formatter={v => `${v} g`} {...tt} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Macros vs Limits */}
          <div className="result-card charts-full">
            <div className="result-card-head"><span className="result-card-label">Macros vs Daily Limits</span></div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={macroBar} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 12 }} />
                <YAxis stroke="var(--text3)" tick={{ fill: "var(--text2)", fontSize: 12 }} />
                <Tooltip {...tt} />
                <Bar dataKey="value" name="Consumed" radius={[4, 4, 0, 0]}>
                  {macroBar.map((e, i) => <Cell key={i} fill={e.value > e.limit ? "var(--high)" : "var(--low)"} />)}
                </Bar>
                <Bar dataKey="limit" name="Limit" fill="var(--track)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ABOUT PAGE ────────────────────────────────────────────────────────────────
export function About() {
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {
    let active = true;
    apiFetch("/model-info")
      .then((data) => {
        if (active) setModelInfo(data);
      })
      .catch(() => {
        if (active) setModelInfo(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">About NutriDent AI</h1>
        <p className="page-sub">Understanding dental caries and how this tool works.</p>
      </div>

      <div className="about-grid">
        <div className="about-section">
          <h2 className="about-heading">What is Dental Caries?</h2>
          <p>Dental caries — commonly known as tooth decay — is one of the most prevalent chronic diseases worldwide. It occurs when bacteria in the mouth metabolise fermentable carbohydrates (sugars and starches), producing acids that dissolve tooth enamel over time.</p>
          <p>Left untreated, caries progresses from enamel demineralisation to cavities, pulp involvement, and tooth loss. Early identification of risk factors is essential for prevention.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">Key Risk Factors</h2>
          <div className="about-factors">
            {[
              { icon: "🍬", factor: "Sugar intake",        detail: "Frequent consumption of sugars — especially sucrose — is the primary driver of caries. Bacteria use sugar to produce lactic acid." },
              { icon: "🍞", factor: "Fermentable carbs",   detail: "Sticky starchy foods (bread, crisps, crackers) adhere to teeth and ferment slowly, providing sustained acid production." },
              { icon: "🚬", factor: "Smoking",             detail: "Tobacco use reduces saliva flow and alters the oral microbiome, significantly raising caries and periodontal risk." },
              { icon: "🕐", factor: "Eating frequency",    detail: "Snacking frequently prevents saliva from neutralising acid. Each eating occasion triggers a ~20-minute acid attack on enamel." },
              { icon: "🥛", factor: "Calcium & phosphorus",detail: "These minerals support enamel remineralisation. Adequate intake partially counters early acid damage." },
              { icon: "💧", factor: "Fluoride & saliva",   detail: "Fluoride strengthens enamel crystals. Saliva buffers acid and delivers protective minerals to the tooth surface." },
            ].map(({ icon, factor, detail }) => (
              <div className="about-factor-card" key={factor}>
                <span className="about-factor-icon">{icon}</span>
                <div>
                  <strong className="about-factor-name">{factor}</strong>
                  <p className="about-factor-detail">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <h2 className="about-heading">How NutriDent AI Helps</h2>
          <p>NutriDent AI uses a <strong>Random Forest machine learning model</strong> trained on the NHANES 2017–2018 clinical dataset (8,000+ participants with full dental examination records, dietary recall, and lifestyle questionnaires).</p>
          <p>It combines your patient profile with real-time food nutrition data from the <strong>USDA FoodData Central API</strong> (600,000+ foods) and <strong>Google Vision AI</strong> for photo-based food detection to generate a personalised caries risk estimate.</p>
          <p>The model outputs a probability score and highlights which specific factors in your lifestyle are contributing most to your risk.</p>
        </div>

        {modelInfo && (
          <div className="about-section">
            <h2 className="about-heading">Model Transparency</h2>
            <p><strong>Model:</strong> {modelInfo.model_type} ({modelInfo.model_version})</p>
            <p><strong>Features:</strong> {modelInfo.feature_count} patient, diet, smoking, and eating-pattern inputs.</p>
            <p><strong>Training data:</strong> {modelInfo.training_data}</p>
            <ul className="reason-list">
              {modelInfo.limitations?.map((item, index) => <li key={index}>{item}</li>)}
            </ul>
          </div>
        )}

        <div className="about-disclaimer">
          <strong>⚠️ Medical Disclaimer</strong>
          <p>NutriDent AI is an educational and research tool only. It does not constitute clinical dental advice or diagnosis. Risk scores are estimates based on statistical patterns in population data and are not a substitute for professional dental examination. Always consult a qualified dental professional for your oral health needs.</p>
        </div>
      </div>
    </div>
  );
}

// ── TIPS PAGE ─────────────────────────────────────────────────────────────────
export function Tips() {
  const tips = [
    { icon: "🪥", cat: "Brushing",  title: "Brush twice daily",              body: "Use fluoride toothpaste and brush for at least 2 minutes each time, especially before bed." },
    { icon: "🧵", cat: "Flossing",  title: "Floss daily",                    body: "Plaque between teeth causes up to 35% of cavities. Floss once a day, ideally at night." },
    { icon: "💧", cat: "Hydration", title: "Drink water after meals",        body: "Water rinses away sugar residue and stimulates saliva production to neutralise mouth acids." },
    { icon: "🥛", cat: "Diet",      title: "Eat calcium-rich foods",         body: "Dairy, leafy greens, and fortified plant milks supply calcium that remineralises enamel." },
    { icon: "⏰", cat: "Habits",    title: "Limit snacking frequency",       body: "Each eating occasion triggers 20 minutes of acid attack. Reduce snacking to reduce total acid exposure time." },
    { icon: "🍬", cat: "Diet",      title: "Cut sugary drinks",              body: "Soda, juice, and energy drinks bathe teeth in sugar for hours. Swap for water or unsweetened tea." },
    { icon: "🌿", cat: "Diet",      title: "Eat crunchy vegetables",         body: "Raw carrots, celery, and apples stimulate saliva and mechanically clean teeth while you eat." },
    { icon: "🚬", cat: "Lifestyle", title: "Avoid tobacco",                  body: "Smoking and chewing tobacco reduce saliva and cause bacterial imbalance — two major caries accelerators." },
    { icon: "🦷", cat: "Care",      title: "Use fluoride mouthwash",         body: "Fluoride rinse after brushing provides additional enamel protection, especially for high-risk individuals." },
    { icon: "📅", cat: "Care",      title: "Regular dental check-ups",       body: "Visit a dentist every 6 months for professional cleaning and early detection of caries before they progress." },
    { icon: "🍫", cat: "Diet",      title: "Dark chocolate over milk choc",  body: "Dark chocolate has less sugar and contains theobromine, which may actually harden enamel." },
    { icon: "🧀", cat: "Diet",      title: "Finish meals with cheese",       body: "Cheese raises mouth pH and provides calcium — ending meals with a small piece can reduce acid damage." },
  ];

  const cats = [...new Set(tips.map(t => t.cat))];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Oral Health Tips</h1>
        <p className="page-sub">Evidence-based practices to protect your teeth and reduce caries risk.</p>
      </div>
      {cats.map(cat => (
        <div key={cat} className="tips-section">
          <h2 className="tips-cat">{cat}</h2>
          <div className="tips-grid">
            {tips.filter(t => t.cat === cat).map(({ icon, title, body }) => (
              <div className="tip-card" key={title}>
                <span className="tip-icon">{icon}</span>
                <h3 className="tip-title">{title}</h3>
                <p className="tip-body">{body}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── PREVIOUS RESULTS PAGE ────────────────────────────────────────────────────
export function PreviousResults() {
  const { previousResults } = useApp();

  if (!previousResults || previousResults.length === 0) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Previous Results</h1>
          <p className="page-sub">Your assessment history saved in this browser.</p>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No results yet</h3>
          <p>Run a risk assessment to see your history here. Results are stored locally in this browser.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Previous Results</h1>
        <p className="page-sub">{previousResults.length} saved assessment{previousResults.length !== 1 ? "s" : ""} in this browser.</p>
      </div>
      <div className="prev-results-list">
        {previousResults.map((r, i) => (
          <div className="prev-result-card" key={i}>
            <div className="prev-result-header">
              <div>
                <span className="prev-result-num">Assessment #{previousResults.length - i}</span>
                <span className="prev-result-time">{new Date(r.timestamp).toLocaleTimeString()}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {r.patient_risk?.prediction && (
                  <span className={`badge ${r.patient_risk.prediction.toLowerCase().includes("high") ? "badge-high" : "badge-low"}`}>
                    {r.patient_risk.prediction}
                  </span>
                )}
                {r.food_risk?.risk?.food_risk_level && (
                  <span className={`badge ${r.food_risk.risk.food_risk_level === "High" ? "badge-high" : r.food_risk.risk.food_risk_level === "Medium" ? "badge-medium" : "badge-low"}`}>
                    {r.food_risk.risk.food_risk_level} Food
                  </span>
                )}
              </div>
            </div>
            <div className="prev-result-body">
              <div className="prev-result-col">
                <span className="micro-label">Risk Probability</span>
                <div className="prob-wrap">
                  <div className="prob-track">
                    <div className={`prob-fill ${(r.patient_risk?.risk_probability || 0) >= 0.7 ? "bar-high" : (r.patient_risk?.risk_probability || 0) >= 0.4 ? "bar-medium" : "bar-low"}`}
                      style={{ width: `${((r.patient_risk?.risk_probability || 0) * 100)}%` }} />
                  </div>
                  <span className="prob-label">{Math.round((r.patient_risk?.risk_probability || 0) * 100)}%</span>
                </div>
              </div>
              {r.food_name && (
                <div className="prev-result-col">
                  <span className="micro-label">Food Analysed</span>
                  <span className="metric-value">{r.food_risk?.usda_match || r.food_name}</span>
                </div>
              )}
            </div>
            {r.patient_risk?.why?.length > 0 && (
              <div className="prev-result-why">
                {r.patient_risk.why.slice(0, 2).map((w, j) => (
                  <span key={j} className="prev-why-chip">{w}</span>
                ))}
              </div>
            )}
            {r.final_advice && <p className="prev-result-advice">{r.final_advice}</p>}
          </div>
        ))}
      </div>
      <p className="session-note">Note: Results are saved in this browser unless you delete NutriDent data from Settings or clear site data.</p>
    </div>
  );
}

export function Privacy() {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Privacy & Safety</h1>
        <p className="page-sub">How NutriDent AI handles food, weight, and dental-risk information.</p>
      </div>

      <div className="about-grid">
        <div className="about-section">
          <h2 className="about-heading">Local Data Storage</h2>
          <p>Food logs, weight logs, profile values, coach targets, and previous results are stored in this browser using local storage by default.</p>
          <p>If Supabase is configured and you sign in, food and weight logs can sync to your account. Local browser data can still remain on the device until you delete it.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">External APIs</h2>
          <p>Food search uses USDA FoodData Central. Photo analysis uses Google Vision API through the backend. Uploaded food images are sent to the backend for analysis and then to the configured Vision API provider.</p>
          <p>Do not upload images that contain faces, documents, or sensitive personal information.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">Medical Disclaimer</h2>
          <p>NutriDent AI is educational and research-oriented. It is not a clinical diagnosis, medical device, nutrition prescription, or replacement for a dentist, physician, or registered dietitian.</p>
          <p>Vision, portion, calorie, and risk estimates can be wrong. Review detected ingredients and portion weight before logging food or making decisions from the result.</p>
        </div>

        <div className="about-section">
          <h2 className="about-heading">Export And Delete</h2>
          <p>Use Settings to export a JSON copy of your NutriDent data, import a previous export, or delete local app data from the current browser.</p>
          <p>For production cloud data, keep Supabase Row Level Security enabled and provide account-level deletion for server-stored records.</p>
        </div>
      </div>
    </div>
  );
}
