import { useEffect, useState } from "react";
import type { ObservationWindow } from "../../models/types";

// The overview only supports 24h/3d/7d (007 spec Edge Cases, extended by 015) — 30-day is out
// of scope, so its own window toggle never offers that option.
export type OverviewDisplayMode = "last-24-hours" | "last-3-days" | "last-7-days";

// "Last 3 days" and "Last 7 days" both fetch via the same shared ObservationWindow
// ("last-7-days") — a purely client-side display choice over already-fetched data.
// `label` is a translation KEY, translated at render via `t(w.label)`.
export const OVERVIEW_WINDOWS: { value: OverviewDisplayMode; label: string }[] = [
  { value: "last-24-hours", label: "weatherOverview.windowLabel24h" },
  { value: "last-3-days", label: "weatherOverview.windowLabel3d" },
  { value: "last-7-days", label: "weatherOverview.windowLabel7d" },
];

/** Local display choice, independent of the shared fetch `window`, kept in sync with it. */
export function useOverviewDisplayMode(
  window: ObservationWindow,
  onWindowChange: (window: ObservationWindow) => void
): { displayMode: OverviewDisplayMode; selectDisplayMode: (mode: OverviewDisplayMode) => void } {
  const [displayMode, setDisplayMode] = useState<OverviewDisplayMode>(
    window === "last-24-hours" ? "last-24-hours" : "last-7-days"
  );

  useEffect(() => {
    // Keeps displayMode in sync if `window` changes for a reason outside this component's own
    // buttons (e.g. the shared window falling back from last-30-days elsewhere in the app).
    if (window === "last-24-hours" && displayMode !== "last-24-hours") {
      setDisplayMode("last-24-hours");
    } else if (window !== "last-24-hours" && displayMode === "last-24-hours") {
      setDisplayMode("last-7-days");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window]);

  function selectDisplayMode(mode: OverviewDisplayMode) {
    setDisplayMode(mode);
    onWindowChange(mode === "last-24-hours" ? "last-24-hours" : "last-7-days");
  }

  return { displayMode, selectDisplayMode };
}
