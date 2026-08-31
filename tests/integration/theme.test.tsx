import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemePicker from "../../src/components/ThemePicker";
import { useThemePreference } from "../../src/hooks/useThemePreference";

function ThemeHarness() {
  const { theme, setTheme } = useThemePreference();
  return (
    <div>
      <p data-testid="active-theme">{theme}</p>
      <ThemePicker theme={theme} onChange={setTheme} />
    </div>
  );
}

describe("ThemePicker + useThemePreference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to Midnight and applies data-theme on mount", () => {
    render(<ThemeHarness />);

    expect(screen.getByRole("button", { name: "Midnight" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
  });

  it("switching themes updates the active theme and the data-theme attribute", async () => {
    render(<ThemeHarness />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Bright" }));

    expect(screen.getByTestId("active-theme")).toHaveTextContent("ivory");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ivory");
    expect(screen.getByRole("button", { name: "Bright" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Midnight" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );

    await user.click(screen.getByRole("button", { name: "Glass" }));
    expect(document.documentElement.getAttribute("data-theme")).toBe("glass");
  });

  it("persists the selected theme across a fresh render (reload)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeHarness />);

    await user.click(screen.getByRole("button", { name: "Glass" }));
    unmount();

    render(<ThemeHarness />);
    expect(screen.getByTestId("active-theme")).toHaveTextContent("glass");
    expect(screen.getByRole("button", { name: "Glass" })).toHaveAttribute("aria-pressed", "true");
  });
});
