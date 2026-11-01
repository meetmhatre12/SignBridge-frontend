import React, { useEffect, useMemo, useState } from 'react';
import {
  Award, BookOpen, Brain, Check, ChevronLeft, ChevronRight, Clock3, ExternalLink,
  Flame, Gamepad2, GraduationCap, Info, Lightbulb, RotateCcw, Sparkles, Target, Trophy, X, Zap
} from 'lucide-react';
import { ALPHABET_SIGNS, GameSign } from './gameData';

const REFERENCE_GAME_URL = 'https://robizman.github.io/guess-indian-sign-lang-alphabet/game.html';
const TOTAL_QUESTIONS = 37;
const QUESTION_TIME_SECONDS = 20;
const SPEED_TIME_SECONDS = 60;
const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const buildOptions = (answer: string) => shuffle([answer, ...shuffle(ALPHABET_SIGNS.map(x => x.answer).filter(x => x !== answer)).slice(0, 3)]);
const buildQuestionSet = (count: number) => {
  const result: GameSign[] = [];
  let previous = '';
  while (result.length < count) {
    const pool = shuffle(ALPHABET_SIGNS).filter(sign => sign.answer !== previous);
    const next = pool[0];
    if (!next) break;
    result.push(next);
    previous = next.answer;
  }
  return result;
};

type GameKey = 'alphabet' | 'speed' | 'flashcards' | 'memory' | 'imagehunt' | 'sequence';
type Feedback = { selected: string; answer: string; correct: boolean; timedOut?: boolean };

const GameIcon = ({ game }: { game: GameKey }) => {
  const icons = { alphabet: Award, speed: Zap, flashcards: BookOpen, memory: Brain, imagehunt: Target, sequence: Sparkles };
  const Icon = icons[game];
  return <Icon className="w-5 h-5" />;
};

