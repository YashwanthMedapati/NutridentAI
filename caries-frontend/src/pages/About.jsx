import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function About() {
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
          <p>It combines your patient profile with food nutrition data from a local <strong>Indian dish dataset</strong>, the <strong>USDA FoodData Central API</strong> (600,000+ foods), Open Food Facts barcode data, and <strong>Google Vision AI</strong> for photo-based food detection to generate a personalised caries risk estimate.</p>
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
