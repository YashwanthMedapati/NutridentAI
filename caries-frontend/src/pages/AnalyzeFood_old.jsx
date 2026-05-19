import React, { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { RiskBadge, NutritionGrid, Alert, Spinner } from "../components/UI";

// ── NET ORAL RISK COLOUR ───────────────────────────────────────────────────────
function riskColor(label) {
  if (!label) return "var(--low)";
  const l = label.toLowerCase();
  if (l.includes("very high")) return "var(--high)";
  if (l.includes("high"))      return "var(--high)";
  if (l.includes("moderate"))  return "var(--medium)";
  return "var(--low)";
}

// ── SCORE BAR COMPONENT ────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 10, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="score-bar-row">
      <div className="score-bar-labels">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── ACTION CATEGORY COLOUR ─────────────────────────────────────────────────────
const CAT_COLORS = {
  Immediate:   "#ef4444",
  Frequency:   "#f59e0b",
  Pairing:     "#3b82f6",
  Portion:     "#a78bfa",
  Hydration:   "#06b6d4",
  "Dental Care": "#22c55e",
};

export default function AnalyzeFood() {
  const { addToFoodLog } = useApp();

  const [mode, setMode]           = useState("upload");
  const [image, setImage]         = useState(null);
  const [imagePreview, setPreview] = useState(null);
  const [searchText, setSearchText] = useState("");

  // Raw result from backend (per-100g values + portion_estimate)
  const [rawResult, setRawResult] = useState(null);
  // Displayed result (after portion scaling applied client-side for UI refresh)
  const [result, setResult]       = useState(null);

  const [loading, setLoading]     = useState(false);
  const [logged, setLogged]       = useState(false);

  // Portion state: starts from AI estimate, user can override
  const [portionG, setPortionG]   = useState(null);
  const [portionEdited, setPortionEdited] = useState(false);

  const [barcodeText, setBarcodeText] = useState("");

  const fileRef = useRef();

  // ── FILE HANDLER ─────────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f); setRawResult(null); setResult(null); setLogged(false);
    setPortionG(null); setPortionEdited(false);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── SET RESULT + INITIALIZE PORTION ──────────────────────────────────────────
  const applyResult = (data) => {
    setRawResult(data);
    setResult(data);
    const estimatedG = data?.portion_estimate?.g || 100;
    setPortionG(estimatedG);
    setPortionEdited(false);
  };

  // ── RE-FETCH WITH NEW PORTION ─────────────────────────────────────────────────
  const recalcWithPortion = async (newG) => {
    if (!rawResult) return;
    const foodName = rawResult.food_name_entered || searchText || rawResult.detected_food || "";
    try {
      const res = await fetch("http://127.0.0.1:8000/food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ food_name: foodName, portion_g: newG }),
      });
      const data = await res.json();
      if (!data.error) setResult(data);
    } catch { /* keep existing result */ }
  };

  const handlePortionChange = (e) => {
    const val = Number(e.target.value);
    if (val > 0) setPortionG(val);
  };

  const handlePortionApply = () => {
    setPortionEdited(true);
    recalcWithPortion(portionG);
  };

  // ── ANALYZE IMAGE ─────────────────────────────────────────────────────────────
  const analyzeImage = async () => {
    if (!image) return;
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const fd = new FormData(); fd.append("file", image);
      const res  = await fetch("http://127.0.0.1:8000/image-food-risk", { method: "POST", body: fd });
      const data = await res.json();
      applyResult(data);
    } catch { setResult({ error: "Image analysis failed. Check backend." }); }
    finally   { setLoading(false); }
  };

  // ── SEARCH FOOD ───────────────────────────────────────────────────────────────
  const analyzeSearch = async () => {
    if (!searchText.trim()) return;
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const res = await fetch("http://127.0.0.1:8000/food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ food_name: searchText }),
      });
      const data = await res.json();
      applyResult({ ...data, food_name_entered: searchText });
    } catch { setResult({ error: "Search failed. Check backend." }); }
    finally   { setLoading(false); }
  };

  // ── ANALYZE BARCODE ───────────────────────────────────────────────────────────
  const analyzeBarcode = async () => {
    const code = barcodeText.trim();
    if (!code) return;
    // Basic sanity: barcodes are 8–14 digits
    if (!/^\d{8,14}$/.test(code)) {
      setResult({ error: "Please enter a valid barcode (8–14 digits, numbers only)." });
      return;
    }
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const res = await fetch("http://127.0.0.1:8000/barcode-food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ barcode: code }),
      });
      const data = await res.json();
      // Attach the barcode as food_name_entered so recalcWithPortion
      // falls back gracefully (it will call /food-risk with product name)
      applyResult({ ...data, food_name_entered: data.product_name || code });
    } catch { setResult({ error: "Barcode lookup failed. Check backend." }); }
    finally   { setLoading(false); }
  };

  // ── LOG FOOD ──────────────────────────────────────────────────────────────────
  const logFood = () => {
    if (result?.nutrition) {
      addToFoodLog({ ...result, food_name_entered: result.detected_food || searchText });
      setLogged(true);
    }
  };

  const risk         = result?.risk;
  const riskLevel    = risk?.food_risk_level;
  const portionInfo  = result?.portion_estimate;
  const nutrition    = result?.nutrition;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Analyze Food</h1>
        <p className="page-sub">
          Upload a photo, search by name, or scan a barcode — get portion-aware caries risk,
          nutrition data, and personalised dental advice.
        </p>
      </div>

      {/* MODE TABS */}
      <div className="mode-tabs">
        {[
          { key: "upload",  label: "📷 Upload Photo" },
          { key: "search",  label: "🔍 Search Food" },
          { key: "barcode", label: "📦 Barcode / QR" },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`mode-tab ${mode === key ? "active" : ""}`}
            onClick={() => { setMode(key); setRawResult(null); setResult(null); setLogged(false); }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* INPUT CARD */}
      <div className="analyze-input-card">

        {/* UPLOAD */}
        {mode === "upload" && (
          <>
            <div
              className={`upload-zone large-zone ${imagePreview ? "has-preview" : ""}`}
              onClick={() => fileRef.current.click()}
            >
              {imagePreview
                ? <img src={imagePreview} alt="food" className="preview-img" />
                : (
                  <div className="upload-placeholder">
                    <span className="upload-icon-lg">📷</span>
                    <span className="upload-text">Click or drag to upload a food photo</span>
                    <span className="upload-hint">JPG, PNG, HEIC supported</span>
                  </div>
                )
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {imagePreview && (
              <button className="btn-primary mt-12 w-full" onClick={analyzeImage} disabled={loading}>
                {loading ? <><Spinner /> Analyzing image…</> : "Analyze Photo"}
              </button>
            )}
          </>
        )}

        {/* SEARCH */}
        {mode === "search" && (
          <div className="search-input-row">
            <input
              className="search-big-input"
              type="text"
              placeholder="Type a food name… e.g. pasta, banana, pizza"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyzeSearch()}
            />
            <button className="btn-primary" onClick={analyzeSearch} disabled={loading}>
              {loading ? <><Spinner /> Searching…</> : "Search"}
            </button>
          </div>
        )}

        {/* BARCODE */}
        {mode === "barcode" && (
          <div className="barcode-active">
            <div className="barcode-header">
              <span className="barcode-header-icon">📦</span>
              <div>
                <h3 className="barcode-header-title">Barcode / QR Lookup</h3>
                <p className="barcode-header-sub">
                  Enter the barcode number from any packaged food product.
                  Data sourced from Open Food Facts (free, no API key needed).
                </p>
              </div>
            </div>

            {/* Manual entry */}
            <div className="barcode-entry-row">
              <div className="barcode-icon-wrap">
                <div className="barcode-lines-sm">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="barcode-line-sm"
                      style={{ height: `${16 + (i % 3) * 6}px` }} />
                  ))}
                </div>
              </div>
              <input
                className="search-big-input"
                type="text"
                inputMode="numeric"
                placeholder="Enter barcode number e.g. 5000112637922"
                value={barcodeText}
                onChange={e => setBarcodeText(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && analyzeBarcode()}
                maxLength={14}
              />
              <button className="btn-primary" onClick={analyzeBarcode} disabled={loading}>
                {loading ? <><Spinner /> Looking up…</> : "Look Up"}
              </button>
            </div>

            {/* Format hint */}
            <p className="barcode-format-hint">
              Supported formats: EAN-13, EAN-8, UPC-A, UPC-E &nbsp;·&nbsp;
              Digits only, no spaces or dashes
            </p>

            {/* Camera scanner note */}
            <div className="barcode-camera-note">
              <span>📷</span>
              <span>
                <strong>Camera scanning:</strong> To add real camera barcode scanning,
                install <code>react-zxing</code> or <code>@ericblade/quagga2</code> and
                call <code>analyzeBarcode(scannedCode)</code> with the decoded string.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ERROR */}
      {result?.error && <Alert type="error">{result.error}</Alert>}

      {/* ── RESULTS ── */}
      {result && !result.error && (
        <div className="food-results">

          {/* Detected / matched banner */}
          <div className="detected-food-banner">
            {result.detected_food && (
              <span>🔍 Detected: <strong>{result.detected_food}</strong></span>
            )}
            <span className="detected-match">
              USDA match: <em>{result.usda_match}</em>
            </span>
          </div>

          {/* ── PORTION EDITOR ── */}
          {portionInfo && (
            <div className="portion-editor-card">
              <div className="portion-editor-head">
                <span className="portion-editor-title">⚖️ Portion Size</span>
                <span className={`portion-confidence conf-${(portionInfo.confidence || "low").toLowerCase()}`}>
                  {portionInfo.confidence} confidence
                </span>
              </div>
              <p className="portion-estimate-label">
                {portionEdited
                  ? `Using your portion: ${portionG}g`
                  : `AI estimate: ${portionInfo.label}`
                }
              </p>
              <p className="portion-note">
                ℹ️ USDA values are per 100g. All nutrition and risk values below are scaled to your portion.
              </p>
              <div className="portion-input-row">
                <div className="portion-presets">
                  {[
                    { label: "Small",  g: Math.round((portionInfo.g || 150) * 0.65) },
                    { label: "Medium", g: portionInfo.g || 150 },
                    { label: "Large",  g: Math.round((portionInfo.g || 150) * 1.4)  },
                  ].map(({ label, g }) => (
                    <button
                      key={label}
                      className={`portion-preset-btn ${portionG === g ? "active" : ""}`}
                      onClick={() => { setPortionG(g); recalcWithPortion(g); setPortionEdited(true); }}
                    >
                      {label} ({g}g)
                    </button>
                  ))}
                </div>
                <div className="portion-custom-row">
                  <input
                    type="number"
                    className="portion-input"
                    value={portionG || ""}
                    onChange={handlePortionChange}
                    min="10"
                    max="2000"
                    placeholder="grams"
                  />
                  <button className="btn-primary" onClick={handlePortionApply}>
                    Recalculate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── LABEL RED FLAGS (barcode results only) ── */}
          {result?.label_red_flags?.length > 0 && (
            <div className="label-flags-card">
              <div className="fr-card-head">
                <span className="fr-card-icon">🏷️</span>
                <h3 className="fr-card-title">Label Red Flags</h3>
                <span className="label-source-badge">Open Food Facts</span>
              </div>
              {result.brand && (
                <p className="label-brand">Brand: <strong>{result.brand}</strong></p>
              )}
              <ul className="label-flags-list">
                {result.label_red_flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
              {result.ingredients && (
                <details className="ingredients-detail">
                  <summary>View full ingredients list</summary>
                  <p className="ingredients-text">{result.ingredients}</p>
                </details>
              )}
            </div>
          )}

          {/* ── 4-CARD GRID ── */}
          <div className="food-results-grid">

            {/* 1. CARIES RISK */}
            <div className="fr-card fr-card-risk">
              <div className="fr-card-head">
                <span className="fr-card-icon">🦷</span>
                <h3 className="fr-card-title">Caries Risk</h3>
                <RiskBadge risk={riskLevel} />
              </div>
              <div className="fr-risk-score">
                <span className="fr-score-num">{risk?.food_risk_score ?? "—"}</span>
                <span className="fr-score-denom">/10</span>
              </div>

              {/* Score bars */}
              <div className="score-bars">
                <ScoreBar
                  label="Exposure Score"
                  value={risk?.exposure_score ?? 0}
                  max={10}
                  color="var(--high)"
                />
                <ScoreBar
                  label="Protective Score"
                  value={risk?.protective_score ?? 0}
                  max={4}
                  color="var(--low)"
                />
              </div>

              {/* Net Oral Risk Index */}
              {risk?.net_oral_risk_index !== undefined && (
                <div className="nori-block">
                  <span className="nori-label">Net Oral Risk Index</span>
                  <div className="nori-value-row">
                    <span
                      className="nori-value"
                      style={{ color: riskColor(risk.net_oral_risk_label) }}
                    >
                      {risk.net_oral_risk_index}
                      <span className="nori-denom">/10</span>
                    </span>
                    <span
                      className="nori-badge"
                      style={{ color: riskColor(risk.net_oral_risk_label) }}
                    >
                      {risk.net_oral_risk_label}
                    </span>
                  </div>
                  <div className="nori-track">
                    <div
                      className="nori-fill"
                      style={{
                        width: `${(risk.net_oral_risk_index / 10) * 100}%`,
                        background: riskColor(risk.net_oral_risk_label),
                      }}
                    />
                  </div>
                  <p className="nori-explanation">
                    Exposure ({risk.exposure_score}) minus protective factors ({risk.protective_score})
                    = net oral caries risk.
                  </p>
                </div>
              )}

              {risk?.reasons?.length > 0 && (
                <div className="why-block mt-12">
                  <span className="micro-label">Risk Factors</span>
                  <ul className="reason-list">
                    {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {risk?.warning && <Alert type="warning">{risk.warning}</Alert>}
            </div>

            {/* 2. CALORIES & NUTRITION */}
            <div className="fr-card">
              <div className="fr-card-head">
                <span className="fr-card-icon">🥗</span>
                <h3 className="fr-card-title">Calories & Nutrition</h3>
                <span className="fr-kcal">{nutrition?.energy_kcal ?? "—"} kcal</span>
              </div>
              <div className="portion-tag">
                For {portionG || portionInfo?.g || 100}g serving
              </div>
              <NutritionGrid nutrition={nutrition} />

              {/* Per-100g comparison */}
              {result?.nutrition_per_100g && (
                <div className="per100g-note">
                  <span className="micro-label">Per 100g reference</span>
                  <div className="per100g-row">
                    <span>{result.nutrition_per_100g.energy_kcal ?? "—"} kcal</span>
                    <span>{result.nutrition_per_100g.sugar_g ?? "—"}g sugar</span>
                    <span>{result.nutrition_per_100g.carbs_g ?? "—"}g carbs</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. AI DENTIST NOTES */}
            <div className="fr-card">
              <div className="fr-card-head">
                <span className="fr-card-icon">🩺</span>
                <h3 className="fr-card-title">AI Dentist Notes</h3>
              </div>
              {risk?.dentist_notes?.length > 0
                ? (
                  <ul className="dentist-notes">
                    {risk.dentist_notes.map((n, i) => <li key={i}>{n}</li>)}
                  </ul>
                )
                : <p className="fr-empty">No specific dental concerns for this food.</p>
              }
            </div>

            {/* 4. ACTION PLAN */}
            <div className={`fr-card fr-action-${(riskLevel || "low").toLowerCase()}`}>
              <div className="fr-card-head">
                <span className="fr-card-icon">📋</span>
                <h3 className="fr-card-title">Action Plan</h3>
              </div>

              {risk?.action_plan?.length > 0
                ? (
                  <div className="action-plan-list">
                    {risk.action_plan.map((item, i) => (
                      <div key={i} className="action-plan-item">
                        <span
                          className="action-cat-dot"
                          style={{ background: CAT_COLORS[item.category] || "#94a3b8" }}
                        />
                        <div>
                          <span className="action-cat-label">{item.category}</span>
                          <span className="action-text">{item.action}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
                : (
                  <ul className="action-list">
                    <li>✅ Maintain regular brushing and flossing</li>
                    <li>💧 Stay hydrated to promote saliva production</li>
                    <li>🦷 Schedule dental check-ups every 6 months</li>
                  </ul>
                )
              }

              {risk?.consumption_advice && (
                <div className="consumption-note">{risk.consumption_advice}</div>
              )}
            </div>
          </div>

          {/* ── FREQUENCY RISK PANEL ── */}
          {risk?.frequency_risk && (
            <div className="freq-risk-card">
              <div className="fr-card-head">
                <span className="fr-card-icon">🔁</span>
                <h3 className="fr-card-title">Food Frequency Risk</h3>
              </div>
              <p className="freq-explanation">{risk.frequency_risk.explanation}</p>
              <div className="freq-comparison">
                <div className="freq-item">
                  <span className="freq-label">Occasional intake</span>
                  <span
                    className="freq-badge"
                    style={{ color: riskColor(risk.frequency_risk.occasional_risk) }}
                  >
                    {risk.frequency_risk.occasional_risk} Risk
                  </span>
                  <p className="freq-note">Eating 1–2× per week — limited acid exposure cycles</p>
                </div>
                <div className="freq-divider">→</div>
                <div className="freq-item">
                  <span className="freq-label">Frequent intake</span>
                  <span
                    className="freq-badge"
                    style={{ color: riskColor(risk.frequency_risk.frequent_risk) }}
                  >
                    {risk.frequency_risk.frequent_risk} Risk
                  </span>
                  <p className="freq-note">Eating daily or multiple times/day — repeated acid attacks</p>
                </div>
              </div>
            </div>
          )}

          {/* LOG BUTTON */}
          <div className="log-row">
            {logged
              ? <span className="log-success">✅ Added to today's food log</span>
              : <button className="btn-primary" onClick={logFood}>+ Add to Food Log</button>
            }
          </div>
        </div>
      )}
    </div>
  );
}
