/**
 * SignBridge Temporal Recognition State Machine
 *
 * Implements strict temporal consensus, duplicate suppression, open-set margin validation,
 * sign boundary detection, and sentence segmentation.
 *
 * State Progression:
 *   NO_HAND
 *   ↓ (hand enters frame)
 *   HAND_DETECTED
 *   ↓ (classifier output)
 *   CANDIDATE (sign + confidence >= threshold)
 *   ↓ (held for N stable frames)
 *   STABLE
 *   ↓ (admitted to sequence buffer)
 *   ACCEPTED
 *   ↓ (cooldown active)
 *   COOLDOWN
 *   ↓ (hand moves / pause / neutral)
 *   NEUTRAL / SIGN BOUNDARY
 *   ↓ (next intentional gesture)
 *   CANDIDATE (Next Sign)
 */

import { SignRecognitionResult } from './sign_classifier.js';
import { SentenceBuilderService, SentenceTranslationResult } from './sentence_builder.js';

export type RecognitionState =
  | 'NO_HAND'
  | 'HAND_DETECTED'
  | 'CANDIDATE'
  | 'STABLE'
  | 'ACCEPTED'
  | 'COOLDOWN'
  | 'NEUTRAL'
  | 'UNKNOWN';

export interface StateMachineConfig {
  minConfidence: number;        // Default 0.75 (aligned with the active classifier gate)
  stableFramesRequired: number; // Default 4 frames
  duplicateCooldownMs: number;  // Default 1000ms
  neutralBoundaryMs: number;    // Default 500ms
  sentencePauseMs: number;      // Default 3200ms
}

export interface StateMachineFrameResult {
  state: RecognitionState;
  rawPrediction: string | null;
  rawName: string | null;
  rawConfidence: number;
  stablePrediction: string | null;
  stableName: string | null;
  stableConfidence: number;
  isStable: boolean;
  isAcceptedThisFrame: boolean;
  acceptedSign: string | null;
  activeSequence: string[];
  sentenceSegments: string[][];
  currentSentence: string;
  currentTranslation: SentenceTranslationResult;
  allSentencesTranslation: string;
  isPaused: boolean;
  isHandDetected: boolean;
  handCount: number;
  statusMessage: string;
  movementDetected: boolean;
  motionMagnitude: number;
}

export class RecognitionStateMachine {
  private config: StateMachineConfig;
  private currentState: RecognitionState = 'NO_HAND';

  // Temporal Candidate Tracking
  private candidateSign: string | null = null;
  private candidateFramesCount: number = 0;
  private stableSign: string | null = null;
  private stableConfidence: number = 0;

  // Duplicate Suppression & Cooldown
  private lastAcceptedSign: string | null = null;
  private lastAcceptedTime: number = 0;
  private isInNeutralState: boolean = true;
  private neutralStartTime: number = 0;

  // Sequence Buffers & Sentence Segments
  private currentSegment: string[] = [];
  private completedSegments: string[][] = [];
  private lastSignActivityTime: number = 0;

  // Pause toggle
  private isPaused: boolean = false;
  private previousWristCenters: Array<{ x: number; y: number; z: number }> = [];
  private motionMagnitude: number = 0;

