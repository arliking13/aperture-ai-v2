export const calculateMovement = (current: any[], previous: any[] | null): number => {
  if (!previous) return 999;

  const weightedPoints = [
    { index: 0, weight: 1.0 },   // nose
    { index: 11, weight: 0.3 },  // left shoulder
    { index: 12, weight: 0.3 },  // right shoulder
    { index: 23, weight: 1.0 },  // left hip
    { index: 24, weight: 1.0 },  // right hip
  ];

  let total = 0;
  let totalWeight = 0;

  weightedPoints.forEach(({ index, weight }) => {
    if (current[index] && previous[index]) {
      const dx = current[index].x - previous[index].x;
      const dy = current[index].y - previous[index].y;
      total += Math.sqrt(dx * dx + dy * dy) * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight === 0) return 999;

  return total / totalWeight;
};