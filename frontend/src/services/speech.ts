/**
 * SignBridge Speech Service
 * Text-to-Speech (TTS) for ISL-to-Voice and Speech Recognition (STT) for Voice-to-Text
 */

export class SpeechService {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  /**
   * Speaks natural English text
   */
  public static speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      lang?: string;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): boolean {
    if (!this.synth || !text.trim()) return false;

    // Stop existing speech
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;
      utterance.lang = options?.lang || 'en-IN'; // Indian English default

      // Pick an English voice if available
      const voices = this.synth.getVoices();
      const engVoice = voices.find(v => v.lang.startsWith('en-IN') || v.lang.startsWith('en-GB') || v.lang.startsWith('en-US'));
      if (engVoice) {
        utterance.voice = engVoice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (err) => {
        this.currentUtterance = null;
        options?.onError?.(err);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
      return true;
    } catch (err) {
      console.error('TTS execution error:', err);
      return false;
    }
  }

  public static pause(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public static resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return Boolean(this.synth?.speaking);
  }

  /**
   * Initializes Speech-to-Text Recognition for reverse conversation path
   */
  public static createSpeechRecognizer(callbacks: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: string) => void;
    onEnd: () => void;
  }): { start: () => void; stop: () => void; isSupported: boolean } {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return {
        start: () => callbacks.onError('Speech Recognition is not supported in this browser.'),
        stop: () => {},
        isSupported: false
      };
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.lang = 'en-IN';

    recognizer.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        callbacks.onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        callbacks.onResult(interimTranscript.trim(), false);
      }
    };

    recognizer.onerror = (event: any) => {
      callbacks.onError(event.error || 'Speech recognition error.');
    };

    recognizer.onend = () => {
      callbacks.onEnd();
    };

    return {
      start: () => {
        try {
          recognizer.start();
        } catch (e) {
          console.warn('Speech recognition start error:', e);
        }
      },
      stop: () => {
        try {
          recognizer.stop();
        } catch (e) {
          console.warn('Speech recognition stop error:', e);
        }
      },
      isSupported: true
    };
  }
}

export const speechService = SpeechService;
