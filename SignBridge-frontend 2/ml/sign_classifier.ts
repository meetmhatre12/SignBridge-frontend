/**
 * SignBridge ML: Geometric KNN & Spatial Pattern Classifier for Indian Sign Language
 * Evaluates scale-invariant joint flexion angles, fingertip distances, extension states,
 * and two-handed spatial relationships with open-set rejection and temporal smoothing.
 */

import { TwoHandExtractedFeatures, HandFeatureExtractor, SingleHandData, Landmark3D } from './feature_extractor.js';
import landmarkSignatures from './isl_landmarks.json' with { type: 'json' };

export interface SignRecognitionResult {
  signId: string | null; // Canonical signId, e.g. "isl_hello", "isl_a"
  sign: string | null;
  canonicalName: string | null;
  name: string | null;
  confidence: number; // Genuine calibrated model probability (0.0 to 1.0)
  rawScore: number; // Raw geometric similarity score (0.0 to 1.0)
  modelVersion: string;
  isTwoHanded: boolean;
  status: 'RECOGNIZED' | 'LOW_CONFIDENCE' | 'UNKNOWN' | 'UNRECOGNIZED' | 'NO_HANDS';
  isAccepted: boolean; // True when confidence >= threshold
  message: string;
  topPredictions: Array<{ signId: string; sign: string; name: string; confidence: number; rawScore: number }>;
  timestamp: string;
}

export interface ISLModelInterface {
  recognizeFrame(hands: SingleHandData[] | Landmark3D[] | null): SignRecognitionResult;
  recognizeSequence(temporalFrames: Array<SingleHandData[] | Landmark3D[]>): SignRecognitionResult;
  reset(): void;
}

export class ISLSignClassifier implements ISLModelInterface {
  private modelVersion: string;
  private confidenceThreshold: number;
  private signatures: Record<string, any>;

  // Temporal Sliding Window (last 8 frames)
  private frameBuffer: Array<{ timestamp: number; prediction: string | null; confidence: number }> = [];
  private readonly bufferCapacity = 8;

  // Debounce tracking
  private lastEmittedSign: string | null = null;
  private lastEmittedTime: number = 0;
  private readonly emitCooldownMs = 1000;

  constructor() {
    const raw = (landmarkSignatures as any)?.default || landmarkSignatures;
    this.modelVersion = raw?.modelVersion || 'v2.0-KNN-Geometric';
    this.confidenceThreshold = raw?.confidenceThreshold || 0.75;
    this.signatures = raw?.signs || {};
  }

  public getSignCount(): number {
    return Object.keys(this.signatures).length;
  }


