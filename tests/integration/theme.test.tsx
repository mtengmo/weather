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

  it("defaults to Dark and applies data-theme on mount", () => {
    render(<ThemeHarness />);

    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
  });

  it("switching themes updates the active theme and the data-theme attribute in one click", async () => {
    render(<ThemeHarness />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Dark" }));

    expect(screen.getByTestId("active-theme")).toHaveTextContent("ivory");
    expect(document.documentElement.getAttribute("data-theme")).toBe("ivory");
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Light" }));

    expect(screen.getByTestId("active-theme")).toHaveTextContent("midnight");
    expect(document.documentElement.getAttribute("data-theme")).toBe("midnight");
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
  });

  it("persists the selected theme across a fresh render (reload)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ThemeHarness />);

    await user.click(screen.getByRole("button", { name: "Dark" }));
    unmount();

    render(<ThemeHarness />);
    expect(screen.getByTestId("active-theme")).toHaveTextContent("ivory");
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
  });
});
