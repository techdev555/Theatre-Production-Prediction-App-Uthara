from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import PredictionRecord, create_tables, get_db
from .predictor import predict
from .schemas import HistoryItem, PredictionRequest, PredictionResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Theatre Prediction API",
    description="Predict theatre production performance before opening night.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
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

    return PredictionResponse(
        id=record.id,
        tickets_sold=result["tickets_sold"],
        total_revenue=result["total_revenue"],
        sold_out_probability=result["sold_out_probability"],
        feature_importance=result["feature_importance"],
        created_at=record.created_at,
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
