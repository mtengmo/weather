import { useTranslation } from "react-i18next";
import type { HighLowVisibility } from "../models/types";

interface HighLowToggleProps {
  visible: HighLowVisibility;
  onChange: (visible: HighLowVisibility) => void;
}

export default function HighLowToggle({ visible, onChange }: HighLowToggleProps) {
  const { t } = useTranslation();
  return (
    <div className="high-low-toggle" role="group" aria-label={t("highLowToggle.ariaLabel")}>
      <button type="button" aria-pressed={visible} onClick={() => onChange(true)}>
        {t("highLowToggle.on")}
      </button>
      <button type="button" aria-pressed={!visible} onClick={() => onChange(false)}>
        {t("highLowToggle.off")}
      </button>
    </div>
  );
}
