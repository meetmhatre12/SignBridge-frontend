# SignBridge AI — Frontend Master Plan

## Current repository

React 18 + TypeScript + Vite frontend. Deployment target: Vercel. API base URL must be configured through `VITE_API_BASE_URL`; the browser must never receive Supabase service-role credentials or backend-only secrets.

## Existing frontend modules

- Authentication context for email/password, email verification and Google OAuth.
- Sign-in/sign-up, reset-password and Google callback routes.
- Learner dashboard, profile, learning, dictionary, translator, conversation, progress, assessment and certificate areas.
- Admin Studio, user records, certificate requests, admin invitation acceptance and individual learner analytics.
- API client with bearer-token handling, timeout/abort handling, HTTP error normalization and 401 session cleanup.
- User session list/revoke API methods.
- English/Hindi administrator records language support.

## Implemented in this upgrade pass

- Individual learner analytics page with course progress, practice, examination and certificate history.
- Authentication and session history, last login/logout and active-session visibility.
- Login/logout/failed-login and password-change metrics.
- CSV export of learner analytics.
- Admin dashboard learner activity metrics and chart.
- User records search, server-side pagination and last learning activity.
- Admin archive action copy now reflects that records are retained and sessions are revoked.

## Required frontend improvements

### Authentication and account security
- Surface session expiry and invalid-session feedback.
- Add session/device management in the learner security settings using existing list/revoke APIs.
- Provide clear active/revoked/expired labels and a sign-out-all-sessions action after a backend endpoint exists.
- Keep local logout immediate; show a non-blocking warning if server revocation cannot be confirmed.
- Avoid storing long-lived provider access tokens in persistent browser storage.

### Learner analytics
- Display enrollment, course/lesson completion, practice attempts, assessment attempts, score trends and certificates.
- Show authentication events and active sessions separately from learning activity.
- Show missing history as unavailable, never as zero.
- Add date filters and CSV export with permission-aware fields.

### Admin experience
- Platform overview with user growth, active learners, login/logout/failure, active sessions, course progress, pass rates, certificates and admin actions.
- Search/filter by role, status, verification, provider, enrollment and last activity.
- Individual learner detail with activity timeline, progress, assessment and certificate history.
- Administrator directory with scoped permissions and invitation lifecycle.
- Audit trail for user status changes, archive/restore, certificate decisions and administrator permission changes.

### Learning and assessments
- Distinguish provisional camera recognition from the official backend-scored attempt.
- Show attempt timestamps, target sign, accepted/rejected outcome and configured pass threshold.
- Provide meaningful retry feedback without fabricating model accuracy.
- Show course progress from API records only.

### Certificates
- Show request state, reviewer decision and rejection reason.
- Download only an approved, server-generated PDF.
- Link to the public QR verification page.
- Preserve history for archived accounts where administrator permissions allow.

### Privacy and accessibility
- Explain translation history storage and model-improvement consent.
- Offer accessible keyboard navigation, focus states, contrast, responsive layouts and reduced-motion support.
- Keep the existing professional white/gold light and dark/amber visual themes.
- Do not store camera frames or raw landmarks in frontend analytics or browser storage.

## Frontend environment

- `VITE_API_BASE_URL`: full backend API base ending in `/api`.
- Supabase browser publishable key only where required for OAuth; never use `SUPABASE_SERVICE_ROLE_KEY`.
- Ensure Vercel production/preview environments point to the intended Render API and exact CORS origin.

## Team E2E verification checklist

- Login, logout, expired JWT and revoked session.
- Google OAuth callback and account switching.
- Admin permissions, invitation acceptance, revocation and protected super-admin behavior.
- Search, pagination, archive and restore.
- Learner analytics compared with backend records.
- CSV export and data coverage notes.
- Assessment provisional feedback vs official backend result.
- Certificate PDF and QR verification.
- Mobile/tablet responsiveness and keyboard accessibility.
- Vercel-to-Render network, CORS and production environment variables.
