# SignBridge AI — Vercel Deployment and Backend Integration

This file documents the frontend deployment handoff. It does not claim that the backend, database or third-party services are already connected.

## Vercel import settings

- Repository: `meetmhatre12/SignBridge-frontend`
- Branch: `main`
- Root Directory: `.` (repository root; shared `ml/` assets are outside `frontend/`)
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`

Do not change the Root Directory to `frontend` unless the shared ML imports and build configuration are deliberately moved and re-tested.

## Environment variable

Set in Vercel for the appropriate deployment environments:

```env
VITE_API_BASE_URL=https://YOUR-RENDER-BACKEND.onrender.com/api
```

Replace the example host after the backend is imported and Render provides the real service URL. The `/api` suffix is required by the current frontend API service contract.

Never place private keys, database credentials, JWT secrets, Resend keys or Supabase service-role keys in Vite variables. Variables prefixed with `VITE_` are exposed to browser code.

## Backend CORS handoff

After Vercel provides the frontend origin, configure backend `FRONTEND_URL` and `CORS_ORIGINS` with that exact origin. Do not include a trailing path. Add preview origins only when intentionally required.

## Frontend feature integration checklist

- Registration, name/email validation and password creation.
- Email verification OTP, resend and expiry/error states.
- Login, logout and authenticated route handling.
- Forgot-password request, OTP verification and password reset.
- Google OAuth callback and account-linking flow.
- Profile and account preferences.
- Learning content, progress, bookmarks and completion state.
- Practice and assessment attempts/results.
- Recognition/translation history and conversation save behaviour.
- Certificates and certificate verification.
- Contributions and submission status.
- Institution and admin dashboards with role-aware access.
- Developer API key and usage screens.

Every screen must use the real backend API where the feature is intended to persist. Do not silently treat browser local storage as the permanent database.

## Post-import sequence

1. Import backend into Render and verify build/start/health.
2. Import frontend into Vercel and verify build.
3. Add the real Render API URL to Vercel as `VITE_API_BASE_URL`.
4. Add the exact Vercel origin to Render CORS settings.
5. Smoke-test frontend-to-backend connectivity.
6. Implement the selected production MySQL database and migration process in the backend.
7. Connect each feature to persistent storage and verify reload/restart persistence.
8. Run the complete authentication and learning end-to-end checklist.

## Data safety

No production database import or destructive migration is part of this Vercel setup. Existing JSON/SQLite records must be backed up, mapped, imported with stable identifiers and reconciled before database cutover.

## Current validation

- Frontend CI/build passed on the current pre-plan main commit (see GitHub Actions).
- Deployment itself is not yet confirmed.
- Real backend URL and CORS origin are pending Render/Vercel import.
- Production database integration is a later phase; a successful static frontend build does not validate persistence.
