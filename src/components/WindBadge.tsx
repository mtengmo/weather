import { Wind } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ResolvedConditionIcon } from "./smhiSymbolIcons";

/** Small wind marker drawn over character artwork for the `windy` condition, which has no artwork
 *  of its own (it reuses a neutral-sky image). Decorative: the visible "Windy" label carries the
 *  meaning. Positioned by `.condition-art` / `.wind-badge` in index.css. */
export function WindBadge() {
  const { t } = useTranslation();
  // Hover text only; aria-hidden so screen readers rely on the column/card's own label.
  return (
    <span className="wind-badge" aria-hidden="true" data-testid="wind-badge" title={t("weatherCondition.windy")}>
      <Wind aria-hidden="true" size={14} />
    </span>
  );
}

/** Renders resolved SMHI-symbol artwork, wrapped with a `WindBadge` when the icon or the caller's `windy` is set (never doubled) so
 *  non-windy icons keep their exact DOM. */
export function ConditionArtwork({
  icon,
  size,
  windy = false,
}: {
  icon: Extract<ResolvedConditionIcon, { kind: "smhi-symbol" }>;
  size: number;
  /** Extra wind signal from the period/card (wind >= threshold regardless of condition). */
  windy?: boolean;
}) {
  const img = <img src={icon.src} alt="" aria-hidden="true" width={size} height={size} />;
  if (!icon.windy && !windy) return img;
  return (
    <span className="condition-art">
      {img}
      <WindBadge />
    </span>
  );
}
