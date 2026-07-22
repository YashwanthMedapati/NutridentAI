# Model Evaluation Report

Generated: 2026-07-22T18:06:52.560260+00:00 (commit `1b6128c`)

Regenerate this file by running `python test_load.py` with the NHANES `.xpt` files in this directory (see README for download links).

## Dataset

- Merged rows: 8366
- Train / test split: 6692 / 1674 (80/20, stratified)
- Label distribution: 4531 low-risk, 3835 high-risk

## Model comparison (held-out test set)

| Model | Accuracy | Cohen's Kappa | ROC-AUC |
|---|---|---|---|
| Logistic Regression | 0.6404 | 0.2707 | 0.6735 |
| Random Forest | 0.7204 | 0.4382 | 0.7982 |
| XGBoost | 0.7157 | 0.4288 | 0.7819 |

## Best model: Random Forest

- Held-out accuracy: **0.7204** (95% bootstrap CI: 0.6995 - 0.7419)
- Held-out ROC-AUC: 0.7982
- Held-out Cohen's Kappa: 0.4382
- 5-fold CV ROC-AUC: 0.7979 ± 0.0079
- 5-fold CV F1-weighted: 0.7174 ± 0.0074

## Top features

| Feature | Importance |
|---|---|
| RIDAGEYR | 0.4017 |
| sugar_per_year | 0.1441 |
| age_group | 0.0940 |
| diet_risk_score | 0.0419 |
| DR1TSUGR | 0.0385 |
| DR1TCARB | 0.0362 |
| DR1TKCAL | 0.0308 |
| DR1TCALC | 0.0297 |
| DR1TTFAT | 0.0293 |
| DR1TPHOS | 0.0286 |

## Notes

- Educational/research use only — not a clinical diagnostic tool.
- The caries_risk label is derived from a median split of tooth-surface counts, not a clinician-assigned diagnosis, so metrics reflect agreement with that proxy label rather than ground-truth caries status.
