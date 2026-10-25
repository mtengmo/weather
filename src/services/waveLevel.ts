/** Wave-height severity 1..5 for a height in metres: <0.5 calm, 0.5-1, 1-2, 2-3, >3 (upper bounds exclusive). */
export type WaveLevel = 1 | 2 | 3 | 4 | 5;

export const WAVE_LEVEL_LOWER_BOUNDS_M: readonly number[] = [0, 0.5, 1, 2, 3];

export function waveHeightLevel(meters: number): WaveLevel {
  if (meters < 0.5) return 1;
  if (meters < 1) return 2;
  if (meters < 2) return 3;
  if (meters <= 3) return 4;
  return 5;
}
