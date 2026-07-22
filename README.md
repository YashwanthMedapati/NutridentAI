# NutriDent AI

Full-stack oral health and nutrition analytics platform using React, Vite, FastAPI, USDA FoodData Central, Open Food Facts, Google Vision, Supabase Auth, and a local Random Forest model.

## Features

- Dental caries risk prediction from patient, diet, smoking, and eating-pattern inputs
- Food-risk analysis by text search, image upload, or barcode lookup
- Portion-aware nutrition and oral-risk recalculation with confidence/review metadata
- Persistent browser-local food logs, previous assessments, coach profile, water, weight, badges, and streaks
- Daily Log with calendar-style food history, logged eating times, daily weight, calories, and CSV export
- Nutrition tracker with editable logged portions and meal categories
- Coach dashboard with daily targets, trends, insights, and swaps
- Supabase Auth/cloud-sync integration for food and weight logs when configured
- Account, settings, data export, import, and delete controls
- Privacy and safety page for local data, external APIs, and medical-use limitations
- Backend health and model transparency endpoints

## Project Structure

- `Caries/main.py` - FastAPI app assembly and route handlers (thin entrypoint)
- `Caries/core/` - backend modules: config, schemas, portion/quality/risk scoring, USDA, Open Food Facts, Vision, patient model, rate limiting, middleware
- `Caries/caries_model.pkl` - local trained model
- `Caries/feature_names.pkl` - model feature order
- `Caries/test_core.py` - unit tests for scoring, validation, image heuristics, and metadata
- `Caries/test_endpoints.py` - integration tests for every API endpoint (mocked USDA/Vision/Open Food Facts calls), including rate limiting
- `Caries/test_load.py` - NHANES model training/rebuild script; also produces `MODEL_EVALUATION.md`/`.json`
- `caries-frontend/` - React app
- `caries-frontend/src/` - Vite React source, contexts, pages, and tests
- `database/schema.sql` - Supabase schema with RLS policies for authenticated cloud sync
- `database/verify_security.sql` - Supabase RLS/grant verification queries
- `.github/workflows/ci.yml` - GitHub Actions: runs backend/frontend lint, tests, and the frontend build on every push/PR to `main`
- `Caries/Dockerfile` - optional container build for the backend (alongside the pip-based deploy flow below)
- `Caries/pyproject.toml` - ruff lint config (`ruff check .` from `Caries/`)
- `caries-frontend/eslint.config.js` - ESLint flat config (`npm run lint` from `caries-frontend/`)
- `DEPLOYMENT.md` - production deployment checklist
- `LICENSE` - MIT

## Backend Setup

Create `Caries/.env`:

```env
USDA_API_KEY=your_usda_fooddata_central_key
GOOGLE_API_KEY=your_google_vision_api_key
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
MODEL_VERSION=local-dev
# Optional rate limiting (defaults shown below; set RATE_LIMIT_ENABLED=false to disable)
RATE_LIMIT_DEFAULT=60/minute
RATE_LIMIT_EXTERNAL=20/minute
# Optional: share rate-limit counters across multiple backend instances/workers
# REDIS_URL=redis://localhost:6379/0
```

Requests to endpoints that call USDA, Open Food Facts, or Google Vision are rate-limited per client IP (`RATE_LIMIT_EXTERNAL`) to avoid exhausting those providers' quotas; all other endpoints use the more permissive `RATE_LIMIT_DEFAULT`. Rate-limit counters are in-memory per process by default — fine for a single instance, but each worker/replica behind a load balancer would track its own counters independently. Set `REDIS_URL` to share counters across instances; if it's set but unreachable at startup, the backend falls back to in-memory storage and logs a warning rather than failing to boot.

Run the API from the `Caries` folder or repo root:

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI\Caries
python -m pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Useful endpoints:

- `GET /health` - model and API key readiness
- `GET /model-info` - model type, feature count, version, training-data note, limitations
- `POST /predict`
- `POST /food-risk`
- `POST /combined-risk`
- `POST /image-food-risk`
- `POST /barcode-food-risk`

