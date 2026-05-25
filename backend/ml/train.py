"""Train three models: tickets-sold regressor, revenue regressor, sold-out classifier."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error, r2_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ARTIFACTS = Path(__file__).parent / "artifacts"

CATEGORICAL = ["genre", "season"]
NUMERIC = [
    "capacity",
    "ticket_price",
    "marketing_spend",
    "run_length_weeks",
    "cast_popularity",
    "is_musical",
    "has_celebrity",
    "prior_show_avg_rating",
]
FEATURES = CATEGORICAL + NUMERIC


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL),
            ("num", StandardScaler(), NUMERIC),
        ]
    )


def train_regressor(X_train, y_train, X_test, y_test, name: str):
    pipe = Pipeline(
        steps=[
            ("prep", build_preprocessor()),
            ("model", GradientBoostingRegressor(n_estimators=300, max_depth=4, random_state=42)),
        ]
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    print(f"[{name}] MAE={mae:,.2f}  R2={r2:.3f}")
    return pipe, {"mae": float(mae), "r2": float(r2)}


def train_classifier(X_train, y_train, X_test, y_test, name: str):
    pipe = Pipeline(
        steps=[
            ("prep", build_preprocessor()),
            ("model", GradientBoostingClassifier(n_estimators=300, max_depth=4, random_state=42)),
        ]
    )
    pipe.fit(X_train, y_train)
    pred = pipe.predict(X_test)
    proba = pipe.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, pred)
    # roc_auc only valid if both classes present in test set
    auc = roc_auc_score(y_test, proba) if len(np.unique(y_test)) > 1 else float("nan")
    print(f"[{name}] ACC={acc:.3f}  AUC={auc:.3f}")
    return pipe, {"accuracy": float(acc), "roc_auc": float(auc)}


def feature_importance(pipe: Pipeline) -> dict[str, float]:
    """Return human-readable feature importances for the wrapped GBM."""
    prep: ColumnTransformer = pipe.named_steps["prep"]
    model = pipe.named_steps["model"]
    importances = model.feature_importances_

    ohe: OneHotEncoder = prep.named_transformers_["cat"]
    cat_names = list(ohe.get_feature_names_out(CATEGORICAL))
    all_names = cat_names + NUMERIC

    # Collapse one-hot dummies back to their parent categorical feature
    collapsed: dict[str, float] = {f: 0.0 for f in FEATURES}
    for name, imp in zip(all_names, importances):
        for cat in CATEGORICAL:
            if name.startswith(cat + "_"):
                collapsed[cat] += float(imp)
                break
        else:
            collapsed[name] = float(imp)
    return collapsed


def main() -> None:
    csv_path = ARTIFACTS / "productions.csv"
    if not csv_path.exists():
        raise SystemExit(f"Missing dataset at {csv_path}. Run generate_data.py first.")
    df = pd.read_csv(csv_path)

    X = df[FEATURES]
    y_tickets = df["tickets_sold"]
    y_revenue = df["total_revenue"]
    y_soldout = df["sold_out"]

    X_train, X_test, yt_train, yt_test = train_test_split(X, y_tickets, test_size=0.2, random_state=42)
    _, _, yr_train, yr_test = train_test_split(X, y_revenue, test_size=0.2, random_state=42)
    _, _, ys_train, ys_test = train_test_split(X, y_soldout, test_size=0.2, random_state=42)

    tickets_model, tickets_metrics = train_regressor(X_train, yt_train, X_test, yt_test, "tickets")
    revenue_model, revenue_metrics = train_regressor(X_train, yr_train, X_test, yr_test, "revenue")
    soldout_model, soldout_metrics = train_classifier(X_train, ys_train, X_test, ys_test, "sold_out")

    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    joblib.dump(tickets_model, ARTIFACTS / "tickets_model.joblib")
    joblib.dump(revenue_model, ARTIFACTS / "revenue_model.joblib")
    joblib.dump(soldout_model, ARTIFACTS / "soldout_model.joblib")

    metadata = {
        "features": FEATURES,
        "categorical": CATEGORICAL,
        "numeric": NUMERIC,
        "metrics": {
            "tickets": tickets_metrics,
            "revenue": revenue_metrics,
            "sold_out": soldout_metrics,
        },
        "feature_importance": {
            "tickets": feature_importance(tickets_model),
            "revenue": feature_importance(revenue_model),
            "sold_out": feature_importance(soldout_model),
        },
    }
    with open(ARTIFACTS / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print("\nSaved models and metadata to", ARTIFACTS)


if __name__ == "__main__":
    main()
