# SignBridge AI — Frontend

React 18 + TypeScript + Vite frontend.

## Vercel deployment
This repository keeps the Vite app in `frontend/` and shared recognition code in the sibling `ml/` directory. Set the Vercel **Root Directory** to the repository root (`.`) so the frontend can import the shared `ml/` code.

- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`
- Framework Preset: Vite (or Other if the dashboard does not detect the nested app)
- Environment variable: `VITE_API_BASE_URL` = deployed backend API base URL

Do not commit `.env` files, credentials, local databases, or `node_modules`.

## Important validation
The source package has not yet passed a fresh Vercel build or end-to-end browser test. Camera recognition quality depends on validated ISL training data and must not be represented as fully accurate until measured on a held-out dataset.
