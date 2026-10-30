import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SignItem } from '../../types';
import { api } from '../../services/api';
import { speechService } from '../../services/speech';
import { useAuth } from '../../context/AuthContext';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { SignRepository } from '../../../../ml/sign_repository';
import { ALL_DICTIONARY_VIDEOS_URL, DICTIONARY_VIDEO_BY_LETTER } from './dictionaryVideoLibrary';

type SortOption = 'A_Z' | 'DIFFICULTY' | 'LEVEL' | 'CATEGORY';

const InstructionStep: React.FC<{ number: string; title: string; text: string }> = ({ number, title, text }) => (
  <div className="flex gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
    <div className="w-7 h-7 shrink-0 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs font-black">{number}</div>
    <div><div className="text-xs font-black text-slate-900 dark:text-white">{title}</div><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{text}</p></div>
  </div>
);

export const SignDictionary: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [signs, setSigns] = useState<SignItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>(() => searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('A_Z');

  // Detail & Camera Practice Modals
  const [selectedDetailSign, setSelectedDetailSign] = useState<SignItem | null>(null);
  const [practiceSign, setPracticeSign] = useState<SignItem | null>(null);
  const [classifier] = useState(() => new ISLSignClassifier());
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [practiceScore, setPracticeScore] = useState<number>(0);
  const [practiceSuccess, setPracticeSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearchQuery(q);
  }, [searchParams]);

  // Load signs from API with Authoritative SignRepository fallback
  useEffect(() => {
    api.getSigns()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setSigns(res.data);
        } else {
          loadFromRepository();
        }
      })
      .catch(() => {
        loadFromRepository();
      })
      .finally(() => setLoading(false));

    function loadFromRepository() {
      const repoSigns: any = SignRepository.getAllSigns().map(s => ({
        ...s,
        name: s.displayName,
        categoryId: s.category,
        meaning: s.englishMeaning,
        englishTranslation: s.englishMeaning,
        isTwoHanded: s.handedness === 'TWO_HANDED',
        isEmergency: s.emergency,
        isSupportedInV1: s.isAvailableForRecognition,
        description: s.instruction.movement,
        instructions: s.instruction.movement,
        exampleSentence: s.exampleUsage
      }));
      setSigns(repoSigns);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Toggle Favorite
  const handleToggleFavorite = async (signId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      showToast('Please sign in to save favorite signs to your profile.');
      return;
    }

    const currentFavs = user.favoriteSigns || [];
    const isFav = currentFavs.includes(signId);
    const updated = isFav
      ? currentFavs.filter(id => id !== signId)
      : [...currentFavs, signId];

    try {
      await updateUser({ favoriteSigns: updated });
      showToast(isFav ? `Removed from Favorites` : `⭐ Added ${signId} to Favorites!`);
    } catch {
      showToast('Could not update favorites.');
    }
  };

  // Filter & Sort Logic
  const filteredAndSortedSigns = useMemo(() => {
    let result = signs.filter(sign => {
      const canonical = (sign.canonicalName || sign.name || sign.id).toLowerCase();
      const display = (sign.displayName || sign.name || sign.id).toLowerCase();
      const meaning = (sign.englishMeaning || sign.meaning || '').toLowerCase();
      const category = (sign.category || sign.categoryId || '').toLowerCase();
      const subcategory = (sign.subcategory || '').toLowerCase();
      const aliases = (sign.aliases || []).map(a => a.toLowerCase()).join(' ');

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        canonical.includes(q) ||
        display.includes(q) ||
        meaning.includes(q) ||
        category.includes(q) ||
        subcategory.includes(q) ||
        aliases.includes(q) ||
        sign.id.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'ALL' ||
        (sign.category && sign.category.toUpperCase() === selectedCategory.toUpperCase()) ||
        (sign.categoryId && sign.categoryId.toUpperCase() === selectedCategory.toUpperCase());

      const matchesDiff = selectedDifficulty === 'ALL' || sign.difficulty === selectedDifficulty;
      const matchesLevel = selectedLevel === 'ALL' || String(sign.learningLevel) === selectedLevel;

      return matchesSearch && matchesCat && matchesDiff && matchesLevel;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'A_Z') {
        const nameA = a.displayName || a.name || a.id;
        const nameB = b.displayName || b.name || b.id;
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'DIFFICULTY') {
        const diffWeight: Record<string, number> = { EASY: 1, MEDIUM: 2, HARD: 3 };
        return (diffWeight[a.difficulty] || 0) - (diffWeight[b.difficulty] || 0);
      }
      if (sortBy === 'LEVEL') {
        return (a.learningLevel || 1) - (b.learningLevel || 1);
      }
      if (sortBy === 'CATEGORY') {
        return (a.category || a.categoryId || '').localeCompare(b.category || b.categoryId || '');
      }
      return 0;
    });

    return result;
  }, [signs, searchQuery, selectedCategory, selectedDifficulty, selectedLevel, sortBy]);

  // Statistics
  const statistics = useMemo(() => {
    return {
      total: signs.length,
      cameraSupported: signs.filter(s => s.isAvailableForRecognition || s.isSupportedInV1).length,
      emergency: signs.filter(s => s.emergency || s.isEmergency).length,
      level1: signs.filter(s => s.learningLevel === 1).length,
      level2: signs.filter(s => s.learningLevel === 2).length,
      level3: signs.filter(s => s.learningLevel === 3).length,
      level4: signs.filter(s => s.learningLevel === 4).length,
    };
  }, [signs]);

  // Camera Practice Hook
  const handleHandsDetected = useCallback((hands: DetectedHand[]) => {
    if (!practiceSign || !hands || hands.length === 0) {
      setCurrentRecognition(null);
      return;
    }

    const result = classifier.recognizeFrame(hands);
    setCurrentRecognition(result);

    if (result.sign === practiceSign.id || result.sign === practiceSign.canonicalName) {
      const score = Math.round(result.confidence * 100);
      setPracticeScore(score);
      if (result.isAccepted) {
        setPracticeSuccess(true);
      }
    }
  }, [practiceSign, classifier]);

  const openPracticeModal = (sign: SignItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!sign.isAvailableForRecognition && !sign.isSupportedInV1) {
      showToast(`Camera model for '${sign.displayName || sign.id}' is currently in dataset development. Review verified instructions below.`);
      setSelectedDetailSign(sign);
      return;
    }
    setPracticeSign(sign);
    setPracticeScore(0);
    setPracticeSuccess(false);
    setCurrentRecognition(null);
    classifier.reset();
  };

  const speakSignMeaning = (sign: SignItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = `${sign.displayName || sign.name || sign.id}. Meaning: ${sign.englishMeaning || sign.meaning || sign.displayName}.`;
    speechService.speak(text);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-cyan-700 dark:bg-cyan-900 border border-cyan-400 text-white text-xs font-bold shadow-2xl animate-fade-in flex items-center gap-2">
            <span>ℹ️</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
              <span>🤟</span>
              <span>Authoritative Lexicon</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Indian Sign Language Dictionary</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Search a sign, open it, follow the four simple steps, and practise with the camera when that sign is supported.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center self-start md:self-auto">
            <div className="text-xs font-mono text-cyan-700 dark:text-cyan-300 px-4 py-2 rounded-2xl bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800 shadow-sm">
              <strong>{filteredAndSortedSigns.length}</strong> / {statistics.total} Signs
            </div>
            <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300 px-3.5 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              📹 <strong>{statistics.cameraSupported}</strong> Camera Ready
            </div>
          </div>
        </div>

        {/* User-provided dictionary video library */}
        <section className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-sky-50 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Video reference library</div>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-slate-900">Open the supplied ISL dictionary videos</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl">The uploaded dictionary CSV provides one shared video folder plus A–Z folders. SignBridge links to those folders directly; it does not pretend that a folder link is an individual word-level image or instruction.</p>
            </div>
            {ALL_DICTIONARY_VIDEOS_URL && <a href={ALL_DICTIONARY_VIDEOS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shrink-0">Open all dictionary videos <span>↗</span></a>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.keys(DICTIONARY_VIDEO_BY_LETTER).map(letter => <a key={letter} href={DICTIONARY_VIDEO_BY_LETTER[letter]} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg border border-amber-200 bg-white text-amber-800 text-xs font-black flex items-center justify-center hover:bg-amber-100" title={`Open ${letter} video folder`}>{letter}</a>)}
          </div>
        </section>

        {/* Level Quick Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { id: '1', label: 'Level 1: Foundations', count: statistics.level1, color: 'text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/60 bg-white dark:bg-cyan-950/30' },
            { id: '2', label: 'Level 2: Everyday', count: statistics.level2, color: 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 bg-white dark:bg-emerald-950/30' },
            { id: '3', label: 'Level 3: Conversation', count: statistics.level3, color: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 bg-white dark:bg-amber-950/30' },
            { id: '4', label: 'Level 4: Advanced', count: statistics.level4, color: 'text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/60 bg-white dark:bg-purple-950/30' }
          ].map(lvl => (
            <button
              key={lvl.id}
              onClick={() => setSelectedLevel(selectedLevel === lvl.id ? 'ALL' : lvl.id)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between shadow-sm ${
                selectedLevel === lvl.id
                  ? 'bg-cyan-50 dark:bg-slate-800 border-cyan-500 dark:border-cyan-400 ring-2 ring-cyan-500/30'
                  : `hover:bg-slate-100 dark:hover:bg-slate-900 ${lvl.color}`
              }`}
            >
              <div>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">{lvl.label}</span>
                <span className="text-lg font-black font-mono mt-0.5">{lvl.count} signs</span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">L{lvl.id}</span>
            </button>
          ))}
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search signs, meanings, categories, or keywords (e.g. water, police, greeting)..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white flex-1 md:flex-none transition"
              >
                <option value="A_Z">A to Z</option>
                <option value="LEVEL">Learning Level (1-4)</option>
                <option value="DIFFICULTY">Difficulty (Easy-Hard)</option>
                <option value="CATEGORY">Category</option>
              </select>
            </div>
          </div>

          {/* Simple filters: keep discovery easy to explain. */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white">
              <option value="ALL">All Categories</option><option value="GREETINGS">Greetings & Courtesy</option><option value="PEOPLE">People & Relationships</option><option value="NEEDS">Daily Needs & Actions</option><option value="PLACES">Places & Institutions</option><option value="QUESTIONS">Question Words</option><option value="TIME">Time & Calendar</option><option value="ACTIONS">Common Actions</option><option value="FEELINGS">Feelings & States</option><option value="EMERGENCY">Emergency & Urgent</option><option value="NUMBERS">Numbers & Counting</option>
            </select>
            <select value={selectedDifficulty} onChange={e => setSelectedDifficulty(e.target.value)} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white">
              <option value="ALL">All Difficulties</option><option value="EASY">Beginner (Easy)</option><option value="MEDIUM">Intermediate (Medium)</option><option value="HARD">Advanced (Hard)</option>
            </select>
            <span className="text-[11px] text-slate-400">Search → choose a sign → read the steps → practise when camera support is available.</span>
            {(searchQuery || selectedCategory !== 'ALL' || selectedDifficulty !== 'ALL' || selectedLevel !== 'ALL') && (
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); setSelectedDifficulty('ALL'); setSelectedLevel('ALL'); }} className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline px-2 py-1 ml-auto font-bold">Reset</button>
            )}
          </div>
        </div>

        {/* Dictionary Cards Grid */}
        {loading ? (
          <div className="text-center py-24 text-slate-400 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent animate-spin mx-auto" />
            <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">Loading ISL Authoritative Database...</div>
          </div>
        ) : filteredAndSortedSigns.length === 0 ? (
          <div className="p-16 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="text-3xl">🔍</div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No signs found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No signs match your active filters. Try clearing your search query or selecting "All Categories".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedSigns.map((sign) => {
              const displayName = sign.displayName || sign.name || sign.id;
              const englishMeaning = sign.englishMeaning || sign.meaning || displayName;
              const category = sign.category || sign.categoryId || 'General';
              const isTwoHanded = sign.handedness === 'TWO_HANDED' || sign.isTwoHanded;
              const isEmergency = sign.emergency || sign.isEmergency;
              const isCameraSupported = sign.isAvailableForRecognition || sign.isSupportedInV1;
              const isFavorite = user?.favoriteSigns?.includes(sign.id) || false;

              return (
                <div
                  key={sign.id}
                  onClick={() => setSelectedDetailSign(sign)}
                  className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 rounded-3xl p-5 shadow-sm dark:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4 group cursor-pointer hover:shadow-lg"
                >
                  <div className="space-y-3">
                    {/* Card Top Badges */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/70 px-2.5 py-1 rounded-xl border border-cyan-200 dark:border-cyan-800/80">
                        {sign.id}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleToggleFavorite(sign.id, e)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition ${
                            isFavorite ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500'
                          }`}
                          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {isFavorite ? '★' : '☆'}
                        </button>

                        {isEmergency && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            🚨 Emergency
                          </span>
                        )}

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sign.difficulty === 'EASY' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                          sign.difficulty === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                          'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                        }`}>
                          {sign.difficulty}
                        </span>
                      </div>
                    </div>

                    {/* Title & Meaning */}
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition flex items-center justify-between">
                        <span>{displayName}</span>
                        <span className="text-[11px] font-mono font-normal text-slate-500">
                          Level {sign.learningLevel || 1}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 italic">"{englishMeaning}"</p>
                    </div>

                    {/* Meta info tags */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        📂 {category}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                        ✋ {isTwoHanded ? 'Two-Handed' : 'One-Handed'}
                      </span>
                      {isCameraSupported ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          ✓ Camera ML
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-950 text-slate-500 border border-slate-200 dark:border-slate-800">
                          📖 Reference
                        </span>
                      )}
                    </div>

                    {/* Brief Performance Preview Box */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-950/90 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-1.5">
                      <div className="text-[10px] uppercase font-bold text-cyan-700 dark:text-cyan-400 tracking-wider flex items-center justify-between">
                        <span>How to Perform:</span>
                        {sign.hasVerifiedInstruction && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[9px] font-semibold">✓ Verified ISL</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {sign.instruction?.movement || sign.instructions || sign.description || 'Instructional reference coming soon.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={(e) => speakSignMeaning(sign, e)}
                      className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1 shadow-sm"
                      title="Hear meaning spoken"
                    >
                      <span>🔊</span>
                      <span>Audio</span>
                    </button>

                    <button
                      onClick={(e) => openPracticeModal(sign, e)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm ${
                        isCameraSupported
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/20'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{isCameraSupported ? '📹' : '📖'}</span>
                      <span>{isCameraSupported ? 'Practice' : 'Learn Sign'}</span>
                    </button>
                  </div>
                  {(() => { const letter = (displayName || '').trim().charAt(0).toUpperCase(); const videoUrl = DICTIONARY_VIDEO_BY_LETTER[letter]; return videoUrl ? <a href={videoUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="mt-2 w-full py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-black border border-amber-200 flex items-center justify-center gap-2">🎥 Open {letter} video folder</a> : null; })()}
                </div>
              );
            })}
          </div>
        )}

        {/* 1. SIGN DETAIL MODAL */}
        {selectedDetailSign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto transition-colors">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-200 dark:border-cyan-800">
                      {selectedDetailSign.id}
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Level {selectedDetailSign.learningLevel || 1} • {selectedDetailSign.category}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {selectedDetailSign.displayName || selectedDetailSign.name}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Meaning: <strong>"{selectedDetailSign.englishMeaning || selectedDetailSign.meaning}"</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFavorite(selectedDetailSign.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      user?.favoriteSigns?.includes(selectedDetailSign.id)
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {user?.favoriteSigns?.includes(selectedDetailSign.id) ? '★ Favorited' : '☆ Add to Favorites'}
                  </button>
                  <button
                    onClick={() => setSelectedDetailSign(null)}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Plain-language learning guide */}
              <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 space-y-2">
                <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900 p-4 text-sm text-cyan-900 dark:text-cyan-100">
                  <strong>Easy method:</strong> First look at the hand shape. Then copy the starting position. Follow the movement. Finish in the shown ending position. Do not rush the movement.
                </div>
                <div className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-300">How to learn this sign</div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-6">Start with the hand shape, put your hand in the starting position, follow the movement, then finish in the ending position. Do not rush the movement.</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-bold">
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-2.5"><span className="text-cyan-600">1.</span> Hand shape</div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-2.5"><span className="text-cyan-600">2.</span> Start position</div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-2.5"><span className="text-cyan-600">3.</span> Movement</div>
                  <div className="rounded-xl bg-white/80 dark:bg-slate-900 p-2.5"><span className="text-cyan-600">4.</span> Finish & repeat</div>
                </div>
              </div>

              {/* Instructional Details Section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                    Structured How to Perform:
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedDetailSign.hasVerifiedInstruction ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {selectedDetailSign.hasVerifiedInstruction ? '✓ Verified ISL Standards' : 'Reference Pending'}
                  </span>
                </div>

                {selectedDetailSign.hasVerifiedInstruction && selectedDetailSign.instruction ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400">Step-by-step instructions</span>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">✓ Verified reference</span>
                    </div>
                    <InstructionStep number="1" title="Make the hand shape" text={selectedDetailSign.instruction.handConfiguration} />
                    <InstructionStep number="2" title="Start here" text={`${selectedDetailSign.instruction.startingPosition} ${selectedDetailSign.instruction.palmOrientation}`} />
                    <InstructionStep number="3" title="Move your hand" text={selectedDetailSign.instruction.movement} />
                    <InstructionStep number="4" title="Finish here" text={selectedDetailSign.instruction.endingPosition} />
                  </div>
                ) : (
                  <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                    <p className="font-bold text-slate-800 dark:text-slate-200">A verified movement guide is not available for this entry yet.</p>
                    <p className="text-xs leading-5">SignBridge does not invent hand movements. Use the available meaning and reference information until verified instructional media is added.</p>
                  </div>
                )}

                {/* Common Mistakes, Tips, Examples */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  {selectedDetailSign.practiceTips && (
                    <div>
                      <strong className="text-amber-600 dark:text-amber-300">💡 Practice Tip: </strong>
                      <span className="text-slate-700 dark:text-slate-300">{selectedDetailSign.practiceTips}</span>
                    </div>
                  )}
                  {selectedDetailSign.commonMistakes && (
                    <div>
                      <strong className="text-rose-600 dark:text-rose-300">⚠️ Common Mistake: </strong>
                      <span className="text-slate-700 dark:text-slate-300">{selectedDetailSign.commonMistakes}</span>
                    </div>
                  )}
                  {selectedDetailSign.exampleUsage && (
                    <div>
                      <strong className="text-cyan-700 dark:text-cyan-300">📝 Example Usage: </strong>
                      <span className="text-slate-700 dark:text-slate-300 italic">"{selectedDetailSign.exampleUsage}"</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2 justify-end">
                <button
                  onClick={() => speakSignMeaning(selectedDetailSign)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
                >
                  <span>🔊</span>
                  <span>Hear Pronunciation</span>
                </button>

                {(selectedDetailSign.isAvailableForRecognition || selectedDetailSign.isSupportedInV1) ? (
                  <button
                    onClick={() => {
                      const s = selectedDetailSign;
                      setSelectedDetailSign(null);
                      openPracticeModal(s);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-xs font-bold shadow-md shadow-cyan-600/30 flex items-center gap-1.5 transition"
                  >
                    <span>📹</span>
                    <span>Practice with Camera</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>📖 Educational Reference</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. CAMERA PRACTICE MODAL */}
        {practiceSign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl space-y-4 transition-colors">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase">Camera Gesture Practice Studio</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">{practiceSign.displayName || practiceSign.name} ({practiceSign.id})</h3>
                </div>
                <button
                  onClick={() => setPracticeSign(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <CameraPreview
                    onHandsDetected={handleHandsDetected}
                    activeStatusText={
                      currentRecognition?.isAccepted
                        ? `Recognized: ${currentRecognition.name} (${(currentRecognition.confidence * 100).toFixed(0)}%)`
                        : 'Practice Camera Ready'
                    }
                    recognitionState={currentRecognition?.isAccepted ? 'RECOGNIZED' : 'IDLE'}
                  />
                </div>

                <div className="md:col-span-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-slate-500 dark:text-slate-400 block uppercase text-[10px]">Instructions:</span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {practiceSign.instruction?.movement || practiceSign.instructions || practiceSign.description}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center">
                      <div className="text-[10px] text-slate-500 uppercase font-bold">Accuracy Score</div>
                      <div className={`text-3xl font-mono font-bold mt-1 ${practiceSuccess ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                        {practiceScore}%
                      </div>
                    </div>
                  </div>

                  {practiceSuccess && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-500/50 rounded-2xl text-center text-xs text-emerald-700 dark:text-emerald-300 font-bold animate-fade-in">
                      ✓ Excellent! Sign Verified (≥90%)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
