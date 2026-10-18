import i18next from "i18next";

/**
 * The ONE place that decides how clock times and dates read (clarify pass).
 *
 * Policy — follows the APP language (the Settings > Language choice), never the browser/device
 * locale, and is identical on Android (`ui/TimeFormat.kt`):
 *   - Swedish: 24-hour clock ("14:05"), hour labels "14:00", lower-case weekdays ("mån").
 *   - English: 12-hour clock with AM/PM ("2:05 PM"), hour labels "2 PM", weekdays "Mon".
 * AM/PM is assembled by hand (not Intl) so every browser and the Android app render the same text.
 */
export type AppLanguage = "en" | "sv";

export function appLanguage(): AppLanguage {
  return (i18next.language ?? "en").toLowerCase().startsWith("sv") ? "sv" : "en";
}

const pad = (n: number) => String(n).padStart(2, "0");

function hour12(hour24: number): { h: number; suffix: "AM" | "PM" } {
  return { h: hour24 % 12 === 0 ? 12 : hour24 % 12, suffix: hour24 < 12 ? "AM" : "PM" };
}

/** Clock time with minutes: sv "14:05", en "2:05 PM". */
export function formatClockTime(date: Date, lang: AppLanguage = appLanguage()): string {
  if (lang === "sv") return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const { h, suffix } = hour12(date.getHours());
  return `${h}:${pad(date.getMinutes())} ${suffix}`;
}

/** Whole-hour label for timelines and axes: sv "14:00", en "2 PM". */
export function formatHourLabel(date: Date, lang: AppLanguage = appLanguage()): string {
  if (lang === "sv") return `${pad(date.getHours())}:00`;
  const { h, suffix } = hour12(date.getHours());
  return `${h} ${suffix}`;
}

/** Short weekday in the app language: sv "mån", en "Mon". */
export function formatWeekdayShort(date: Date, lang: AppLanguage = appLanguage()): string {
  return date.toLocaleDateString(lang, { weekday: "short" }).replace(/\.$/, "");
}

/** Short weekday plus day of month: sv "mån 14", en "Mon 14". */
export function formatWeekdayDay(date: Date, lang: AppLanguage = appLanguage()): string {
  return `${formatWeekdayShort(date, lang)} ${date.getDate()}`;
}

/** Calendar date, medium length, in the app language: sv "14 okt. 2026", en "Oct 14, 2026". */
export function formatDateMedium(date: Date, lang: AppLanguage = appLanguage()): string {
  return date.toLocaleDateString(lang, { dateStyle: "medium" });
}

/** Date + clock time in one app-language format. */
export function formatDateTime(date: Date, lang: AppLanguage = appLanguage()): string {
  return `${formatDateMedium(date, lang)} ${formatClockTime(date, lang)}`;
}

/** Month + day ("14 okt." / "Oct 14") for long-range axis ticks. */
export function formatMonthDay(date: Date, lang: AppLanguage = appLanguage()): string {
  return date.toLocaleDateString(lang, { month: "short", day: "numeric" });
}
