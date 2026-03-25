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
    rate = 0.92,
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
      const preferred = voices.find((v) =>
        v.name.toLowerCase().includes(preferredVoiceName.toLowerCase())
      );
      if (preferred) return preferred;
    }

    const preferredOrder = [
      'samantha',
      'ava',
      'victoria',
      'allison',
      'karen',
      'moira',
      'serena',
      'susan',
    ];

    for (const wanted of preferredOrder) {
      const found = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('en') &&
          v.name.toLowerCase().includes(wanted)
      );
      if (found) return found;
    }

    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ||
      voices[0] ||
      null
    );
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  const unlockAudio = async () => {
    try {
      if (tickAudioRef.current) {
        tickAudioRef.current.muted = true;
        tickAudioRef.current.currentTime = 0;
        await tickAudioRef.current.play().catch(() => {});
        tickAudioRef.current.pause();
        tickAudioRef.current.currentTime = 0;
        tickAudioRef.current.muted = false;
      }

      if (shutterAudioRef.current) {
        shutterAudioRef.current.muted = true;
        shutterAudioRef.current.currentTime = 0;
        await shutterAudioRef.current.play().catch(() => {});
        shutterAudioRef.current.pause();
        shutterAudioRef.current.currentTime = 0;
        shutterAudioRef.current.muted = false;
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.cancel();
      }
    } catch {}
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
    unlockAudio,
  };
}