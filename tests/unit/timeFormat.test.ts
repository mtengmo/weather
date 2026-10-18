import { describe, expect, it } from "vitest";
import {
  formatClockTime,
  formatDateTime,
  formatHourLabel,
  formatMonthDay,
  formatWeekdayDay,
  formatWeekdayShort,
} from "../../src/services/timeFormat";

// Local-time constructor so the assertions don't depend on the runner's time zone.
const at = (h: number, m = 0) => new Date(2026, 9, 14, h, m); // Wed 14 Oct 2026

describe("timeFormat — one policy per app language (mirrors Android ui/TimeFormat.kt)", () => {
  it("Swedish uses a 24-hour clock", () => {
    expect(formatClockTime(at(14, 5), "sv")).toBe("14:05");
    expect(formatClockTime(at(0, 7), "sv")).toBe("00:07");
    expect(formatHourLabel(at(9), "sv")).toBe("09:00");
  });

  it("English uses a 12-hour clock with AM/PM", () => {
    expect(formatClockTime(at(14, 5), "en")).toBe("2:05 PM");
    expect(formatClockTime(at(0, 7), "en")).toBe("12:07 AM");
    expect(formatClockTime(at(12, 0), "en")).toBe("12:00 PM");
    expect(formatHourLabel(at(9), "en")).toBe("9 AM");
    expect(formatHourLabel(at(0), "en")).toBe("12 AM");
    expect(formatHourLabel(at(23), "en")).toBe("11 PM");
  });

  it("weekday and month names follow the app language, not the browser locale", () => {
    expect(formatWeekdayShort(at(12), "en")).toBe("Wed");
    expect(formatWeekdayShort(at(12), "sv").toLowerCase()).toBe("ons");
    expect(formatWeekdayDay(at(12), "en")).toBe("Wed 14");
    expect(formatWeekdayDay(at(12), "sv").toLowerCase()).toBe("ons 14");
    expect(formatMonthDay(at(12), "sv").toLowerCase()).toContain("okt");
    expect(formatMonthDay(at(12), "en")).toContain("Oct");
  });

  it("date + time uses the language's own clock", () => {
    expect(formatDateTime(at(14, 5), "sv")).toMatch(/14:05$/);
    expect(formatDateTime(at(14, 5), "en")).toMatch(/2:05 PM$/);
  });
});