  /**
   * Evaluates feature vector against all 25 ISL sign templates
   */
  public evaluateFeatures(features: TwoHandExtractedFeatures | null): {
    signId: string | null;
    sign: string | null;
    canonicalName: string | null;
    rawScore: number;
    calibratedConfidence: number;
    isTwoHanded: boolean;
    isAmbiguous: boolean;
    topPredictions: Array<{ signId: string; sign: string; name: string; confidence: number; rawScore: number }>;
  } {
    if (!features || !features.primary) {
      return { signId: null, sign: null, canonicalName: null, rawScore: 0, calibratedConfidence: 0, isTwoHanded: false, isAmbiguous: false, topPredictions: [] };
    }

    const primary = features.primary;
    const candidateScores: Array<{ signId: string; sign: string; canonicalName: string; name: string; rawScore: number; confidence: number; isTwoHanded: boolean }> = [];

    for (const [signKey, template] of Object.entries(this.signatures)) {
      const requiredHands: number = template.handCount || 1;
      const isTwoHandedSign = requiredHands >= 2;

      // 1. Hand count compatibility
      let handCountWeight = 1.0;
      if (isTwoHandedSign && features.handCount < 2) {
        handCountWeight = 0.35; // Heavy penalty if two hands required but only one presented
      } else if (!isTwoHandedSign && features.handCount >= 2) {
        handCountWeight = 0.85; // Slight tolerance if secondary hand is in background
      }

      // 2. Joint Angle Similarity (5 fingers)
      const targetAngles: number[] = template.targetJointAngles || [180, 180, 180, 180, 180];
      let angleDist = 0;
      for (let i = 0; i < 5; i++) {
        const diff = Math.abs(primary.jointAngles[i] - targetAngles[i]);
        angleDist += diff / 180;
      }
      const angleSim = Math.max(0, 1 - 1.5 * (angleDist / 5));

      // 3. Fingertip Distance Similarity (5 fingertips to wrist)
      const targetTips: number[] = template.targetTipDistances || [1.3, 1.9, 2.0, 1.85, 1.6];
      let tipDist = 0;
      for (let i = 0; i < 5; i++) {
        const diff = Math.abs(primary.fingertipDistances[i] - targetTips[i]);
        tipDist += Math.min(1.0, diff / 1.0);
      }
      const tipSim = Math.max(0, 1 - 1.3 * (tipDist / 5));

      // 4. Boolean Finger Extension State Agreement
      const targetExt: boolean[] = template.targetExtension || [true, true, true, true, true];
      let matchingExtCount = 0;
      for (let i = 0; i < 5; i++) {
        if (primary.fingerExtensionStates[i] === targetExt[i]) {
          matchingExtCount++;
        }
      }
      const extSim = matchingExtCount / 5;

      // 5. Fist / Open Palm Specialization
      let stateBonus = 1.0;
      if (template.isFist && primary.isFist) stateBonus = 1.15;
      else if (template.isFist && !primary.isFist) stateBonus = 0.60;
      if (template.isOpenPalm && primary.isOpenPalm) stateBonus = 1.10;
      else if (template.isOpenPalm && !primary.isOpenPalm) stateBonus = 0.65;

      // 6. Two-Handed Spatial Relations
      let twoHandSim = 1.0;
      if (isTwoHandedSign && features.handCount >= 2 && features.secondary) {
        if (signKey === 'HELP' || signKey === 'STOP') {
          twoHandSim = features.isOneHandRestingOnOther ? 1.15 : 0.70;
        } else if (signKey === 'SCHOOL' || signKey === 'HOME') {
          twoHandSim = (features.interPalmDistance !== undefined && features.interPalmDistance < 1.5) ? 1.10 : 0.75;
        } else if (signKey === 'DOCTOR') {
          twoHandSim = (features.interPalmDistance !== undefined && features.interPalmDistance < 1.4) ? 1.15 : 0.70;
        }
      }

      // Weighted Raw Score [0.0, 1.0]
      const rawScore = Math.max(0, Math.min(1.0,
        ((0.45 * angleSim) + (0.35 * tipSim) + (0.20 * extSim)) * handCountWeight * stateBonus * twoHandSim
      ));

      // Calibrated Sigmoidal Probability: Center at x0 = 0.60, k = 10
      const k = 10;
      const x0 = 0.60;
      const confidence = Math.min(0.98, Math.max(0.05, 1 / (1 + Math.exp(-k * (rawScore - x0)))));

      const signId = `isl_${signKey.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;
      candidateScores.push({
        signId,
        sign: signKey,
        canonicalName: signKey,
        name: template.name || signKey,
        rawScore: parseFloat(rawScore.toFixed(3)),
        confidence: parseFloat(confidence.toFixed(3)),
        isTwoHanded: isTwoHandedSign
      });
    }

    // Sort descending by confidence
    candidateScores.sort((a, b) => b.confidence - a.confidence);

    const top = candidateScores[0];
    const second = candidateScores[1];

    // Open-set rejection is deliberately conservative. Several legacy word templates
    // share the same static hand geometry (for example HELLO/THANK_YOU/PLEASE).
    // A static landmark frame cannot truthfully distinguish those signs without
    // temporal movement/location features, so a near-tie is returned as UNKNOWN
    // rather than showing a confident but incorrect word.
    const scoreMargin = top && second ? top.rawScore - second.rawScore : 1;
    const isBelowBaseline = !top || top.confidence < 0.50 || top.rawScore < 0.52;
    const isAmbiguous = Boolean(top && second && (
      (top.confidence - second.confidence < 0.08) ||
      scoreMargin < 0.08
    ));

    if (isBelowBaseline || isAmbiguous) {
      return {
        signId: null,
        sign: null,
        canonicalName: null,
        rawScore: top?.rawScore || 0,
        calibratedConfidence: top?.confidence || 0,
        isTwoHanded: false,
        isAmbiguous,
        topPredictions: candidateScores.slice(0, 3)
      };
    }

    return {
      signId: top.signId,
      sign: top.sign,
      canonicalName: top.canonicalName,
      rawScore: top.rawScore,
      calibratedConfidence: top.confidence,
      isTwoHanded: top.isTwoHanded,
      isAmbiguous: false,
      topPredictions: candidateScores.slice(0, 3)
    };
  }

  /**
   * Recognizes a single camera frame with temporal consensus smoothing
   */
  public recognizeFrame(hands: SingleHandData[] | Landmark3D[] | null): SignRecognitionResult {
    const timestamp = new Date().toISOString();
    const now = Date.now();

    if (!hands || (Array.isArray(hands) && hands.length === 0)) {
      this.frameBuffer = [];
      return {
        signId: null,
        sign: null,
        canonicalName: null,
        name: null,
        confidence: 0,
        rawScore: 0,
        modelVersion: this.modelVersion,
        isTwoHanded: false,
        status: 'NO_HANDS',
        isAccepted: false,
        message: 'No hands detected. Place hand inside frame.',
        topPredictions: [],
        timestamp
      };
    }

    const features = HandFeatureExtractor.extractFeatures(hands);
    if (!features) {
      return {
        signId: null,
        sign: null,
        canonicalName: null,
        name: null,
        confidence: 0,
        rawScore: 0,
        modelVersion: this.modelVersion,
        isTwoHanded: false,
        status: 'UNRECOGNIZED',
        isAccepted: false,
        message: 'Landmarks unclear. Adjust lighting or distance.',
        topPredictions: [],
        timestamp
      };
    }

    const evalResult = this.evaluateFeatures(features);

    // Update temporal sliding window
    this.frameBuffer.push({
      timestamp: now,
      prediction: evalResult.sign,
      confidence: evalResult.calibratedConfidence
    });

    if (this.frameBuffer.length > this.bufferCapacity) {
      this.frameBuffer.shift();
    }

    // Temporal Consensus Filtering
    const candidateSign = evalResult.sign;
    const matchingFrames = candidateSign
      ? this.frameBuffer.filter(f => f.prediction === candidateSign).length
      : 0;
    const consensusRatio = this.frameBuffer.length > 0 ? matchingFrames / this.frameBuffer.length : 0;

    // Modulated Confidence = instant confidence modulated by temporal stability
    const smoothedConfidence = candidateSign
      ? parseFloat((evalResult.calibratedConfidence * (0.80 + 0.20 * consensusRatio)).toFixed(2))
      : 0;

    const topCandidate = evalResult.topPredictions[0];

    // Status Determination
    if (!candidateSign || smoothedConfidence < 0.50) {
      return {
        signId: null,
        sign: null,
        canonicalName: null,
        name: null,
        confidence: topCandidate ? topCandidate.confidence : 0,
        rawScore: topCandidate ? topCandidate.rawScore : 0,
        modelVersion: this.modelVersion,
        isTwoHanded: false,
        status: 'UNKNOWN',
        isAccepted: false,
        message: evalResult.isAmbiguous
          ? `Ambiguous gesture. Possible matches: ${evalResult.topPredictions.slice(0, 3).map(p => p.name).join(', ')}. Hold the complete sign movement or use the Dictionary reference.`
          : 'Gesture not recognized. Hold hand steady.',
        topPredictions: evalResult.topPredictions,
        timestamp
      };
    }

    const isAccepted = smoothedConfidence >= this.confidenceThreshold && consensusRatio >= 0.50;

    if (isAccepted) {
      const canEmit = candidateSign !== this.lastEmittedSign || (now - this.lastEmittedTime > this.emitCooldownMs);
      if (canEmit) {
        this.lastEmittedSign = candidateSign;
        this.lastEmittedTime = now;
      }
    }

    const toSignId = (key: string) => `isl_${key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`;

    return {
      signId: toSignId(candidateSign),
      sign: candidateSign,
      canonicalName: candidateSign,
      name: topCandidate ? topCandidate.name : candidateSign,
      confidence: smoothedConfidence,
      rawScore: topCandidate ? topCandidate.rawScore : evalResult.rawScore,
      modelVersion: this.modelVersion,
      isTwoHanded: evalResult.isTwoHanded,
      status: isAccepted ? 'RECOGNIZED' : 'LOW_CONFIDENCE',
      isAccepted,
      message: isAccepted
        ? `Recognized: ${topCandidate?.name || candidateSign} (${Math.round(smoothedConfidence * 100)}%)`
        : `Hold steady (${Math.round(smoothedConfidence * 100)}%)`,
      topPredictions: evalResult.topPredictions,
      timestamp
    };
  }

  public recognizeSequence(temporalFrames: Array<SingleHandData[] | Landmark3D[]>): SignRecognitionResult {
    let lastResult: SignRecognitionResult | null = null;
    for (const frame of temporalFrames) {
      lastResult = this.recognizeFrame(frame);
    }
    return lastResult || this.recognizeFrame(null);
  }

  public reset(): void {
    this.frameBuffer = [];
    this.lastEmittedSign = null;
    this.lastEmittedTime = 0;
  }
}
