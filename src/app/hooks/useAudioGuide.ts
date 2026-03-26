import { useEffect, useRef } from 'react';

type AudioGuideOptions = {
  speechEnabled?: boolean;
  soundEnabled?: boolean;
  volume?: number;
};

const voiceMap: Record<string, string> = {
  'Step into frame': '/voice/step-into-frame.mp3',
  'Move closer': '/voice/move-closer.mp3',
  'Step back': '/voice/step-back.mp3',
  'Hold still': '/voice/hold-still.mp3',
  'Perfect': '/voice/perfect.mp3',
  'Need more light': '/voice/need-more-light.mp3',
  'Too bright': '/voice/too-bright.mp3',
};

export function useAudioGuide(options: AudioGuideOptions = {}) {
  const {
    speechEnabled = true,
    soundEnabled = true,
    volume = 1,
  } = options;

  const lastSpokenRef = useRef<string | null>(null);
  const lastSpokenAtRef = useRef<number>(0);
const HINT_COOLDOWN_MS = 2500;

  const audioContextRef = useRef<AudioContext | null>(null);
  const tickBufferRef = useRef<AudioBuffer | null>(null);
  const shutterBufferRef = useRef<AudioBuffer | null>(null);
  const voiceBuffersRef = useRef<Record<string, AudioBuffer | null>>({});
  const currentVoiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioUnlockedRef = useRef(false);

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
      if (!response.ok) {
        console.log('Failed to load audio:', url, response.status);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      return await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (e) {
      console.log('Audio decode/load error for:', url, e);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const prepareBuffers = async () => {
      const ctx = getAudioContext();
      if (!ctx) return;

      const tickPromise = loadSoundBuffer('/tick.mp3');
      const shutterPromise = loadSoundBuffer('/shutter.mp3');

      const voiceEntries = Object.entries(voiceMap);

      const loadedVoiceEntries = await Promise.all(
        voiceEntries.map(async ([hint, url]) => {
          const buffer = await loadSoundBuffer(url);
          return [hint, buffer] as const;
        })
      );

      const [tickBuffer, shutterBuffer] = await Promise.all([
        tickPromise,
        shutterPromise,
      ]);

      if (!mounted) return;

      tickBufferRef.current = tickBuffer;
      shutterBufferRef.current = shutterBuffer;
      voiceBuffersRef.current = Object.fromEntries(loadedVoiceEntries);

      console.log('Audio buffers ready:', {
        tick: !!tickBuffer,
        shutter: !!shutterBuffer,
        voices: Object.fromEntries(
          Object.entries(voiceBuffersRef.current).map(([key, value]) => [key, !!value])
        ),
      });
    };

    prepareBuffers();

    return () => {
      mounted = false;
    };
  }, []);

  const unlockAudio = async () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // tiny silent buffer to warm up some browsers
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);

      audioUnlockedRef.current = true;
      console.log('Audio unlocked');
    } catch (e) {
      console.log('Audio unlock failed:', e);
    }
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
    } catch (e) {
      console.log('playBuffer error:', e);
    }
  };

  const stopSpeech = () => {
    try {
      currentVoiceSourceRef.current?.stop();
    } catch {}

    currentVoiceSourceRef.current = null;
  };

  const speakHint = async (text: string | null) => {
    console.log('speakHint text:', text);

    if (!speechEnabled || !text) return;
    if (!audioUnlockedRef.current) {
      console.log('Audio not unlocked yet');
      return;
    }
    const now = Date.now();

if (
  lastSpokenRef.current === text &&
  now - lastSpokenAtRef.current < HINT_COOLDOWN_MS
) {
  console.log('Skipping repeated hint:', text);
  return;
}

    const buffer = voiceBuffersRef.current[text];
    console.log('Voice buffer found:', !!buffer, 'for text:', text);

    if (!buffer) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      stopSpeech();

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();

      gainNode.gain.value = volume;
      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        if (currentVoiceSourceRef.current === source) {
          currentVoiceSourceRef.current = null;
        }
      };

      currentVoiceSourceRef.current = source;
source.start(0);
lastSpokenRef.current = text;
lastSpokenAtRef.current = Date.now();
    } catch (e) {
      console.log('speakHint playback error:', e);
    }
  };

  const resetLastSpoken = () => {
  lastSpokenRef.current = null;
  lastSpokenAtRef.current = 0;
};

  const playTick = async () => {
    await playBuffer(tickBufferRef.current);
  };

  const playShutter = async () => {
    await playBuffer(shutterBufferRef.current);
  };

  return {
    speakHint,
    stopSpeech,
    resetLastSpoken,
    playTick,
    playShutter,
    unlockAudio,
  };
}