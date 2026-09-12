import type { DailyAggregate, WeatherObservation } from "../models/types";
import { deriveFeelsLike } from "./feelsLike";
import { NIGHT_END_HOUR, NIGHT_START_HOUR } from "./weatherCondition";

const BUCKET_MS = 24 * 3600_000;

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function nonNull(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null);
}

// Bucket index relative to "now": 0 = most recent past bucket (now-24h, now], 1 = the one
// before that, etc. A *negative* index is a future (forecast) bucket: -1 = (now, now+24h],
// -2 = the day after that, and so on (005-add-weather-forecast).
function bucketIndexOf(obs: WeatherObservation, now: number): number {
  return Math.floor((now - Date.parse(obs.timestamp)) / BUCKET_MS);
}

/** The per-bucket aggregation math shared by every bucket shape (rolling 24h day, or sub-day
 *  period) — factored out so `toSubDayBuckets` reuses it exactly rather than duplicating it
 *  (014-dashboard-usability-fixes, research.md §8). */
function aggregateBucket(bucket: WeatherObservation[]): Omit<DailyAggregate, "bucketEnd" | "isForecast"> {
  const temperatures = nonNull(bucket.map((o) => o.temperature));
  const precipitations = nonNull(bucket.map((o) => o.precipitation));
  const windSpeeds = nonNull(bucket.map((o) => o.windSpeed));
  const cloudCoverages = nonNull(bucket.map((o) => o.cloudCoverPercent));
  const windGusts = nonNull(bucket.map((o) => o.windGust ?? null));
  // Last-reading-wins, not a circular mean — the general direction is all a daily summary needs
  // (018-dashboard-visual-redesign, research.md §5).
  const windDirections = nonNull(bucket.map((o) => o.windDirection ?? null));
  const chancesOfRain = nonNull(
    bucket.filter((o) => o.isForecast === true).map((o) => o.chanceOfRain ?? null)
  );
  const feelsLikes = nonNull(
    bucket.map((o) =>
      deriveFeelsLike({
        temperature: o.temperature,
        windSpeed: o.windSpeed,
        relativeHumidity: o.relativeHumidity ?? null,
      })
    )
  );

  return {
    high: temperatures.length > 0 ? Math.max(...temperatures) : null,
    low: temperatures.length > 0 ? Math.min(...temperatures) : null,
    average: temperatures.length > 0 ? mean(temperatures) : null,
    totalPrecipitation:
      precipitations.length > 0 ? precipitations.reduce((sum, p) => sum + p, 0) : null,
    windAverage: windSpeeds.length > 0 ? mean(windSpeeds) : null,
    cloudAverage: cloudCoverages.length > 0 ? mean(cloudCoverages) : null,
    windHigh: windSpeeds.length > 0 ? Math.max(...windSpeeds) : null,
    windLow: windSpeeds.length > 0 ? Math.min(...windSpeeds) : null,
    windGustHigh: windGusts.length > 0 ? Math.max(...windGusts) : null,
    feelsLikeAverage: feelsLikes.length > 0 ? mean(feelsLikes) : null,
    chanceOfRainMax: chancesOfRain.length > 0 ? Math.max(...chancesOfRain) : null,
    windDirection: windDirections.length > 0 ? windDirections[windDirections.length - 1] : null,
  };
}

/** Daytime local-clock hours (066-daily-forecast-language-setting, research.md §2) — the inverse
 *  of `isNight`'s own boundary, reused exactly rather than re-derived, so a whole-day condition
 *  computed from these hours never disagrees with the app's existing day/night icon logic. */
function isDaytimeObservation(obs: WeatherObservation): boolean {
  const hour = new Date(obs.timestamp).getHours();
  return hour >= NIGHT_END_HOUR && hour < NIGHT_START_HOUR;
}

/** The `daytime*` subset of `DailyAggregate`, computed by re-running `aggregateBucket` on just a
 *  bucket's daytime-hour observations (research.md §3) — reuses the exact same mean/max/sum math
 *  as the whole-bucket fields rather than duplicating it, so the two can never silently diverge in
 *  *how* they aggregate, only in *which observations* they aggregate. */
function daytimeAggregateFields(
  bucket: WeatherObservation[]
): Pick<
  DailyAggregate,
  | "daytimeAverage"
  | "daytimeTotalPrecipitation"
  | "daytimeWindAverage"
  | "daytimeCloudAverage"
  | "daytimeChanceOfRainMax"
  | "daytimeHourCount"
  | "daytimeRainHourCount"
  | "daytimeMaxHourlyPrecipitation"
