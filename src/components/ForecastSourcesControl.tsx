import { useEffect, useRef, useState } from "react";

interface ForecastSourcesControlProps {
  combined: boolean;
  onChange: (combined: boolean) => void;
}

/**
 * Replaces the old two-button "Combine forecast sources on/off" toggle with a single dropdown
 * offering two named options — "Automatic" (today's off state) and "Combined" (today's on
 * state) — the same underlying boolean preference, just presented as a choice rather than a
 * toggle (018-dashboard-visual-redesign, FR-004, research.md §1).
 */
export default function ForecastSourcesControl({ combined, onChange }: ForecastSourcesControlProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function select(value: boolean) {
    onChange(value);
    setOpen(false);
  }

  return (
    <div className="forecast-sources-control" ref={panelRef}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((prev) => !prev)}>
        Forecast sources: {combined ? "Combined" : "Automatic"}
      </button>

      {open && (
        <ul role="listbox" aria-label="Forecast sources">
          <li>
            <button type="button" aria-selected={!combined} onClick={() => select(false)}>
              Automatic
            </button>
          </li>
          <li>
            <button type="button" aria-selected={combined} onClick={() => select(true)}>
              Combined
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
