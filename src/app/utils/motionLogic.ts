export const calculateMovement = (current: any[], previous: any[] | null): number => {
  if (!previous) return 999;

  const MOVEMENT_POINTS = [
  { index: 0, weight: 1.0 },   // nose
  { index: 11, weight: 0.3 },  // left shoulder
  { index: 12, weight: 0.3 },  // right shoulder
  { index: 23, weight: 1.0 },  // left hip
  { index: 24, weight: 1.0 },  // right hip
] as const;

const MIN_VISIBILITY = 0.5;

export const calculateMovement = (
  current: any[],
  previous: any[] | null
): number => {
  if (!previous) return 999;

  let total = 0;
  let totalWeight = 0;

  for (let i = 0; i < MOVEMENT_POINTS.length; i++) {
    const { index, weight } = MOVEMENT_POINTS[i];

    const c = current[index];
    const p = previous[index];

    if (!c || !p) continue;

    // фильтр шумных или пропавших точек (особенно важно для боковой позы)
    if (
      (c.visibility !== undefined && c.visibility < MIN_VISIBILITY) ||
      (p.visibility !== undefined && p.visibility < MIN_VISIBILITY)
    ) {
      continue;
    }

    const dx = c.x - p.x;
    const dy = c.y - p.y;

    total += Math.sqrt(dx * dx + dy * dy) * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 999;

  return total / totalWeight;
};