> {
  const daytimeBucket = bucket.filter(isDaytimeObservation);
  const daytimeAggregate = aggregateBucket(daytimeBucket);
  // Hour-level precipitation readings, separate from `aggregateBucket`'s sum — needed to judge
  // whether the day's daytime rain is "meaningful enough to display" (067-fix-rain-brief-icons,
  // research.md §2): a brief morning shower and a full day of rain can produce the same nonzero
  // sum, but differ in how many hours had rain and how heavy the worst single hour was.
  const daytimePrecipitationReadings = nonNull(daytimeBucket.map((o) => o.precipitation));
  return {
    daytimeAverage: daytimeAggregate.average,
    daytimeTotalPrecipitation: daytimeAggregate.totalPrecipitation,
    daytimeWindAverage: daytimeAggregate.windAverage,
    daytimeCloudAverage: daytimeAggregate.cloudAverage,
    daytimeChanceOfRainMax: daytimeAggregate.chanceOfRainMax,
    daytimeHourCount: daytimePrecipitationReadings.length > 0 ? daytimePrecipitationReadings.length : null,
    daytimeRainHourCount:
      daytimePrecipitationReadings.length > 0
        ? daytimePrecipitationReadings.filter((p) => p > 0).length
        : null,
    daytimeMaxHourlyPrecipitation:
      daytimePrecipitationReadings.length > 0 ? Math.max(...daytimePrecipitationReadings) : null,
  };
}

export function toDailyAggregates(
  observations: WeatherObservation[],
  bucketCount: number
): DailyAggregate[] {
  const now = Date.now();

  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  // Extend forward only as far as forecast data in `observations` actually reaches — never
  // fabricate placeholder future days beyond what was provided (spec User Story 2, Acceptance Scenario 3).
  const forwardBucketCount = minIndex < 0 ? -minIndex : 0;

  const bucketsByIndex = new Map<number, WeatherObservation[]>();
  observations.forEach((obs, i) => {
    const index = indices[i];
    if (index >= bucketCount) return; // older than the requested window
    const bucket = bucketsByIndex.get(index);
    if (bucket) bucket.push(obs);
    else bucketsByIndex.set(index, [obs]);
  });

  const aggregates: DailyAggregate[] = [];
  // Oldest -> newest: descending index from the oldest past bucket through "now" (index 0)
  // and on into the future buckets (negative index), if any.
  for (let index = bucketCount - 1; index >= -forwardBucketCount; index--) {
    const bucket = bucketsByIndex.get(index) ?? [];
    const bucketEndMs = now - index * BUCKET_MS;
    const bucketEnd = new Date(bucketEndMs).toISOString();
    const isForecast = bucketEndMs > now;

    aggregates.push({
      bucketEnd,
      ...(isForecast ? { isForecast: true } : {}),
      ...aggregateBucket(bucket),
      ...daytimeAggregateFields(bucket),
    });
  }

  return aggregates;
}

export type SubDayPeriod = "morning" | "lunch" | "afternoon" | "evening" | "night";

interface SubDayBoundary {
  period: SubDayPeriod;
  label: string;
  startHour: number; // local hour, inclusive
  endHour: number; // local hour, exclusive (>24 means it wraps past midnight)
}

// A common, fixed convention (014-dashboard-usability-fixes, Assumptions) — not user-configurable.
export const SUB_DAY_PERIODS: SubDayBoundary[] = [
  { period: "morning", label: "Morning", startHour: 6, endHour: 11 },
  { period: "lunch", label: "Lunch", startHour: 11, endHour: 13 },
  { period: "afternoon", label: "Afternoon", startHour: 13, endHour: 17 },
  { period: "evening", label: "Evening", startHour: 17, endHour: 21 },
  { period: "night", label: "Night", startHour: 21, endHour: 30 }, // 21:00 through 06:00 next day
];

