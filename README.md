# SignBridge AI — Frontend

React 18 + TypeScript + Vite application. Shared recognition code is retained in the repository-root `ml/` directory.

## Vercel
- Root Directory: `.` (repository root; required for sibling `ml/` imports)
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`
- Set `VITE_API_BASE_URL` to the deployed backend API URL.

The current code has not yet passed a fresh Vercel build or end-to-end browser tests. Recognition accuracy must be validated against a sufficiently large held-out ISL dataset.
