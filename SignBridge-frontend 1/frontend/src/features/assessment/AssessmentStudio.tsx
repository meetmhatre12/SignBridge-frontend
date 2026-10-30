import React, { useState, useEffect, useCallback } from 'react';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { RecognitionDebugHUD } from '../../components/camera/RecognitionDebugHUD';
import { DetectedHand, LightingCondition } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { api } from '../../services/api';
import { Assessment, Certificate } from '../../types';
import { CertificateModal } from '../certificates/CertificateModal';
import { useAuth } from '../../context/AuthContext';
import { Award, Clock, CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';
import { AlphabetPrediction } from '../../services/alphabetRecognitionService';

type ExamPhase = 'SELECT_LEVEL' | 'INSTRUCTIONS' | 'QUESTION_ACTIVE' | 'QUESTION_EVALUATED' | 'RESULT';

interface QuestionFeedback {
  signId: string;
  score: number;
  isPassed: boolean;
}

export const AssessmentStudio: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [examPhase, setExamPhase] = useState<ExamPhase>('SELECT_LEVEL');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [classifier] = useState(() => new ISLSignClassifier());
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [detectedHands, setDetectedHands] = useState<DetectedHand[]>([]);
  const [lighting, setLighting] = useState<{ level: LightingCondition; luminance: number; label: string } | undefined>(undefined);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>({});

  const [questionFeedbacks, setQuestionFeedbacks] = useState<QuestionFeedback[]>([]);
  const [lastSubmittedFeedback, setLastSubmittedFeedback] = useState<QuestionFeedback | null>(null);
  const [examResult, setExamResult] = useState<{
    score: number;
    passingScore: number;
    isPassed: boolean;
    certificate: Certificate | null;
    courseComplete?: boolean;
    requiredLessonCount?: number;
    completedLessonCount?: number;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCertificate, setActiveCertificate] = useState<Certificate | null>(null);
  const [evaluationError, setEvaluationError] = useState('');

  // Load available official assessments
  useEffect(() => {
    api.getAssessments().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setAssessments(res.data);
      } else {
        setAssessments([]);
      }
    });
  }, []);

  const currentTargetSign = selectedAssessment ? selectedAssessment.targetSigns[currentQuestionIdx] : null;

  const handleHandsDetected = useCallback((hands: DetectedHand[], light?: { level: LightingCondition; luminance: number; label: string }, _video?: HTMLVideoElement, alpha?: AlphabetPrediction | null) => {
    setDetectedHands(hands || []);
    if (light) setLighting(light);

    if (examPhase !== 'QUESTION_ACTIVE' || !hands || hands.length === 0) {
      setCurrentRecognition(null);
      return;
    }

    const geometricResult = classifier.recognizeFrame(hands);
    
    // Normalize target sign for comparison
    const rawTarget = currentTargetSign || '';
    const normTarget = rawTarget.toUpperCase().replace(/^ISL_/, '').replace(/\s+/g, '_');
    const isTargetAlphabet = normTarget.length === 1 || normTarget.startsWith('LETTER_') || normTarget.startsWith('ALPHABET_');

    // Only allow HOG alphabet prediction fallback if the current exam target is explicitly an alphabet letter
    const result: SignRecognitionResult = geometricResult.isAccepted
      ? geometricResult
      : (isTargetAlphabet && alpha && alpha.confidence >= 0.75)
        ? {
            sign: alpha.label,
            signId: `isl_${alpha.label.toLowerCase()}`,
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
              sign: p.label,
              signId: `isl_${p.label.toLowerCase()}`,
              canonicalName: `Letter ${p.label}`,
              name: `Letter ${p.label}`,
              confidence: p.confidence,
              rawScore: p.confidence
            })),
            timestamp: new Date().toISOString()
          }
        : geometricResult;
        
    setCurrentRecognition(result);

    if (result.isAccepted && currentTargetSign) {
      const resSign = (result.sign || '').toUpperCase().replace(/^ISL_/, '').replace(/\s+/g, '_');
      const resSignId = (result.signId || '').toUpperCase().replace(/^ISL_/, '').replace(/\s+/g, '_');
      const resName = (result.canonicalName || result.name || '').toUpperCase().replace(/^ISL_/, '').replace(/\s+/g, '_');

      const isMatch = resSign === normTarget || resSignId === normTarget || resName === normTarget ||
        (isTargetAlphabet && (resSign === normTarget.replace(/^(LETTER_|ALPHABET_)/, '') || (result.canonicalName || '').endsWith(normTarget)));

      if (isMatch) {
        const score = Math.round(result.confidence * 100);
        setQuestionScores(prev => ({
          ...prev,
          [currentTargetSign]: Math.max(prev[currentTargetSign] || 0, score)
        }));
      }
    }
  }, [examPhase, classifier, currentTargetSign]);

  const handleSelectLevel = (asm: Assessment) => {
    setSelectedAssessment(asm);
    setExamPhase('INSTRUCTIONS');
  };

  const handleStartExam = () => {
    setCurrentQuestionIdx(0);
    setQuestionScores({});
    setQuestionFeedbacks([]);
    setLastSubmittedFeedback(null);
    setExamResult(null);
    classifier.reset();
    setExamPhase('QUESTION_ACTIVE');
  };

  const handleSubmitAnswer = () => {
    if (!currentTargetSign) return;

    const score = questionScores[currentTargetSign] || (currentRecognition?.sign === currentTargetSign ? Math.round(currentRecognition.confidence * 100) : 0);
    const isPassed = score >= 80;

    const feedback: QuestionFeedback = {
      signId: currentTargetSign,
      score,
      isPassed
    };

    setLastSubmittedFeedback(feedback);
    setQuestionFeedbacks(prev => [...prev.filter(f => f.signId !== currentTargetSign), feedback]);
    setExamPhase('QUESTION_EVALUATED');
  };

  const handleNextQuestion = () => {
    if (!selectedAssessment) return;

    if (currentQuestionIdx + 1 < selectedAssessment.targetSigns.length) {
      setCurrentQuestionIdx(prev => prev + 1);
      setCurrentRecognition(null);
      setLastSubmittedFeedback(null);
      classifier.reset();
      setExamPhase('QUESTION_ACTIVE');
    } else {
      finishExam();
    }
  };

  const finishExam = async () => {
    if (!selectedAssessment) return;
    setIsSubmitting(true);

    try {
      const res = await api.evaluateAssessment(selectedAssessment.id, questionScores);
      if (res.success && res.data) {
        setExamResult(res.data);
        if (res.data.certificate) {
          setActiveCertificate(res.data.certificate);
        }
      } else {
        throw new Error(res.error || 'The server could not evaluate this assessment.');
      }
    } catch (error: any) {
      setEvaluationError(error?.message || 'Unable to complete assessment evaluation.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(false);
    setExamPhase('RESULT');
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center shadow-sm">
          <Award className="w-10 h-10 mx-auto text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-4">Sign in to take a certification assessment</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Certification attempts and certificates are private account records.</p>
          <a href="/profile" className="inline-block mt-5 px-5 py-2.5 rounded-xl bg-cyan-600 text-white font-bold text-sm">Open Profile</a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>Formal Evaluation & Verifiable Credentials</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Assessments & Certification</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Demonstrate required Indian Sign Language signs in front of the camera to earn a verified certificate.
          </p>
        </div>
        {examPhase !== 'SELECT_LEVEL' && (
          <button
            onClick={() => setExamPhase('SELECT_LEVEL')}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 self-start md:self-auto"
          >
            ← Back to Assessment Levels
          </button>
        )}
      </div>

      {evaluationError && <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-sm text-rose-700 dark:text-rose-300">{evaluationError}</div>}

      {/* 1. SELECT LEVEL SCREEN */}
      {examPhase === 'SELECT_LEVEL' && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Available Assessments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assessments.map((asm) => (
              <div
                key={asm.id}
                className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/50 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col justify-between space-y-4 transition group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      Level {asm.levelNumber}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{asm.durationMinutes} mins</span>
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition">
                    {asm.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {asm.description}
                  </p>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Tested Signs ({asm.targetSigns.length}):</div>
                    <div className="flex flex-wrap gap-1.5">
                      {asm.targetSigns.map(sign => (
                        <span key={sign} className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-800">
                          {sign}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Pass: <strong className="text-emerald-600 dark:text-emerald-400">{asm.passingScore}%</strong></span>
                  <button
                    onClick={() => handleSelectLevel(asm)}
                    className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 transition"
                  >
                    Select Exam →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. INSTRUCTIONS SCREEN */}
      {examPhase === 'INSTRUCTIONS' && selectedAssessment && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-3xl mx-auto animate-fade-in transition-colors">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 uppercase">Pre-Exam Briefing</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{selectedAssessment.title}</h2>
          </div>

          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            <h4 className="text-xs uppercase font-extrabold text-amber-600 dark:text-amber-400 tracking-wider">
              Assessment Guidelines:
            </h4>
            <ol className="space-y-3 list-decimal list-inside leading-relaxed">
              <li>A target sign prompt will appear on the screen with execution cues.</li>
              <li>Position your hands inside the camera framing box under clear lighting.</li>
              <li>Perform the sign steadily and hold for 1 second.</li>
              <li>Click <strong>[Submit Answer]</strong> to evaluate your sign accuracy.</li>
              <li>Achieve at least <strong>{selectedAssessment.passingScore}%</strong> across all questions to earn your verified certificate.</li>
            </ol>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setExamPhase('SELECT_LEVEL')}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
            >
              Back
            </button>
            <button
              onClick={handleStartExam}
              className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm shadow-md shadow-cyan-600/30 transition flex items-center space-x-2"
            >
              <span>📹</span>
              <span>Start Camera Assessment</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. ACTIVE QUESTION & EVALUATION FLOW */}
      {(examPhase === 'QUESTION_ACTIVE' || examPhase === 'QUESTION_EVALUATED') && selectedAssessment && currentTargetSign && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Camera Stream */}
          <div className="lg:col-span-7 space-y-4">
            <CameraPreview
              onHandsDetected={handleHandsDetected}
              activeStatusText={
                currentRecognition?.isAccepted
                  ? `Recognized: ${currentRecognition.name} (${(currentRecognition.confidence * 100).toFixed(0)}%)`
                  : 'Exam Camera Ready'
              }
              recognitionState={currentRecognition?.isAccepted ? 'RECOGNIZED' : 'IDLE'}
              recognitionMode={
                currentTargetSign && (currentTargetSign.length === 1 || currentTargetSign.startsWith('LETTER_') || currentTargetSign.startsWith('ALPHABET_'))
                  ? 'ALPHABET_ONLY'
                  : 'WORD_ONLY'
              }
            />
          </div>

          {/* Right Column: Question Panel & Actions */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl space-y-5 flex flex-col justify-between transition-colors">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-extrabold text-cyan-600 dark:text-cyan-400 uppercase">
                    Question {currentQuestionIdx + 1} of {selectedAssessment.targetSigns.length}
                  </span>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">
                    Passing Requirement: {selectedAssessment.passingScore}%
                  </span>
                </div>

                {/* Target Sign Prompt Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 tracking-wider">
                    Target ISL Sign
                  </span>
                  <div className="text-3xl font-black text-slate-900 dark:text-white font-mono tracking-wide text-center py-2">
                    {currentTargetSign}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                    Perform the target sign clearly in front of the camera and hold for 1 second.
                  </p>
                </div>

                {/* Live Model Prediction & Match Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Live Model Detection:</span>
                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                      currentRecognition?.sign === currentTargetSign || currentRecognition?.name === currentTargetSign
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : currentRecognition?.sign
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                        : 'bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}>
                      {currentRecognition?.name || currentRecognition?.sign || 'Waiting for hand gesture...'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Match Probability:</span>
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {currentRecognition ? `${Math.round(currentRecognition.confidence * 100)}%` : '--'}
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        currentRecognition?.sign === currentTargetSign || currentRecognition?.name === currentTargetSign ? 'bg-emerald-500' : 'bg-cyan-500'
                      }`}
                      style={{
                        width: `${currentRecognition ? currentRecognition.confidence * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>

                {/* Post-Submission Result Banner */}
                {examPhase === 'QUESTION_EVALUATED' && lastSubmittedFeedback && (
                  <div className={`p-4 rounded-2xl border text-center space-y-1 animate-fade-in ${
                    lastSubmittedFeedback.isPassed
                      ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-500/60 text-rose-700 dark:text-rose-300'
                  }`}>
                    <div className="font-bold text-sm">
                      {lastSubmittedFeedback.isPassed ? '✓ Correct! Sign Verified' : '✕ Needs Improvement'}
                    </div>
                    <div className="text-xs opacity-90">
                      Recorded Score: {lastSubmittedFeedback.score}% (Passing Threshold: 80%)
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Action Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                {examPhase === 'QUESTION_ACTIVE' ? (
                  <button
                    onClick={handleSubmitAnswer}
                    className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm shadow-md shadow-cyan-600/30 transition"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-md shadow-emerald-600/30 transition"
                  >
                    {currentQuestionIdx + 1 < selectedAssessment.targetSigns.length ? 'Next Question →' : 'Finish Assessment & Calculate Score'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FINAL RESULT SCREEN */}
      {examPhase === 'RESULT' && examResult && selectedAssessment && (
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-w-2xl mx-auto text-center animate-fade-in transition-colors">
          <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto border ${
            examResult.isPassed
              ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500/50 text-rose-600 dark:text-rose-400'
          }`}>
            {examResult.isPassed ? '🏆' : '📝'}
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
              Assessment Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {examResult.isPassed ? 'Congratulations! You Passed' : 'Assessment Incomplete'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedAssessment.title}
            </p>
          </div>

          {/* Score Cards */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-left">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Your Score</span>
              <div className={`text-3xl font-black font-mono ${examResult.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {examResult.score}%
              </div>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold">Passing Requirement</span>
              <div className="text-3xl font-black font-mono text-slate-700 dark:text-slate-300">
                {selectedAssessment.passingScore}%
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-left space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Performance Summary:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {questionFeedbacks.map(f => (
                <div key={f.signId} className="flex justify-between items-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{f.signId}</span>
                  <span className={`font-mono font-bold ${f.isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {f.score}% {f.isPassed ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            {examResult.isPassed && activeCertificate ? (
              <button
                onClick={() => setActiveCertificate(activeCertificate)}
                className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition flex items-center space-x-2"
              >
                <span>📜</span>
                <span>View & Download Certificate</span>
              </button>
            ) : (
              <button
                onClick={handleStartExam}
                className="px-6 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 transition"
              >
                Retry Assessment
              </button>
            )}

            <button
              onClick={() => setExamPhase('SELECT_LEVEL')}
              className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700"
            >
              Back to Assessment Levels
            </button>
          </div>
        </div>
      )}

      {/* Certificate Modal Viewer */}
      {activeCertificate && (
        <CertificateModal
          certificate={activeCertificate}
          onClose={() => setActiveCertificate(null)}
        />
      )}
    </div>
  );
};
