/**
 * SignBridge ML: 3D Hand Landmark Feature Extractor (Single & Two-Hand Support)
 * Extracts scale-invariant, translation-invariant, orientation-normalized geometric features
 * from 21 MediaPipe 3D keypoints per hand (63 coordinates per hand + joint angles + fingertip metrics).
 */

export const FEATURE_SCHEMA_VERSION = 'isl-landmarks-v1';

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface SingleHandData {
  landmarks: Landmark3D[]; // 21 landmarks
  handedness: 'Left' | 'Right';
  score?: number;
}

export interface NormalizedHandFeatures {
  normalizedLandmarks: number[]; // 63 values: (x - wrist.x) / scale, (y - wrist.y) / scale, (z - wrist.z) / scale
  jointAngles: number[]; // 5 finger angles in degrees [Thumb, Index, Middle, Ring, Pinky]
  fingertipDistances: number[]; // 5 distances from fingertip to wrist / scale
  fingerExtensionStates: boolean[]; // 5 booleans [isThumbExtended, isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended]
  palmNormal: [number, number, number]; // 3D unit normal vector of palm plane
  handSpan: number; // Distance between thumb tip and pinky tip / scale
  isFist: boolean;
  isOpenPalm: boolean;
  wrist: Landmark3D;
  palmScale: number;
}

export interface TwoHandExtractedFeatures {
  handCount: number;
  primaryHand: 'Left' | 'Right' | 'None';
  primary: NormalizedHandFeatures;
  secondary?: NormalizedHandFeatures;
  // Inter-hand relational features for two-handed ISL signs (HELP, STOP, DOCTOR, HOSPITAL, SCHOOL, HOME, FAMILY, etc.)
  interPalmDistance?: number; // Distance between primary wrist and secondary wrist / avgScale
  interHandElevationDiff?: number; // (primary.wrist.y - secondary.wrist.y) / avgScale
  arePalmsFacing?: boolean; // Dot product of palm normals < -0.2
  isOneHandRestingOnOther?: boolean; // Vertical alignment & close spatial proximity
}

export class HandFeatureExtractor {
  public static distance3D(p1: Landmark3D, p2: Landmark3D): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculates 3D angle at point p2 formed by rays (p2 -> p1) and (p2 -> p3) in degrees [0, 180]
   */
  public static calculateAngle(p1: Landmark3D, p2: Landmark3D, p3: Landmark3D): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

