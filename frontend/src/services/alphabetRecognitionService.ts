import modelData from '../../../ml/models/isl_hog_sgd_35class.json';
import { DetectedHand } from './landmarkDetector';

export interface AlphabetPrediction {
  label: string;
  confidence: number;
  topPredictions: Array<{ label: string; confidence: number }>;
}

type ModelData = {
  classes: string[];
  imageSize: number;
  weights: number[][];
  bias: number[];
  hog: { orientations: number; pixelsPerCell: number; cellsPerBlock: number };
};

const model = modelData as ModelData;
const imageSize = model.imageSize || 64;
const orientations = model.hog?.orientations || 9;
const pixelsPerCell = model.hog?.pixelsPerCell || 8;
const cellsPerBlock = model.hog?.cellsPerBlock || 2;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/**
 * Browser inference for the supplied A-Z HOG model. This is deliberately throttled
 * by CameraPreview so it does not compete with MediaPipe on every animation frame.
 */
export class AlphabetRecognitionService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  public recognize(video: HTMLVideoElement, hands: DetectedHand[]): AlphabetPrediction | null {
    if (!video.videoWidth || !video.videoHeight || !hands?.length) return null;
    if (!model.weights?.length || !model.bias?.length) return null;

    const box = this.getHandBox(hands, video.videoWidth, video.videoHeight);
    if (!box) return null;

    if (!this.canvas) this.canvas = document.createElement('canvas');
    this.canvas.width = imageSize;
    this.canvas.height = imageSize;
    if (!this.ctx) this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!this.ctx) return null;

    const { x, y, width, height } = box;
    this.ctx.clearRect(0, 0, imageSize, imageSize);
    this.ctx.drawImage(video, x, y, width, height, 0, 0, imageSize, imageSize);
    const pixels = this.ctx.getImageData(0, 0, imageSize, imageSize).data;
    const features = this.hog(pixels);
    if (!features.length) return null;

    const logits = model.weights.map((row, i) => {
      let value = Number(model.bias[i] || 0);
      const n = Math.min(row.length, features.length);
      for (let j = 0; j < n; j++) value += Number(row[j] || 0) * features[j];
      return value;
    });
    const maxLogit = Math.max(...logits);
    const exp = logits.map(v => Math.exp(clamp(v - maxLogit, -40, 40)));
    const sum = exp.reduce((a, b) => a + b, 0) || 1;
    const ranked = logits.map((_, i) => ({ label: model.classes[i], confidence: exp[i] / sum }))
      .filter(p => /^[A-Z]$/.test(p.label))
      .sort((a, b) => b.confidence - a.confidence);

    const top = ranked[0];
    if (!top || top.confidence < 0.60) return null;
    return {
      label: top.label,
      confidence: Number(top.confidence.toFixed(3)),
      topPredictions: ranked.slice(0, 3).map(p => ({ label: p.label, confidence: Number(p.confidence.toFixed(3)) }))
    };
  }

  private getHandBox(hands: DetectedHand[], videoWidth: number, videoHeight: number) {
    const points = hands.flatMap(hand => hand.landmarks || []);
    if (!points.length) return null;
    const xs = points.map(p => clamp(p.x, 0, 1) * videoWidth);
    const ys = points.map(p => clamp(p.y, 0, 1) * videoHeight);
    let minX = Math.min(...xs), maxX = Math.max(...xs);
    let minY = Math.min(...ys), maxY = Math.max(...ys);
    const padX = Math.max(24, (maxX - minX) * 0.30);
    const padY = Math.max(24, (maxY - minY) * 0.30);
    minX = clamp(minX - padX, 0, videoWidth - 1);
    minY = clamp(minY - padY, 0, videoHeight - 1);
    maxX = clamp(maxX + padX, minX + 1, videoWidth);
    maxY = clamp(maxY + padY, minY + 1, videoHeight);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private hog(pixels: Uint8ClampedArray): number[] {
    const cellRows = imageSize / pixelsPerCell;
    const cellCols = imageSize / pixelsPerCell;
    const bins: number[][][] = Array.from({ length: cellRows }, () =>
      Array.from({ length: cellCols }, () => Array(orientations).fill(0))
    );
    const binWidth = 180 / orientations;

    const gray = (x: number, y: number) => {
      const idx = (y * imageSize + x) * 4;
      return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
    };

    for (let y = 1; y < imageSize - 1; y++) {
      for (let x = 1; x < imageSize - 1; x++) {
        const gx = gray(x + 1, y) - gray(x - 1, y);
        const gy = gray(x, y + 1) - gray(x, y - 1);
        const magnitude = Math.hypot(gx, gy);
        if (magnitude === 0) continue;
        let angle = Math.atan2(gy, gx) * 180 / Math.PI;
        if (angle < 0) angle += 180;
        if (angle >= 180) angle -= 180;
        const position = angle / binWidth;
        const lower = Math.floor(position) % orientations;
        const upper = (lower + 1) % orientations;
        const upperWeight = position - Math.floor(position);
        const lowerWeight = 1 - upperWeight;
        const cy = Math.min(cellRows - 1, Math.floor(y / pixelsPerCell));
        const cx = Math.min(cellCols - 1, Math.floor(x / pixelsPerCell));
        bins[cy][cx][lower] += magnitude * lowerWeight;
        bins[cy][cx][upper] += magnitude * upperWeight;
      }
    }

    const blockRows = cellRows - cellsPerBlock + 1;
    const blockCols = cellCols - cellsPerBlock + 1;
    const out: number[] = [];
    for (let by = 0; by < blockRows; by++) {
      for (let bx = 0; bx < blockCols; bx++) {
        const block: number[] = [];
        for (let cy = 0; cy < cellsPerBlock; cy++) {
          for (let cx = 0; cx < cellsPerBlock; cx++) {
            block.push(...bins[by + cy][bx + cx]);
          }
        }
        let norm = Math.sqrt(block.reduce((s, v) => s + v * v, 0) + 1e-6);
        let normalized = block.map(v => v / norm);
        // L2-Hys: clip then renormalize, matching the supplied training configuration.
        normalized = normalized.map(v => Math.min(v, 0.2));
        norm = Math.sqrt(normalized.reduce((s, v) => s + v * v, 0) + 1e-6);
        out.push(...normalized.map(v => v / norm));
      }
    }
    return out;
  }
}

export const alphabetRecognitionService = new AlphabetRecognitionService();
