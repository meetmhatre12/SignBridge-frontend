import React, { useState, useCallback, useRef } from 'react';
import { Phone, ShieldAlert } from 'lucide-react';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { speechService } from '../../services/speech';

interface EmergencyContact { id:string; title:string; number:string; description:string; source:string; sourceUrl:string; }

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { id:'112', title:'Unified Emergency', number:'112', description:'India’s integrated emergency number for urgent police, fire and medical assistance.', source:'Maharashtra SDMA', sourceUrl:'https://sdma.maharashtra.gov.in/en/' },
  { id:'100', title:'Police', number:'100', description:'Police emergency assistance in Maharashtra. 112 is also the unified emergency number.', source:'Government of Maharashtra', sourceUrl:'https://depwd.maharashtra.gov.in/en/contact-us/' },
  { id:'108', title:'Ambulance / Emergency Medical Service', number:'108', description:'24×7 Maharashtra Emergency Medical Services (MEMS) for pre-hospital emergency care.', source:'Maharashtra Public Health Department', sourceUrl:'https://phd.maharashtra.gov.in/en/scheme/maharashtra-emergency-medical-services-mems/' },
  { id:'101', title:'Fire Service', number:'101', description:'Fire emergency service contact published by Maharashtra government departments.', source:'Government of Maharashtra', sourceUrl:'https://depwd.maharashtra.gov.in/en/contact-us/' },
  { id:'1033', title:'National Highway Assistance', number:'1033', description:'NHAI helpline for emergency and non-emergency assistance on National Highways.', source:'NHAI', sourceUrl:'https://nhai.gov.in/' },
  { id:'104', title:'Health Advice (Non-emergency)', number:'104', description:'Health advice, blood availability and grievance support. For ambulance emergencies call 108 or 112.', source:'Maharashtra Public Health Department', sourceUrl:'https://phd.maharashtra.gov.in/en/helpline/' },
  { id:'1070', title:'Disaster Response & Relief', number:'1070', description:'Maharashtra district emergency operations and disaster response support.', source:'Maharashtra State Disaster Management Authority', sourceUrl:'https://sdma.maharashtra.gov.in/en/faqs/' },
  { id:'1091', title:'Women Crisis Response', number:'1091', description:'Women crisis response centre helpline listed by Maharashtra government departments.', source:'Government of Maharashtra', sourceUrl:'https://depwd.maharashtra.gov.in/en/contact-us/' },
  { id:'1930', title:'Cybercrime Reporting (Non-emergency)', number:'1930', description:'National cybercrime reporting helpline. For immediate physical danger, call 112.', source:'Government of India', sourceUrl:'https://cybercrime.gov.in/' },
];

interface EmergencyPhrase {
  id: string;
  sign: string;
  spokenText: string;
  label: string;
  icon: string;
  color: string;
}

const EMERGENCY_VOCABULARY: EmergencyPhrase[] = [
  { id: 'help', sign: 'HELP', spokenText: 'Please help me, this is urgent!', label: 'I Need Help', icon: '🆘', color: 'from-rose-600 to-red-700' },
  { id: 'hospital', sign: 'HOSPITAL', spokenText: 'Please take me to the nearest hospital.', label: 'Hospital Needed', icon: '🏥', color: 'from-red-600 to-rose-700' },
  { id: 'police', sign: 'POLICE', spokenText: 'Please call the police immediately!', label: 'Call Police', icon: '👮', color: 'from-blue-600 to-indigo-700' },
  { id: 'doctor', sign: 'DOCTOR', spokenText: 'I need a doctor or medical attention.', label: 'Need Doctor', icon: '🩺', color: 'from-emerald-600 to-teal-700' },
  { id: 'water', sign: 'WATER', spokenText: 'I urgently need drinking water.', label: 'Need Water', icon: '💧', color: 'from-cyan-600 to-blue-700' },
  { id: 'stop', sign: 'STOP', spokenText: 'Please stop what you are doing.', label: 'Stop Action', icon: '🛑', color: 'from-amber-600 to-orange-700' },
  { id: 'yes', sign: 'YES', spokenText: 'Yes, that is correct.', label: 'Confirm (Yes)', icon: '✅', color: 'from-emerald-600 to-green-700' },
  { id: 'no', sign: 'NO', spokenText: 'No, that is not correct.', label: 'Decline (No)', icon: '❌', color: 'from-slate-700 to-slate-800' }
];