## Frontend Setup

Create `caries-frontend/.env.development` for local development:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Create `caries-frontend/.env.production` for deployment:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Run:

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI\caries-frontend
npm install
npm start
```

Build and test:

```powershell
npm test
npm run build
```

Backend tests:

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI\Caries
python -m unittest test_core test_endpoints -v
```

`test_core.py` covers scoring/validation/image-heuristic unit behavior; `test_endpoints.py` exercises every API route end-to-end (USDA, Open Food Facts, and Google Vision calls are mocked) and verifies rate limiting actually triggers.

Model retraining and evaluation:

`Caries/test_load.py` expects local NHANES `.xpt` files in the `Caries` folder (download from the [NHANES 2017-2018 data portal](https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017)). Those raw datasets are intentionally untracked because they are large training artifacts, not runtime dependencies — the deployed API only needs the committed `.pkl` files. Running the script additionally requires `pandas` and `xgboost` (not in `requirements.txt`, since the serving API doesn't need them):

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI\Caries
pip install pandas xgboost
python test_load.py
```

This trains and compares Logistic Regression, Random Forest, and XGBoost on an 80/20 stratified split, runs 5-fold cross-validation, computes a bootstrap 95% confidence interval on held-out accuracy, and writes the full comparison to `Caries/MODEL_EVALUATION.md` and `.json` alongside the updated `.pkl` artifacts.

Current committed model (Random Forest, selected by ROC-AUC, NHANES 2017-2018): **72.04% held-out accuracy** (95% bootstrap CI: 69.95%-74.19%), ROC-AUC 0.798, Cohen's Kappa 0.438, 5-fold CV ROC-AUC 0.798 ± 0.008 — see `Caries/MODEL_EVALUATION.md` for the full breakdown, including per-model comparison and feature importances. Re-run `test_load.py` after pulling a fresh NHANES cycle and diff the regenerated report against the committed one before trusting a specific number long-term.

Full local preflight:

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI\Caries
python -m unittest test_core test_endpoints
cd ..\caries-frontend
npm test
npm run build
npm audit
```

Continuous integration: `.github/workflows/ci.yml` runs the backend and frontend suites (and the frontend production build) on every push and pull request to `main`.

## Supabase Setup

1. Create a Supabase project.
2. Run `database/schema.sql` in the Supabase SQL Editor.
3. Run `database/verify_security.sql`.
4. Confirm RLS is enabled for `user_profiles`, `food_logs`, `weight_logs`, and `assessment_results`.
5. Confirm the `anon` privilege query returns zero rows.
6. Enable Email sign-in under Authentication -> Sign In / Providers.
7. Add the Project URL and publishable/anon key to the frontend env files.

Never put a Supabase service-role key in the frontend.

## Data And Privacy

NutriDent AI stores user-entered form data, assessment history, food logs, coach profile, hydration, weight, badges, and streaks in browser `localStorage` by default. When Supabase env vars are configured and a user signs in, food logs and weight logs sync to Supabase using RLS-protected user-owned rows.

Do not treat localStorage as secure storage for sensitive medical records. Clear browser site data to remove saved local data.

The Daily Log can export food and weight history to CSV from the browser. Uploaded food photos are analyzed through the backend and Google Vision API when image detection is used.

## Validation And Safety

The backend validates plausible ranges for age, nutrients, smoking fields, eating-frequency fields, portions, food names, and barcodes. The frontend also validates assessment inputs before submitting.

This project is educational and research-oriented. It is not a clinical dental diagnosis or medical advice. Risk scores depend on self-reported inputs and population-level model patterns.

## Author

Yashwanth Reddy Medapati

M.S. Computer Science, Binghamton University

GitHub: [YashwanthMedapati](https://github.com/YashwanthMedapati)

## Future Upgrades

- Extend Supabase sync to assessment history, coach hydration, badges, and streaks
- Add account deletion and server-side data deletion flow
- Add TypeScript or shared API schema generation for stronger frontend/backend contracts
- Add user consent and data export/delete controls before storing health-adjacent data in a server database
