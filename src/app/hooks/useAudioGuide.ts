import { useEffect, useRef, useState } from 'react';

type AudioGuideOptions = {
  speechEnabled?: boolean;
  soundEnabled?: boolean;
  volume?: number;
  rate?: number;
  pitch?: number;
  preferredVoiceName?: string;
};

export function useAudioGuide(options: AudioGuideOptions = {}) {
  const {
    speechEnabled = true,
    soundEnabled = true,
    volume = 1,
    rate = 1,
    pitch = 1,
    preferredVoiceName = '',
  } = options;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const lastSpokenRef = useRef<string | null>(null);

  const tickAudioRef = useRef<HTMLAudioElement | null>(null);
  const shutterAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    tickAudioRef.current = new Audio('/tick.mp3');
    shutterAudioRef.current = new Audio('/shutter.mp3');

    if (tickAudioRef.current) {
      tickAudioRef.current.preload = 'auto';
      tickAudioRef.current.volume = volume;
    }

    if (shutterAudioRef.current) {
      shutterAudioRef.current.preload = 'auto';
      shutterAudioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const getSelectedVoice = () => {
    if (!voices.length) return null;

    if (preferredVoiceName) {
      const preferred = voices.find((v) => v.name.includes(preferredVoiceName));
      if (preferred) return preferred;
    }

    const englishVoice =
      voices.find((v) => v.lang.startsWith('en') && /Samantha|Google|Microsoft/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0];

    return englishVoice ?? null;
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakHint = (text: string | null) => {
    if (!speechEnabled || !text || !('speechSynthesis' in window)) return;
    if (lastSpokenRef.current === text) return;

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = text;
  };

  const resetLastSpoken = () => {
    lastSpokenRef.current = null;
  };

  const playTick = async () => {
    if (!soundEnabled || !tickAudioRef.current) return;
    try {
      tickAudioRef.current.currentTime = 0;
      await tickAudioRef.current.play();
    } catch {}
  };

  const playShutter = async () => {
    if (!soundEnabled || !shutterAudioRef.current) return;
    try {
      shutterAudioRef.current.currentTime = 0;
      await shutterAudioRef.current.play();
    } catch {}
  };

  return {
    voices,
    speakHint,
    stopSpeech,
    resetLastSpoken,
    playTick,
    playShutter,
  };
}