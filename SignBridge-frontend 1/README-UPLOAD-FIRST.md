# SignBridge AI — Frontend repository package

This archive is prepared from the supplied latest source ZIP.

## Upload
1. Extract this ZIP.
2. Upload the contents (including the `frontend/` and `ml/` folders) to the root of `meetmhatre12/SignBridge-frontend`.
3. Keep the `frontend/` directory structure unchanged. Vercel Project Root Directory: `frontend`.
4. Build command: `npm run build`
5. Output directory: `dist` (relative to the `frontend` root).
6. Configure `VITE_API_BASE_URL` only after the backend API URL is deployed.

The `ml/` directory is intentionally retained at repository root because existing frontend imports reference it using relative paths.

## Important
- `node_modules/`, generated `dist/`, local environment files and secrets are excluded.
- This is a source separation package, not a claim that camera recognition or all modules have passed production tests.
- Backend API and database must be deployed/configured separately.
