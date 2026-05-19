import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { RiskBadge, NutritionGrid, Alert, Spinner } from "../components/UI";
import { Html5Qrcode } from "html5-qrcode";

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

  const fileRef    = useRef();
  const scannerRef = useRef(null); // holds the Html5Qrcode instance

  // ── BARCODE STATE ─────────────────────────────────────────────────────────────
  const [barcodeText, setBarcodeText] = useState("");
  const [cameraOpen,  setCameraOpen]  = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scannedCode, setScannedCode] = useState(null); // code captured, awaiting confirm

  // ── CAMERA: start scanner when cameraOpen becomes true ───────────────────────
  useEffect(() => {
    if (!cameraOpen) return;

    // The div with this id must be in the DOM when the effect runs
    const SCANNER_DIV_ID = "nutrident-barcode-scanner";
    const scanner = new Html5Qrcode(SCANNER_DIV_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" }, // use rear camera on mobile
        { fps: 10, qrbox: { width: 260, height: 120 } },
        (decodedText) => {
          // Pause scanning immediately after first successful read
          scanner.pause();
          setScannedCode(decodedText);
        },
        () => { /* ignore "not found" frames — fires every frame */ }
      )
      .catch((err) => {
        const msg = typeof err === "string" ? err : err?.message || "Camera error";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("notallowed")) {
          setCameraError("Camera permission denied. Allow camera access in your browser and try again.");
        } else {
          setCameraError("Camera not available on this device or browser.");
        }
        setCameraOpen(false);
      });

    // Cleanup: stop scanner when camera is closed or component unmounts
    return () => {
      scanner.stop().catch(() => {});
    };
  }, [cameraOpen]);

  // ── CAMERA: open — quick permission probe first ───────────────────────────────
  const openCamera = async () => {
    setCameraError(null);
    setScannedCode(null);
    setBarcodeText("");
    try {
      // Just check permission without keeping the stream
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      setCameraOpen(true);
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access in your browser settings and try again."
          : "Camera not available on this device or browser."
      );
    }
  };

  // ── CAMERA: close ─────────────────────────────────────────────────────────────
  const closeCamera = () => {
    setCameraOpen(false);
    setScannedCode(null);
  };

  // ── CAMERA: resume scanning (scan again) ─────────────────────────────────────
  const resumeScanning = () => {
    setScannedCode(null);
    scannerRef.current?.resume();
  };

  // ── ANALYZE BARCODE — shared by manual entry and camera ──────────────────────
  const analyzeBarcode = async (codeOverride) => {
    const barcode = (codeOverride ?? barcodeText).trim();
    if (!barcode) return;
    if (!/^\d{8,14}$/.test(barcode)) {
      setResult({ error: "Please enter a valid barcode (8–14 digits, numbers only)." });
      return;
    }
    // Close camera before lookup
    closeCamera();
    setBarcodeText(barcode);
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const res = await fetch("http://127.0.0.1:8000/barcode-food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ barcode }),
      });
      const data = await res.json();
      applyResult({ ...data, food_name_entered: data.product_name || barcode });
    } catch {
      setResult({ error: "Barcode lookup failed. Make sure the backend is running." });
    } finally {
      setLoading(false);
    }
  };

  // Close camera when leaving barcode tab
  const switchMode = (key) => {
    setMode(key);
    closeCamera();
    setCameraError(null);
    setRawResult(null); setResult(null); setLogged(false);
  };

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
            onClick={() => switchMode(key)}
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

        {/* BARCODE / QR */}
        {mode === "barcode" && (
          <div className="barcode-active">

            {/* Header */}
            <div className="barcode-header">
              <span className="barcode-header-icon">📦</span>
              <div>
                <h3 className="barcode-header-title">Barcode / QR Lookup</h3>
                <p className="barcode-header-sub">
                  Scan a product barcode with your camera, or type it manually.
                  Powered by Open Food Facts — free, no sign-up needed.
                </p>
              </div>
            </div>

            {/* Camera permission error */}
            {cameraError && <Alert type="error">{cameraError}</Alert>}

            {/* ── LIVE CAMERA SCANNER ── */}
            {cameraOpen ? (
              <div className="camera-scanner">
                {/* html5-qrcode renders the video feed into this div by ID */}
                <div id="nutrident-barcode-scanner" className="camera-viewfinder" />

                {/* Detected code — confirm or retry */}
                {scannedCode ? (
                  <div className="camera-detected">
                    <span className="camera-detected-label">✅ Detected:</span>
                    <span className="camera-detected-code">{scannedCode}</span>
                    <div className="camera-detected-actions">
                      <button className="btn-primary" onClick={() => analyzeBarcode(scannedCode)} disabled={loading}>
                        {loading ? <><Spinner /> Looking up…</> : "Look Up Product"}
                      </button>
                      <button className="btn-ghost" onClick={resumeScanning}>
                        Scan Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="camera-scanning-msg">
                    <Spinner /> Point at a barcode or QR code…
                  </p>
                )}

                <button className="camera-close-btn" onClick={closeCamera}>
                  ✕ Close Camera
                </button>
              </div>
            ) : (
              /* Camera open button (shown when scanner is not active) */
              <button className="btn-camera" onClick={openCamera} disabled={loading}>
                <span className="btn-camera-icon">📷</span>
                Scan Barcode with Camera
              </button>
            )}

            {/* Divider */}
            <div className="barcode-divider"><span>or enter barcode manually</span></div>

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
                placeholder="e.g. 5000112637922"
                value={barcodeText}
                onChange={e => setBarcodeText(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && analyzeBarcode()}
                maxLength={14}
              />
              <button className="btn-primary" onClick={() => analyzeBarcode()} disabled={loading}>
                {loading ? <><Spinner /> Looking up…</> : "Look Up"}
              </button>
            </div>

            <p className="barcode-format-hint">
              EAN-13, EAN-8, UPC-A, UPC-E &nbsp;·&nbsp; Numbers only, no spaces or dashes
            </p>

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
