import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "../../src/components/ThemeToggle";
import { useThemePreference } from "../../src/hooks/useThemePreference";

function ThemeHarness() {
  const { theme, setTheme } = useThemePreference();
  return (
    <div>
      <p data-testid="active-theme">{theme}</p>
      <ThemeToggle theme={theme} onThemeChange={setTheme} />
    </div>
  );
}

describe("ThemeToggle + useThemePreference", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to dark (midnight) and labels the item with the current theme, 'Theme: Dark'", () => {
    render(<ThemeHarness />);

    expect(screen.getByRole("menuitem", { name: /^Theme: Dark/ })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
  });

  it("switching themes updates the active theme, the data-theme attribute, and the button's destination label", async () => {
    render(<ThemeHarness />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("menuitem", { name: /^Theme: Dark/ }));

    expect(screen.getByTestId("active-theme")).toHaveTextContent("ivory");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ivory");
    expect(screen.getByRole("menuitem", { name: /^Theme: Light/ })).toBeInTheDocument();

    await user.click(screen.getByRole("menuitem", { name: /^Theme: Light/ }));

    expect(screen.getByTestId("active-theme")).toHaveTextContent("midnight");
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    expect(screen.getByRole("menuitem", { name: /^Theme: Dark/ })).toBeInTheDocument();
  });

  it("persists the selected theme across a fresh render (reload)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeHarness />);

    await user.click(screen.getByRole("menuitem", { name: /^Theme: Dark/ }));
    unmount();

    render(<ThemeHarness />);
    expect(screen.getByTestId("active-theme")).toHaveTextContent("ivory");
    expect(screen.getByRole("menuitem", { name: /^Theme: Light/ })).toBeInTheDocument();
  });
});
