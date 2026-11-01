import React, { useRef, useEffect, useState, useCallback } from 'react';
import { landmarkService, DetectedHand, LightingCondition } from '../../services/landmarkDetector';
import { alphabetRecognitionService, AlphabetPrediction } from '../../services/alphabetRecognitionService';

export interface CameraPreviewProps {
  onHandsDetected?: (hands: DetectedHand[], lighting: { level: LightingCondition; luminance: number; label: string }, videoElement?: HTMLVideoElement, alphabetPrediction?: AlphabetPrediction | null) => void;
  showSkeleton?: boolean;
  activeStatusText?: string;
  isRecognizing?: boolean;
  recognitionState?: 'IDLE' | 'TRACKING' | 'RECOGNIZED' | 'LOW_CONFIDENCE' | 'UNKNOWN';
  recognitionMode?: 'ALL' | 'WORD_ONLY' | 'ALPHABET_ONLY';
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  onHandsDetected,
  showSkeleton = true,
  activeStatusText = 'Camera Ready',
  isRecognizing = false,
  recognitionState = 'IDLE',
  recognitionMode = 'ALL'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const processingRef = useRef(false);
  const lastProcessRef = useRef(0);
  const lastAlphabetRef = useRef(0);

  const [cameraState, setCameraState] = useState<'INITIALIZING' | 'ACTIVE' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'ERROR'>('INITIALIZING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lightingInfo, setLightingInfo] = useState<{ level: LightingCondition; luminance: number; label: string }>({
    level: 'GOOD',
    luminance: 120,
    label: 'Good lighting'
  });
  const [trackedHandCount, setTrackedHandCount] = useState<number>(0);
  const [showLightingAdvice, setShowLightingAdvice] = useState<boolean>(true);
  const [mirrorCamera, setMirrorCamera] = useState<boolean>(() => localStorage.getItem('sb_mirror_camera') !== 'false');
  const [cameraResolution] = useState<string>(() => localStorage.getItem('sb_camera_resolution') || '720p');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  // Initialize WebRTC User Media. A request id prevents a late permission
  // response from reviving a camera after a device switch or component unmount.
  const startCamera = useCallback(async () => {
    const requestId = ++cameraRequestRef.current;
    setCameraState('INITIALIZING');
    setErrorMessage('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState('UNAVAILABLE');
      setErrorMessage('Camera access is not supported in this browser or secure context. Open SignBridge over HTTPS and try again.');
      return;
    }

    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;

      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: cameraResolution === '480p' ? 854 : 1280, max: 1280 },
        height: { ideal: cameraResolution === '480p' ? 480 : 720, max: 720 },
        frameRate: { ideal: 24, max: 30 },
        ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: 'user' })
      };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });

      if (requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack?.addEventListener('ended', () => {
        if (requestId !== cameraRequestRef.current) return;
        setCameraState('ERROR');
        setErrorMessage('The camera connection ended. Reconnect the device or select another camera, then retry.');
      }, { once: true });

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          if (requestId === cameraRequestRef.current) {
            setCameraDevices(devices.filter(device => device.kind === 'videoinput'));
          }
        } catch {
          // Device enumeration is optional; a working camera stream must remain usable.
        }
      }

      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        return;
      }

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (requestId === cameraRequestRef.current) {
        setCameraState('ACTIVE');
      } else {
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (err: any) {
      if (requestId !== cameraRequestRef.current) return;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError' || err?.name === 'SecurityError') {
        setCameraState('PERMISSION_DENIED');
        setErrorMessage('Camera permission was denied or blocked. Allow camera access for this site in your browser settings, then retry.');
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setCameraState('UNAVAILABLE');
        setErrorMessage('No camera device was detected. Connect a camera and retry.');
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setCameraState('ERROR');
        setErrorMessage('The camera may be in use by another application or tab. Close other camera apps and retry.');
      } else if (err?.name === 'OverconstrainedError') {
        setCameraState('ERROR');
        setErrorMessage('The selected camera does not support the requested settings. Choose another camera and retry.');
      } else {
        setCameraState('ERROR');
        setErrorMessage(err?.message || 'Failed to initialize camera. Check browser permissions and device availability.');
      }
    }
  }, [cameraResolution, selectedCameraId]);

  useEffect(() => {
    void startCamera();
    const handleDeviceChange = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCameraDevices(devices.filter(device => device.kind === 'videoinput'));
      } catch {
        // Device enumeration is optional; the active stream remains usable.
      }
    };
    navigator.mediaDevices?.addEventListener?.('devicechange', handleDeviceChange);

    return () => {
      cameraRequestRef.current += 1;
      navigator.mediaDevices?.removeEventListener?.('devicechange', handleDeviceChange);
      streamRef.current?.getTracks().forEach(track => {
        try { track.stop(); } catch { /* Ignore already-stopped tracks. */ }
      });
      streamRef.current = null;
      if (videoRef.current) {
        try { videoRef.current.srcObject = null; } catch { /* Ignore detached video elements. */ }
      }
    };
  }, [startCamera]);

  // Frame Processing Loop
  useEffect(() => {
    let animationFrameId: number;

    const processLoop = async (now = performance.now()) => {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(processLoop);
        return;
      }
      if (cameraState === 'ACTIVE' && videoRef.current && videoRef.current.readyState >= 2 && !processingRef.current && now - lastProcessRef.current >= 180) {
        processingRef.current = true;
        lastProcessRef.current = now;
        try {
          const { hands, lighting } = await landmarkService.processFrame(videoRef.current);
          setLightingInfo(lighting);
          setTrackedHandCount(hands.length);
          if (canvasRef.current && showSkeleton) {
            const vw = videoRef.current.videoWidth || 640;
            const vh = videoRef.current.videoHeight || 480;
            if (canvasRef.current.width !== vw || canvasRef.current.height !== vh) { canvasRef.current.width = vw; canvasRef.current.height = vh; }
            landmarkService.drawSkeleton(canvasRef.current, hands);
          }
          let alphabetPrediction: AlphabetPrediction | null = null;
          // Only sample alphabet recognition when allowed by recognitionMode
          if (recognitionMode !== 'WORD_ONLY' && hands.length > 0 && now - lastAlphabetRef.current >= 900) {
            lastAlphabetRef.current = now;
            try { alphabetPrediction = alphabetRecognitionService.recognize(videoRef.current, hands); } catch { alphabetPrediction = null; }
          }
          onHandsDetected?.(hands, lighting, videoRef.current, alphabetPrediction);
        } catch (error) {
          console.warn('[CameraPreview] Frame processing failed:', error);
        } finally {
          processingRef.current = false;
        }
      }
      animationFrameId = requestAnimationFrame(processLoop);
    };

    if (cameraState === 'ACTIVE') {
      animationFrameId = requestAnimationFrame(processLoop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraState, showSkeleton, onHandsDetected, recognitionMode]);

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] min-h-[380px] sm:min-h-[500px] lg:min-h-[620px] max-h-[82vh] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
      {/* 1. WebRTC Video Stream - Always Visible when ACTIVE */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${mirrorCamera ? '-scale-x-100' : ''} ${
          cameraState === 'ACTIVE' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 2. Skeleton Wireframe Canvas Overlay - 100% Transparent */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${mirrorCamera ? '-scale-x-100' : ''}`}
      />

      {/* 3. Ergonomic Framing Guide */}
      {cameraState === 'ACTIVE' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-3/4 h-4/5 border-2 border-dashed border-cyan-500/25 rounded-3xl transition-all duration-500" />
        </div>
      )}

      {/* 4. Top Status Header Overlay */}
      <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none z-10">
        {/* Left: Recognition & Hand Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border flex items-center space-x-2 shadow-lg ${
            cameraState === 'ACTIVE'
              ? recognitionState === 'RECOGNIZED'
                ? 'bg-emerald-950/85 text-emerald-200 border-emerald-500/50'
                : recognitionState === 'LOW_CONFIDENCE'
                ? 'bg-amber-950/85 text-amber-200 border-amber-500/50'
                : recognitionState === 'UNKNOWN'
                ? 'bg-slate-900/85 text-slate-300 border-slate-600'
                : 'bg-slate-900/85 text-cyan-300 border-cyan-500/40'
              : 'bg-slate-900/85 text-slate-300 border-slate-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              cameraState === 'ACTIVE'
                ? recognitionState === 'RECOGNIZED'
                  ? 'bg-emerald-400 animate-pulse'
                  : recognitionState === 'LOW_CONFIDENCE'
                  ? 'bg-amber-400'
                  : isRecognizing
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-cyan-400'
                : 'bg-slate-500'
            }`} />
            <span>{activeStatusText}</span>
          </div>

          {cameraState === 'ACTIVE' && (
            <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/85 text-slate-200 border border-slate-700 backdrop-blur-md shadow-lg">
              {trackedHandCount === 0 ? 'No Hands Detected' : trackedHandCount === 1 ? '1 Hand Tracked' : '2 Hands Tracked (Both)'}
            </div>
          )}
        </div>

        {/* Right: Lighting Condition Indicator */}
        {cameraState === 'ACTIVE' && (
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md border shadow-lg flex items-center space-x-1.5 ${
            lightingInfo.level === 'GOOD'
              ? 'bg-slate-900/85 text-emerald-300 border-emerald-500/30'
              : lightingInfo.level === 'FAIR'
              ? 'bg-slate-900/85 text-amber-300 border-amber-500/30'
              : 'bg-slate-900/85 text-slate-300 border-slate-600'
          }`}>
            <span>💡</span>
            <span>{lightingInfo.label}</span>
          </div>
        )}
      </div>

      {cameraState === 'ACTIVE' && cameraDevices.length > 1 && (
        <div className="absolute top-16 right-3.5 z-10 max-w-[min(16rem,70%)]">
          <label className="sr-only" htmlFor="signbridge-camera-device">Select camera</label>
          <select
            id="signbridge-camera-device"
            value={selectedCameraId}
            onChange={event => setSelectedCameraId(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900/90 px-2.5 py-2 text-xs text-white shadow-lg"
          >
            <option value="">Default camera</option>
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 5. Low Lighting Advisory Banner */}
      {cameraState === 'ACTIVE' && lightingInfo.level === 'LOW' && showLightingAdvice && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-amber-500/50 backdrop-blur-md rounded-2xl p-3 text-amber-200 text-xs flex items-center justify-between shadow-2xl z-10">
          <div className="flex items-center space-x-2">
            <span className="text-base">⚠️</span>
            <span>Lighting is dim. Turn on front-facing lighting to maximize ISL recognition accuracy.</span>
          </div>
          <button
            onClick={() => setShowLightingAdvice(false)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white pointer-events-auto text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 6. Permission / Error State Card */}
      {cameraState !== 'ACTIVE' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-center z-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl mb-4 text-slate-300 shadow-xl">
            {cameraState === 'INITIALIZING' ? '📹' : cameraState === 'PERMISSION_DENIED' ? '🔒' : '⚠️'}
          </div>

          <h3 className="text-lg font-bold text-white mb-2">
            {cameraState === 'INITIALIZING'
              ? 'Initializing Camera...'
              : cameraState === 'PERMISSION_DENIED'
              ? 'Camera Permission Required'
              : 'Camera Unavailable'}
          </h3>

          <p className="text-sm text-slate-400 max-w-md mb-6">
            {errorMessage || 'Connecting to your camera to recognize Indian Sign Language.'}
          </p>

          {cameraState !== 'INITIALIZING' && (
            <button
              onClick={startCamera}
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 transition-all flex items-center space-x-2"
            >
              <span>🔄</span>
              <span>Retry Camera Permission</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

