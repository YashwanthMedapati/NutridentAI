import React from "react";
import { Alert, MacroAnalysis, NutritionGrid, RiskBadge, RiskBar, Spinner } from "../UI";

export function QuickSearchCard({
  searchName,
  setSearchName,
  searching,
  onSearch,
  searchResult,
  onAddToLog,
}) {
  return (
    <div className="result-card mt-16">
      <div className="result-card-head"><span className="result-card-label">Quick Food Lookup</span></div>
      <div className="quick-search-row">
        <input className="quick-search-input" type="text"
          placeholder="Search any food… e.g. banana, pizza, oatmeal"
          value={searchName} onChange={e => setSearchName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch()} />
        <button className="btn-primary" onClick={onSearch} disabled={searching}>
          {searching ? <><Spinner /> Searching…</> : "Look Up"}
        </button>
      </div>
      {searchResult && !searchResult.error && (
        <div className="search-result-block">
          <div className="search-result-head">
            <span className="fli-name">{searchResult.usda_match}</span>
            <RiskBadge risk={searchResult.risk?.food_risk_level} />
          </div>
          <RiskBar score={searchResult.risk?.food_risk_score} level={searchResult.risk?.food_risk_level} />
          <NutritionGrid nutrition={searchResult.nutrition} />
          <MacroAnalysis nutrition={searchResult.nutrition} />
          {searchResult.risk?.reasons?.length > 0 && (
            <ul className="reason-list mt-8">{searchResult.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
          )}
          {searchResult.risk?.consumption_advice && <p className="fli-advice">{searchResult.risk.consumption_advice}</p>}
          {searchResult.risk?.warning && <Alert type="warning">{searchResult.risk.warning}</Alert>}
          <button className="btn-primary mt-12" onClick={onAddToLog}>
            + Add to Food Log
          </button>
        </div>
      )}
      {searchResult?.error && <Alert type="error">{searchResult.error}</Alert>}
    </div>
  );
}