    if (mag1 === 0 || mag2 === 0) return 0;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return (Math.acos(cosAngle) * 180) / Math.PI;
  }

  /**
   * Normalizes a single 21-landmark hand into scale & translation invariant features
   */
  public static extractSingleHand(landmarks: Landmark3D[]): NormalizedHandFeatures | null {
    if (!landmarks || landmarks.length < 21) return null;

    const wrist = landmarks[0];
    const middleMcp = landmarks[9]; // Middle finger MCP joint
    const palmScale = Math.max(0.001, this.distance3D(wrist, middleMcp));

    // 1. 63 Wrist-Relative Normalized Coordinates
    const normalizedLandmarks: number[] = [];
    for (let i = 0; i < 21; i++) {
      const p = landmarks[i];
      normalizedLandmarks.push(
        (p.x - wrist.x) / palmScale,
        (p.y - wrist.y) / palmScale,
        (p.z - wrist.z) / palmScale
      );
    }

    // 2. 5 Finger Joint Angles (flexion / extension angles)
    const thumbAngle = this.calculateAngle(landmarks[1], landmarks[2], landmarks[4]); // CMC -> MCP -> TIP
    const indexAngle = this.calculateAngle(landmarks[5], landmarks[6], landmarks[8]); // MCP -> PIP -> TIP
    const middleAngle = this.calculateAngle(landmarks[9], landmarks[10], landmarks[12]);
    const ringAngle = this.calculateAngle(landmarks[13], landmarks[14], landmarks[16]);
    const pinkyAngle = this.calculateAngle(landmarks[17], landmarks[18], landmarks[20]);

    const jointAngles = [
      Math.round(thumbAngle * 10) / 10,
      Math.round(indexAngle * 10) / 10,
      Math.round(middleAngle * 10) / 10,
      Math.round(ringAngle * 10) / 10,
      Math.round(pinkyAngle * 10) / 10
    ];

    // 3. 5 Fingertip-to-Wrist Distances normalized by Palm Scale
    const tipIndices = [4, 8, 12, 16, 20];
    const fingertipDistances = tipIndices.map(idx => 
      Math.round((this.distance3D(landmarks[idx], wrist) / palmScale) * 100) / 100
    );

    // 4. Boolean Extension States (true = extended/open, false = curled/fist)
    // A finger is extended if angle > 140 deg AND tip distance > 1.4 * palmScale
    const fingerExtensionStates = [
      jointAngles[0] > 135 && fingertipDistances[0] > 1.1, // Thumb
      jointAngles[1] > 140 && fingertipDistances[1] > 1.4, // Index
      jointAngles[2] > 140 && fingertipDistances[2] > 1.4, // Middle
      jointAngles[3] > 140 && fingertipDistances[3] > 1.3, // Ring
      jointAngles[4] > 135 && fingertipDistances[4] > 1.2  // Pinky
    ];

    // 5. Palm Normal Vector (Cross product of Index MCP - Wrist and Pinky MCP - Wrist)
    const vIndex = { x: landmarks[5].x - wrist.x, y: landmarks[5].y - wrist.y, z: landmarks[5].z - wrist.z };
    const vPinky = { x: landmarks[17].x - wrist.x, y: landmarks[17].y - wrist.y, z: landmarks[17].z - wrist.z };
    const crossX = vIndex.y * vPinky.z - vIndex.z * vPinky.y;
    const crossY = vIndex.z * vPinky.x - vIndex.x * vPinky.z;
    const crossZ = vIndex.x * vPinky.y - vIndex.y * vPinky.x;
    const normMag = Math.max(0.0001, Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ));
    const palmNormal: [number, number, number] = [
      Math.round((crossX / normMag) * 100) / 100,
      Math.round((crossY / normMag) * 100) / 100,
      Math.round((crossZ / normMag) * 100) / 100
    ];

    const handSpan = Math.round((this.distance3D(landmarks[4], landmarks[20]) / palmScale) * 100) / 100;
    const extendedCount = fingerExtensionStates.filter(Boolean).length;
    const isFist = extendedCount === 0 || (extendedCount === 1 && fingerExtensionStates[0] && fingertipDistances[1] < 1.1);
    const isOpenPalm = extendedCount >= 4;

    return {
      normalizedLandmarks,
      jointAngles,
      fingertipDistances,
      fingerExtensionStates,
      palmNormal,
      handSpan,
      isFist,
      isOpenPalm,
      wrist,
      palmScale
    };
  }

  /**
   * Processes input hands (single or two-handed) with relational inter-hand metrics
   */
  public static extractFeatures(
    hands: SingleHandData[] | Landmark3D[] | null
  ): TwoHandExtractedFeatures | null {
    if (!hands) return null;

    let handList: SingleHandData[] = [];
    if (Array.isArray(hands) && hands.length > 0) {
      if ('landmarks' in (hands[0] as any)) {
        handList = hands as SingleHandData[];
      } else {
        handList = [{ landmarks: hands as Landmark3D[], handedness: 'Right' }];
      }
    }

    if (handList.length === 0) return null;

    const primaryHandData = handList[0];
    const primaryFeatures = this.extractSingleHand(primaryHandData.landmarks);
    if (!primaryFeatures) return null;

    const result: TwoHandExtractedFeatures = {
      handCount: handList.length,
      primaryHand: primaryHandData.handedness || 'Right',
      primary: primaryFeatures
    };

    // If second hand is present (for two-handed ISL signs)
    if (handList.length >= 2) {
      const secondaryHandData = handList[1];
      const secondaryFeatures = this.extractSingleHand(secondaryHandData.landmarks);

      if (secondaryFeatures) {
        result.secondary = secondaryFeatures;

        const avgScale = (primaryFeatures.palmScale + secondaryFeatures.palmScale) / 2;
        result.interPalmDistance = Math.round((this.distance3D(primaryFeatures.wrist, secondaryFeatures.wrist) / avgScale) * 100) / 100;
        result.interHandElevationDiff = Math.round((Math.abs(primaryFeatures.wrist.y - secondaryFeatures.wrist.y) / avgScale) * 100) / 100;

        const dotPalms =
          primaryFeatures.palmNormal[0] * secondaryFeatures.palmNormal[0] +
          primaryFeatures.palmNormal[1] * secondaryFeatures.palmNormal[1] +
          primaryFeatures.palmNormal[2] * secondaryFeatures.palmNormal[2];
        result.arePalmsFacing = dotPalms < -0.25;

        // Check if one hand is resting above/on the other (e.g. HELP, STOP)
        const dx = Math.abs(primaryFeatures.wrist.x - secondaryFeatures.wrist.x) / avgScale;
        result.isOneHandRestingOnOther = dx < 0.6 && (result.interPalmDistance < 1.8);
      }
    }

    return result;
  }
}
