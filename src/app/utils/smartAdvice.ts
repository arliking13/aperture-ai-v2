type DetectedObject = { class: string };

const CAPTURE_COMPLIMENTS = [
  "Lighting looks good. You are ready.",
  "Nice framing. This shot works well.",
  "Clean shot. You look ready.",
  "Good angle. Try one more just in case.",
];

const say = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function analyzeBrightness(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): number {
  const sampleSize = 100;
  const startX = (width - sampleSize) / 2;
  const startY = (height - sampleSize) / 2;

  const imageData = ctx.getImageData(startX, startY, sampleSize, sampleSize);
  const data = imageData.data;
  let colorSum = 0;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    colorSum += avg;
  }

  return Math.floor(colorSum / (data.length / 4));
}

export function generateLiveHint(
  landmarks: any[] | null,
  brightness: number | null,
  stability: number
): string | null {
  if (!landmarks || landmarks.length === 0) {
    return "Step into frame";
  }

  if (brightness !== null) {
    if (brightness < 40) return "Need more light";
    if (brightness > 220) return "Too bright";
  }

  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftEye || !rightEye || !leftShoulder || !rightShoulder) {
    return "Step into frame";
  }

  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  if (nose.x < 0.4) return "Move right";
  if (nose.x > 0.6) return "Move left";

  if (shoulderWidth < 0.15) return "Move closer";
  if (shoulderWidth > 0.8) return "Step back";

  const tilt = Math.abs(leftEye.y - rightEye.y);
  if (tilt > 0.08) return "Straighten head";

  if (stability < 40) return "Hold still";

  return "Perfect";
}

export function generateCaptureAdvice(
  landmarks: any[] | null,
  objects: DetectedObject[] = [],
  brightness: number | null
): string {
  if (!landmarks || landmarks.length === 0) {
    return "I could not see you clearly. Step into frame.";
  }

  if (brightness !== null) {
    if (brightness < 40) {
      return "It is too dark. Face a window or brighter light.";
    }
    if (brightness > 220) {
      return "It is too bright. Move away from the light source.";
    }
  }

  const clutter = objects
    .filter((o) => o.class !== "person")
    .map((o) => o.class);

  if (clutter.includes("bottle") || clutter.includes("cup")) {
    return "A bottle or cup is distracting. Remove it from frame.";
  }

  if (clutter.includes("tv") || clutter.includes("laptop")) {
    return "Screens are distracting. Angle away from the tech.";
  }

  if (clutter.includes("chair") || clutter.includes("couch")) {
    return "Furniture is pulling attention. Try a cleaner background.";
  }

  const nose = landmarks[0];
  const leftEye = landmarks[2];
  const rightEye = landmarks[5];
  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];

  if (!nose || !leftEye || !rightEye || !leftShoulder || !rightShoulder) {
    return "Step into frame more clearly.";
  }

  if (nose.x < 0.4) return "You are too far left. Move toward center.";
  if (nose.x > 0.6) return "You are too far right. Move toward center.";

  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  if (shoulderWidth < 0.15) return "You are too far away. Move closer.";
  if (shoulderWidth > 0.8) return "You are too close. Step back slightly.";

  const tilt = Math.abs(leftEye.y - rightEye.y);
  if (tilt > 0.08) return "Your head is tilted. Level your chin a little.";

  return say(CAPTURE_COMPLIMENTS);
}