import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand, LightingCondition } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { SignRepository, SignDefinition } from '../../../../ml/sign_repository';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Target, CheckCircle2, RotateCcw, ArrowRight, Play, Award, BookOpen, Lock as LockIcon } from 'lucide-react';
import { AlphabetPrediction } from '../../services/alphabetRecognitionService';

export const PracticeStudio: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [classifier] = useState(() => new ISLSignClassifier());
  const { user } = useAuth();
  const allPracticeSigns = SignRepository.getAllSigns().filter(s => s.isAvailableForRecognition || s.learningLevel <= 2);
  const initialSignId = searchParams.get('sign') || 'HELLO';

  const [selectedSign, setSelectedSign] = useState<SignDefinition | null>(
    SignRepository.getSignById(initialSignId) || allPracticeSigns[0]
  );

  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([]);
  const [lighting, setLighting] = useState<{ level: LightingCondition; luminance: number; label: string } | undefined>(undefined);
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [alphabetPrediction, setAlphabetPrediction] = useState<AlphabetPrediction | null>(null);

  const [accuracyScore, setAccuracyScore] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [attempts, setAttempts] = useState<number>(0);
  const [recorded, setRecorded] = useState(false);

  const handleHandsDetected = useCallback((hands: DetectedHand[], light?: { level: LightingCondition; luminance: number; label: string }, _video?: HTMLVideoElement, alpha?: AlphabetPrediction | null) => {
    setDetectedHands(hands || []);
    if (light) setLighting(light);
    setAlphabetPrediction(alpha || null);

    if (!hands || hands.length === 0) {
      setCurrentRecognition(null);
      return;
    }

    const recResult = classifier.recognizeFrame(hands);
    setCurrentRecognition(recResult);

    if (selectedSign) {
      const targetSignId = selectedSign.signId || `isl_${selectedSign.id.toLowerCase()}`;
      const isTargetAlphabet = selectedSign.category === 'ALPHABET' || selectedSign.id.length === 1;

      const geometricScore = recResult.isAccepted && (recResult.signId || recResult.sign) ? Math.round(recResult.confidence * 100) : 0;
      const geometricMatch = Boolean(
        recResult.isAccepted && (
          (recResult.signId && recResult.signId.toLowerCase() === targetSignId.toLowerCase()) ||
          (recResult.sign && recResult.sign.toUpperCase() === selectedSign.id.toUpperCase()) ||
          (recResult.canonicalName && recResult.canonicalName.toUpperCase() === selectedSign.canonicalName.toUpperCase())
        )
      );

      const alphaMatch = Boolean(alpha && isTargetAlphabet && alpha.label.toUpperCase() === selectedSign.id.toUpperCase());
      const alphaScore = alphaMatch ? Math.round((alpha?.confidence || 0) * 100) : 0;
      const score = Math.max(geometricMatch ? geometricScore : 0, isTargetAlphabet && alphaMatch ? alphaScore : 0);
      setAccuracyScore(score);

      if ((geometricMatch || (isTargetAlphabet && alphaMatch)) && score >= 80) {
        setIsSuccess(true);
        if (user && !recorded) {
          setRecorded(true);
          api.recordPracticeAttempt({ signId: selectedSign.signId || selectedSign.id, confidence: score / 100, passed: true }).catch(() => undefined);
        }
      }
    }
  }, [classifier, selectedSign, user, recorded]);

  const handleSelectSign = (sign: SignDefinition) => {
    setSelectedSign(sign);
    setIsSuccess(false);
    setAccuracyScore(0);
    setAttempts(0);
    setRecorded(false);
    setAlphabetPrediction(null);
    classifier.reset();
  };

  const handleRetry = () => {
    setIsSuccess(false);
    setAccuracyScore(0);
    setAttempts(prev => prev + 1);
    setAlphabetPrediction(null);
    classifier.reset();
  };

  const handleNextSign = () => {
    const currentIndex = allPracticeSigns.findIndex(s => s.id === selectedSign?.id);
    const nextIndex = (currentIndex + 1) % allPracticeSigns.length;
    handleSelectSign(allPracticeSigns[nextIndex]);
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
          <LockIcon className="mx-auto w-10 h-10 text-cyan-600" />
          <h1 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Sign in to start practice</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Practice attempts and scores are private account records. Sign in before using the camera practice workspace.</p>
          <button onClick={() => navigate('/profile')} className="mt-6 px-6 py-3 rounded-xl bg-cyan-600 text-white font-bold text-sm">Open Profile / Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span>Interactive Guided Practice</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Practice Studio</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Perform specific target ISL signs in front of the camera and receive real-time posture accuracy feedback.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <img src="/illustrations/practice-hand.svg" alt="Hand positioning guide" className="hidden md:block w-36 lg:w-44 h-auto" />
          <button
            onClick={() => navigate('/assessment')}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition shadow"
          >
            <Award className="w-4 h-4" />
            <span>Take Certification Exam</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Left Camera & Feedback | Right Target & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 Cols: Camera & Live Recognition Accuracy */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
            
            {/* Camera Viewport */}
            <CameraPreview
              onHandsDetected={handleHandsDetected}
              activeStatusText={
                isSuccess
                  ? `✓ Target Matched: ${selectedSign?.displayName} (${accuracyScore}%)`
                  : currentRecognition?.sign
                  ? `Detected: ${currentRecognition.name || currentRecognition.sign} (${Math.round(currentRecognition.confidence * 100)}%)`
                  : 'Perform the sign in front of camera'
              }
              recognitionState={isSuccess ? 'RECOGNIZED' : currentRecognition ? 'LOW_CONFIDENCE' : 'IDLE'}
              recognitionMode={selectedSign?.category === 'ALPHABET' || (selectedSign?.id && selectedSign.id.length === 1) ? 'ALPHABET_ONLY' : 'WORD_ONLY'}
            />

            {/* Real-time Match & Accuracy Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Target Match Accuracy</span>
                <span className={`font-mono font-bold ${isSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                  {accuracyScore}% {isSuccess && '✓ (Target Achieved)'}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${isSuccess ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                  style={{ width: `${accuracyScore}%` }}
                />
              </div>

              {/* Status Banner */}
              {isSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-between animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Great job! You executed {selectedSign?.displayName} with high accuracy.</span>
                  </div>
                  <button
                    onClick={handleNextSign}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
                  >
                    Next Sign →
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between items-center">
                  <span>Hold sign steady for 1 second. Minimum target: 80% accuracy.</span>
                  <button
                    onClick={handleRetry}
                    className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right 5 Cols: Target Sign Reference & Sign Picker */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Active Target Sign Details */}
          {selectedSign && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              <div className="flex justify-between items-start pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950 border border-cyan-200 dark:border-cyan-800">
                    Target Sign
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {selectedSign.displayName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    &ldquo;{selectedSign.englishMeaning}&rdquo;
                  </p>
                </div>

                <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {selectedSign.handedness === 'TWO_HANDED' ? 'Two Hands' : 'One Hand'}
                </span>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">
                  How to perform:
                </span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {selectedSign.instruction?.movement || selectedSign.instruction?.handConfiguration || 'Perform the target gesture steadily into the camera.'}
                </p>
                {selectedSign.exampleUsage && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                    <strong>Example:</strong> {selectedSign.exampleUsage}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleNextSign}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md shadow-cyan-600/20"
                >
                  Try Next Sign →
                </button>
                <button
                  onClick={() => navigate('/dictionary')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition border border-slate-200 dark:border-slate-700"
                >
                  View in Dictionary
                </button>
              </div>
            </div>
          )}

          {/* Quick Sign Picker Palette */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-3 transition-colors">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Sign to Practice ({allPracticeSigns.length})
            </h3>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {allPracticeSigns.map(sign => (
                <button
                  key={sign.id}
                  onClick={() => handleSelectSign(sign)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
                    selectedSign?.id === sign.id
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sign.displayName}
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