  constructor(config?: Partial<StateMachineConfig>) {
    this.config = {
      minConfidence: config?.minConfidence ?? 0.75,
      stableFramesRequired: config?.stableFramesRequired ?? 4,
      duplicateCooldownMs: config?.duplicateCooldownMs ?? 1000,
      neutralBoundaryMs: config?.neutralBoundaryMs ?? 500,
      sentencePauseMs: config?.sentencePauseMs ?? 3200
    };
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (paused) {
      this.resetCandidate();
    }
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.resetCandidate();
    }
    return this.isPaused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Main Frame Processing Hook
   * Evaluates camera classification against state machine rules
   */
  public processFrame(
    hands: any[] | null,
    recognition: SignRecognitionResult | null,
    now: number = Date.now()
  ): StateMachineFrameResult {
    let isAcceptedThisFrame = false;
    let acceptedSign: string | null = null;

    const handCount = hands && Array.isArray(hands) ? hands.length : 0;
    const isHandDetected = handCount > 0;

    // Temporal movement signal: whole-hand translation is intentionally not treated as noise.
    // Dynamic ISL signs can contain meaningful motion, so the state machine keeps a lightweight
    // motion estimate alongside the handshape classifier. A production temporal model should
    // learn sign-specific motion trajectories from verified landmark sequences.
    let movementDetected = false;
    if (isHandDetected && Array.isArray(hands)) {
      const centers = hands.slice(0, 2).map((hand: any) => {
        const lm = Array.isArray(hand?.landmarks) ? hand.landmarks[0] : null;
        return lm ? { x: Number(lm.x) || 0, y: Number(lm.y) || 0, z: Number(lm.z) || 0 } : null;
      }).filter(Boolean) as Array<{ x: number; y: number; z: number }>;
      if (this.previousWristCenters.length && centers.length) {
        const distances = centers.map((c, i) => {
          const p = this.previousWristCenters[i] || this.previousWristCenters[0];
          return Math.sqrt((c.x-p.x)**2 + (c.y-p.y)**2 + (c.z-p.z)**2);
        });
        this.motionMagnitude = Math.max(...distances, 0);
        movementDetected = this.motionMagnitude >= 0.012;
      } else {
        this.motionMagnitude = 0;
      }
      this.previousWristCenters = centers;
    } else {
      this.previousWristCenters = [];
      this.motionMagnitude = 0;
    }

    // 1. If Recognition is Paused
    if (this.isPaused) {
      return this.buildResult(
        'NEUTRAL',
        null, null, 0,
        this.stableSign, null, this.stableConfidence,
        false, false, null,
        isHandDetected, handCount,
        'Recognition is paused. Click Resume to continue.'
      );
    }

    // 2. No Hands Detected -> Strictly NO_HAND State & Neutral boundary transition
    if (!isHandDetected) {
      if (!this.isInNeutralState) {
        this.isInNeutralState = true;
        this.neutralStartTime = now;
      }
      this.currentState = 'NO_HAND';
      this.resetCandidate();

      // Check if long pause triggers sentence boundary segmentation
      this.checkSentencePauseBoundary(now);

      return this.buildResult(
        'NO_HAND',
        null, null, 0,
        null, null, 0,
        false, false, null,
        false, 0,
        'No hands detected. Place hands inside frame to sign.'
      );
    }

    // 3. Hands Detected: Parse Classifier Output
    const rawSign = recognition?.sign || null;
    const rawName = recognition?.name || null;
    const rawConf = recognition?.confidence || 0;
    const isRawAcceptedByClassifier = recognition?.isAccepted || false;

    // Handle Unknown / Low Confidence Frame
    if (!rawSign || rawConf < 0.50 || recognition?.status === 'UNKNOWN') {
      this.currentState = 'UNKNOWN';
      this.resetCandidate();

      if (!this.isInNeutralState && now - this.lastAcceptedTime > this.config.neutralBoundaryMs) {
        this.isInNeutralState = true;
      }
      this.checkSentencePauseBoundary(now);

      return this.buildResult(
        'UNKNOWN',
        rawSign, rawName, rawConf,
        null, null, 0,
        false, false, null,
        true, handCount,
        'Gesture not recognized. Hold hand clearly.'
      );
    }

    // 4. Candidate Tracking & Temporal Stability Accumulator
    if (rawSign === this.candidateSign) {
      this.candidateFramesCount++;
    } else {
      this.candidateSign = rawSign;
      this.candidateFramesCount = 1;
    }

    // Check if Candidate has achieved required stability (e.g. 5 frames)
    const isStable = this.candidateFramesCount >= this.config.stableFramesRequired && rawConf >= this.config.minConfidence;

    if (isStable) {
      this.stableSign = this.candidateSign;
      this.stableConfidence = rawConf;
      this.currentState = 'STABLE';

      // 5. Duplicate Suppression & Acceptance Validation
      const isDifferentFromLast = this.stableSign !== this.lastAcceptedSign;
      const hasCooldownElapsed = now - this.lastAcceptedTime > this.config.duplicateCooldownMs;
      const canAcceptSameSignAgain = this.isInNeutralState && hasCooldownElapsed;

      if (isDifferentFromLast || canAcceptSameSignAgain) {
        // ACCEPT SIGN INTO SEQUENCE
        this.currentState = 'ACCEPTED';
        this.lastAcceptedSign = this.stableSign;
        this.lastAcceptedTime = now;
        this.lastSignActivityTime = now;
        this.isInNeutralState = false;

        this.currentSegment.push(this.stableSign);
        isAcceptedThisFrame = true;
        acceptedSign = this.stableSign;
      } else {
        // Suppress repeated duplicate during continuous hold
        this.currentState = 'COOLDOWN';
      }
    } else if (rawConf >= this.config.minConfidence) {
      this.currentState = 'CANDIDATE';
    } else {
      this.currentState = 'HAND_DETECTED';
    }

    const statusMsg = this.currentState === 'ACCEPTED'
      ? `✓ Accepted: ${rawName || rawSign} (${Math.round(rawConf * 100)}%)` 
      : this.currentState === 'COOLDOWN'
      ? `Holding ${rawName || rawSign} (duplicate suppressed)`
      : this.currentState === 'CANDIDATE'
      ? `${movementDetected ? 'Motion detected • ' : ''}Evaluating ${rawName || rawSign}... (${this.candidateFramesCount}/${this.config.stableFramesRequired})`
      : `Low confidence (${Math.round(rawConf * 100)}%)`;

    return this.buildResult(
      this.currentState,
      rawSign, rawName, rawConf,
      this.stableSign, rawName, this.stableConfidence,
      isStable, isAcceptedThisFrame, acceptedSign,
      true, handCount,
      statusMsg
    );
  }

