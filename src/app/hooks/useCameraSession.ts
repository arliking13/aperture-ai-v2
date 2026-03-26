import { useCallback } from 'react';

type FacingMode = 'user' | 'environment';

type StartCameraParams = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  facingMode: FacingMode;
  unlockAudio: () => Promise<void> | void;
  setCameraStarted: (value: boolean) => void;
  setZoomCap: (value: { min: number; max: number }) => void;
  setZoom: (value: number) => void;
};

export function useCameraSession() {
  const stopCurrentStream = useCallback(
    (videoRef: React.RefObject<HTMLVideoElement | null>) => {
      const stream = videoRef.current?.srcObject as MediaStream | null;
      if (!stream) return;

      stream.getTracks().forEach((track) => track.stop());

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    },
    []
  );

  const startCamera = useCallback(
    async ({
      videoRef,
      facingMode,
      unlockAudio,
      setCameraStarted,
      setZoomCap,
      setZoom,
    }: StartCameraParams) => {
      stopCurrentStream(videoRef);

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          zoom: true,
        } as any,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      try {
        await video.play();
      } catch (e) {
        console.log('video.play() warning:', e);
      }

      setCameraStarted(true);

      const track = stream.getVideoTracks()[0];
      const caps = (track.getCapabilities() as any) || {};

      if (caps.zoom) {
        setZoomCap({ min: caps.zoom.min, max: caps.zoom.max });
        setZoom(1);
      } else {
        setZoomCap({ min: 1, max: 1 });
        setZoom(1);
      }

      // Аудио разблокируем уже после старта камеры, best-effort
      try {
        await unlockAudio();
      } catch (e) {
        console.log('unlockAudio warning:', e);
      }
    },
    [stopCurrentStream]
  );

  return {
    startCamera,
    stopCurrentStream,
  };
}