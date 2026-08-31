import type { DailyAggregate, WeatherObservation } from "../models/types";

const BUCKET_MS = 24 * 3600_000;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function nonNull(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null);
}

export function toDailyAggregates(
  observations: WeatherObservation[],
  bucketCount: number
): DailyAggregate[] {
  const now = Date.now();

  // Bucket 0 = most recent (now-24h, now], bucket (bucketCount-1) = oldest.
  const buckets: WeatherObservation[][] = Array.from({ length: bucketCount }, () => []);

  for (const obs of observations) {
    const age = now - Date.parse(obs.timestamp);
    if (age < 0) continue; // defensive: ignore anything outside the window
    const index = Math.floor(age / BUCKET_MS);
    if (index >= 0 && index < bucketCount) {
      buckets[index].push(obs);
    }
  }

  const aggregates: DailyAggregate[] = buckets.map((bucket, index) => {
    const bucketEnd = new Date(now - index * BUCKET_MS).toISOString();
    const temperatures = nonNull(bucket.map((o) => o.temperature));
    const precipitations = nonNull(bucket.map((o) => o.precipitation));
    const windSpeeds = nonNull(bucket.map((o) => o.windSpeed));
    const cloudCoverages = nonNull(bucket.map((o) => o.cloudCoverPercent));

    return {
      bucketEnd,
      high: temperatures.length > 0 ? Math.max(...temperatures) : null,
      low: temperatures.length > 0 ? Math.min(...temperatures) : null,
      average: temperatures.length > 0 ? mean(temperatures) : null,
      totalPrecipitation:
        precipitations.length > 0 ? precipitations.reduce((sum, p) => sum + p, 0) : null,
      windAverage: windSpeeds.length > 0 ? mean(windSpeeds) : null,
      cloudAverage: cloudCoverages.length > 0 ? mean(cloudCoverages) : null,
    };
  });

  // Oldest -> newest.
  return aggregates.reverse();
}
