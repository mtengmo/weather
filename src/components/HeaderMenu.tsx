import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import type { HighLowVisibility, LanguagePreference, NearbyStationCount, Theme, UnitSystem } from "../models/types";
import ThemeToggle from "./ThemeToggle";
import SettingsMenu from "./SettingsMenu";
import NearbyStationCountControl from "./NearbyStationCountControl";

export type HeaderView = "graph" | "details" | "overview" | "map";

interface HeaderMenuProps {
  view: HeaderView;
  onDetails: () => void;
  onHome: () => void;
  onMap: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  highLowVisible: HighLowVisibility;
  onHighLowChange: (visible: HighLowVisibility) => void;
  language: LanguagePreference;
  onLanguageChange: (language: LanguagePreference) => void;
  nearbyStationCount: NearbyStationCount;
  onNearbyStationCountChange: (count: NearbyStationCount) => void;
}

/**
 * The header's single overflow menu: navigation (Home / Details / Map), theme and Settings.
 * "Home" always means the Overview and "Details" always means the next detail view, exactly as
 * the former row of header buttons did.
 */
export default function HeaderMenu(props: HeaderMenuProps) {
  const { view } = props;
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"main" | "settings">("main");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function close(returnFocus: boolean) {
    setOpen(false);
    setPanel("main");
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setPanel("main");
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Move focus into the panel when it opens or switches panel.
  useEffect(() => {
    if (!open) return;
    const first = listRef.current?.querySelector<HTMLElement>(
      panel === "main" ? '[role="menuitem"]' : "button, select"
    );
    first?.focus();
  }, [open, panel]);

  function items(): HTMLElement[] {
    return Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function onKeyDown(event: ReactKeyboardEvent) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key === "Tab" && panel === "main") {
      close(false);
      return;
    }
    if (panel !== "main" || event.target === triggerRef.current) return;
    const list = items();
    if (list.length === 0) return;
    const index = list.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % list.length;
    else if (event.key === "ArrowUp") next = (index - 1 + list.length) % list.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = list.length - 1;
    if (next !== null) {
      event.preventDefault();
      list[next].focus();
    }
  }

  function act(fn: () => void) {
    fn();
    close(true);
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
    }
  }

  return (
    <div className="header-menu" ref={rootRef} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="header-menu-trigger"
        aria-label={t("app.menu")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "header-menu-content" : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={onTriggerKeyDown}
      >
        <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
          <path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div id="header-menu-content" className="header-menu-content" ref={listRef}>
          {panel === "main" ? (
            <div role="menu" aria-label={t("app.menu")} className="header-menu-list">
              {view !== "overview" && (
                <button type="button" role="menuitem" className="header-menu-item" onClick={() => act(props.onHome)}>
                  {t("app.showOverview")}
                </button>
              )}
              {view !== "details" && view !== "map" && (
                <button type="button" role="menuitem" className="header-menu-item" onClick={() => act(props.onDetails)}>
                  {t("app.showDetails")}
                </button>
              )}
              {view !== "map" && (
                <button type="button" role="menuitem" className="header-menu-item" onClick={() => act(props.onMap)}>
                  {t("app.showMap")}
                </button>
              )}
              <ThemeToggle theme={props.theme} onThemeChange={(next) => act(() => props.onThemeChange(next))} />
              <button
                type="button"
                role="menuitem"
                className="header-menu-item"
                aria-haspopup="true"
                onClick={() => setPanel("settings")}
              >
                {t("settingsMenu.settings")}
              </button>
            </div>
          ) : (
            <div className="header-menu-settings" role="group" aria-label={t("settingsMenu.settings")}>
              <button type="button" className="header-menu-back" onClick={() => setPanel("main")}>
                <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                  <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t("settingsMenu.settings")}
              </button>
              <SettingsMenu
                unit={props.unit}
                onUnitChange={props.onUnitChange}
                highLowVisible={props.highLowVisible}
                onHighLowChange={props.onHighLowChange}
                language={props.language}
                onLanguageChange={props.onLanguageChange}
              >
                {view !== "overview" && (
                  <NearbyStationCountControl
                    count={props.nearbyStationCount}
                    onChange={props.onNearbyStationCountChange}
                  />
                )}
              </SettingsMenu>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
