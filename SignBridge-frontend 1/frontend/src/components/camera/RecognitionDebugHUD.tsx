import React, { useState } from 'react';
import { SignRecognitionResult } from '../../../../ml/sign_classifier';
import { DetectedHand, LightingCondition } from '../../services/landmarkDetector';

export interface RecognitionDebugHUDProps {
  cameraReady: boolean;
  hands: DetectedHand[];
  recognition: SignRecognitionResult | null;
  lighting?: { level: LightingCondition; luminance: number; label: string };
}

export const RecognitionDebugHUD: React.FC<RecognitionDebugHUDProps> = ({
  cameraReady,
  hands,
  recognition,
  lighting
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 text-xs font-mono font-bold shadow-lg transition flex items-center space-x-1.5"
          title="Open ML Diagnostics"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>ML HUD</span>
        </button>
      ) : (
        <div className="w-80 bg-slate-950/95 border border-cyan-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-lg space-y-3 font-mono text-xs text-slate-300 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <span className="text-[11px] font-extrabold text-cyan-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              ML Pipeline Diagnostics
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-white font-bold px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Camera Stream:</span>
              <span className={cameraReady ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {cameraReady ? 'READY' : 'OFFLINE'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Tracked Hands:</span>
              <span className="text-white font-bold">{hands.length}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Landmarks / Hand:</span>
              <span className="text-white font-bold">
                {hands.length > 0 ? `${hands[0].landmarks?.length || 0} pts` : '0 pts'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Feature Vector:</span>
              <span className={hands.length > 0 ? 'text-emerald-400' : 'text-slate-600'}>
                {hands.length > 0 ? '63-D + 5-Angle (VALID)' : 'NO_DATA'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Model Version:</span>
              <span className="text-cyan-300 font-semibold">{recognition?.modelVersion || 'v2.0-KNN-Geometric'}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Predicted Sign:</span>
              <span className="text-white font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                {recognition?.sign || recognition?.status || 'NONE'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Model Confidence:</span>
              <span className="text-cyan-400 font-bold">
                {recognition ? `${(recognition.confidence * 100).toFixed(1)}%` : '0.0%'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Temporal Gate:</span>
              <span className={recognition?.isAccepted ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {recognition?.isAccepted ? 'STABLE (ACCEPTED)' : 'HOLDING / UNSTABLE'}
              </span>
            </div>

            {lighting && (
              <div className="flex justify-between">
                <span className="text-slate-500">Lighting Luma:</span>
                <span className="text-slate-300">{lighting.luminance} ({lighting.level})</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
