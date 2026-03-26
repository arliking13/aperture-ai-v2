export const takeSnapshot = (
  video: HTMLVideoElement,
  format: 'vertical' | 'square' | 'album',
  isMirrored: boolean
): string | null => {
  const vidW = video.videoWidth;
  const vidH = video.videoHeight;
  let targetW = vidW, targetH = vidH;

  if (format === 'square') {
    const size = Math.min(vidW, vidH);
    targetW = size;
    targetH = size;
  } else if (format === 'vertical') {
    targetH = vidH;
    targetW = targetH * (9 / 16);
    if (targetW > vidW) {
      targetW = vidW;
      targetH = targetW * (16 / 9);
    }
  } else {
    targetH = vidH;
    targetW = targetH * (4 / 3);
    if (targetW > vidW) {
      targetW = vidW;
      targetH = targetW * (3 / 4);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const startX = (vidW - targetW) / 2;
  const startY = (vidH - targetH) / 2;

  ctx.save();
  if (isMirrored) {
    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, startX, startY, targetW, targetH, 0, 0, targetW, targetH);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
};
export const resizeForAI = (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const scale = maxWidth / img.width;

      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };

    img.src = base64Str;
  });
};