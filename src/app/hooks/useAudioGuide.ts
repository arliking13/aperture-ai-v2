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
    rate = 0.88,
    pitch = 1.05,
    preferredVoiceName = '',
  } = options;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const lastSpokenRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const tickBufferRef = useRef<AudioBuffer | null>(null);
  const shutterBufferRef = useRef<AudioBuffer | null>(null);
  const audioUnlockedRef = useRef(false);

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

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      audioContextRef.current = new Ctx();
    }
    return audioContextRef.current;
  };

  const loadSoundBuffer = async (url: string): Promise<AudioBuffer | null> => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return null;

      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const prepareBuffers = async () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const [tickBuffer, shutterBuffer] = await Promise.all([
        loadSoundBuffer('/tick.mp3'),
        loadSoundBuffer('/shutter.mp3'),
      ]);

      if (!mounted) return;

      tickBufferRef.current = tickBuffer;
      shutterBufferRef.current = shutterBuffer;
    };

    prepareBuffers();

    return () => {
      mounted = false;
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
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      audioUnlockedRef.current = true;

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        window.speechSynthesis.cancel();
      }
    } catch {}
  };

  const playBuffer = async (buffer: AudioBuffer | null) => {
    if (!soundEnabled || !buffer) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      gainNode.gain.value = volume;

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } catch {}
  };

  const speakHint = (text: string | null) => {
    if (!speechEnabled || !text || !('speechSynthesis' in window)) return;
    if (!audioUnlockedRef.current) return;
    if (lastSpokenRef.current === text) return;

    stopSpeech();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volume;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = 'en-US';

    const voice = getSelectedVoice();
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = text;
  };

  const resetLastSpoken = () => {
    lastSpokenRef.current = null;
  };

  const playTick = async () => {
    await playBuffer(tickBufferRef.current);
  };

  const playShutter = async () => {
    await playBuffer(shutterBufferRef.current);
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