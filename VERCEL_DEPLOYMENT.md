# Vercel deployment

Root Directory: repository root (`.`).

Install Command: `cd frontend && npm ci`
Build Command: `cd frontend && npm run build`
Output Directory: `frontend/dist`

The repository root must remain the build root because frontend source imports shared modules from `../ml`. Configure `VITE_API_BASE_URL` in Vercel after the backend is deployed, including the `/api` suffix (for example, `https://your-service.onrender.com/api`). Configure the backend `CORS_ORIGINS` with the exact deployed Vercel origin. Never put private API keys or database credentials in VITE_ variables.
