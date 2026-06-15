import csv
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .database import PredictionRecord, SessionLocal, create_tables, get_db
from .predictor import predict
from .schemas import HistoryItem, PredictionRequest, PredictionResponse

EXPORTS_DIR = Path(__file__).parent.parent / "exports"
CSV_PATH = EXPORTS_DIR / "predictions_log.csv"

CSV_COLUMNS = [
    "id", "created_at",
    # inputs
    "genre", "season", "capacity", "ticket_price", "marketing_spend",
    "run_length_weeks", "cast_popularity", "is_musical", "has_celebrity",
    "prior_show_avg_rating",
    # predictions
    "predicted_tickets_sold", "predicted_total_revenue", "predicted_sold_out_probability",
    # blank actuals — fill in after the show runs to check accuracy
    "actual_tickets_sold", "actual_total_revenue", "actual_sold_out",
    "notes",
]


def _record_to_row(record: PredictionRecord) -> dict:
    inputs = record.inputs or {}
    return {
        "id": record.id,
        "created_at": record.created_at.isoformat(),
        "genre": inputs.get("genre", ""),
        "season": inputs.get("season", ""),
        "capacity": inputs.get("capacity", ""),
        "ticket_price": inputs.get("ticket_price", ""),
        "marketing_spend": inputs.get("marketing_spend", ""),
        "run_length_weeks": inputs.get("run_length_weeks", ""),
        "cast_popularity": inputs.get("cast_popularity", ""),
        "is_musical": inputs.get("is_musical", ""),
        "has_celebrity": inputs.get("has_celebrity", ""),
        "prior_show_avg_rating": inputs.get("prior_show_avg_rating", ""),
        "predicted_tickets_sold": max(0, int(record.tickets_sold)),
        "predicted_total_revenue": max(0.0, round(record.total_revenue, 2)),
        "predicted_sold_out_probability": round(record.sold_out_probability, 4),
        "actual_tickets_sold": "",
        "actual_total_revenue": "",
        "actual_sold_out": "",
        "notes": "",
    }


def _rebuild_csv(db: Session) -> None:
    """Rebuild CSV from SQLite on startup — keeps CSV in sync and clears any corruption."""
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    records = db.query(PredictionRecord).order_by(PredictionRecord.created_at).all()
    with open(CSV_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        for record in records:
            writer.writerow(_record_to_row(record))


def _append_to_csv(record: PredictionRecord) -> None:
    with open(CSV_PATH, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writerow(_record_to_row(record))


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    db = SessionLocal()
    try:
        _rebuild_csv(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Theatre Prediction API",
    description="Predict theatre production performance before opening night.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=PredictionResponse)
def create_prediction(req: PredictionRequest, db: Session = Depends(get_db)):
    input_dict = req.model_dump()
    try:
        result = predict(input_dict)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}") from exc

    record = PredictionRecord(
        inputs=input_dict,
        tickets_sold=result["tickets_sold"],
        total_revenue=result["total_revenue"],
        sold_out_probability=result["sold_out_probability"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    _append_to_csv(record)

    return PredictionResponse(
        id=record.id,
        tickets_sold=result["tickets_sold"],
        total_revenue=result["total_revenue"],
        sold_out_probability=result["sold_out_probability"],
        feature_importance=result["feature_importance"],
        created_at=record.created_at,
        tickets_sold_low=result.get("tickets_sold_low"),
        tickets_sold_high=result.get("tickets_sold_high"),
        total_revenue_low=result.get("total_revenue_low"),
        total_revenue_high=result.get("total_revenue_high"),
        occupancy_rate=result.get("occupancy_rate"),
        capped_at_capacity=result.get("capped_at_capacity"),
        max_tickets=result.get("max_tickets"),
        sensitivity=result.get("sensitivity", []),
    )


@app.get("/history", response_model=list[HistoryItem])
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    records = (
        db.query(PredictionRecord)
        .order_by(PredictionRecord.created_at.desc())
        .limit(limit)
        .all()
    )
    return records


@app.get("/history/{prediction_id}", response_model=HistoryItem)
def get_prediction(prediction_id: int, db: Session = Depends(get_db)):
    record = db.query(PredictionRecord).filter(PredictionRecord.id == prediction_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return record


@app.delete("/history/all")
def delete_all_predictions(db: Session = Depends(get_db)):
    deleted = db.query(PredictionRecord).delete()
    db.commit()
    _rebuild_csv(db)
    return {"deleted": deleted}


@app.delete("/history/{prediction_id}")
def delete_prediction(prediction_id: int, db: Session = Depends(get_db)):
    record = db.query(PredictionRecord).filter(PredictionRecord.id == prediction_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Prediction not found")
    db.delete(record)
    db.commit()
    _rebuild_csv(db)
    return {"deleted": prediction_id}


@app.get("/export/csv")
def download_csv():
    if not CSV_PATH.exists():
        raise HTTPException(status_code=404, detail="No predictions logged yet.")
    return FileResponse(
        path=str(CSV_PATH),
        media_type="text/csv",
        filename="predictions_log.csv",
    )