function subDayBucketsForDate(
  baseDate: Date,
  observations: WeatherObservation[],
  now: number,
  isFirstDay: boolean
): DailyAggregate[] {
  const dayStart = new Date(baseDate);
  dayStart.setHours(0, 0, 0, 0);

  return SUB_DAY_PERIODS.map(({ period, label, startHour, endHour }) => {
    // Every rendered day *except the first* has its own 00:00-06:00 window already covered by
    // the *previous* day's Night period (which reaches 6 hours into the next day) — but no
    // "yesterday" bucket is ever generated to cover the first rendered day's own early morning.
    // Widening just this one day's Morning period to start at local midnight closes that gap
    // without disturbing every other day's familiar "Night = tonight into tomorrow morning"
    // semantics (020-dashboard-polish-round-five, research.md §1).
    const effectiveStartHour = isFirstDay && period === "morning" ? 0 : startHour;
    const startMs = dayStart.getTime() + effectiveStartHour * 3600_000;
    const endMs = dayStart.getTime() + endHour * 3600_000;
    const bucket = observations.filter((o) => {
      const t = Date.parse(o.timestamp);
      return t >= startMs && t < endMs;
    });
    return {
      bucketEnd: new Date(endMs).toISOString(),
      // Same wall-clock rule `toDailyAggregates` already uses for its own buckets — a
      // still-to-come sub-day period of "today" is forecast the same way a still-to-come hour
      // of "today" already is in the hourly view (spec Edge Cases).
      ...(endMs > now ? { isForecast: true } : {}),
      subDayLabel: label,
      ...aggregateBucket(bucket),
    };
  });
}

/**
 * The last `dayCount` days (ending with today) plus up to `dayCount` days forward — as far as the
 * underlying observations' forecast actually reaches — each broken into the same 5 fixed sub-day
 * periods: a single, uniform resolution throughout, never mixed with plain daily columns
 * (015-overview-3day-resolution-fix, FR-003/FR-004).
 *
 * The past side mirrors `toDailyAggregates`' own "N past buckets" semantics, which the 24-hour and
 * 7-day views both already follow — this view previously started at *today* and only went forward,
 * making it the odd one out with no observed data at all (and, before ~11:00 local, not even one
 * completed period of today), which read as "the 3-day view's observations are broken"
 * (026-fix-3-day follow-up). A forward day beyond the forecast's real reach is omitted
 * entirely, never fabricated (FR-005).
 *
 * The forward side is capped here, in whole days, rather than by trimming entries afterwards the
 * way the 7-day view's `capForecastReach` does — an entry-count trim would cut mid-day and leave a
 * partial trailing day, breaking the "always exactly 5 periods per day" contract that the
 * day-boundary markers and weekday labels both rely on.
 */
export function toSubDayBuckets(
  observations: WeatherObservation[],
  dayCount: number
): DailyAggregate[] {
  const now = Date.now();
  const indices = observations.map((o) => bucketIndexOf(o, now));
  const minIndex = indices.length > 0 ? Math.min(...indices) : 0;
  const forwardDayCount = Math.min(minIndex < 0 ? -minIndex : 0, dayCount);

  const firstDayOffset = -(dayCount - 1);
  const buckets: DailyAggregate[] = [];
  for (let dayOffset = firstDayOffset; dayOffset <= forwardDayCount; dayOffset++) {
    const date = new Date(now + dayOffset * BUCKET_MS);
    // The Morning-widened-to-midnight rule applies to whichever day renders first — no day before
    // it exists to cover its own 00:00-06:00 window via that earlier day's Night period
    // (020-dashboard-polish-round-five, research.md §1).
    buckets.push(...subDayBucketsForDate(date, observations, now, dayOffset === firstDayOffset));
  }
  return buckets;
}

/**
 * Sums precipitation over the *local calendar day* containing `reference` — midnight to
 * midnight, combining already-elapsed (observed) and still-upcoming (forecast) hours — rather
 * than a rolling 24-hour window from `reference` itself, which can spill into tomorrow
 * (033-todays-rain-total). Returns `null`, not `0`, when there's no non-null precipitation
 * reading anywhere in that span, matching this module's existing never-fabricate convention.
 */
export function sumCalendarDayPrecipitation(
  observations: WeatherObservation[],
  reference: Date
): number | null {
  const dayStart = new Date(reference);
  dayStart.setHours(0, 0, 0, 0);
  const startMs = dayStart.getTime();
  const endMs = startMs + BUCKET_MS;

  const readings = nonNull(
    observations
      .filter((o) => {
        const t = Date.parse(o.timestamp);
        return t >= startMs && t < endMs;
      })
      .map((o) => o.precipitation)
  );

  return readings.length > 0 ? readings.reduce((sum, v) => sum + v, 0) : null;
}
