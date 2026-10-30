/**
 * MediaPipe 21-Landmark Hand Tracker with Two-Hand Support & Robust Lighting Monitor
 */

export interface Landmark3D {
  x: number;
  y: number;
  z: number;
}

export interface DetectedHand {
  landmarks: Landmark3D[];
  handedness: 'Left' | 'Right';
  score: number;
}

export type LightingCondition = 'GOOD' | 'FAIR' | 'LOW';

export class LandmarkDetectorService {
  private hands: any = null;
  private isModelReady: boolean = false;
  private lightingHistory: number[] = [];

  constructor() {
    this.initMediaPipe();
  }

  private initMediaPipe(): void {
    if (typeof window === 'undefined') return;

    // Check if MediaPipe is loaded on window
    if ((window as any).Hands) {
      this.hands = new (window as any).Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
      });

      this.hands.setOptions({
        maxNumHands: 2, // Full 2-hand recognition
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
      });

      this.isModelReady = true;
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.min.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        if ((window as any).Hands) {
          this.hands = new (window as any).Hands({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`
          });
          this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.65,
            minTrackingConfidence: 0.65
          });
          this.isModelReady = true;
        }
      };
      document.head.appendChild(script);
    }
  }

  public async processFrame(videoElement: HTMLVideoElement): Promise<{
    hands: DetectedHand[];
    lighting: { level: LightingCondition; luminance: number; label: string };
  }> {
    const lighting = this.calculateLighting(videoElement);

    if (!this.isModelReady || !this.hands || videoElement.readyState < 2) {
      return { hands: [], lighting };
    }

    return new Promise((resolve) => {
      this.hands.onResults((results: any) => {
        const detectedHands: DetectedHand[] = [];

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
          for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const rawLandmarks = results.multiHandLandmarks[i];
            const handednessInfo = results.multiHandedness?.[i];
            const label = handednessInfo?.label || (i === 0 ? 'Right' : 'Left');
            const score = handednessInfo?.score || 0.9;

            detectedHands.push({
              landmarks: rawLandmarks.map((pt: any) => ({ x: pt.x, y: pt.y, z: pt.z || 0 })),
              handedness: label as 'Left' | 'Right',
              score
            });
          }
        }

        resolve({ hands: detectedHands, lighting });
      });

      this.hands.send({ image: videoElement }).catch(() => {
        resolve({ hands: [], lighting });
      });
    });
  }

  /**
   * Calculates frame average luminance (3-tier smoothed)
   */
  private calculateLighting(video: HTMLVideoElement): { level: LightingCondition; luminance: number; label: string } {
    try {
      if (video.videoWidth === 0) return { level: 'GOOD', luminance: 128, label: 'Good lighting' };

      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 24;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { level: 'GOOD', luminance: 128, label: 'Good lighting' };

      ctx.drawImage(video, 0, 0, 32, 24);
      const data = ctx.getImageData(0, 0, 32, 24).data;
      let totalLuma = 0;

      for (let i = 0; i < data.length; i += 4) {
        totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }
      const currentLuma = totalLuma / (32 * 24);

      // Moving average over last 10 frames to avoid flickering
      this.lightingHistory.push(currentLuma);
      if (this.lightingHistory.length > 10) this.lightingHistory.shift();
      const avgLuma = this.lightingHistory.reduce((a, b) => a + b, 0) / this.lightingHistory.length;

      if (avgLuma < 45) {
        return { level: 'LOW', luminance: Math.round(avgLuma), label: 'Low lighting' };
      } else if (avgLuma < 85) {
        return { level: 'FAIR', luminance: Math.round(avgLuma), label: 'Fair lighting' };
      } else {
        return { level: 'GOOD', luminance: Math.round(avgLuma), label: 'Good lighting' };
      }
    } catch {
      return { level: 'GOOD', luminance: 128, label: 'Good lighting' };
    }
  }

  /**
   * Draws 21-point hand skeleton wireframes for up to 2 hands on canvas
   */
  public drawSkeleton(canvas: HTMLCanvasElement, hands: DetectedHand[]): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!hands || hands.length === 0) return;

    const HAND_CONNECTIONS = [
      // Thumb
      [0, 1], [1, 2], [2, 3], [3, 4],
      // Index
      [0, 5], [5, 6], [6, 7], [7, 8],
      // Middle
      [0, 9], [9, 10], [10, 11], [11, 12],
      // Ring
      [0, 13], [13, 14], [14, 15], [15, 16],
      // Pinky
      [0, 17], [17, 18], [18, 19], [19, 20],
      // Palm base
      [5, 9], [9, 13], [13, 17]
    ];

    hands.forEach((hand, idx) => {
      const isPrimary = idx === 0;
      const boneColor = isPrimary ? 'rgba(34, 211, 238, 0.85)' : 'rgba(168, 85, 247, 0.85)';
      const jointColor = isPrimary ? '#06b6d4' : '#a855f7';

      // 1. Draw Bones
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = boneColor;
      ctx.lineCap = 'round';

      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = hand.landmarks[startIdx];
        const end = hand.landmarks[endIdx];
        if (start && end) {
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.stroke();
        }
      });

      // 2. Draw Joints
      hand.landmarks.forEach((pt, ptIdx) => {
        const isFingertip = [4, 8, 12, 16, 20].includes(ptIdx);
        const radius = isFingertip ? 5.5 : 3.5;

        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isFingertip ? '#ffffff' : jointColor;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();
      });
    });
  }
}

export const landmarkService = new LandmarkDetectorService();
