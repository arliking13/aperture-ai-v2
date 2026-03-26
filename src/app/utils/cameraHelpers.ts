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