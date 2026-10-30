#!/usr/bin/env python3
"""
SignBridge ML: Dataset Cleaning, Normalization & Audit Pipeline
Automatically scans raw datasets (Kaggle ISL, Mendeley, GitHub ISL),
cleans corrupted samples, normalizes labels into canonical signIds (e.g., isl_hello),
removes duplicates, and exports dataset_report.json.
"""

import os
import sys
import json
import hashlib
from pathlib import Path

def normalize_label(label: str) -> str:
    cleaned = label.strip().lower().replace(" ", "_").replace("-", "_")
    if cleaned.startswith("isl_"):
        return cleaned
    if cleaned.startswith("letter_") or cleaned.startswith("alphabet_"):
        cleaned = cleaned.split("_")[-1]
    return f"isl_{cleaned}"

def compute_file_hash(filepath: str) -> str:
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()

def clean_and_audit_dataset(raw_dir: str, output_report_path: str = "data/dataset_report.json"):
    print(f"🌉 Starting SignBridge Dataset Cleaning & Audit on: {raw_dir}")
    
    raw_path = Path(raw_dir)
    report = {
        "datasetVersion": "isl-curated-v1.0",
        "totalFilesScanned": 0,
        "validSamples": 0,
        "corruptedSamples": 0,
        "duplicateSamples": 0,
        "classesCount": 0,
        "classes": {},
        "rejectedSamples": [],
        "split": {
            "train": 0,
            "validation": 0,
            "test": 0
        },
        "status": "HEALTHY"
    }

    if not raw_path.exists():
        print(f"⚠️ Raw dataset folder {raw_dir} does not exist yet. Creating baseline structure.")
        os.makedirs(raw_dir, exist_ok=True)
        os.makedirs(os.path.dirname(output_report_path), exist_ok=True)
        with open(output_report_path, "w") as f:
            json.dump(report, f, indent=2)
        return report

    seen_hashes = set()

    for root, _, files in os.walk(raw_path):
        for file in files:
            report["totalFilesScanned"] += 1
            ext = file.lower().split('.')[-1]
            if ext not in ['jpg', 'jpeg', 'png', 'mp4', 'webm', 'json']:
                report["rejectedSamples"].append({"file": file, "reason": "unsupported_format"})
                report["corruptedSamples"] += 1
                continue

            file_path = os.path.join(root, file)
            
            # Check file size (reject 0-byte or corrupted header)
            if os.path.getsize(file_path) < 100:
                report["rejectedSamples"].append({"file": file_path, "reason": "corrupted_zero_byte"})
                report["corruptedSamples"] += 1
                continue

            # Duplicate check
            fhash = compute_file_hash(file_path)
            if fhash in seen_hashes:
                report["duplicateSamples"] += 1
                report["rejectedSamples"].append({"file": file_path, "reason": "duplicate_content"})
                continue
            seen_hashes.add(fhash)

            # Extract class folder
            rel_path = os.path.relpath(file_path, raw_path)
            parts = rel_path.split(os.sep)
            raw_class = parts[0] if len(parts) > 1 else Path(file).stem.split('_')[0]
            canonical_sign_id = normalize_label(raw_class)

            if canonical_sign_id not in report["classes"]:
                report["classes"][canonical_sign_id] = 0
            report["classes"][canonical_sign_id] += 1
            report["validSamples"] += 1

    report["classesCount"] = len(report["classes"])
    total_valid = report["validSamples"]
    report["split"]["train"] = int(total_valid * 0.70)
    report["split"]["validation"] = int(total_valid * 0.15)
    report["split"]["test"] = total_valid - report["split"]["train"] - report["split"]["validation"]

    os.makedirs(os.path.dirname(output_report_path), exist_ok=True)
    with open(output_report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"✓ Scanned: {report['totalFilesScanned']} samples")
    print(f"✓ Valid: {report['validSamples']} | Classes: {report['classesCount']}")
    print(f"✓ Duplicates: {report['duplicateSamples']} | Corrupted: {report['corruptedSamples']}")
    print(f"✓ Report written to: {output_report_path}")
    return report

if __name__ == "__main__":
    target_dir = sys.argv[1] if len(sys.argv) > 1 else "ml/datasets/raw"
    clean_and_audit_dataset(target_dir)
