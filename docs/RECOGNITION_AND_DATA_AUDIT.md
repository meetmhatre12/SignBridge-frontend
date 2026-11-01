# Recognition and Data Audit — Frontend

Audit basis: the tracked `main` branch files inspected on 2026-11-01. This is a repository-source audit, not a physical dataset/media verification.

## Findings

### Dataset inventory mismatch
- `data/dataset_report.json` reports 6 video samples, 4 classes (WATER=3, HELLO=1, HELP=1, HOSPITAL=1), 4 unique signers, and 4/1/1 train/validation/test split.
- `ml/sample_manifest.json` also contains 6 records, but its top-level `signers` list names only signer_01..signer_03 while one record is signer_04. The manifest therefore conflicts with the dataset report.
- The sample manifest lists paths under `raw/signer_*`, but those raw video files are not present in the tracked repository tree. Their availability must be checked in the original data archive/storage.
- This 6-sample video dataset is not evidence that the complete ISL vocabulary is represented.

### Alphabet model metrics
- `ml/models/isl_alphabet_hog_metrics.json` lists 26 classes, 25,556 training samples and 6,389 random-stratified holdout samples, with 1.0 accuracy and 1.0 macro-F1.
- Its own evaluation note says this is a random stratified holdout and is not signer-independent or camera-generalization evidence. Do not display this as production or real-world accuracy.
- These counts total 31,945 samples, which does not match the separately discussed ~12,000-image dataset. The source archive, dataset version and sample counting method need reconciliation before combining them.
- `ml/models/model_registry.json` reports only 2 test samples, accuracy 0, recall 0, F1 0 and false rejection rate 1. This is insufficient to establish recognition quality.

### Alphabet media and dictionary links
- The tracked tree contains reference image files for A–Z (26 files).
- `data/media_validation_report.json` claims 161/161 signs have verified media, but a static report cannot prove remote Google Drive folders are accessible or that each folder contains the matching sign.
- `data/dictionary/ISL_Dictionary_words.csv` maps A–Z and Numbers to Drive folders. Remote access, contents, licence and signer/creator attribution were not independently verified in this source audit.
- The shared sign repository contains media mappings with repeated shared folder URLs and some suspicious short folder IDs in word entries. Validate every link and its actual contents; do not treat a non-empty URL as verified media.
- Some sign records have no image and use a shared video folder. Keep these as video-only or needs-review until the individual asset is confirmed.

## Required corrective work
1. Create one canonical dataset manifest; reconcile all sample counts and signer lists.
2. Keep image alphabet dataset and video/sequence dataset as separate versions.
3. Audit the reported ~12,000-image archive by actual file hash and image decoding; report class distribution, duplicates, corrupt files, quality and source/licence.
4. Validate all 26 alphabet images and every associated video individually.
5. Validate every dictionary Drive link by opening it and checking the actual media, sign label, language, creator/source, permission and licence.
6. Change the media verification process so `verified=true` is only assigned after a successful asset check and reviewer approval. A syntactically valid URL is not sufficient.
7. Do not mix ASL/BSL or other sign languages into ISL labels.
8. Do not report 100% prediction accuracy from a random frame-level split. Use signer-independent and session-independent test data, class-wise precision/recall/F1, confusion matrix, false-acceptance and false-rejection rates, plus live camera tests.
9. For dynamic signs, validate full temporal sequences; a still-frame HOG model is not a continuous sign-language translator.

## Current safe feature claims
- A–Z reference images exist in the repository.
- The frontend contains MediaPipe hand-landmark processing and a browser HOG alphabet inference path.
- These facts do not prove all letters work reliably on arbitrary cameras or users.
- Show a score as an uncalibrated model score unless calibration is measured on a separate representative validation set.
- If hands are absent, lighting is poor, the sign is unsupported or predictions are ambiguous, return a clear unable-to-assess/try-again result rather than guessing.
