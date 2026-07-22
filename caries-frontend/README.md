# NutriDent AI Frontend

Vite React frontend for NutriDent AI.

## Environment

Local development uses `.env.development`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Production uses `.env.production` or host-provided environment variables:

```env
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_or_anon_key
```

Never put Supabase service-role keys in frontend env vars.

## Scripts

```powershell
npm install
npm start
npm test
npm run build
npm audit
```

`npm run build` writes production files to `dist/`.

## Local URLs

Vite starts on `http://localhost:3000` when available. If that port is busy, it may use `3001`. Add every local frontend port you use to the backend `CORS_ORIGINS` value.