  private checkSentencePauseBoundary(now: number): void {
    if (this.currentSegment.length > 0 && this.lastSignActivityTime > 0) {
      if (now - this.lastSignActivityTime > this.config.sentencePauseMs) {
        // Move current segment to completed segments (Sentence 1 -> Sentence 2)
        this.completedSegments.push([...this.currentSegment]);
        this.currentSegment = [];
        this.lastSignActivityTime = 0;
      }
    }
  }

  private resetCandidate(): void {
    this.candidateSign = null;
    this.candidateFramesCount = 0;
    this.stableSign = null;
    this.stableConfidence = 0;
  }

  public undoLastSign(): void {
    if (this.currentSegment.length > 0) {
      this.currentSegment.pop();
    } else if (this.completedSegments.length > 0) {
      const lastSeg = this.completedSegments[this.completedSegments.length - 1];
      if (lastSeg.length > 0) {
        lastSeg.pop();
        if (lastSeg.length === 0) {
          this.completedSegments.pop();
        }
      }
    }
    this.lastAcceptedSign = null;
    this.resetCandidate();
  }

  public clear(): void {
    this.currentSegment = [];
    this.completedSegments = [];
    this.lastAcceptedSign = null;
    this.lastAcceptedTime = 0;
    this.lastSignActivityTime = 0;
    this.isInNeutralState = true;
    this.previousWristCenters = [];
    this.motionMagnitude = 0;
    this.resetCandidate();
  }

  public getFullSequence(): string[] {
    const all: string[] = [];
    for (const seg of this.completedSegments) {
      all.push(...seg);
    }
    all.push(...this.currentSegment);
    return all;
  }

  public getSentenceSegments(): string[][] {
    const segs = [...this.completedSegments];
    if (this.currentSegment.length > 0) {
      segs.push([...this.currentSegment]);
    }
    return segs;
  }

  private buildResult(
    state: RecognitionState,
    rawPrediction: string | null,
    rawName: string | null,
    rawConfidence: number,
    stablePrediction: string | null,
    stableName: string | null,
    stableConfidence: number,
    isStable: boolean,
    isAcceptedThisFrame: boolean,
    acceptedSign: string | null,
    isHandDetected: boolean,
    handCount: number,
    statusMessage: string
  ): StateMachineFrameResult {
    const activeSequence = this.getFullSequence();
    const sentenceSegments = this.getSentenceSegments();

    const currentTranslation = SentenceBuilderService.buildSentence(this.currentSegment);
    const multiRes = SentenceBuilderService.buildMultiSentence(sentenceSegments);

    return {
      state,
      rawPrediction,
      rawName,
      rawConfidence,
      stablePrediction,
      stableName,
      stableConfidence,
      isStable,
      isAcceptedThisFrame,
      acceptedSign,
      activeSequence,
      sentenceSegments,
      currentSentence: currentTranslation.sentence,
      currentTranslation,
      allSentencesTranslation: multiRes.combinedText,
      isPaused: this.isPaused,
      isHandDetected,
      handCount,
      statusMessage,
      movementDetected: this.motionMagnitude >= 0.012,
      motionMagnitude: Number(this.motionMagnitude.toFixed(4))
    };
  }
}
