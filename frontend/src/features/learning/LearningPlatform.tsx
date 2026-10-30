import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronRight, CirclePlay, Clock3, GraduationCap, Lightbulb, RefreshCw, Sparkles, Target, X } from 'lucide-react';
import { CourseLevel, Chapter, Lesson, SignItem } from '../../types';
import { api } from '../../services/api';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { getFallbackChapters, LEARNING_CHAPTERS, LEARNING_COURSES, LEARNING_LESSONS } from './learningData';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { SignRepository } from '../../../../ml/sign_repository';
import { AlphabetPrediction } from '../../services/alphabetRecognitionService';

export const LearningPlatform: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [courses, setCourses] = useState<CourseLevel[]>(LEARNING_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<CourseLevel>(LEARNING_COURSES[0]);
  const [chapters, setChapters] = useState<Chapter[]>(getFallbackChapters(LEARNING_COURSES[0].id));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openChapter, setOpenChapter] = useState<string | null>(LEARNING_CHAPTERS[0]?.id || null);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [lessonSigns, setLessonSigns] = useState<SignItem[]>([]);
  const [activeSignIdx, setActiveSignIdx] = useState(0);
  const [classifier] = useState(() => new ISLSignClassifier());
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [practiceAccuracy, setPracticeAccuracy] = useState(0);
  const [lessonCompletedMessage, setLessonCompletedMessage] = useState('');
  const [recommendations, setRecommendations] = useState<{ recommendedLessons?: any[]; message?: string; completedCount?: number; totalLessons?: number } | null>(null);
  const [regionalDialect] = useState(() => localStorage.getItem('sb_regional_variant') || 'STANDARD');
  const advancingRef = useRef(false);

  const totalLessons = useMemo(() => LEARNING_LESSONS.length, []);

  const loadCurriculum = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      api.getRecommendations().then(recRes => {
        if (recRes.success && recRes.data) {
          setRecommendations(recRes.data);
        }
      }).catch(() => {});

      const res = await api.getCourses();
      if (res.success && res.data?.length) {
        const coursesData = res.data;
        setCourses(coursesData);
        const first = coursesData[0];
        setSelectedCourse(first);
        const chapterRes = await api.getChapters(first.id);
        if (chapterRes.success && chapterRes.data?.length) {
          setChapters(chapterRes.data);
          setOpenChapter(chapterRes.data[0].id);
        } else {
          setChapters(getFallbackChapters(first.id));
          setOpenChapter(getFallbackChapters(first.id)[0]?.id || null);
          setLoadError('The server curriculum could not be loaded, so the built-in learning curriculum is being shown.');
        }
      } else {
        setCourses(LEARNING_COURSES);
        setSelectedCourse(LEARNING_COURSES[0]);
        setChapters(getFallbackChapters(LEARNING_COURSES[0].id));
        setOpenChapter(LEARNING_CHAPTERS[0]?.id || null);
        setLoadError(res.error || 'The learning server is unavailable. You can still study the built-in curriculum.');
      }
    } catch (error) {
      console.error('Curriculum loading error:', error);
      setCourses(LEARNING_COURSES);
      setSelectedCourse(LEARNING_COURSES[0]);
      setChapters(getFallbackChapters(LEARNING_COURSES[0].id));
      setOpenChapter(LEARNING_CHAPTERS[0]?.id || null);
      setLoadError('Learning is available offline in this build. Start with the theory and lesson cards while the server is restarted.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCurriculum(); }, [loadCurriculum]);

  const handleSelectCourse = async (course: CourseLevel) => {
    setSelectedCourse(course);
    setOpenChapter(null);
    setLoadError('');
    try {
      const res = await api.getChapters(course.id);
      if (res.success && res.data?.length) {
        setChapters(res.data);
        setOpenChapter(res.data[0].id);
      } else {
        const fallback = getFallbackChapters(course.id);
        setChapters(fallback);
        setOpenChapter(fallback[0]?.id || null);
      }
    } catch {
      const fallback = getFallbackChapters(course.id);
      setChapters(fallback);
      setOpenChapter(fallback[0]?.id || null);
    }
  };

  const handleOpenLesson = async (lesson: Lesson) => {
    setActiveLesson(lesson);
    setLessonSigns([]);
    setActiveSignIdx(0);
    setPracticeAccuracy(0);
    setCurrentRecognition(null);
    setLessonCompletedMessage('');
    classifier.reset();
    advancingRef.current = false;
    try {
      const res = await api.getLesson(lesson.id);
      if (res.success && res.data) {
        setActiveLesson(res.data);
        const serverSigns = res.data.signs || [];
        const fallbackSigns = res.data.signsIncluded
          .map((id: string) => SignRepository.getSignById(id) as any)
          .filter(Boolean) as SignItem[];
        setLessonSigns(serverSigns.length ? serverSigns : fallbackSigns);
      } else {
        const fallbackSigns = lesson.signsIncluded
          .map((id: string) => SignRepository.getSignById(id) as any)
          .filter(Boolean) as SignItem[];
        setLessonSigns(fallbackSigns);
      }
    } catch (err) {
      const fallbackSigns = lesson.signsIncluded
        .map((id: string) => SignRepository.getSignById(id) as any)
        .filter(Boolean) as SignItem[];
      setLessonSigns(fallbackSigns);
      console.warn('Lesson details unavailable; using curriculum lesson content.', err);
    }
  };

  const handleHandsDetected = useCallback((hands: DetectedHand[], _light?: any, _video?: HTMLVideoElement, alpha?: AlphabetPrediction | null) => {
    if (!activeLesson || lessonSigns.length === 0 || !hands?.length) {
      setCurrentRecognition(null);
      return;
    }
    const currentTarget = lessonSigns[activeSignIdx];
    const geometric = classifier.recognizeFrame(hands);
    const result: SignRecognitionResult = geometric.isAccepted || !alpha
      ? geometric
      : { ...geometric, sign: alpha.label, name: `Letter ${alpha.label}`, confidence: alpha.confidence, rawScore: alpha.confidence, isAccepted: alpha.confidence >= 0.75, status: alpha.confidence >= 0.75 ? 'RECOGNIZED' : 'LOW_CONFIDENCE', message: `Recognized letter ${alpha.label} (${Math.round(alpha.confidence * 100)}%)` };
    setCurrentRecognition(result);
    const targetNames = [currentTarget?.id, currentTarget?.canonicalName, currentTarget?.name, currentTarget?.displayName]
      .filter(Boolean).map(v => String(v).toUpperCase().replace(/\s+/g, '_'));
    const predicted = result.sign ? result.sign.toUpperCase().replace(/\s+/g, '_') : '';
    if (predicted && targetNames.includes(predicted)) {
      const score = Math.round(result.confidence * 100);
      setPracticeAccuracy(score);
      if (result.isAccepted) {
        if (activeSignIdx < lessonSigns.length - 1) {
          if (advancingRef.current) return;
          advancingRef.current = true;
          window.setTimeout(() => {
            setActiveSignIdx((prev: number) => prev + 1);
            setPracticeAccuracy(0);
            setCurrentRecognition(null);
            classifier.reset();
            advancingRef.current = false;
          }, 900);
        } else {
          api.completeLesson(activeLesson.id, score).then(res => {
            setLessonCompletedMessage(res.message || 'Lesson completed successfully!');
            if (selectedCourse) handleSelectCourse(selectedCourse);
          });
        }
      }
    }
  }, [activeLesson, lessonSigns, activeSignIdx, classifier, selectedCourse]);

  if (authLoading) return <div className="min-h-[60vh] grid place-items-center text-slate-500">Checking your learning account…</div>;
  if (!user) return <main className="max-w-xl mx-auto py-16 px-4 text-center"><div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm"><GraduationCap className="w-12 h-12 mx-auto text-amber-600"/><h1 className="mt-4 text-2xl font-black text-slate-900">Sign in to start learning</h1><p className="mt-3 text-sm leading-6 text-slate-600">Your lessons, practice results and certificate eligibility are saved to your SignBridge account. Sign in or create an account to begin the structured ISL curriculum.</p><Link to="/" className="inline-flex mt-6 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950">Go to Sign In</Link></div></main>;

  return (
    <div className="min-h-full bg-[var(--bg-primary)] text-slate-900 pb-24 lg:pb-8">
      <div className="w-full max-w-[1500px] mx-auto space-y-5 sm:space-y-7">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#eadfc6] bg-gradient-to-br from-white via-[#fffdf8] to-[#f7f0df] p-5 sm:p-7 lg:p-9 shadow-sm">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#c49a45]/10 blur-2xl" />
          <div className="absolute -left-12 -bottom-24 h-48 w-48 rounded-full bg-[#c49a45]/10 blur-2xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-700 border border-cyan-100 shadow-sm">
                <Sparkles className="h-4 w-4" /> Learn first • practise next • certify later
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950">Learn Indian Sign Language</h1>
              <p className="mt-3 max-w-3xl text-sm sm:text-base leading-7 text-slate-600">A structured learning path with theory, vocabulary, visual references, recall practice, camera practice and situation-based conversation. Certification is the final step — not the starting point.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/practice" className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-black text-slate-950">Open Practice Studio</Link>
                <Link to="/certificates" className="inline-flex items-center gap-2 rounded-xl border border-[#dfc88f] bg-white px-4 py-2.5 text-xs font-black text-slate-800">Certificate eligibility & history</Link>
              </div>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500">Certificates are available after completing the required learning content and passing the practical assessment. Your certificate history is saved to your account.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                {['10 learning chapters', 'Theory + examples', 'Vocabulary recall', 'Camera practice', 'Sentence building'].map(item => <span key={item} className="rounded-full bg-white px-3 py-2 border border-slate-200 shadow-sm">✓ {item}</span>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2 xl:w-80">
              <LearningStat icon={<BookOpen />} value="10" label="Chapters" />
              <LearningStat icon={<Target />} value={String(totalLessons)} label="Lessons" />
              <LearningStat icon={<CirclePlay />} value="Live" label="Practice" />
              <LearningStat icon={<GraduationCap />} value="Final" label="Certificate" />
            </div>
          </div>
        </section>

        {loadError && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><span>{loadError}</span><button onClick={loadCurriculum} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 font-bold border border-amber-200"><RefreshCw className="w-4 h-4" /> Retry server</button></div>}

        {/* Personalized Recommendations & Regional Dialect Bar */}
        {recommendations && (
          <div className="rounded-3xl border border-amber-300 dark:border-amber-800/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" /> Recommended Next Lesson
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {recommendations.message || 'Continue your curriculum pathway towards Indian Sign Language certification.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/settings" className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 transition">
                Dialect: {regionalDialect}
              </Link>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Offline learning references available
              </span>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Learn workspace</div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Link to="/learn" className="rounded-xl bg-cyan-50 border border-cyan-100 p-3 text-xs font-black text-cyan-700">Learning Hub</Link>
            <Link to="/dictionary" className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-black text-slate-700">Dictionary</Link>
            <Link to="/practice" className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-black text-slate-700">Practice</Link>
            <Link to="/games" className="rounded-xl bg-violet-50 border border-violet-100 p-3 text-xs font-black text-violet-700">Games</Link>
            <Link to="/assessment" className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-xs font-black text-amber-700">Assessments</Link>
            <Link to="/conversation" className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-black text-emerald-700">Conversation</Link>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {courses.map(course => <button key={course.id} onClick={() => handleSelectCourse(course)} className={`text-left rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:-translate-y-0.5 ${selectedCourse.id === course.id ? 'bg-gradient-to-br from-[#b88a2d] to-[#9b711f] text-white border-[#c49a45] shadow-lg shadow-amber-500/15' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-200 hover:shadow-md'}`}><div className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${selectedCourse.id === course.id ? 'text-white/80' : 'text-cyan-700'}`}>Level {course.levelNumber}</div><div className="mt-1 text-sm sm:text-base font-black">{course.title}</div><div className={`mt-1 text-[11px] leading-5 line-clamp-2 ${selectedCourse.id === course.id ? 'text-white/85' : 'text-slate-500'}`}>{course.description}</div></button>)}
        </section>

        <section className="rounded-[2rem] bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-7 border-b border-slate-100 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div><div className="text-xs font-black uppercase tracking-widest text-violet-600">Your learning path</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">{selectedCourse.title}</h2><p className="mt-1 text-sm text-slate-500">Open a chapter, read the theory, study the vocabulary, then start the lesson.</p></div>
            <Link to="/games" className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-700 border border-violet-100 hover:bg-violet-100"><Sparkles className="w-4 h-4" /> Reinforce with Games</Link>
          </div>

          <div className="p-4 sm:p-6 space-y-3">
            {loading ? <LearningSkeleton /> : chapters.map(chapter => {
              const isOpen = openChapter === chapter.id;
              const lessons = chapter.lessons || [];
              return <article key={chapter.id} className={`rounded-2xl border overflow-hidden transition-all ${isOpen ? 'border-cyan-200 shadow-sm' : 'border-slate-200'}`}>
                <button onClick={() => setOpenChapter(isOpen ? null : chapter.id)} className="w-full text-left p-4 sm:p-5 flex items-start gap-3 sm:gap-4 hover:bg-slate-50">
                  <div className={`mt-0.5 shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${isOpen ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-500'}`}><BookOpen className="w-5 h-5" /></div>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Chapter {chapter.orderIndex}</span><span className="text-[10px] font-bold text-slate-400">• {lessons.length} lesson{lessons.length === 1 ? '' : 's'}</span></div><h3 className="mt-1 text-base sm:text-lg font-black text-slate-900">{chapter.title}</h3><p className="mt-1 text-xs sm:text-sm leading-5 text-slate-500">{chapter.description}</p></div><ChevronRight className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-90 text-cyan-600' : ''}`} /></button>
                {isOpen && <div className="px-4 pb-5 sm:px-5 sm:pb-6 animate-card-in">
                  <div className="rounded-2xl bg-gradient-to-r from-[#fbf5e8] to-white border border-[#eadfc6] p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-700"><Lightbulb className="w-4 h-4" /> Theory before practice</div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{chapter.theoryContent}</p>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {lessons.map(lesson => <div key={lesson.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-violet-600">Lesson {lesson.orderIndex}</div><h4 className="mt-1 text-sm sm:text-base font-black">{lesson.title}</h4></div>{lesson.isCompleted && <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-emerald-600"><CheckCircle2 className="w-4 h-4" /> {lesson.bestAccuracy}%</span>}</div>
                      <p className="mt-2 text-xs sm:text-sm leading-5 text-slate-500">{lesson.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">{lesson.signsIncluded.map(sign => <span key={sign} className="rounded-lg bg-slate-50 border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600">{sign.replace(/_/g, ' ')}</span>)}</div>
                      <button onClick={() => handleOpenLesson(lesson)} className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:shadow-md transition-all"><CirclePlay className="w-4 h-4" /> {lesson.isCompleted ? 'Review & Practise' : 'Start Learning Lesson'}</button>
                    </div>)}
                  </div>
                </div>}
              </article>;
            })}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <LearningPrinciple icon="01" title="See & understand" text="Learn meaning and context before trying to reproduce a sign." />
          <LearningPrinciple icon="02" title="Move naturally" text="ISL is visual and dynamic. Practice temporal gestures, not only frozen poses." />
          <LearningPrinciple icon="03" title="Build sentences" text="Combine verified signs into meaningful sequences and review the system's segmentation." />
        </section>

        <section className="rounded-3xl border border-[#eadfc6] bg-gradient-to-r from-[#fbf5e8] via-white to-[#fffdf8] p-5 sm:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div><div className="text-xs font-black uppercase tracking-widest text-violet-600">Ready for the next stage?</div><h3 className="mt-1 text-xl font-black">Certification comes after learning.</h3><p className="mt-1 text-sm text-slate-500">Finish the learning path, practise the camera tasks, then take the assessment when you are ready.</p></div>
          <Link to="/assessment" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-violet-200 px-5 py-3 text-xs font-black text-violet-700 shadow-sm hover:shadow-md">View Certification <ChevronRight className="w-4 h-4" /></Link>
        </section>
      </div>

      {activeLesson && <LessonModal
        lesson={activeLesson}
        signs={lessonSigns}
        activeSignIdx={activeSignIdx}
        currentRecognition={currentRecognition}
        practiceAccuracy={practiceAccuracy}
        lessonCompletedMessage={lessonCompletedMessage}
        onClose={() => setActiveLesson(null)}
        onHandsDetected={handleHandsDetected}
      />}
    </div>
  );
};

const LearningStat: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => <div className="rounded-2xl bg-white/80 border border-white p-3 sm:p-4 shadow-sm"><div className="text-cyan-600">{React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}</div><div className="mt-2 text-lg sm:text-xl font-black">{value}</div><div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</div></div>;
const LearningPrinciple: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm"><div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white flex items-center justify-center text-xs font-black">{icon}</div><h3 className="mt-3 font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>;
const LearningSkeleton = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />)}</div>;

interface LessonModalProps {
  lesson: Lesson;
  signs: SignItem[];
  activeSignIdx: number;
  currentRecognition: SignRecognitionResult | null;
  practiceAccuracy: number;
  lessonCompletedMessage: string;
  onClose: () => void;
  onHandsDetected: (hands: DetectedHand[], light?: any, video?: HTMLVideoElement, alpha?: AlphabetPrediction | null) => void;
}

const LessonModal: React.FC<LessonModalProps> = ({ lesson, signs, activeSignIdx, currentRecognition, practiceAccuracy, lessonCompletedMessage, onClose, onHandsDetected }) => {
  const activeSign = signs[activeSignIdx];
  return <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm p-2 sm:p-4 flex items-center justify-center">
    <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl border border-white/70">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 backdrop-blur px-4 sm:px-6 py-4"><div className="min-w-0"><div className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Learning lesson</div><h2 className="truncate text-lg sm:text-xl font-black">{lesson.title}</h2></div><button onClick={onClose} className="shrink-0 h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200"><X className="w-5 h-5" /></button></div>
      <div className="p-4 sm:p-6 lg:p-8 space-y-5">
        <div className="rounded-2xl bg-gradient-to-r from-cyan-50 to-violet-50 border border-cyan-100 p-4 sm:p-5"><div className="text-[10px] font-black uppercase tracking-widest text-cyan-700">Theory</div><p className="mt-2 text-sm leading-6 text-slate-700">{lesson.theoryContent}</p></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5"><div className="text-xs font-black uppercase tracking-widest text-violet-600">What to learn</div><div className="mt-4 space-y-2">{lesson.signsIncluded.map((s, i) => <div key={s} className={`flex items-center gap-3 rounded-xl p-3 ${i === activeSignIdx && signs.length ? 'bg-cyan-50 border border-cyan-200' : 'bg-slate-50 border border-slate-100'}`}><span className="h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black">{i+1}</span><span className="text-sm font-bold">{s.replace(/_/g, ' ')}</span></div>)}</div><div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Visual reference:</strong> use the linked ISL Dictionary media for the sign when available. This build does not invent a sign image when verified media is unavailable.</div></div>
          <div className="rounded-2xl border border-slate-200 p-4 sm:p-5">
            {signs.length > 0 ? <><div className="flex items-center justify-between gap-2"><div><div className="text-xs font-black uppercase tracking-widest text-cyan-600">Camera practice</div><div className="mt-1 text-xl font-black">{activeSign?.displayName || activeSign?.name || activeSign?.id}</div></div><div className="text-xs font-bold text-slate-400">{activeSignIdx + 1}/{signs.length}</div></div><div className="mt-4 overflow-hidden rounded-2xl"><CameraPreview onHandsDetected={onHandsDetected} activeStatusText={currentRecognition?.isAccepted ? `Recognized ${currentRecognition.name}` : 'Move naturally — the temporal recognizer analyses the gesture stream'} recognitionState={currentRecognition?.isAccepted ? 'RECOGNIZED' : 'IDLE'} /></div><div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><span className="text-xs font-bold text-slate-500">Current match</span><span className="text-lg font-black text-cyan-700">{practiceAccuracy}%</span></div></> : <div className="h-full min-h-[280px] rounded-2xl bg-gradient-to-br from-slate-50 to-cyan-50 border border-dashed border-cyan-200 flex flex-col items-center justify-center text-center p-6"><BookOpen className="w-10 h-10 text-cyan-600" /><h3 className="mt-3 font-black">Study mode ready</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">The server-side sign media is not available right now. You can still study the theory and vocabulary. Restart the backend to enable live camera validation.</p></div>}
          </div>
        </div>
        {lessonCompletedMessage && <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-bold text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> {lessonCompletedMessage}</div>}
      </div>
    </div>
  </div>;
};
