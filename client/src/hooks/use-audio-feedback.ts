import { useCallback, useRef } from 'react';

interface AudioFeedbackOptions {
  enabled?: boolean;
  volume?: number;
}

export function useAudioFeedback(options: AudioFeedbackOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const audioContextRef = useRef<AudioContext | null>(null);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!enabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const context = audioContextRef.current;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.value = volume;

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.warn('Audio feedback error:', error);
    }
  }, [enabled, volume]);

  const playSuccess = useCallback(() => {
    // Two tone success sound
    playTone(800, 0.1);
    setTimeout(() => playTone(1000, 0.15), 100);
  }, [playTone]);

  const playError = useCallback(() => {
    // Low frequency error sound
    playTone(200, 0.3, 'square');
  }, [playTone]);

  const playDetected = useCallback(() => {
    // Quick beep for face detection
    playTone(600, 0.05);
  }, [playTone]);

  const playWarning = useCallback(() => {
    // Medium tone warning
    playTone(500, 0.2);
  }, [playTone]);

  const speak = useCallback((text: string, lang: string = 'id-ID') => {
    if (!enabled || !('speechSynthesis' in window)) return;

    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.volume = volume;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.warn('Speech synthesis error:', error);
    }
  }, [enabled, volume]);

  return {
    playSuccess,
    playError,
    playDetected,
    playWarning,
    speak,
  };
}