export const EmergencyMode: React.FC = () => {
  const [classifier] = useState(() => new ISLSignClassifier());
  const [detectedSign, setDetectedSign] = useState<SignRecognitionResult | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<EmergencyPhrase | null>(null);
  const [lastSpokenPhrase, setLastSpokenPhrase] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [confirmedMessage, setConfirmedMessage] = useState<string | null>(null);
  const lastDetectedRef = useRef<string | null>(null);
  const emergencySequenceRef = useRef<string[]>([]);

  // Camera frame evaluation
  const handleHandsDetected = useCallback((hands: DetectedHand[]) => {
    if (!hands || hands.length === 0) {
      setDetectedSign(null);
      return;
    }

    const result = classifier.recognizeFrame(hands);
    setDetectedSign(result);

    // Stricter emergency validation: requires 90% confidence AND in emergency vocabulary
    if (result.isAccepted && result.sign) {
      if (lastDetectedRef.current !== result.sign) {
        lastDetectedRef.current = result.sign;
        emergencySequenceRef.current = [...emergencySequenceRef.current.filter(s => s !== result.sign), result.sign].slice(-4);
      }

      const seq = emergencySequenceRef.current;
      const key = seq.join('_');
      let contextual: EmergencyPhrase | undefined;
      if (key.includes('NEED_HELP')) contextual = { id:'need-help', sign:'NEED + HELP', spokenText:'I need help. Please assist me.', label:'I Need Help', icon:'🆘', color:'from-rose-600 to-red-700' };
      else if (key.includes('NEED_POLICE')) contextual = { id:'need-police', sign:'NEED + POLICE', spokenText:'I need the police. Please assist me.', label:'I Need Police Assistance', icon:'👮', color:'from-blue-600 to-indigo-700' };
      else if (key.includes('NEED_DOCTOR')) contextual = { id:'need-doctor', sign:'NEED + DOCTOR', spokenText:'I need a doctor. Please assist me.', label:'I Need a Doctor', icon:'🩺', color:'from-emerald-600 to-teal-700' };
      else if (key.includes('NEED_HOSPITAL')) contextual = { id:'need-hospital', sign:'NEED + HOSPITAL', spokenText:'I need to go to a hospital. Please assist me.', label:'I Need a Hospital', icon:'🏥', color:'from-red-600 to-rose-700' };
      else contextual = EMERGENCY_VOCABULARY.find(p => p.sign === result.sign);

      if (contextual && lastDetectedRef.current === result.sign) {
        setPendingConfirmation(contextual);
      }
    }
  }, [classifier]);

  // Explicit user confirmation before vocalization
  const handleConfirmAndSpeak = (phrase: EmergencyPhrase) => {
    setIsSpeaking(true);
    setLastSpokenPhrase(phrase.spokenText);
    setPendingConfirmation(null);
    setConfirmedMessage(phrase.spokenText);

    speechService.speak(phrase.spokenText, {
      rate: 1.0,
      pitch: 1.05,
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false)
    });
  };

  const handleDismissPending = () => {
    setPendingConfirmation(null);
    lastDetectedRef.current = null;
    emergencySequenceRef.current = [];
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 1. Header & Strict Safety Notice */}
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 rounded-3xl p-6 shadow-sm dark:shadow-2xl backdrop-blur-md transition-colors">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-600/30 border border-rose-300 dark:border-rose-500 flex items-center justify-center text-2xl shadow-sm">
                🚨
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Emergency Communication</span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40">
                    Confirmation Required
                  </span>
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Rapid assistive communication for urgent situations. Requires explicit confirmation before vocalizing.
                </p>
              </div>
            </div>

            <div className="text-xs text-rose-800 dark:text-rose-300/90 bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800/60 rounded-2xl p-3.5 max-w-sm">
              ⚠️ <strong>Disclaimer:</strong> For life-threatening emergencies, always dial emergency services (<strong>112</strong>) directly.
            </div>
          </div>
        </div>

        {/* 2. Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Large Camera Workspace (7 Columns) */}
          <div className="lg:col-span-7 space-y-4">
            <CameraPreview
              onHandsDetected={handleHandsDetected}
              activeStatusText={
                detectedSign?.isAccepted
                  ? `Detected: ${detectedSign.name} (${(detectedSign.confidence * 100).toFixed(0)}%)`
                  : detectedSign?.status === 'LOW_CONFIDENCE'
                  ? 'Sign Detected (Hold steady)'
                  : 'Emergency Camera Ready'
              }
              recognitionState={
                detectedSign?.isAccepted ? 'RECOGNIZED' : detectedSign?.status === 'LOW_CONFIDENCE' ? 'LOW_CONFIDENCE' : 'IDLE'
              }
            />

            {/* Gesture Detection Confirmation Card */}
            {pendingConfirmation && (
              <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white rounded-3xl p-5 shadow-xl animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl">{pendingConfirmation.icon}</span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-rose-100">
                        Camera Detected Gesture:
                      </div>
                      <div className="text-xl font-bold text-white">
                        "{pendingConfirmation.label}"
                      </div>
                      <div className="text-xs text-rose-100 mt-0.5">
                        Will speak: <em>"{pendingConfirmation.spokenText}"</em>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    <button
                      onClick={() => handleConfirmAndSpeak(pendingConfirmation)}
                      className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-white hover:bg-slate-100 text-rose-950 font-bold text-sm shadow-xl flex items-center justify-center space-x-2 transition-all transform active:scale-95"
                    >
                      <span>🔊</span>
                      <span>Confirm & Speak</span>
                    </button>
                    <button
                      onClick={handleDismissPending}
                      className="px-4 py-3 rounded-xl bg-rose-900/60 hover:bg-rose-900 text-rose-100 border border-rose-400 font-semibold text-sm transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quick High-Reliability Emergency Palette (5 Columns) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl transition-colors">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center justify-between">
                <span>One-Tap Assistive Phrases</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Tap to confirm & vocalize</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EMERGENCY_VOCABULARY.map((phrase) => {
                  const isPending = pendingConfirmation?.id === phrase.id;

                  return (
                    <div
                      key={phrase.id}
                      className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                        isPending
                          ? 'bg-rose-50 dark:bg-rose-900/60 border-rose-400 shadow-lg ring-2 ring-rose-400'
                          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{phrase.icon}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {phrase.sign}
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-sm mb-1">{phrase.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">"{phrase.spokenText}"</div>

                      {isPending ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmAndSpeak(phrase)}
                            className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
                          >
                            Speak Now
                          </button>
                          <button
                            onClick={handleDismissPending}
                            className="px-2 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPendingConfirmation(phrase)}
                          className="w-full py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-semibold text-xs transition"
                        >
                          Select
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>


            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center"><ShieldAlert className="w-5 h-5"/></div><div><h2 className="text-sm font-black">Emergency & Official Support Contacts</h2><p className="text-[11px] text-slate-500">Tap Call to open your device dialler. 112 is the primary all-in-one emergency number. Some listed lines are for non-emergency support.</p></div></div>
              {confirmedMessage && <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 p-3 text-xs"><div className="font-black text-rose-700 dark:text-rose-300">Confirmed message</div><div className="mt-1 text-slate-700 dark:text-slate-200">{confirmedMessage}</div></div>}
              <a href="tel:112" aria-label="Call unified emergency number 112" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-600 hover:bg-rose-700 px-5 py-4 text-white font-black shadow-lg transition-colors"><Phone className="h-5 w-5"/><span>Call Primary Emergency Number — 112</span></a><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{EMERGENCY_CONTACTS.map(c => <div key={c.id} className={`rounded-2xl border p-3 ${c.id === '112' ? 'border-rose-300 dark:border-rose-700 bg-rose-50 dark:bg-rose-950/30 ring-1 ring-rose-200 dark:ring-rose-900' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'}`}><div className="flex items-start justify-between gap-2"><div><div className="text-xs font-black">{c.title}</div><div className="text-[10px] text-slate-500 mt-1">{c.description}</div></div><a href={`tel:${c.number}`} aria-label={`Open dialler to call ${c.title} ${c.number}`} title={`Call ${c.number}`} className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black"><Phone className="w-3.5 h-3.5"/>Call</a></div><div className="mt-2 text-lg font-black text-rose-600">{c.number}</div><a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[9px] text-slate-500 uppercase tracking-wider hover:text-cyan-600 underline underline-offset-2">Official website: {c.source} ↗</a></div>)}</div>
              <a href="https://sdma.maharashtra.gov.in/emergency-contacts/" target="_blank" rel="noreferrer" className="block rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/30 p-3 text-xs font-black text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100 dark:hover:bg-cyan-950/50">Open Maharashtra district emergency directory (36 districts) →</a>
            </div>

            {/* Last Spoken Status */}
            {lastSpokenPhrase && (
              <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-md transition-colors">
                <div className="flex items-center space-x-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${isSpeaking ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    🔊
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {isSpeaking ? 'Speaking Loudly...' : 'Last Broadcasted Message'}
                    </div>
                    <div className="text-sm font-medium text-slate-900 dark:text-white">"{lastSpokenPhrase}"</div>
                  </div>
                </div>

                <button
                  onClick={() => speechService.speak(lastSpokenPhrase)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
                >
                  Replay
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
