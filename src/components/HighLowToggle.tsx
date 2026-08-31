import type { HighLowVisibility } from "../models/types";

interface HighLowToggleProps {
  visible: HighLowVisibility;
  onChange: (visible: HighLowVisibility) => void;
}

export default function HighLowToggle({ visible, onChange }: HighLowToggleProps) {
  return (
    <div className="high-low-toggle" role="group" aria-label="High/low lines">
      <button type="button" aria-pressed={visible} onClick={() => onChange(true)}>
        High/Low on
      </button>
      <button type="button" aria-pressed={!visible} onClick={() => onChange(false)}>
        High/Low off
      </button>
    </div>
  );
}
