import React, { useState, useRef } from "react";
import { useApp } from "../context/AppContext";
import { Alert } from "../components/UI";
import { apiFetch } from "../api";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { UploadPanel } from "../components/analyze-food/UploadPanel";
import { SearchPanel } from "../components/analyze-food/SearchPanel";
import { BarcodePanel } from "../components/analyze-food/BarcodePanel";
import { MealPanel } from "../components/analyze-food/MealPanel";
import { DetectionSummary } from "../components/analyze-food/DetectionSummary";
import { CorrectionCard } from "../components/analyze-food/CorrectionCard";
import { GuidedPortionCard } from "../components/analyze-food/GuidedPortionCard";
import { PortionEditorCard } from "../components/analyze-food/PortionEditorCard";
import { ResultCards } from "../components/analyze-food/ResultCards";
import { FrequencyRiskCard } from "../components/analyze-food/FrequencyRiskCard";
import {
  GUIDED_DEFAULTS,
  foodKindFor,
  guidedEstimate,
  ingredientCalorieBreakdown,
} from "../utils/foodAnalysis";

export default function AnalyzeFood() {
  const { addToFoodLog } = useApp();

  const [mode, setMode]           = useState("upload");
  const [image, setImage]         = useState(null);
  const [imagePreview, setPreview] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [mealItems, setMealItems] = useState([
    { food_name: "", portion_g: "" },
    { food_name: "", portion_g: "" },
  ]);

  // Raw result from backend (per 100 g values + portion_estimate)
  const [rawResult, setRawResult] = useState(null);
  // Displayed result (after portion scaling applied client-side for UI refresh)
  const [result, setResult]       = useState(null);

  const [loading, setLoading]     = useState(false);
  const [logged, setLogged]       = useState(false);
  const [mealCategory, setMealCategory] = useState("Meal");
  const [correctedFoodName, setCorrectedFoodName] = useState("");
  const [userIngredients, setUserIngredients] = useState("");
  const [guidedAnswers, setGuidedAnswers] = useState(GUIDED_DEFAULTS.generic);

  // Portion state: starts from AI estimate, user can override
  const [portionG, setPortionG]   = useState(null);
  const [portionEdited, setPortionEdited] = useState(false);
  const [portionError, setPortionError] = useState(null);

  const fileRef = useRef();

  const {
    barcodeText,
    setBarcodeText,
    cameraOpen,
    cameraError,
    setCameraError,
    scannedCode,
    openCamera,
    closeCamera,
    resumeScanning,
  } = useBarcodeScanner();

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
      const data = await apiFetch("/barcode-food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ barcode }),
      });
      applyResult({ ...data, food_name_entered: data.product_name || barcode });
    } catch (error) {
      setResult({ error: error.message || "Barcode lookup failed. Make sure the backend is running." });
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
  const loadImageFile = (f) => {
    if (!f) return;
    setImage(f); setRawResult(null); setResult(null); setLogged(false);
    setPortionG(null); setPortionEdited(false);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleFile = (e) => {
    loadImageFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    loadImageFile(e.dataTransfer.files?.[0]);
  };

  // ── SET RESULT + INITIALIZE PORTION ──────────────────────────────────────────
  const applyResult = (data) => {
    setRawResult(data);
    setResult(data);
    const estimatedG = data?.portion_estimate?.g || 100;
    setPortionG(estimatedG);
    setPortionEdited(false);
    setPortionError(null);
    setCorrectedFoodName(data?.detected_food || data?.product_name || data?.food_name_entered || searchText || "");
    setUserIngredients(
      data?.image_insights?.detected_ingredients?.map(item => item.name).join(", ") ||
      data?.ingredients ||
      ""
    );
    const nextKind = foodKindFor(data?.detected_food || data?.product_name || data?.food_name_entered || searchText || "");
    const detectedIngredients = data?.image_insights?.detected_ingredients?.map(item => item.name) || [];
    setGuidedAnswers({
      ...GUIDED_DEFAULTS[nextKind],
      toppings: detectedIngredients.length ? detectedIngredients : GUIDED_DEFAULTS[nextKind].toppings,
    });
  };

  // ── RE-FETCH WITH NEW PORTION ─────────────────────────────────────────────────
  const updateMealItem = (index, key, value) => {
    setMealItems(prev => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [key]: value } : item
    )));
  };

  const addMealItem = () => {
    setMealItems(prev => [...prev, { food_name: "", portion_g: "" }]);
  };

  const removeMealItem = (index) => {
    setMealItems(prev => prev.length <= 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const recalcWithPortion = async (newG, foodNameOverride) => {
    if (!rawResult) return;
    if (rawResult.meal_items?.length) {
      setPortionError("Edit the combo meal rows and analyze again to update a meal portion.");
      return;
    }
    const foodName = foodNameOverride || correctedFoodName || rawResult.food_name_entered || searchText || rawResult.detected_food || "";
    try {
      setPortionError(null);
      const path = rawResult.barcode ? "/barcode-food-risk" : "/food-risk";
      const body = rawResult.barcode
        ? { barcode: rawResult.barcode, portion_g: newG }
        : { food_name: foodName, portion_g: newG };
      const data = await apiFetch(path, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      setResult({ ...data, food_name_entered: rawResult.food_name_entered || data.product_name || foodName });
    } catch (error) {
      setPortionError(error.message || "Could not recalculate portion.");
    }
  };

  const handlePortionChange = (e) => {
    const val = Number(e.target.value);
    if (val > 0) setPortionG(val);
  };

  const handlePortionApply = () => {
    setPortionEdited(true);
    recalcWithPortion(portionG);
  };

  const applyCorrections = () => {
    setPortionEdited(true);
    recalcWithPortion(portionG);
  };

  const updateGuidedAnswer = (key, value) => {
    setGuidedAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleGuidedTopping = (name) => {
    setGuidedAnswers(prev => {
      const current = new Set(prev.toppings || []);
      if (current.has(name)) current.delete(name);
      else current.add(name);
      return { ...prev, toppings: Array.from(current) };
    });
  };

  const applyGuidedEstimate = () => {
    const baseName = correctedFoodName || result?.detected_food || result?.food_name_entered || searchText || "";
    const kind = foodKindFor(baseName);
    const estimate = guidedEstimate(kind, guidedAnswers);
    const selectedIngredients = (guidedAnswers.toppings || []).filter(Boolean);
    const enrichedName = selectedIngredients.length
      ? `${baseName} with ${selectedIngredients.join(", ")}`
      : baseName;
    setCorrectedFoodName(enrichedName);
    setUserIngredients(selectedIngredients.join(", "));
    setPortionG(estimate.grams);
    setPortionEdited(true);
    recalcWithPortion(estimate.grams, enrichedName);
  };

  // ── ANALYZE IMAGE ─────────────────────────────────────────────────────────────
  const analyzeImage = async () => {
    if (!image) return;
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const fd = new FormData(); fd.append("file", image);
      const data = await apiFetch("/image-food-risk", { method: "POST", body: fd });
      applyResult(data);
    } catch (error) { setResult({ error: error.message || "Image analysis failed. Check backend." }); }
    finally   { setLoading(false); }
  };

  // ── SEARCH FOOD ───────────────────────────────────────────────────────────────
  const analyzeSearch = async () => {
    if (!searchText.trim()) return;
    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const data = await apiFetch("/food-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ food_name: searchText }),
      });
      applyResult({ ...data, food_name_entered: searchText });
    } catch (error) { setResult({ error: error.message || "Search failed. Check backend." }); }
    finally   { setLoading(false); }
  };

  const analyzeMeal = async () => {
    const items = mealItems
      .map(item => ({
        food_name: item.food_name.trim(),
        portion_g: item.portion_g ? Number(item.portion_g) : undefined,
      }))
      .filter(item => item.food_name);

    if (!items.length) {
      setResult({ error: "Add at least one meal item before analyzing." });
      return;
    }

    try {
      setLoading(true); setRawResult(null); setResult(null); setLogged(false);
      const data = await apiFetch("/meal-risk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ items }),
      });
      applyResult({ ...data, food_name_entered: data.food_name_entered || "Combo meal" });
    } catch (error) {
      setResult({ error: error.message || "Meal analysis failed. Check backend." });
    } finally {
      setLoading(false);
    }
  };

  // ── LOG FOOD ──────────────────────────────────────────────────────────────────
  const logFood = () => {
    if (result?.nutrition) {
      addToFoodLog({
        ...result,
        food_name_entered: correctedFoodName || result.detected_food || searchText,
        corrected_food_name: correctedFoodName || null,
        user_ingredients: userIngredients || null,
        mealCategory,
      });
      setLogged(true);
    }
  };

  const risk         = result?.risk;
  const riskLevel    = risk?.food_risk_level;
  const portionInfo  = result?.portion_estimate;
  const nutrition    = result?.nutrition;
  const imageInsights = result?.image_insights;
  const analysisQuality = result?.analysis_quality;
  const calorieBreakdown = result?.calorie_breakdown;
  const guidedKind = foodKindFor(correctedFoodName || result?.detected_food || result?.food_name_entered || searchText);
  const guidedEstimatePreview = guidedEstimate(guidedKind, guidedAnswers);
  const visibleIngredients = userIngredients
    ? userIngredients.split(",").map(name => ({ name: name.trim(), confidence: "User" })).filter(item => item.name)
    : imageInsights?.detected_ingredients || [];
  const ingredientCalories = calorieBreakdown?.ingredient_estimates?.length
    ? calorieBreakdown.ingredient_estimates
    : ingredientCalorieBreakdown(visibleIngredients, nutrition);
  const portionOptions = portionInfo?.options || [
    { label: "Small",  g: Math.round((portionInfo?.g || 150) * 0.65) },
    { label: "Medium", g: portionInfo?.g || 150 },
    { label: "Large",  g: Math.round((portionInfo?.g || 150) * 1.4)  },
  ];

  return (
    <div className="page analyze-page">
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
          { key: "meal",    label: "🍽️ Combo Meal" },
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

        {mode === "upload" && (
          <UploadPanel
            imagePreview={imagePreview}
            fileRef={fileRef}
            onFileChange={handleFile}
            onDrop={handleDrop}
            onAnalyze={analyzeImage}
            loading={loading}
          />
        )}

        {mode === "search" && (
          <SearchPanel
            searchText={searchText}
            onChange={e => setSearchText(e.target.value)}
            onSearch={analyzeSearch}
            loading={loading}
          />
        )}

        {mode === "meal" && (
          <MealPanel
            items={mealItems}
            onItemChange={updateMealItem}
            onAddItem={addMealItem}
            onRemoveItem={removeMealItem}
            onAnalyze={analyzeMeal}
            loading={loading}
          />
        )}

        {mode === "barcode" && (
          <BarcodePanel
            cameraError={cameraError}
            cameraOpen={cameraOpen}
            scannedCode={scannedCode}
            loading={loading}
            onLookupScanned={analyzeBarcode}
            onResumeScanning={resumeScanning}
            onCloseCamera={closeCamera}
            onOpenCamera={openCamera}
            barcodeText={barcodeText}
            setBarcodeText={setBarcodeText}
            onManualLookup={analyzeBarcode}
          />
        )}
      </div>

      {loading && (
        <div className="ai-scan-status">
          <div className="ai-scan-orbit">
            <span>AI</span>
          </div>
          <div>
            <strong>Analyzing nutrition and dental risk</strong>
            <p>Detecting food, matching nutrition data, estimating portion, and preparing macro details.</p>
          </div>
        </div>
      )}

      {/* ERROR */}
      {result?.error && <Alert type="error">{result.error}</Alert>}

      {/* ── RESULTS ── */}
      {result && !result.error && (
        <div className="food-results">

          <DetectionSummary
            result={result}
            analysisQuality={analysisQuality}
            imageInsights={imageInsights}
          />

          {!result.meal_items?.length && (
            <>
              <CorrectionCard
                correctedFoodName={correctedFoodName}
                setCorrectedFoodName={setCorrectedFoodName}
                mealCategory={mealCategory}
                setMealCategory={setMealCategory}
                portionG={portionG}
                onPortionChange={handlePortionChange}
                userIngredients={userIngredients}
                setUserIngredients={setUserIngredients}
                onApplyCorrections={applyCorrections}
              />

              <GuidedPortionCard
                guidedKind={guidedKind}
                guidedAnswers={guidedAnswers}
                updateGuidedAnswer={updateGuidedAnswer}
                toggleGuidedTopping={toggleGuidedTopping}
                guidedEstimatePreview={guidedEstimatePreview}
                onApplyGuidedEstimate={applyGuidedEstimate}
              />
            </>
          )}

          {portionInfo && !result.meal_items?.length && (
            <PortionEditorCard
              portionInfo={portionInfo}
              portionEdited={portionEdited}
              portionG={portionG}
              portionOptions={portionOptions}
              onPresetSelect={(g) => { setPortionG(g); recalcWithPortion(g); setPortionEdited(true); }}
              onPortionChange={handlePortionChange}
              onPortionApply={handlePortionApply}
              portionError={portionError}
            />
          )}

          <ResultCards
            risk={risk}
            riskLevel={riskLevel}
            nutrition={nutrition}
            portionG={portionG}
            portionInfo={portionInfo}
            ingredientCalories={ingredientCalories}
            nutritionPer100g={result?.nutrition_per_100g}
            mealItems={result?.meal_items}
            sourceDetails={result?.source_details}
          />

          {risk?.frequency_risk && <FrequencyRiskCard frequencyRisk={risk.frequency_risk} />}

          {/* LOG BUTTON */}
          <div className="log-row">
            {logged ? (
              <span className="log-success">Added to today's food log</span>
            ) : (
              <button className="btn-primary" onClick={logFood}>+ Add to Food Log</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
