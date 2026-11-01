import React, { useState, useCallback } from 'react';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand, LightingCondition } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { RecognitionStateMachine, StateMachineFrameResult } from '../../../../ml/recognition_state_machine';
import { SentenceBuilderService, MultiSentenceResult } from '../../../../ml/sentence_builder';
import { SignRepository } from '../../../../ml/sign_repository';
import { api } from '../../services/api';
import { speechService } from '../../services/speech';
import { useAuth } from '../../context/AuthContext';
import { AlphabetPrediction } from '../../services/alphabetRecognitionService';

export const LiveTranslator: React.FC = () => {
  const { user } = useAuth();
  const [classifier] = useState(() => new ISLSignClassifier());
  const [stateMachine] = useState(() => new RecognitionStateMachine({
    minConfidence: 0.75,
    stableFramesRequired: 4,
    duplicateCooldownMs: 1000,
    sentencePauseMs: 3200
  }));

  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([]);
  const [lighting, setLighting] = useState<{ level: LightingCondition; luminance: number; label: string } | undefined>(undefined);
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [smResult, setSmResult] = useState<StateMachineFrameResult | null>(null);

  // Sequences & Translations
  const [activeSequence, setActiveSequence] = useState<string[]>([]);
  const [sentenceSegments, setSentenceSegments] = useState<string[][]>([]);
  const [multiTranslation, setMultiTranslation] = useState<MultiSentenceResult | null>(null);

  // States
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [activeTranslationId, setActiveTranslationId] = useState<string | null>(null);
  const [autoSpeak] = useState<boolean>(() => localStorage.getItem('sb_auto_speak') === 'true');
  const [speechRate] = useState<number>(() => parseFloat(localStorage.getItem('sb_speech_rate') || '1.0'));
  const [spokenLanguage] = useState<string>(() => localStorage.getItem('sb_spoken_lang') || 'en-IN');

  // Correction Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState<boolean>(false);
  const [correctionMeaning, setCorrectionMeaning] = useState<string>('');
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);

  // Camera Frame Processing Hook
  const handleHandsDetected = useCallback((hands: DetectedHand[], light?: { level: LightingCondition; luminance: number; label: string }, _video?: HTMLVideoElement, alpha?: AlphabetPrediction | null) => {
    setDetectedHands(hands || []);
    if (light) setLighting(light);

    if (!hands || hands.length === 0) {
      setCurrentRecognition(null);
      const res = stateMachine.processFrame(null, null);
      setSmResult(res);
      return;
    }

    const geometricResult = classifier.recognizeFrame(hands);
    const recResult: SignRecognitionResult = geometricResult.isAccepted
      ? geometricResult
      : alpha && alpha.confidence >= 0.75
        ? {
            signId: `isl_${alpha.label.toLowerCase()}`,
            sign: alpha.label,
            canonicalName: `Letter ${alpha.label}`,
            name: `Letter ${alpha.label}`,
            confidence: alpha.confidence,
            rawScore: alpha.confidence,
            modelVersion: 'A-Z-HOG-v1',
            isTwoHanded: false,
            status: 'RECOGNIZED',
            isAccepted: true,
            message: `Recognized letter ${alpha.label} (${Math.round(alpha.confidence * 100)}%)`,
            topPredictions: alpha.topPredictions.map(p => ({
              signId: `isl_${p.label.toLowerCase()}`,
              sign: p.label,
              name: `Letter ${p.label}`,
              confidence: p.confidence,
              rawScore: p.confidence
            })),
            timestamp: new Date().toISOString()
          }
        : geometricResult;
    setCurrentRecognition(recResult);

    const res = stateMachine.processFrame(hands, recResult);
    setSmResult(res);

    // Update sequence buffers and automatic translation if state changed
    setActiveSequence(res.activeSequence);
    setSentenceSegments(res.sentenceSegments);

    if (res.isAcceptedThisFrame) {
      const translated = SentenceBuilderService.buildMultiSentence(res.sentenceSegments);
      setMultiTranslation(translated);
    }
  }, [classifier, stateMachine]);

  // Server-side NLP / AI Naturalization trigger
  const handleTranslateSequence = async () => {
    const fullSeq = stateMachine.getFullSequence();
    if (fullSeq.length === 0 || isTranslating) return;

    setIsTranslating(true);
    try {
      const actualConfidence = smResult?.stableConfidence && smResult.stableConfidence > 0
        ? smResult.stableConfidence
        : 0;

      const res = await api.translateSequence(fullSeq, actualConfidence);
      if (res.success && res.data) {
        setActiveTranslationId(res.data.id);
        const translated = SentenceBuilderService.buildMultiSentence(stateMachine.getSentenceSegments());
        // If server produced sentence, use it
        if (res.data.sentence) {
          translated.combinedText = res.data.sentence;
          translated.speechText = res.data.speechText || res.data.sentence;
        }
        setMultiTranslation(translated);

        if (autoSpeak && translated.speechText) {
          setIsSpeaking(true);
          speechService.speak(translated.speechText, {
            rate: speechRate,
            lang: spokenLanguage,
            onEnd: () => setIsSpeaking(false),
            onError: () => setIsSpeaking(false)
          });
        }
      }
    } catch (err) {
      console.warn('Server translation fallback:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSpeakSentence = (text?: string) => {
    const targetText = text || multiTranslation?.speechText || multiTranslation?.combinedText;
    if (!targetText) return;
    setIsSpeaking(true);
    speechService.speak(targetText, {
      rate: speechRate,
      lang: spokenLanguage,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleTogglePause = () => {
    const paused = stateMachine.togglePause();
    setIsPaused(paused);
  };

  const handleUndoLast = () => {
    stateMachine.undoLastSign();
    const updated = stateMachine.getFullSequence();
    const segs = stateMachine.getSentenceSegments();
    setActiveSequence(updated);
    setSentenceSegments(segs);
    const translated = SentenceBuilderService.buildMultiSentence(segs);
    setMultiTranslation(translated);
  };

  const handleClearAll = () => {
    stateMachine.clear();
    classifier.reset();
    setActiveSequence([]);
    setSentenceSegments([]);
    setMultiTranslation(null);
    setActiveTranslationId(null);
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionMeaning.trim()) return;

    try {
      const res = await api.submitCorrection({
        translationResultId: activeTranslationId || undefined,
        recognizedSigns: activeSequence,
        suggestedMeaning: correctionMeaning.trim(),
        confidenceAtPrediction: smResult?.stableConfidence || 0,
        feedbackNotes: feedbackNotes.trim()
      });

      if (res.success) {
        setFeedbackSuccess(true);
        setTimeout(() => {
          setShowFeedbackModal(false);
          setFeedbackSuccess(false);
          setCorrectionMeaning('');
          setFeedbackNotes('');
        }, 1800);
      }
    } catch {
      alert('Failed to submit feedback.');
    }
  };

  const cameraSupportedCount = SignRepository.getCameraSupportedCount();

  const navigateToPractice = (signName?: string) => {
    const target = signName || activeSequence[activeSequence.length - 1] || 'HELLO';
    window.location.href = `/practice?sign=${encodeURIComponent(target)}`;
  };

  const navigateToDictionary = (signName?: string) => {
    const target = signName || activeSequence[activeSequence.length - 1] || '';
    window.location.href = target ? `/dictionary?search=${encodeURIComponent(target)}` : '/dictionary';
  };

  const handleApplyExample = (exampleTokens: string[], exampleSentence: string) => {
    stateMachine.clear();
    classifier.reset();
    setActiveSequence(exampleTokens);
    setSentenceSegments([exampleTokens]);
    const translated = SentenceBuilderService.buildMultiSentence([exampleTokens]);
    translated.combinedText = exampleSentence;
    translated.speechText = exampleSentence;
    setMultiTranslation(translated);
  };

  const handleCopySentence = () => {
    const text = multiTranslation?.combinedText || 'No translation yet. Start signing.';
    navigator.clipboard.writeText(text);
    alert('Copied translation to clipboard!');
  };

  const handleShareSentence = () => {
    const text = multiTranslation?.combinedText || 'No translation yet. Start signing.';
    if (navigator.share) {
      navigator.share({ title: 'SignBridge Translation', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Translation text copied to clipboard.');
    }
  };

  const handleSaveSentence = async () => {
    const text = multiTranslation?.speechText || multiTranslation?.combinedText;
    if (!text) return;
    if (!user) { alert('Please sign in to save translations.'); return; }
    const res = await api.addSavedPhrase(text, 'Translation');
    if (res.success) alert('Translation saved to your account.');
    else alert(res.error || 'Unable to save translation.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 transition-colors">
      <div className="space-y-6">
        
        {/* 1. Top Inspiration Banner */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">👋</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Break Barriers with SignBridge
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Learn, Practice, Communicate — Indian Sign Language for a More Inclusive World.
            </p>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-xs italic text-slate-400 dark:text-slate-500">
              &ldquo;Different hands. Same possibilities.&rdquo;
            </div>
            <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              — SignBridge
            </div>
          </div>
        </div>

        {/* 2. Three-Column Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Live ISL Translator Camera (5 Cols on large screens) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-3 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Live ISL Translator</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Show a sign in front of the camera</p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Camera Ready</span>
                  </span>
                  {smResult?.movementDetected && <span className="px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 text-[10px] font-bold">↝ Motion detected</span>}
                  <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
                    {detectedHands.length > 0 ? `${detectedHands.length} Hand Detected` : 'No Hands Detected'}
                  </span>
                </div>
              </div>

              {/* Camera Feed Viewport */}
              <CameraPreview
                onHandsDetected={handleHandsDetected}
                activeStatusText={
                  isPaused
                    ? '⏸ Recognition Paused'
                    : smResult?.state === 'ACCEPTED'
                    ? `✓ Accepted: ${smResult.stableName || smResult.acceptedSign}`
                    : smResult?.state === 'STABLE'
                    ? `Stable: ${smResult.stableName || smResult.stablePrediction}`
                    : smResult?.state === 'CANDIDATE'
                    ? `Evaluating: ${smResult.rawName || smResult.rawPrediction}`
                    : smResult?.state === 'COOLDOWN'
                    ? `Holding: ${smResult.stableName || smResult.stablePrediction}`
                    : smResult?.state === 'UNKNOWN'
                    ? 'Unrecognized gesture — hold clearly and try again'
                    : detectedHands.length > 0
                    ? 'Analyzing Hand Gestures...'
                    : 'Camera Ready'
                }
                recognitionState={
                  isPaused
                    ? 'IDLE'
                    : smResult?.state === 'ACCEPTED' || smResult?.state === 'STABLE'
                    ? 'RECOGNIZED'
                    : smResult?.state === 'CANDIDATE' || smResult?.state === 'COOLDOWN'
                    ? 'LOW_CONFIDENCE'
                    : 'IDLE'
                }
              />

              {detectedHands.length > 0 && currentRecognition && !currentRecognition.isAccepted && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-3 text-xs text-amber-900 dark:text-amber-200"
                >
                  <div className="font-bold">Recognition is uncertain</div>
                  <p className="mt-1 leading-5">
                    {currentRecognition.message || 'This hand pose does not currently match a supported sign with enough certainty.'}
                    {' '}It has not been added to your sentence. Improve lighting, keep your hands fully in view, and try again.
                  </p>
                </div>
              )}

              {/* Camera Bottom Status Bar */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  💡 {lighting?.label || 'Good lighting'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTogglePause}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>
                  <button
                    onClick={() => alert('Settings: You can configure camera resolution and mirroring in Settings & Preferences.')}
                    className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    title="Camera Settings"
                  >
                    ⚙️
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Recognized Sign Sequence & Translated Sentence (4 Cols on large screens) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Recognized Sign Sequence */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Recognized Sign Sequence
                </h3>
                <button
                  onClick={handleClearAll}
                  disabled={activeSequence.length === 0}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 disabled:opacity-30 transition"
                >
                  Clear All
                </button>
              </div>

              {/* Sign Token Cards Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 min-h-[100px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                {activeSequence.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center text-center py-6 text-slate-400 dark:text-slate-500 space-y-1">
                    <span className="text-2xl">🖐️</span>
                    <span className="text-xs italic">Hold signs in camera view to assemble sentence...</span>
                  </div>
                ) : (
                  <>
                    {activeSequence.map((tok, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-cyan-800/60 shadow-sm flex flex-col items-center justify-center space-y-1 group relative animate-fade-in"
                      >
                        <span className="text-xl">🖐️</span>
                        <span className="text-[11px] font-mono font-black text-slate-900 dark:text-cyan-300 text-center truncate w-full">
                          {tok}
                        </span>
                      </div>
                    ))}
                    <div className="p-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-0.5 text-slate-400 dark:text-slate-500">
                      <span className="text-lg">+</span>
                      <span className="text-[9px] font-semibold">Keep signing...</span>
                    </div>
                  </>
                )}
              </div>

              {/* Sequence Controls */}
              {activeSequence.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleUndoLast}
                    className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                  >
                    ↶ Undo Last Sign
                  </button>
                  <button
                    onClick={handleTranslateSequence}
                    className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-sm"
                  >
                    Convert to Sentence
                  </button>
                </div>
              )}
            </div>

            {/* Translated Sentence Card */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Translated Sentence
                </span>
                <div className="flex items-center gap-2">
                  <select className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] text-slate-700 dark:text-slate-300">
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                  <button
                    onClick={() => handleSpeakSentence()}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-600 dark:text-slate-400 transition"
                    title="Speak translated sentence"
                  >
                    🔊
                  </button>
                  <button
                    onClick={handleCopySentence}
                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-600 dark:text-slate-400 transition"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[60px] flex items-center">
                <div className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                  {multiTranslation?.combinedText || (activeSequence.length > 0 ? activeSequence.join(' ') + '.' : 'No translation yet. Start signing.')}
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleSpeakSentence()}
                  className="py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 flex items-center justify-center space-x-1 transition"
                >
                  <span>🔊</span>
                  <span>{isSpeaking ? 'Speaking...' : 'Speak'}</span>
                </button>
                <button
                  onClick={handleShareSentence}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1 transition"
                >
                  <span>🔗</span>
                  <span>Share</span>
                </button>
                <button
                  onClick={handleSaveSentence}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1 transition"
                >
                  <span>💾</span>
                  <span>Save</span>
                </button>
              </div>

              {/* Confidence & Details Footer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Confidence: {smResult?.rawConfidence ? `${Math.round(smResult.rawConfidence * 100)}%` : '—'}
                </span>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  className="text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
                >
                  Report / Correction
                </button>
              </div>
            </div>

          </div>

          {/* Column 3: Quick Actions & Example Sentences (3 Cols on large screens) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Quick Actions Panel */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-3 transition-colors">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Quick Actions
              </h3>

              <div className="space-y-2">
                <button
                  onClick={handleClearAll}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left flex items-center space-x-3 transition group"
                >
                  <span className="text-lg">📷</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      New Translation
                    </div>
                    <div className="text-[10px] text-slate-500">Reset buffer and start fresh</div>
                  </div>
                </button>

                <button
                  onClick={() => navigateToPractice()}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left flex items-center space-x-3 transition group"
                >
                  <span className="text-lg">🎯</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      Practice This Sign
                    </div>
                    <div className="text-[10px] text-slate-500">Open in Practice Studio</div>
                  </div>
                </button>

                <button
                  onClick={() => navigateToDictionary()}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left flex items-center space-x-3 transition group"
                >
                  <span className="text-lg">📖</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      View in Dictionary
                    </div>
                    <div className="text-[10px] text-slate-500">Lookup movement mechanics</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (currentRecognition?.sign) {
                      setActiveSequence(prev => [...prev, currentRecognition.sign!]);
                    } else {
                      alert('Perform a sign in front of the camera to add to the sentence buffer.');
                    }
                  }}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left flex items-center space-x-3 transition group"
                >
                  <span className="text-lg">➕</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      Add to Sentence
                    </div>
                    <div className="text-[10px] text-slate-500">Append current recognized sign</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Try Example Sentences */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-3 transition-colors">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Try Example Sentences
              </h3>

              <div className="space-y-2">
                {[
                  { tokens: ['I', 'NEED', 'HELP'], sentence: 'I need help.' },
                  { tokens: ['WHERE', 'IS', 'HOSPITAL'], sentence: 'Where is the hospital?' },
                  { tokens: ['THANK_YOU', 'VERY', 'MUCH'], sentence: 'Thank you very much.' },
                  { tokens: ['MY', 'NAME', 'MEET'], sentence: 'My name is Meet.' }
                ].map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleApplyExample(ex.tokens, ex.sentence)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-cyan-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-left text-xs font-semibold text-slate-800 dark:text-slate-200 transition"
                  >
                    &ldquo;{ex.sentence}&rdquo;
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Correction Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 transition-colors">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Submit Translation Correction</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold">✕</button>
              </div>

              {feedbackSuccess ? (
                <div className="p-6 text-center text-emerald-600 dark:text-emerald-400 space-y-2">
                  <div className="text-3xl">✓</div>
                  <div className="font-bold">Correction Submitted!</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Queued for dataset curation. Thank you for improving ISL accuracy.</div>
                </div>
              ) : (
                <form onSubmit={handleSubmitCorrection} className="space-y-3 text-xs">
                  <p className="text-slate-600 dark:text-slate-400">
                    Help us refine ISL sentence construction. What was your intended sentence?
                  </p>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Intended Meaning *</label>
                    <input
                      type="text"
                      value={correctionMeaning}
                      onChange={e => setCorrectionMeaning(e.target.value)}
                      placeholder="e.g., I need drinking water, please"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-semibold">Optional Notes / Context</label>
                    <textarea
                      value={feedbackNotes}
                      onChange={e => setFeedbackNotes(e.target.value)}
                      placeholder="Any notes on gestures or dialect variation..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowFeedbackModal(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-sm"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
