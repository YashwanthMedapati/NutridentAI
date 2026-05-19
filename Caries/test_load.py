import pandas as pd
import numpy as np
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (accuracy_score, classification_report,
                             cohen_kappa_score, confusion_matrix, roc_auc_score)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier


# ── 1. LOAD ────────────────────────────────────────────────────────────────────
dental  = pd.read_sas("OHXDEN_J.xpt")
diet    = pd.read_sas("DR1TOT_J.xpt")
smoking = pd.read_sas("SMQ_J.xpt")
dbq     = pd.read_sas("DBQ_J.xpt")
demo    = pd.read_sas("DEMO_J.xpt")

print("Shapes:")
print(f"  Dental:  {dental.shape}")
print(f"  Diet:    {diet.shape}")
print(f"  Smoking: {smoking.shape}")
print(f"  DBQ:     {dbq.shape}")
print(f"  Demo:    {demo.shape}")


# ── 2. MERGE ───────────────────────────────────────────────────────────────────
demo_cols = demo[["SEQN", "RIDAGEYR", "RIAGENDR"]].copy()

df = dental.merge(diet,      on="SEQN", how="inner")
df = df.merge(smoking,       on="SEQN", how="left")
df = df.merge(dbq,           on="SEQN", how="left")
df = df.merge(demo_cols,     on="SEQN", how="left")

print(f"\nMerged shape: {df.shape}")


# ── 3. CARIES LABEL (binary) ───────────────────────────────────────────────────
tooth_cols = [c for c in df.columns if "OHX" in c and "CTC" in c and "RTC" not in c]
print(f"Tooth columns: {len(tooth_cols)}")

def count_caries(row):
    count = 0
    for col in tooth_cols:
        val = row[col]
        if isinstance(val, bytes):
            val = val.decode("utf-8").strip()
        if val in ["D", "F", "E"]:
            count += 1
    return count

df["caries_count"] = df[tooth_cols].apply(count_caries, axis=1)

# Data-driven threshold — median gives natural ~50/50 split
threshold = df["caries_count"].median()
print(f"\nCaries count — median threshold: {threshold}")
print(f"Mean: {df['caries_count'].mean():.2f}, Std: {df['caries_count'].std():.2f}")

df["caries_risk"] = (df["caries_count"] > threshold).astype(int)

print("\nBinary label distribution:")
vc = df["caries_risk"].value_counts()
print(f"  Low risk  (0): {vc.get(0, 0)}")
print(f"  High risk (1): {vc.get(1, 0)}")


# ── 4. FEATURE ENGINEERING ────────────────────────────────────────────────────

# Fix smoking nulls — non-smokers get 0
df["SMD650"] = df["SMD650"].fillna(0)
df["SMD030"] = df["SMD030"].fillna(df["RIDAGEYR"])  # started "now" = 0 years smoking
df["SMQ040"] = df["SMQ040"].fillna(3)               # 3 = not at all

# Age-based features
df["sugar_per_year"]  = df["DR1TSUGR"] / (df["RIDAGEYR"] + 1)
df["smoker_years"]    = (df["RIDAGEYR"] - df["SMD030"]).clip(lower=0)
df["age_group"]       = pd.cut(df["RIDAGEYR"],
                                bins=[0, 18, 35, 50, 100],
                                labels=[0, 1, 2, 3]).astype(float)

# Diet composite
df["diet_risk_score"] = (
    df["DR1TSUGR"].fillna(0) * 0.4 +
    df["DR1TCARB"].fillna(0) * 0.3 +
    df["DBD900"].fillna(0)   * 0.3
)

# Binary smoker flag
df["smoker_flag"] = (df["SMQ040"] == 1).astype(int)


# ── 5. SELECT FEATURES ────────────────────────────────────────────────────────
features = [
    # Demographics
    "RIDAGEYR",         # age — most important feature
    "RIAGENDR",         # gender

    # Diet — nutritional
    "DR1TSUGR",         # total sugar
    "DR1TCARB",         # total carbs
    "DR1TTFAT",         # total fat
    "DR1TKCAL",         # total calories
    "DR1TCALC",         # calcium (protective)
    "DR1TPHOS",         # phosphorus (protective)
    "DR1TSFAT",         # saturated fat

    # Smoking
    "SMD650",           # cigarettes per day
    "SMQ040",           # current smoking status
    "smoker_flag",      # binary smoker
    "smoker_years",     # years of smoking exposure

    # Eating behavior
    "DBD895",           # meals not home-cooked per week
    "DBD900",           # fast food meals per week
    "DBD905",           # ready-to-eat foods per week
    "DBD910",           # frozen meals per week

    # Engineered
    "sugar_per_year",   # lifetime sugar exposure proxy
    "age_group",        # bucketed age
    "diet_risk_score",  # composite diet risk
]