const Asset: React.FC<{ sign: GameSign; large?: boolean }> = ({ sign, large = false }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`relative ${large ? 'w-52 h-52 sm:w-64 sm:h-64' : 'w-28 h-28'} rounded-[1.5rem] bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center`}>
      {!failed ? (
        <img src={assetUrl(sign.image)} alt={`ISL reference image for ${sign.label}`} loading="lazy" decoding="async" className="w-full h-full object-contain p-2.5" onError={() => setFailed(true)} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-sky-50">
          <span className="text-3xl font-black text-[#8b671f]">{sign.label}</span>
          <span className="mt-1 text-[10px] font-bold text-slate-500">Reference image unavailable</span>
        </div>
      )}
      <span className="absolute top-2 right-2 px-2 py-1 rounded-full bg-white/90 border border-slate-200 text-[9px] font-black text-slate-500">ISL</span>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; gold?: boolean }> = ({ value, gold }) => (
  <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
    <div className={`h-full rounded-full transition-all duration-500 ${gold ? 'bg-amber-500' : 'bg-sky-500'}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
  </div>
);

const StudyNote: React.FC<{ sign: GameSign; compact?: boolean }> = ({ sign, compact }) => (
  <div className={`rounded-2xl border border-[#eadfc6] bg-[#fbf5e8]/80 ${compact ? 'p-3' : 'p-4'}`}>
    <div className="flex items-start gap-2"><Info className="w-4 h-4 text-[#9b711f] mt-0.5 shrink-0" /><div className="text-xs leading-5 text-slate-700">
      <div className="font-black text-slate-900">How to study {sign.label}</div>
      <p className="mt-1">This is the supplied ISL alphabet reference image for <strong>{sign.label}</strong>. Copy the exact hand and finger arrangement shown in the picture.</p>
      <p className="mt-1 text-slate-600"><strong>Check:</strong> number of hands → finger positions → thumb position → palm orientation. Alphabet entries are static reference poses, so there is no movement to invent.</p>
    </div></div>
  </div>
);

export const SignGamesHub: React.FC = () => {
  const [activeGame, setActiveGame] = useState<GameKey>('alphabet');
  const [questions, setQuestions] = useState<GameSign[]>(() => buildQuestionSet(TOTAL_QUESTIONS));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = React.useRef<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(() => Number(localStorage.getItem('sb_game_best_streak') || '0'));
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_SECONDS);

  const [speedRunning, setSpeedRunning] = useState(false);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedAnswered, setSpeedAnswered] = useState(0);
  const [speedCorrect, setSpeedCorrect] = useState(0);
  const [speedFeedback, setSpeedFeedback] = useState<Feedback | null>(null);

  const [flashIndex, setFlashIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const [memoryCards, setMemoryCards] = useState<{ id: string; type: 'sign' | 'label'; value: string; sign: GameSign; matched: boolean }[]>([]);
  const [memoryOpen, setMemoryOpen] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryStarted, setMemoryStarted] = useState(false);
  const [memoryFeedback, setMemoryFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  const [huntRound, setHuntRound] = useState<{ target: GameSign; options: GameSign[] } | null>(null);
  const [huntFeedback, setHuntFeedback] = useState<Feedback | null>(null);
  const [huntScore, setHuntScore] = useState(0);
  const [huntAnswered, setHuntAnswered] = useState(0);
  const [sequenceRound, setSequenceRound] = useState<{ shown: GameSign[]; answer: GameSign; options: GameSign[] } | null>(null);
  const [sequenceFeedback, setSequenceFeedback] = useState<Feedback | null>(null);
  const [sequenceScore, setSequenceScore] = useState(0);
  const [sequenceAnswered, setSequenceAnswered] = useState(0);

  const current = questions[questionIndex];
  const options = useMemo(() => current ? buildOptions(current.answer) : [], [current]);
  const finished = questionIndex >= TOTAL_QUESTIONS;
  const accuracy = answered ? Math.round((score / (answered * 10)) * 100) : 0;

  const resetAlphabet = () => {
    setQuestions(buildQuestionSet(TOTAL_QUESTIONS)); setQuestionIndex(0); setSelected(null); setFeedback(null);
    setScore(0); setAnswered(0); setStreak(0); setTimeLeft(QUESTION_TIME_SECONDS);
  };

  const recordStreak = (correct: boolean) => {
    if (!correct) { setStreak(0); return; }
    setStreak(previous => {
      const next = previous + 1;
      setBestStreak(best => { const value = Math.max(best, next); localStorage.setItem('sb_game_best_streak', String(value)); return value; });
      return next;
    });
  };

  const choose = (answer: string, timedOut = false) => {
    if (selected || !current) return;
    const correct = !timedOut && answer === current.answer;
    const selection = timedOut ? '__TIMEOUT__' : answer;
    selectedRef.current = selection;
    setSelected(selection);
    setFeedback({ selected: timedOut ? '__TIMEOUT__' : answer, answer: current.answer, correct, timedOut });
    setAnswered(v => v + 1);
    if (correct) setScore(v => v + 10);
    recordStreak(correct);
  };

  const nextQuestion = () => {
    setQuestionIndex(v => v + 1); selectedRef.current = null; setSelected(null); setFeedback(null); setTimeLeft(QUESTION_TIME_SECONDS);
  };

  useEffect(() => {
    if (activeGame !== 'alphabet' || selected || finished) return;
    const timer = window.setInterval(() => {
      setTimeLeft(previous => {
        const next = Math.max(0, previous - 1);
        if (previous <= 1 && !selectedRef.current) window.setTimeout(() => { if (!selectedRef.current) choose('', true); }, 0);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [activeGame, selected, finished, questionIndex]);

  const startSpeed = () => {
    setQuestions(shuffle(ALPHABET_SIGNS)); setQuestionIndex(0); setSpeedRunning(true); setTimeLeft(SPEED_TIME_SECONDS);
    setSpeedScore(0); setSpeedAnswered(0); setSpeedCorrect(0); setSpeedFeedback(null); setSelected(null);
  };

  useEffect(() => {
    if (activeGame !== 'speed' || !speedRunning) return;
    const timer = window.setInterval(() => setTimeLeft(v => {
      if (v <= 1) { setSpeedRunning(false); return 0; }
      return v - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [activeGame, speedRunning]);

  const speedAnswer = (answer: string) => {
    if (!speedRunning || !current || speedFeedback) return;
    const correct = answer === current.answer;
    const result: Feedback = { selected: answer, answer: current.answer, correct };
    setSpeedFeedback(result); setSpeedAnswered(v => v + 1); if (correct) { setSpeedCorrect(v => v + 1); setSpeedScore(v => v + 10); }
    window.setTimeout(() => {
      setSpeedFeedback(null); setQuestionIndex(v => (v + 1) % ALPHABET_SIGNS.length);
    }, 750);
  };

  const startMemory = () => {
    const chosen = shuffle(ALPHABET_SIGNS).slice(0, 6);
    setMemoryCards(shuffle(chosen.flatMap(sign => [
      { id: `${sign.id}-s`, type: 'sign' as const, value: sign.id, sign, matched: false },
      { id: `${sign.id}-l`, type: 'label' as const, value: sign.label, sign, matched: false },
    ])));
    setMemoryOpen([]); setMemoryMoves(0); setMemoryStarted(true); setMemoryFeedback(null);
  };

  const flipMemory = (id: string) => {
    if (!memoryStarted || memoryOpen.length >= 2 || memoryOpen.includes(id)) return;
    const chosen = memoryCards.find(c => c.id === id);
    if (!chosen || chosen.matched) return;
    const nextOpen = [...memoryOpen, id]; setMemoryOpen(nextOpen);
    if (nextOpen.length !== 2) return;
    const [a, b] = nextOpen.map(x => memoryCards.find(c => c.id === x)!);
    const match = a.sign.id === b.sign.id && a.type !== b.type;
    setMemoryMoves(v => v + 1);
    setMemoryFeedback(match
      ? { text: `Correct match — ${a.sign.label} ✓`, correct: true }
      : { text: `Not a match — ${a.type === 'sign' ? `Sign ${a.sign.label}` : `Letter ${a.value}`} and ${b.type === 'sign' ? `Sign ${b.sign.label}` : `Letter ${b.value}`}.`, correct: false });
    window.setTimeout(() => {
      setMemoryCards(cards => cards.map(c => c.id === a.id || c.id === b.id ? { ...c, matched: match || c.matched } : c));
      setMemoryOpen([]);
    }, match ? 650 : 1050);
  };

  const startHunt = () => {
    const target = shuffle(ALPHABET_SIGNS)[0];
    const distractors = shuffle(ALPHABET_SIGNS.filter(s => s.id !== target.id)).slice(0, 3);
    setHuntRound({ target, options: shuffle([target, ...distractors]) });
    setHuntFeedback(null);
    setHuntScore(0);
    setHuntAnswered(0);
  };

  const answerHunt = (sign: GameSign) => {
    if (!huntRound || huntFeedback) return;
    const correct = sign.id === huntRound.target.id;
    setHuntFeedback({ selected: sign.label, answer: huntRound.target.label, correct });
    setHuntAnswered(v => v + 1);
    if (correct) setHuntScore(v => v + 10);
  };

  const nextHunt = () => {
    const target = shuffle(ALPHABET_SIGNS)[0];
    const distractors = shuffle(ALPHABET_SIGNS.filter(s => s.id !== target.id)).slice(0, 3);
    setHuntRound({ target, options: shuffle([target, ...distractors]) });
    setHuntFeedback(null);
  };

  const startSequence = () => {
    const start = Math.floor(Math.random() * 20);
    const shown = ALPHABET_SIGNS.slice(start, start + 3);
    const answer = ALPHABET_SIGNS[start + 3];
    const options = shuffle([answer, ...shuffle(ALPHABET_SIGNS.filter(s => !shown.some(x => x.id === s.id) && s.id !== answer.id)).slice(0, 3)]);
    setSequenceRound({ shown, answer, options });
    setSequenceFeedback(null);
    setSequenceScore(0);
    setSequenceAnswered(0);
  };

  const answerSequence = (sign: GameSign) => {
    if (!sequenceRound || sequenceFeedback) return;
    const correct = sign.id === sequenceRound.answer.id;
    setSequenceFeedback({ selected: sign.label, answer: sequenceRound.answer.label, correct });
    setSequenceAnswered(v => v + 1);
    if (correct) setSequenceScore(v => v + 10);
  };

  const nextSequence = () => {
    const start = Math.floor(Math.random() * 20);
    const shown = ALPHABET_SIGNS.slice(start, start + 3);
    const answer = ALPHABET_SIGNS[start + 3];
    const options = shuffle([answer, ...shuffle(ALPHABET_SIGNS.filter(s => !shown.some(x => x.id === s.id) && s.id !== answer.id)).slice(0, 3)]);
    setSequenceRound({ shown, answer, options });
    setSequenceFeedback(null);
  };

  const switchGame = (game: GameKey) => {
    setActiveGame(game); selectedRef.current = null; setSelected(null); setFeedback(null); setSpeedFeedback(null); setSpeedRunning(false); setRevealed(false);
    if (game === 'alphabet') resetAlphabet();
    if (game === 'speed') { setTimeLeft(SPEED_TIME_SECONDS); setQuestionIndex(0); }
    if (game === 'flashcards') setFlashIndex(0);
    if (game === 'memory') startMemory();
    if (game === 'imagehunt') startHunt();
    if (game === 'sequence') startSequence();
  };

  const tabs: { key: GameKey; title: string; desc: string }[] = [
    { key: 'alphabet', title: 'Alphabet Quiz', desc: '37 questions · 20 sec each' },
    { key: 'speed', title: 'Speed Round', desc: '60 sec · quick recall' },
    { key: 'flashcards', title: 'Flashcards', desc: 'tap · review · next' },
    { key: 'memory', title: 'Sign Match', desc: 'image ↔ letter · moves' },
    { key: 'imagehunt', title: 'Image Hunt', desc: 'find the correct sign image' },
    { key: 'sequence', title: 'Sign Sequence', desc: 'complete the A–Z pattern' },
  ];

  return (
    <main className="min-h-full bg-[var(--bg-primary)] text-slate-900 pb-20">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6">
        <section className="rounded-[2rem] border border-[#eadfc6] bg-gradient-to-br from-[#fffdf8] via-white to-[#f7f0df] p-5 sm:p-7 shadow-sm overflow-hidden relative">
          <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#eadfc6] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#8b671f]"><Gamepad2 className="w-3.5 h-3.5" /> ISL Game Studio</div>
              <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight">Learn the sign. Then test yourself.</h1>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-6 max-w-2xl">Every challenge uses the bundled A–Z ISL reference images. You see the sign first, choose an answer, and then get the exact answer plus a simple study explanation.</p>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-black"><span className="px-3 py-2 rounded-full bg-sky-100 text-sky-800">37 questions</span><span className="px-3 py-2 rounded-full bg-amber-100 text-amber-800">20 sec each</span><span className="px-3 py-2 rounded-full bg-[#efe5dc] text-[#704f3a]">Instant answer review</span></div>
            </div>
            <div className="w-full lg:w-64 rounded-3xl bg-[#704f3a] text-white p-5 shadow-lg"><div className="text-[10px] uppercase tracking-widest font-black text-amber-200">Best streak</div><div className="mt-1 flex items-end gap-2"><span className="text-5xl font-black">{bestStreak}</span><Flame className="w-7 h-7 text-amber-300 mb-2" /></div><p className="mt-2 text-xs text-white/80">Build accuracy first, then speed.</p></div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {tabs.map(tab => <button key={tab.key} onClick={() => switchGame(tab.key)} className={`text-left rounded-2xl border p-3.5 sm:p-4 transition-all hover:-translate-y-0.5 ${activeGame === tab.key ? 'bg-sky-50 border-sky-400 shadow-md' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between gap-2"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeGame === tab.key ? 'bg-[#b88a2d] text-white' : 'bg-[#fbf5e8] text-[#8b671f]'}`}><GameIcon game={tab.key} /></div><span className="text-[9px] font-black text-slate-400 uppercase">{tab.key === 'alphabet' ? '37×20s' : tab.key === 'speed' ? '60s' : tab.key === 'flashcards' ? '26 cards' : '6 pairs'}</span></div>
            <div className="mt-3 text-sm font-black">{tab.title}</div><div className="mt-1 text-[11px] text-slate-500">{tab.desc}</div>
          </button>)}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
          {activeGame === 'alphabet' && <>
            <div className="p-5 sm:p-7 border-b border-slate-100"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-sky-700">Alphabet Quiz</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">Which letter is this sign?</h2></div><div className="flex gap-2 text-xs font-black"><span className="px-3 py-2 rounded-xl bg-slate-100">{Math.min(questionIndex + 1, TOTAL_QUESTIONS)}/{TOTAL_QUESTIONS}</span><span className="px-3 py-2 rounded-xl bg-amber-50 text-amber-800">{score} pts</span><span className="px-3 py-2 rounded-xl bg-sky-50 text-sky-700"><Flame className="inline w-3.5 h-3.5 mr-1" />{streak}</span></div></div><div className="mt-4"><ProgressBar value={(questionIndex / TOTAL_QUESTIONS) * 100} /></div></div>
            {!finished ? <div className="p-5 sm:p-7 lg:p-9 grid lg:grid-cols-[0.9fr_1.1fr] gap-7 items-center">
              <div className="rounded-3xl bg-sky-50/80 border border-sky-100 p-5 sm:p-7 flex flex-col items-center"><div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">Look at the whole hand</div><Asset sign={current} large /><div className="mt-4 text-center text-xs text-slate-600 leading-5 max-w-sm">Compare the fingers, thumb and palm direction in the image. Do not guess from the shape of the letter itself.</div></div>
              <div><div className="flex items-center justify-between mb-3"><div><div className="font-black text-lg">Choose one answer</div><div className="text-[11px] text-slate-400">Question {questionIndex + 1} of {TOTAL_QUESTIONS}</div></div><div className={`inline-flex items-center gap-1.5 text-xs font-black ${timeLeft <= 5 ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}><Clock3 className="w-4 h-4" /> {timeLeft}s</div></div>
                <div className="grid grid-cols-2 gap-3">{options.map((option, i) => { const correct = feedback?.answer === option; const picked = feedback?.selected === option; let cls = 'border-slate-200 bg-white hover:border-[#c49a45] hover:bg-[#fbf5e8]'; if (feedback) cls = correct ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : picked ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 opacity-55'; return <button key={option} disabled={!!selected} onClick={() => choose(option)} className={`min-h-20 rounded-2xl border-2 px-3 transition-all ${cls}`}><span className="block text-[10px] font-black text-slate-400">OPTION {String.fromCharCode(65 + i)}</span><span className="text-2xl font-black">{option}</span></button>; })}</div>
                {feedback && <div className={`mt-4 rounded-2xl border p-4 ${feedback.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}><div className={`flex items-center gap-2 font-black ${feedback.correct ? 'text-emerald-800' : 'text-rose-800'}`}>{feedback.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}{feedback.timedOut ? `Time's up. Correct answer: ${feedback.answer}.` : feedback.correct ? `Correct! The answer is ${feedback.answer}.` : `Not quite. Correct answer: ${feedback.answer}.`}</div><div className="mt-3 grid sm:grid-cols-[84px_1fr] gap-3 items-center"><img src={assetUrl(current.image)} alt={`Correct ISL reference ${current.answer}`} className="w-20 h-20 object-contain rounded-xl bg-white border border-slate-200 p-1" /><div className="text-xs text-slate-700 leading-5"><strong className="text-slate-900">Answer: {current.answer}</strong><br />This image is the supplied ISL alphabet reference for <strong>{current.answer}</strong>. Learn the visual hand arrangement from the image, then practise it in Practice Studio.</div></div></div>}
                <div className="mt-4"><StudyNote sign={current} compact /></div>
                <div className="mt-4 flex items-center justify-between"><div className="text-xs text-slate-500">Accuracy: <strong>{accuracy}%</strong></div>{feedback && <button onClick={nextQuestion} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 text-white text-sm font-black">{questionIndex === TOTAL_QUESTIONS - 1 ? 'See result' : 'Next question'} <ChevronRight className="w-4 h-4" /></button>}</div>
              </div>
            </div> : <ResultCard score={score} answered={TOTAL_QUESTIONS} bestStreak={bestStreak} onRestart={resetAlphabet} />}
          </>}

          {activeGame === 'speed' && <div className="p-5 sm:p-8 lg:p-10">
            {!speedRunning && timeLeft === 0 ? <ResultCard score={speedScore} answered={speedAnswered} bestStreak={bestStreak} onRestart={startSpeed} speed accuracy={speedAnswered ? Math.round((speedCorrect / speedAnswered) * 100) : 0} /> : <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Speed Round</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">Recognize as many as you can</h2></div><div className="flex gap-2"><span className="px-4 py-3 rounded-2xl bg-amber-50 text-amber-800 font-black"><Clock3 className="inline w-4 h-4 mr-1" />{timeLeft}s</span><span className="px-4 py-3 rounded-2xl bg-sky-50 text-sky-700 font-black">{speedScore} pts</span></div></div>
              {!speedRunning ? <div className="mt-8 rounded-3xl bg-[#efe5dc] p-8 text-center"><Zap className="w-12 h-12 mx-auto text-amber-600" /><h3 className="mt-4 text-2xl font-black text-[#5d4332]">Ready?</h3><p className="mt-2 text-sm text-slate-600">You get 60 seconds. Pick the letter that matches the real ISL image. The correct answer appears immediately.</p><button onClick={startSpeed} className="mt-6 px-7 py-3 rounded-xl bg-[#704f3a] text-white font-black">Start Speed Round</button></div> : <div className="mt-8 grid lg:grid-cols-2 gap-7 items-center"><div className="flex justify-center"><Asset sign={current} large /></div><div><div className="text-sm font-black mb-3">{speedAnswered} answers · {speedCorrect} correct</div><div className="grid grid-cols-2 gap-3">{options.map((option, i) => <button key={option} disabled={!!speedFeedback} onClick={() => speedAnswer(option)} className={`min-h-16 rounded-2xl border-2 font-black transition ${speedFeedback ? option === speedFeedback.answer ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : option === speedFeedback.selected ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 opacity-50' : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50'}`}><span className="block text-[9px] text-slate-400">OPTION {String.fromCharCode(65 + i)}</span><span className="text-xl">{option}</span></button>)}</div>{speedFeedback && <div className={`mt-4 rounded-2xl border p-3 text-sm font-black ${speedFeedback.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>{speedFeedback.correct ? 'Correct!' : `Correct answer: ${speedFeedback.answer}.`} <span className="font-medium">The image is the ISL reference for {speedFeedback.answer}.</span></div>}<div className="mt-5"><ProgressBar value={(timeLeft / SPEED_TIME_SECONDS) * 100} gold /></div></div></div>}
            </>}
          </div>}

          {activeGame === 'flashcards' && <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-sky-700">Flashcards</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">Tap to reveal. Then review.</h2><p className="mt-2 text-sm text-slate-500">There are 26 alphabet cards. Try to identify the sign before revealing the answer.</p></div><span className="text-xs font-black text-slate-500">Card {flashIndex + 1} / 26</span></div>
            <div className="mt-7 flex justify-center"><button onClick={() => setRevealed(v => !v)} className="w-full max-w-2xl min-h-[390px] rounded-[2rem] border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-amber-50 p-5 sm:p-8 shadow-lg text-slate-900"><div className="text-[10px] uppercase tracking-[0.2em] font-black text-sky-700">{revealed ? 'Answer revealed' : 'Tap to reveal'}</div><div className="mt-5 flex justify-center"><Asset sign={ALPHABET_SIGNS[flashIndex]} large /></div>{revealed ? <><div className="mt-4 text-4xl font-black">{ALPHABET_SIGNS[flashIndex].label}</div><p className="mt-2 text-xs text-slate-600">Study the exact hand arrangement in the reference image.</p></> : <div className="mt-4 text-sm font-black text-[#704f3a]">Can you name this sign before you tap?</div>}</button></div>
            <div className="mt-5 flex justify-center gap-2"><button disabled={flashIndex === 0} onClick={() => { setFlashIndex(v => v - 1); setRevealed(false); }} className="p-3 rounded-xl border border-slate-200 disabled:opacity-40"><ChevronLeft /></button><button onClick={() => { setFlashIndex(v => (v + 1) % 26); setRevealed(false); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-sky-600 text-white font-black">Next card <ChevronRight className="w-4 h-4" /></button></div>
            {revealed && <div className="mt-5 max-w-2xl mx-auto"><StudyNote sign={ALPHABET_SIGNS[flashIndex]} /></div>}
          </div>}

          {activeGame === 'memory' && <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-[#704f3a]">Sign Match</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">Match the image with its letter</h2><p className="mt-2 text-sm text-slate-500">6 pairs · your moves are counted · exact image-to-letter matching.</p></div><div className="flex gap-2 text-xs font-black"><span className="px-3 py-2 rounded-xl bg-[#efe5dc] text-[#704f3a]">Moves {memoryMoves}</span><span className="px-3 py-2 rounded-xl bg-sky-50 text-sky-700">{memoryCards.filter(c => c.matched).length / 2}/6 pairs</span></div></div>
            {memoryFeedback && <div className={`mt-5 rounded-2xl border p-4 text-sm font-black ${memoryFeedback.correct ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>{memoryFeedback.text}<div className="mt-1 text-xs font-medium">One move = one pair attempt. Match the exact letter to the exact ISL reference image.</div></div>}
            <div className="mt-7 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">{memoryCards.map(card => { const open = memoryOpen.includes(card.id) || card.matched; return <button key={card.id} onClick={() => flipMemory(card.id)} aria-label={open ? `${card.type === 'sign' ? 'Sign' : 'Letter'} ${card.value}` : 'Hidden memory card'} className={`aspect-square rounded-2xl border-2 p-2 transition-all ${open ? 'border-sky-400 bg-sky-50' : 'border-[#704f3a]/20 bg-[#704f3a] hover:-translate-y-1'}`}>{open ? card.type === 'sign' ? <div className="h-full flex flex-col items-center justify-center"><img src={assetUrl(card.sign.image)} alt={`ISL sign ${card.sign.label}`} className="w-full h-[72%] object-contain rounded-xl bg-white" /><span className="mt-1 text-xs font-black text-sky-700">{card.sign.label}</span></div> : <div className="h-full flex flex-col items-center justify-center text-[#704f3a]"><span className="text-4xl font-black">{card.value}</span><span className="text-[9px] font-black uppercase tracking-widest mt-1">ISL letter</span></div> : <div className="h-full flex flex-col items-center justify-center text-amber-100"><Gamepad2 className="w-8 h-8" /><span className="mt-2 text-[9px] font-black uppercase tracking-widest">Tap to reveal</span></div>}</button>; })}</div>
            {memoryCards.length === 0 && <div className="mt-7 text-center"><button onClick={startMemory} className="px-6 py-3 rounded-xl bg-[#704f3a] text-white font-black">Start Sign Match</button></div>}
            {memoryCards.length > 0 && memoryCards.every(c => c.matched) && <div className="mt-7 rounded-3xl bg-emerald-50 border border-emerald-200 p-6 text-center"><Trophy className="w-10 h-10 mx-auto text-amber-500" /><h3 className="mt-2 text-xl font-black">All 6 pairs matched!</h3><p className="mt-1 text-sm text-slate-500">Completed in {memoryMoves} moves.</p><button onClick={startMemory} className="mt-4 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-black">Play again</button></div>}
          </div>}
          {activeGame === 'imagehunt' && <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-sky-700">Image Hunt</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">Find the correct ISL image</h2><p className="mt-2 text-sm text-slate-500">A target letter is shown. Choose the one real supplied alphabet image that represents it.</p></div><span className="text-xs font-black text-slate-500">{huntAnswered} rounds · {huntScore} pts</span></div>
            {!huntRound ? <div className="mt-8 rounded-3xl bg-sky-50 border border-sky-100 p-8 text-center"><Target className="w-12 h-12 mx-auto text-sky-600" /><h3 className="mt-4 text-2xl font-black">Ready to hunt?</h3><p className="mt-2 text-sm text-slate-600">Use the hand image, not the letter printed on the card, to make your choice.</p><button onClick={startHunt} className="mt-6 px-7 py-3 rounded-xl bg-sky-600 text-white font-black">Start Image Hunt</button></div> : <div className="mt-8"><div className="mx-auto max-w-sm rounded-3xl bg-amber-50 border border-amber-200 p-6 text-center"><div className="text-[10px] uppercase tracking-widest font-black text-amber-700">Target letter</div><div className="mt-2 text-6xl font-black text-[#704f3a]">{huntRound.target.label}</div></div><div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">{huntRound.options.map(option => { const isCorrect = huntFeedback?.answer === option.label; const isPicked = huntFeedback?.selected === option.label; const cls = huntFeedback ? isCorrect ? 'border-emerald-500 bg-emerald-50' : isPicked ? 'border-rose-400 bg-rose-50' : 'border-slate-200 opacity-50' : 'border-slate-200 hover:border-sky-400 hover:bg-sky-50'; return <button key={option.id} disabled={!!huntFeedback} onClick={() => answerHunt(option)} className={`rounded-3xl border-2 p-3 text-left ${cls}`}><Asset sign={option} /><div className="mt-2 text-center font-black">Option {option.label}</div></button>; })}</div>{huntFeedback && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black">{huntFeedback.correct ? 'Correct!' : 'Not quite.'} Correct answer: {huntFeedback.answer}. <span className="font-medium text-slate-600">Use the exact hand arrangement in the supplied image.</span><div><button onClick={nextHunt} className="mt-3 px-5 py-2.5 rounded-xl bg-sky-600 text-white">Next round</button></div></div>}</div>}
          </div>}

          {activeGame === 'sequence' && <div className="p-5 sm:p-8 lg:p-10">
            <div><div className="text-[10px] font-black uppercase tracking-widest text-[#704f3a]">Sign Sequence</div><h2 className="mt-1 text-2xl sm:text-3xl font-black">What sign comes next?</h2><p className="mt-2 text-sm text-slate-500">Read the A–Z sequence and choose the next letter's actual sign image.</p></div>
            {!sequenceRound ? <div className="mt-8 rounded-3xl bg-[#f6eee8] border border-[#eaded4] p-8 text-center"><Sparkles className="w-12 h-12 mx-auto text-amber-600" /><h3 className="mt-4 text-2xl font-black text-[#5d4332]">Complete the pattern</h3><button onClick={startSequence} className="mt-6 px-7 py-3 rounded-xl bg-[#704f3a] text-white font-black">Start Sign Sequence</button></div> : <div className="mt-8"><div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">{sequenceRound.shown.map(sign => <div key={sign.id} className="rounded-2xl border border-slate-200 bg-white p-2 text-center"><Asset sign={sign} /><div className="mt-1 font-black">{sign.label}</div></div>)}<div className="rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-4 flex items-center justify-center text-4xl font-black text-amber-700">?</div></div><div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">{sequenceRound.options.map(option => <button key={option.id} disabled={!!sequenceFeedback} onClick={() => answerSequence(option)} className={`rounded-2xl border-2 p-3 ${sequenceFeedback ? sequenceFeedback.answer === option.label ? 'border-emerald-500 bg-emerald-50' : sequenceFeedback.selected === option.label ? 'border-rose-400 bg-rose-50' : 'border-slate-200 opacity-50' : 'border-slate-200 hover:border-amber-400 hover:bg-amber-50'}`}><Asset sign={option} /><span className="mt-2 block font-black">{option.label}</span></button>)}</div>{sequenceFeedback && <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black">{sequenceFeedback.correct ? 'Correct sequence!' : 'Not quite.'} Correct answer: {sequenceFeedback.answer}.<div><button onClick={nextSequence} className="mt-3 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950">Next pattern</button></div></div>}</div>}
          </div>}
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5 sm:p-6"><div className="flex items-center gap-2 text-sky-700 text-[10px] font-black uppercase tracking-widest"><Target className="w-4 h-4" /> Learning loop</div><h3 className="mt-2 text-xl font-black">Flashcards → Quiz → Speed</h3><p className="mt-2 text-sm text-slate-600 leading-6">Use Flashcards first, the 37-question quiz for accuracy, then Speed Round for quick recall. Sign Match adds visual memory practice.</p></div>
          <div className="rounded-3xl border border-[#eaded4] bg-[#f6eee8] p-5 sm:p-6"><div className="flex items-center gap-2 text-[#704f3a] text-[10px] font-black uppercase tracking-widest"><GraduationCap className="w-4 h-4" /> Reference</div><h3 className="mt-2 text-xl font-black">Real supplied A–Z images</h3><p className="mt-2 text-sm text-slate-600 leading-6">The game uses the supplied A–Z image set. If an image cannot load, it shows a clear unavailable state rather than a fake sign.</p><a href={REFERENCE_GAME_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#704f3a] hover:underline">Open the original reference game <ExternalLink className="w-4 h-4" /></a></div>
        </section>
      </div>
    </main>
  );
};

const ResultCard: React.FC<{ score: number; answered: number; bestStreak: number; onRestart: () => void; speed?: boolean; accuracy?: number }> = ({ score, answered, bestStreak, onRestart, speed, accuracy }) => {
  const pct = accuracy ?? Math.round((score / Math.max(1, answered * 10)) * 100);
  const message = pct >= 90 ? 'Excellent recognition.' : pct >= 70 ? 'Strong progress. Keep practising.' : 'Good start. Review the cards and try again.';
  return <div className="p-7 sm:p-10 text-center bg-gradient-to-br from-sky-50 via-white to-amber-50"><div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500 text-white flex items-center justify-center shadow-lg"><Trophy className="w-10 h-10" /></div><h3 className="mt-5 text-3xl font-black">{speed ? 'Speed round complete!' : 'Quiz complete!'}</h3><p className="mt-2 text-slate-500">{message}</p><div className="mt-7 grid grid-cols-3 max-w-lg mx-auto gap-3"><div className="p-4 rounded-2xl bg-white border border-slate-200"><div className="text-2xl font-black">{score}</div><div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Points</div></div><div className="p-4 rounded-2xl bg-white border border-slate-200"><div className="text-2xl font-black">{pct}%</div><div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Accuracy</div></div><div className="p-4 rounded-2xl bg-white border border-slate-200"><div className="text-2xl font-black">{bestStreak}</div><div className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Best streak</div></div></div><button onClick={onRestart} className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-600 text-white font-black"><RotateCcw className="w-4 h-4" /> Play again</button></div>;
};
