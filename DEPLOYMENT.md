# NutriDent AI Deployment Checklist

## Frontend

Set these in the frontend host:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Build command:

```bash
npm run build
```

Deploy the generated `caries-frontend/dist/` directory.

Static hosting must rewrite all routes to `index.html` so paths like `/food`, `/nutrition`, and `/privacy` work on refresh.

Example fallback rules:

- Netlify: create `_redirects` with `/* /index.html 200`
- Vercel: add a rewrite from `/(.*)` to `/`
- Render static site: set rewrite rule `/*` -> `/index.html`

## Backend

Set these in the backend host:

```env
USDA_API_KEY=...
GOOGLE_API_KEY=...
CORS_ORIGINS=https://your-frontend-domain.com
MAX_IMAGE_BYTES=8388608
MODEL_VERSION=production
# If running more than one backend instance/worker behind a load balancer,
# set REDIS_URL so rate-limit counters are shared instead of per-instance:
# REDIS_URL=redis://your-redis-host:6379/0
```

Install:

```bash
pip install -r requirements.txt
```

Start command from `Caries/`:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

For local development, include every Vite port you use in `CORS_ORIGINS`, for example:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001
```

## Database/Auth Upgrade Path

The app stores logs in browser local storage when Supabase is not configured. When configured, signed-in users sync food and weight logs to Supabase.

1. Create a Supabase project.
2. Run `database/schema.sql` in the Supabase SQL Editor.
3. Run `database/verify_security.sql` and confirm RLS is enabled, `anon` has zero table privileges, authenticated grants exist, and policies filter by `user_id`.
4. Enable Email Auth in Supabase Auth.
5. Set the frontend Supabase env vars above.
6. Verify each signed-in user can only read and write their own rows from the app.

Use only the publishable/anon key in the frontend. Never place a service-role or secret key in `VITE_*`.

Before going public, keep email confirmation enabled and set the production Site URL/redirect URLs in Supabase Auth URL Configuration.

## Known Dependency Warnings

The frontend now uses Vite instead of Create React App. Run `npm audit` from `caries-frontend/` before deployment and do not use `npm audit fix --force` without reviewing breaking changes.

## Manual Production Checks

- Create a new account from the deployed frontend.
- Analyze a food, add it to the food log, refresh, and confirm it persists.
- Sign out and sign back in, then confirm the log still appears.
- In Supabase Table Editor, verify the row has your user id.
- Create a second test user and confirm that user cannot see the first user's logs.
- Confirm `/health` on the backend reports model/API readiness.

## Redis Rate-Limit Check

For one backend instance, the default in-memory limiter is fine. For multiple workers or replicas, set `REDIS_URL` so every instance shares the same counters.

Local Redis smoke test with Docker:

```powershell
docker run --rm -d --name nutrident-redis-test -p 6379:6379 redis:7-alpine
cd C:\Users\yashw\Desktop\NutriDent-AI\Caries
$env:REDIS_URL="redis://127.0.0.1:6379/0"
python -m unittest test_endpoints.TestEndpoints.test_rate_limit_triggers_for_food_risk
docker stop nutrident-redis-test
```

In production, check backend logs at startup for `Rate limiter using Redis-backed storage`. If Redis is unavailable, the app falls back to in-memory limits and logs a warning; treat that warning as a deployment issue for multi-instance hosting.

## Preflight

Run:

```bash
cd Caries && python -m unittest test_core test_endpoints
cd ../caries-frontend && npm test && npm run test:e2e && npm run build && npm audit
```

`.github/workflows/ci.yml` runs the same backend/frontend suites plus the production build automatically on every push and pull request to `main` — check that it's green before deploying.
