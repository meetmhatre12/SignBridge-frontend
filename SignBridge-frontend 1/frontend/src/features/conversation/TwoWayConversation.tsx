import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CameraPreview } from '../../components/camera/CameraPreview';
import { DetectedHand, LightingCondition } from '../../services/landmarkDetector';
import { ISLSignClassifier, SignRecognitionResult } from '../../../../ml/sign_classifier';
import { RecognitionStateMachine } from '../../../../ml/recognition_state_machine';
import { SentenceBuilderService } from '../../../../ml/sentence_builder';
import { SpeechService, speechService } from '../../services/speech';
import { api } from '../../services/api';
import { SavedPhrase } from '../../types';

interface ChatMessage {
  id: string;
  sender: 'ISL_USER' | 'SPOKEN_OTHER';
  text: string;
  signs?: string[];
  timestamp: string;
}

export const TwoWayConversation: React.FC = () => {
  const [classifier] = useState(() => new ISLSignClassifier());
  const [stateMachine] = useState(() => new RecognitionStateMachine({
    minConfidence: 0.88,
    stableFramesRequired: 5,
    duplicateCooldownMs: 1000,
    sentencePauseMs: 3000
  }));

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ISL Camera Path State
  const [currentRecognition, setCurrentRecognition] = useState<SignRecognitionResult | null>(null);
  const [activeSignSequence, setActiveSignSequence] = useState<string[]>([]);
  const [activeSentence, setActiveSentence] = useState<string>('');

  // Hearing Companion Speech Path State
  const [sttState, setSttState] = useState<'READY' | 'LISTENING' | 'PROCESSING' | 'TRANSCRIBED' | 'ERROR'>('READY');
  const [interimSpeechText, setInterimSpeechText] = useState<string>('');
  const recognizerRef = useRef<any>(null);

  // Saved Phrases
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([]);
  const [newPhraseInput, setNewPhraseInput] = useState<string>('');
  const [showAddPhrase, setShowAddPhrase] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load Saved Phrases
  useEffect(() => {
    api.getSavedPhrases()
      .then(res => {
        if (res.success && res.data) setSavedPhrases(res.data);
      })
      .catch(() => {
        const now = new Date().toISOString();
        setSavedPhrases([
          { id: 'p1', userId: 'local', category: 'General', phrase: 'Hello, I am using SignBridge to communicate.', createdAt: now },
          { id: 'p2', userId: 'local', category: 'General', phrase: 'Please wait a moment while I sign.', createdAt: now },
          { id: 'p3', userId: 'local', category: 'Need', phrase: 'I need some drinking water, please.', createdAt: now },
          { id: 'p4', userId: 'local', category: 'Emergency', phrase: 'Please help, I need to find a doctor.', createdAt: now },
          { id: 'p5', userId: 'local', category: 'Inquiry', phrase: 'Where is the washroom or hospital?', createdAt: now }
        ]);
      });
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimSpeechText]);

  // Initialize Speech-to-Text Recognizer
  useEffect(() => {
    recognizerRef.current = SpeechService.createSpeechRecognizer({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setSttState('TRANSCRIBED');
          const newMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            sender: 'SPOKEN_OTHER',
            text: transcript,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, newMsg]);
          setInterimSpeechText('');
          setTimeout(() => setSttState('READY'), 800);
        } else {
          setSttState('PROCESSING');
          setInterimSpeechText(transcript);
        }
      },
      onError: (err) => {
        console.warn('Speech recognition error:', err);
        setSttState('ERROR');
      },
      onEnd: () => {
        setSttState('READY');
      }
    });

    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  const toggleListening = () => {
    if (sttState === 'LISTENING' || sttState === 'PROCESSING') {
      recognizerRef.current?.stop();
      setSttState('READY');
    } else {
      setSttState('LISTENING');
      recognizerRef.current?.start();
    }
  };

  // Handle ISL Camera Recognition with State Machine
  const handleHandsDetected = useCallback((hands: DetectedHand[]) => {
    if (!hands || hands.length === 0) {
      setCurrentRecognition(null);
      const res = stateMachine.processFrame(null, null);
      setActiveSignSequence(res.activeSequence);
      return;
    }

    const recResult = classifier.recognizeFrame(hands);
    setCurrentRecognition(recResult);

    const smRes = stateMachine.processFrame(hands, recResult);
    setActiveSignSequence(smRes.activeSequence);

    if (smRes.isAcceptedThisFrame && smRes.sentenceSegments.length > 0) {
      const translated = SentenceBuilderService.buildMultiSentence(smRes.sentenceSegments);
      setActiveSentence(translated.combinedText);
    }
  }, [classifier, stateMachine]);

  // Send ISL Message to Transcript & Vocalize
  const handleSendISLMessage = () => {
    if (!activeSentence.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ISL_USER',
      text: activeSentence,
      signs: [...activeSignSequence],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    speechService.speak(activeSentence);

    stateMachine.clear();
    classifier.reset();
    setActiveSignSequence([]);
    setActiveSentence('');
  };

  const handleSendSavedPhrase = (phrase: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'ISL_USER',
      text: phrase,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    speechService.speak(phrase);
  };

  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhraseInput.trim()) return;

    try {
      const res = await api.addSavedPhrase(newPhraseInput.trim());
      if (res.success && res.data) {
        setSavedPhrases(prev => [res.data!, ...prev]);
        setNewPhraseInput('');
        setShowAddPhrase(false);
      }
    } catch {
      alert('Failed to save phrase.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-2">
              <span>💬</span>
              <span>Synchronized Two-Way Interface</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Two-Way ISL ↔ Speech Conversation</h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Direction A: ISL User Signs ➔ Voice Broadcast. Direction B: Companion Speaks ➔ Live Transcript Display.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMessages([])}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
            >
              Clear Conversation
            </button>
          </div>
        </div>

        {/* 2-Column Split: ISL Camera Workspace (Left) & Live Dialogue Transcript (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: ISL Video Input (6 Columns) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase">
                  Direction A: Signer Camera
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {currentRecognition?.isAccepted ? `✓ ${currentRecognition.name}` : 'Waiting for gesture'}
                </span>
              </div>

              <CameraPreview
                onHandsDetected={handleHandsDetected}
                activeStatusText={
                  currentRecognition?.isAccepted
                    ? `Recognized: ${currentRecognition.name} (${(currentRecognition.confidence * 100).toFixed(0)}%)`
                    : currentRecognition?.status === 'LOW_CONFIDENCE'
                    ? 'Low Confidence'
                    : 'Signer Camera Ready'
                }
                recognitionState={
                  currentRecognition?.isAccepted
                    ? 'RECOGNIZED'
                    : currentRecognition?.status === 'LOW_CONFIDENCE'
                    ? 'LOW_CONFIDENCE'
                    : 'IDLE'
                }
              />

              {/* Accumulated Sign Sequence */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase">Active Sign Tokens:</div>
                <div className="flex flex-wrap gap-2 min-h-[36px] items-center">
                  {activeSignSequence.length === 0 ? (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Sign into camera to assemble sentence...</span>
                  ) : (
                    activeSignSequence.map((tok, idx) => (
                      <span key={idx} className="px-3 py-1 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-bold border border-cyan-200 dark:border-cyan-800">
                        {tok}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Predicted Sentence & Send Action */}
              {activeSentence && (
                <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-500/40 rounded-2xl flex items-center justify-between gap-3 animate-fade-in">
                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    "{activeSentence}"
                  </div>
                  <button
                    onClick={handleSendISLMessage}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md transition whitespace-nowrap"
                  >
                    Send & Speak ➔
                  </button>
                </div>
              )}
            </div>

            {/* Quick Saved Phrases Palette */}
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl space-y-3 transition-colors">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Saved Quick Phrases</span>
                <button
                  onClick={() => setShowAddPhrase(!showAddPhrase)}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
                >
                  {showAddPhrase ? 'Cancel' : '+ Add Custom'}
                </button>
              </div>

              {showAddPhrase && (
                <form onSubmit={handleAddPhrase} className="flex gap-2">
                  <input
                    type="text"
                    value={newPhraseInput}
                    onChange={e => setNewPhraseInput(e.target.value)}
                    placeholder="Enter frequently used phrase..."
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                  <button type="submit" className="px-4 py-2 bg-cyan-600 rounded-xl text-xs font-bold text-white shadow-sm">
                    Save
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-2">
                {savedPhrases.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSendSavedPhrase(p.phrase)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium border border-slate-200 dark:border-slate-700 transition text-left"
                  >
                    "{p.phrase}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Synchronized Dialogue Transcript (6 Columns) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm dark:shadow-xl h-[600px] flex flex-col justify-between transition-colors">
              {/* Transcript Header */}
              <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Live Conversation Thread</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">{messages.length} messages</span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {messages.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-xs italic">
                    Start signing or click "Tap to Speak" to begin the conversation.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'ISL_USER' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          m.sender === 'ISL_USER'
                            ? 'bg-cyan-600 text-white rounded-br-none shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold">{m.text}</div>
                        {m.signs && (
                          <div className="text-[10px] opacity-80 mt-1 font-mono">
                            ISL: {m.signs.join(' + ')}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                        {m.sender === 'ISL_USER' ? 'You (ISL)' : 'Companion'} • {m.timestamp}
                      </span>
                    </div>
                  ))
                )}

                {interimSpeechText && (
                  <div className="flex flex-col items-start">
                    <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl px-4 py-2 text-sm italic animate-pulse">
                      "{interimSpeechText}..."
                    </div>
                    <span className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1 px-1">Transcribing speech...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Hearing Companion Voice Input Trigger */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs text-slate-500 dark:text-slate-400 text-center font-medium">
                  Direction B: Companion speaks into microphone
                </div>

                <button
                  onClick={toggleListening}
                  className={`w-full py-3.5 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 ${
                    sttState === 'LISTENING' || sttState === 'PROCESSING'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{sttState === 'LISTENING' || sttState === 'PROCESSING' ? '🛑 Stop Listening' : '🎙️ Tap to Speak (Companion Voice)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
