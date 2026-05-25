# Curtain Call — Theatre Production Predictor

AI-powered app that predicts box office performance of a theatre production before opening night.

## Architecture

```
Theatre-Prediction-App/
├── backend/          # FastAPI + scikit-learn — deploy to Render
│   ├── app/          # API code
│   ├── ml/           # Dataset generation + model training scripts
│   └── requirements.txt
└── frontend/         # Next.js 16 + Tailwind — deploy to Vercel
```

## Running Locally

### Backend (FastAPI — port 8000)

```bash
cd backend

# First time only: create venv and install deps
py -m venv venv
./venv/Scripts/python.exe -m pip install -r requirements.txt

# First time only: generate dataset and train models
./venv/Scripts/python.exe ml/generate_data.py
./venv/Scripts/python.exe ml/train.py

# Start the API
./venv/Scripts/uvicorn.exe app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Frontend (Next.js — port 3000)

```bash
cd frontend
npm install
npm run dev
```

App available at: http://localhost:3000

## ML Models

Three Gradient Boosting models trained on a 5,000-row synthetic dataset:

| Model | Target | Metric |
|-------|--------|--------|
| Tickets Regressor | Expected ticket sales | R² = 0.972, MAE = 10,081 |
| Revenue Regressor | Total box office revenue | R² = 0.964 |
| Sold-Out Classifier | Probability of sold-out shows | AUC = 0.979, Accuracy = 92.1% |

### Input Features

- **Genre** — Musical, Drama, Comedy, Tragedy, Thriller, Family, Experimental
- **Season** — Spring, Summer, Fall, Winter
- **Theatre Capacity** — 50–5,000 seats
- **Ticket Price** — $5–$1,000 average ticket price
- **Marketing Spend** — $0–$2,000,000 budget
- **Run Length** — 1–52 weeks
- **Cast Popularity** — 1–10 score
- **Is Musical** — boolean
- **Has Celebrity** — boolean
- **Prior Show Avg Rating** — 1–10 based on producer history

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/predict` | Run a prediction, saves result to DB |
| GET | `/history` | List last 20 saved predictions |
| GET | `/history/{id}` | Retrieve a specific prediction |
| GET | `/health` | Health check |

## Deployment

### Render (Backend)

1. Push `backend/` to a GitHub repo
2. Create a new **Web Service** on Render
3. Set **Build Command**: `pip install -r requirements.txt && python ml/generate_data.py && python ml/train.py`
4. Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set environment variable: `PYTHON_VERSION=3.11`

### Vercel (Frontend)

1. Push `frontend/` to a GitHub repo (or use the monorepo root with root dir set to `frontend`)
2. Import to Vercel
3. Set environment variable: `NEXT_PUBLIC_API_URL=https://your-render-service.onrender.com`
4. Deploy
