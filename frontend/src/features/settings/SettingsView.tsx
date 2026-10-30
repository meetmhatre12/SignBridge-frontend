import React, { useState } from 'react';
import { Camera, Volume2, Check, Palette, Globe, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemeMode } from '../../context/ThemeContext';

export const SettingsView: React.FC<{ onOpenAuth?: () => void }> = () => {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();

  const [mirrorCamera, setMirrorCamera] = useState(() => localStorage.getItem('sb_mirror_camera') !== 'false');
  const [showLandmarkOverlay, setShowLandmarkOverlay] = useState(() => localStorage.getItem('sb_landmark_overlay') !== 'false');
  const [highContrastGuides, setHighContrastGuides] = useState(() => localStorage.getItem('sb_high_contrast_guides') === 'true');
  const [regionalVariant, setRegionalVariant] = useState(() => localStorage.getItem('sb_regional_variant') || 'STANDARD');
  const [spokenLanguage, setSpokenLanguage] = useState(() => user?.preferredSpokenLanguage || localStorage.getItem('sb_spoken_lang') || 'en-IN');
  const [speechRate, setSpeechRate] = useState(() => Number(localStorage.getItem('sb_speech_rate') || '1'));
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('sb_auto_speak') === 'true');
  const [savedAlert, setSavedAlert] = useState('');
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    setSavedAlert('');
    try {
      localStorage.setItem('sb_mirror_camera', String(mirrorCamera));
      localStorage.setItem('sb_landmark_overlay', String(showLandmarkOverlay));
      localStorage.setItem('sb_high_contrast_guides', String(highContrastGuides));
      localStorage.setItem('sb_regional_variant', regionalVariant);
      localStorage.setItem('sb_spoken_lang', spokenLanguage);
      localStorage.setItem('sb_speech_rate', String(speechRate));
      localStorage.setItem('sb_auto_speak', String(autoSpeak));

      if (user) {
        await updateUser({
          preferredSpokenLanguage: spokenLanguage,
          cameraSettings: {
            ...(user.cameraSettings || {}),
            mirrorCamera,
            showLandmarkOverlay,
            highContrastGuides
          }
        });
      }
      setSavedAlert('Enterprise settings and accessibility preferences saved.');
    } catch (error: any) {
      setSavedAlert(error?.message || 'Could not save settings.');
    } finally {
      setSaving(false);
      window.setTimeout(() => setSavedAlert(''), 2500);
    }
  };

  const themes: Array<{ id: ThemeMode; name: string; desc: string; previewClass: string }> = [
    { id: 'midnight', name: 'Midnight Gold', desc: 'Dark sleek slate & amber', previewClass: 'bg-slate-900 border-amber-400 text-amber-300' },
    { id: 'pearl', name: 'Pearl Gold', desc: 'Crisp light & warm gold', previewClass: 'bg-white border-amber-500 text-slate-800' },
    { id: 'ocean', name: 'Deep Ocean', desc: 'Marine navy & bright cyan', previewClass: 'bg-sky-950 border-cyan-400 text-cyan-300' },
    { id: 'forest', name: 'Emerald Forest', desc: 'Pine green & natural emerald', previewClass: 'bg-emerald-950 border-emerald-400 text-emerald-300' },
    { id: 'contrast', name: 'High Contrast', desc: 'Accessibility compliant AAA', previewClass: 'bg-black border-yellow-300 text-yellow-300' }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 text-slate-900 dark:text-slate-100">
      <header className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">
              <span>⚙️</span> Enterprise Settings
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-black">Preferences & Accessibility</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Customise appearance, regional Indian Sign Language dialects, camera perception, and speech feedback.
            </p>
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm disabled:opacity-60 transition"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </header>

      {savedAlert && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4" />
          {savedAlert}
        </div>
      )}

      {/* 1. Theme & Design System */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-black text-base">Visual Theme & Contrast System</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select from 5 calibrated themes optimized for cognitive clarity, low-light studio practice, or high-contrast accessibility.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {themes.map(t => {
            const isSelected = theme === t.id || (t.id === 'midnight' && theme === 'dark') || (t.id === 'pearl' && theme === 'light');
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-amber-400 border-amber-500 bg-amber-500/10'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{t.name}</span>
                    <span className={`w-3.5 h-3.5 rounded-full border ${t.previewClass}`} />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.desc}</p>
                </div>
                {isSelected && (
                  <span className="mt-3 text-[11px] font-black uppercase text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Regional ISL Dialect Preference */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-black text-base">Regional ISL Dialect & Variations</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Indian Sign Language features regional variations across zones. Choose your primary dialect for customized dictionary hints and curriculum.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: 'STANDARD', label: 'Standard ISLRTC (National)', sub: 'Unified national academic curriculum' },
            { id: 'NORTHERN', label: 'Northern Zone (Delhi / Punjab)', sub: 'Includes Northern idiomatic gestures' },
            { id: 'SOUTHERN', label: 'Southern Zone (Tamil / Kannada)', sub: 'Accounts for Southern regional handshapes' },
            { id: 'WESTERN', label: 'Western Zone (Maharashtra / Gujarat)', sub: 'Western metropolitan sign variants' },
            { id: 'EASTERN', label: 'Eastern Zone (Bengal / Assam)', sub: 'Eastern regional sign representations' }
          ].map(r => (
            <label
              key={r.id}
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                regionalVariant === r.id
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-100 font-bold'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
              }`}
            >
              <input
                type="radio"
                name="regionalVariant"
                value={r.id}
                checked={regionalVariant === r.id}
                onChange={() => setRegionalVariant(r.id)}
                className="mt-1 w-4 h-4 accent-cyan-600"
              />
              <div>
                <div className="text-sm">{r.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-normal">{r.sub}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* 3. Camera & Computer Vision Studio */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-black text-base">Camera Perception & Accessibility</h2>
        </div>
        <PreferenceRow
          title="Mirror camera preview"
          description="Reflect camera horizontally so signing matches your physical orientation."
          control={<input type="checkbox" checked={mirrorCamera} onChange={e => setMirrorCamera(e.target.checked)} className="w-5 h-5 accent-cyan-600" />}
        />
        <PreferenceRow
          title="Show 3D hand landmark skeleton"
          description="Render real-time 21-joint spatial overlay on your detected hands during practice."
          control={<input type="checkbox" checked={showLandmarkOverlay} onChange={e => setShowLandmarkOverlay(e.target.checked)} className="w-5 h-5 accent-cyan-600" />}
        />
        <PreferenceRow
          title="High-contrast posture guides"
          description="Enhance on-screen bounding boxes with high-luminance guides for low-vision users."
          control={<input type="checkbox" checked={highContrastGuides} onChange={e => setHighContrastGuides(e.target.checked)} className="w-5 h-5 accent-cyan-600" />}
        />
      </section>

      {/* 4. Speech Synthesis */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-black text-base">Text-to-Speech Output</h2>
        </div>
        <label className="block">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Spoken language voice</span>
          <select
            value={spokenLanguage}
            onChange={e => setSpokenLanguage(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm"
          >
            <option value="en-IN">English (India) — en-IN</option>
            <option value="hi-IN">Hindi (India) — hi-IN</option>
            <option value="en-US">English (US) — en-US</option>
            <option value="en-GB">English (UK) — en-GB</option>
          </select>
        </label>
        <label className="block">
          <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Speech rate</span>
            <span>{speechRate.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.3"
            step="0.1"
            value={speechRate}
            onChange={e => setSpeechRate(Number(e.target.value))}
            className="mt-3 w-full accent-cyan-600"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Slower</span>
            <span>Normal</span>
            <span>Faster</span>
          </div>
        </label>
        <PreferenceRow
          title="Auto-speak completed translations"
          description="Speak the normalized English sentence through device speakers when a sign sequence concludes."
          control={<input type="checkbox" checked={autoSpeak} onChange={e => setAutoSpeak(e.target.checked)} className="w-5 h-5 accent-cyan-600" />}
        />
      </section>
    </div>
  );
};

const PreferenceRow: React.FC<{ title: string; description: string; control: React.ReactNode }> = ({ title, description, control }) => (
  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
    <div>
      <div className="text-sm font-bold">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{description}</div>
    </div>
    {control}
  </div>
);
