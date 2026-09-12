// Initializes i18next before any test imports a component that calls useTranslation()/t()
// (064-swedish-translation) — mirrors src/main.tsx's own "./i18n" import, which tests never
// execute since they import components directly. Vitest runs this whole setup file to completion
// before any test file's own imports are evaluated, so this is safe regardless of position within
// this file — listed first anyway for consistency with main.tsx's own ordering.
import "../src/i18n";
import "@testing-library/jest-dom/vitest";
