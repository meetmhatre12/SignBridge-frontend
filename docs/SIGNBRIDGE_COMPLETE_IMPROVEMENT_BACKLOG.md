# SignBridge AI — Complete Improvement Backlog

Status: planning and acceptance criteria. This document does not claim that the listed features are implemented or that the current dataset has been verified.

## Product direction
Build on the existing application and preserve current working routes, styles, integrations and stored data. Avoid a framework rewrite, a new AI training pipeline, or a database replacement as part of this improvement pass.

## Current-scope principles
- No custom AI model training in this delivery.
- No fabricated sign recognition, translation results, user metrics or sample content in production.
- Camera assistance is a reference-based practice aid, not a general ISL translator.
- Use verified reference images/videos and explicit review status.
- Do not bulk-copy third-party datasets/media until licence, attribution, consent and redistribution terms are checked.
- ASR means spoken-audio recognition; continuous sign-language translation is a different research problem. Do not label one as the other.

## Frontend backlog and acceptance criteria

### 1. Authentication and profile
- Dedicated responsive login and registration pages; avoid tall modal/internal scroll behaviour.
- Google OAuth primary action; preserve supported email/password, OTP and password reset flows.
- On successful auth, route to the profile/dashboard and load the authenticated account from the session/API.
- Display actual provider name, verified email and avatar when available; handle missing optional fields.
- Protected routes, logout, session expiry and useful error states.
- Never store credentials or trust role claims supplied only by the browser.

### 2. Camera practice
- Request camera permission only after user action; explain denied/unavailable states.
- Support device camera selection where available, front/rear camera on mobile, mirrored preview handling and responsive sizing.
- Scene checks: camera available, hand visible, framing, lighting, occlusion and distance where supported.
- Use hand landmarks for supported reference-pose practice only.
- Compare a short frame sequence for movement-based references; a single still frame must not assess a movement sign.
- Results: Match / Adjust position / Try again / Unable to assess. Do not turn camera failure into a wrong answer.
- Per-class acceptance tests for A–Z and numbers before marking each class supported.
- Do not claim sentence-level translation or general vocabulary recognition without a separately validated model.

### 3. Alphabet, numbers and dictionary
- A–Z and numbers have individual content records, reference media, instructions, source and review status.
- Search/filter by category, language, word and phrase.
- Support synonyms and documented regional variants without silently collapsing distinct signs.
- Show reference video/image, meaning, movement notes, attribution and related content.
- Slow playback, replay, favourites and report-content action.
- Only approved entries appear in public dictionary/search.

### 4. Learning centre
- Alphabet, numbers, beginner vocabulary, daily phrases and topic-based lessons.
- Lesson content uses dictionary/media records, not duplicated hardcoded arrays.
- Completion state, bookmarks, resume learning and short quizzes persist per user.
- TTS for text/instructions where browser/device support exists; show fallback if unavailable.
- Captions, keyboard access and readable visual instructions.

### 5. Games and practice
- Alphabet-to-image matching, sign-to-word matching, memory matching, number quiz, vocabulary selection and phrase ordering.
- Camera practice game only for supported reference signs.
- Correct answer feedback, explanation, difficulty, attempts and score.
- Randomise from approved content; exclude unreviewed/rejected records.
- Persist results and avoid fake streaks or scores.

### 6. User dashboard and analytics
- Actual lesson completion, practice attempts, quiz results, bookmarks and recent activity.
- Charts and KPIs are calculated from persisted activity/API responses.
- Empty states for new accounts; no fabricated default progress.
- Certificate records only when eligibility rules are met; public verification endpoint must validate certificate ID.

### 7. UI, accessibility and reliability
- Preserve existing design direction and component conventions; no extraordinary redesign.
- Responsive laptop/mobile layout, consistent loading/empty/error/success states.
- Functional buttons, keyboard navigation, accessible contrast and captions.
- Media lazy loading/compression and clear retry/error states.
- Do not break existing routes or authentication integrations.

## Dataset verification requirements
Treat the reported ~12,000 images as an unverified input until audited. Produce a report containing:
- File count, readable/corrupt count, file types and total size.
- Class labels and per-class counts; missing/unknown labels.
- Exact and perceptual duplicate candidates.
- Blur, exposure, crop, hand visibility and resolution checks.
- Source URL/owner, licence, attribution, consent/collection basis and permitted use.
- Signer/session identity where lawfully available; split by signer/session to reduce leakage.
- Review status: imported, needs_review, approved, rejected.
- Reviewer, review timestamp, dataset version and file checksum.
- Train/validation/test split manifest only if a training experiment is later approved.
No dataset is "verified" solely because it contains many images or is publicly downloadable.

## External dataset/reference policy
Potential sources to evaluate (not automatically import):
- ISLRTC official dictionary and educational material.
- ISLTranslate continuous translation research data.
- INCLUDE and other published ISL research datasets.
- Public alphabet/number image datasets.
For each source, record the actual licence/terms, attribution, consent basis, format, labels, signer diversity, coverage and redistribution permission. Do not mix ASL/BSL/other sign languages into ISL classes.

## Definition of done
- Every visible button has a tested action.
- Every displayed user metric is backed by stored activity.
- Every public sign entry is approved and traceable to a source.
- A–Z and numbers have class-by-class coverage and test evidence.
- Camera errors and uncertain results are handled honestly.
- No existing user records are deleted during schema or storage changes.
- Frontend build, route tests and auth/camera smoke tests pass.
- Deployment is checked from the actual provider status, not assumed from a commit.
