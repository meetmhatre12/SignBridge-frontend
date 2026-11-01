# SignBridge AI — Frontend

React 18 + TypeScript + Vite application. Shared recognition code is retained in the repository-root `ml/` directory.

## Vercel
- Root Directory: `.` (repository root; required for sibling `ml/` imports)
- Install Command: `cd frontend && npm ci`
- Build Command: `cd frontend && npm run build`
- Output Directory: `frontend/dist`
- Set `VITE_API_BASE_URL` to the deployed backend API URL.

The current code has not yet passed a fresh Vercel build or end-to-end browser tests. Recognition accuracy must be validated against a sufficiently large held-out ISL dataset.


## Production routes and acceptance checks

### Authentication
- Sign-in / registration: `/login`
- Google OAuth callback: `/auth/callback`
- Password reset landing page: `/reset-password?token=<single-use-token>`
- User profile: `/profile`

The reset flow requires the backend Resend sender configuration and a reachable `FRONTEND_URL`. The reset token is single-use and expires after 15 minutes. After changing the password, use the dedicated **Go to Sign In** action to open `/login`.

### Administrator pages
- Admin overview: `/admin`
- User records: `/admin/records`
- Administrator management: `/admin/administrators`
- Certificate requests: `/admin/certificate-requests`
- Learner analytics: `/admin/users/:userId/analytics`

Admin routes are protected in the frontend and admin APIs are separately protected by backend RBAC. The first administrator must be allowlisted by the server-side `ADMIN_EMAILS` variable in Render. A regular learner account must not be treated as an administrator.

### Before production acceptance
- [ ] Confirm `VITE_API_BASE_URL` points to the Render API and ends with `/api`.
- [ ] Confirm Supabase URL and publishable key are configured for Google OAuth.
- [ ] Test local email login and logout with a dedicated test account.
- [ ] Test forgot-password email delivery, expiry, single-use behaviour and new-password login.
- [ ] Test Google OAuth callback using a real test Google account.
- [ ] Test every admin page using an allowlisted admin account; verify a learner is denied.
- [ ] Test camera permission, camera switching and sign recognition on a physical device.
- [ ] Test certificate request, admin approval, public QR verification, PDF/print and revocation.
- [ ] Test mobile layout and dark/light themes on all primary modules.

A successful Vite build is not proof of authentication, OAuth, camera, certificate or admin end-to-end behaviour. Record the browser/device and observed outcome for each acceptance check.
