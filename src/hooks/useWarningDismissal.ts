import { useCallback, useState } from "react";
import { addDismissedWarningId, getDismissedWarningIds } from "../services/warningDismissal";

export interface UseWarningDismissalResult {
  dismissedIds: Set<string>;
  dismiss: (id: string) => void;
}

/** Per-browser, per-warning dismissal — a dismissed warning's own id is recorded, so it stays
 *  hidden for as long as it remains that exact warning, while any other/new warning is
 *  unaffected (032-dashboard-polish-round-seven, US4). */
export function useWarningDismissal(): UseWarningDismissalResult {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => getDismissedWarningIds());

  const dismiss = useCallback((id: string) => {
    setDismissedIds((current) => addDismissedWarningId(id, current));
  }, []);

  return { dismissedIds, dismiss };
}