# Only keep features that exist in df
features = [f for f in features if f in df.columns]
print(f"\nFeatures selected: {len(features)}")
print(features)

df_model = df[features + ["caries_risk"]].copy()


# ── 6. PREPROCESSING ──────────────────────────────────────────────────────────

# Clip outliers at 1st/99th percentile
for col in features:
    p01 = df_model[col].quantile(0.01)
    p99 = df_model[col].quantile(0.99)
    df_model[col] = df_model[col].clip(lower=p01, upper=p99)

# Median imputation for remaining nulls
for col in features:
    df_model[col] = df_model[col].fillna(df_model[col].median())

print(f"\nFinal model data shape: {df_model.shape}")
print(f"Nulls remaining: {df_model.isnull().sum().sum()}")


# ── 7. TRAIN / TEST SPLIT ─────────────────────────────────────────────────────
X = df_model[features].values
y = df_model["caries_risk"].values

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print(f"\nTrain size: {X_train.shape[0]}, Test size: {X_test.shape[0]}")


# ── 8. TRAIN & EVALUATE ───────────────────────────────────────────────────────
models = {
    "Logistic Regression": LogisticRegression(
        max_iter=1000,
        class_weight="balanced",
        random_state=42
    ),
    "Random Forest": RandomForestClassifier(
        n_estimators=300,
        max_depth=8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    ),
    "XGBoost": XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=(y_train == 0).sum() / (y_train == 1).sum(),
        eval_metric="logloss",
        random_state=42
    ),
}

results = {}
for name, clf in models.items():
    clf.fit(X_train, y_train)
    preds      = clf.predict(X_test)
    proba      = clf.predict_proba(X_test)[:, 1]

    acc   = accuracy_score(y_test, preds)
    kappa = cohen_kappa_score(y_test, preds)
    auc   = roc_auc_score(y_test, proba)

    results[name] = {"accuracy": acc, "kappa": kappa, "auc": auc, "model": clf}

    print(f"\n{'='*52}")
    print(f"  {name}")
    print(f"{'='*52}")
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Kappa     : {kappa:.4f}   (target > 0.30)")
    print(f"  ROC-AUC   : {auc:.4f}   (target > 0.70)")
    print(f"\n{classification_report(y_test, preds, target_names=['Low','High'])}")
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, preds)
    print(f"  TN={cm[0,0]}  FP={cm[0,1]}")
    print(f"  FN={cm[1,0]}  TP={cm[1,1]}")


# ── 9. CROSS-VALIDATION ───────────────────────────────────────────────────────
best_name  = max(results, key=lambda k: results[k]["auc"])
best_model = results[best_name]["model"]
print(f"\nBest model by ROC-AUC: {best_name}")

cv       = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_aucs  = cross_val_score(best_model, X, y, cv=cv, scoring="roc_auc")
cv_kappa = cross_val_score(best_model, X, y, cv=cv, scoring="f1_weighted")

print(f"5-fold ROC-AUC   : {cv_aucs.mean():.4f} ± {cv_aucs.std():.4f}")
print(f"5-fold F1-weighted: {cv_kappa.mean():.4f} ± {cv_kappa.std():.4f}")


# ── 10. FEATURE IMPORTANCE ────────────────────────────────────────────────────
if hasattr(best_model, "feature_importances_"):
    imp_df = pd.DataFrame({
        "feature":    features,
        "importance": best_model.feature_importances_
    }).sort_values("importance", ascending=False)

    print(f"\nTop 10 features ({best_name}):")
    print(imp_df.head(10).to_string(index=False))


# ── 11. SAVE ──────────────────────────────────────────────────────────────────
joblib.dump(best_model, "caries_model.pkl")
joblib.dump(features,   "feature_names.pkl")
joblib.dump(threshold,  "caries_threshold.pkl")  # save threshold for reference

print("\nSaved: caries_model.pkl, feature_names.pkl, caries_threshold.pkl")
print("\nDone! Share your Kappa and ROC-AUC results.")