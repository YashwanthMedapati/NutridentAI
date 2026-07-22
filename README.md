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

- `Caries/main.py` - FastAPI backend and scoring/model logic
- `Caries/caries_model.pkl` - local trained model
- `Caries/feature_names.pkl` - model feature order
- `Caries/test_core.py` - backend unit tests for scoring, validation, image heuristics, and metadata
- `Caries/test_load.py` - NHANES model training/rebuild script
- `caries-frontend/` - React app
- `caries-frontend/src/` - Vite React source, contexts, pages, and tests
- `database/schema.sql` - Supabase schema with RLS policies for authenticated cloud sync
- `database/verify_security.sql` - Supabase RLS/grant verification queries
- `DEPLOYMENT.md` - production deployment checklist

## Backend Setup

Create `Caries/.env`:

```env
USDA_API_KEY=your_usda_fooddata_central_key
GOOGLE_API_KEY=your_google_vision_api_key
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
MODEL_VERSION=local-dev
```

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

Backend smoke tests:

```powershell
python -m unittest Caries.test_core
```

Full local preflight:

```powershell
cd C:\Users\yashw\Desktop\NutriDent-AI
.\Caries\venv\Scripts\python.exe -m unittest Caries.test_core
cd caries-frontend
npm test
npm run build
npm audit
```

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
