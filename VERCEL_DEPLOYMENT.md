# Deployment notes

The repository root must remain the Vercel root because `ml/` is imported by files under `frontend/src`.

Vercel settings:
- Root Directory: `.`
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

Set `VITE_API_BASE_URL` in Vercel Project Settings after the backend is deployed. Do not put server-only secrets in VITE_ variables.
