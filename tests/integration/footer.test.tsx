import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Footer from "../../src/components/Footer";

describe("Footer (016-dashboard-polish-round-two, US8)", () => {
  it("shows the current version", () => {
    render(<Footer series={null} lastUpdated={null} />);
    expect(screen.getByText(/Weather History v/)).toBeInTheDocument();
  });

  it("opens the privacy notice when 'Privacy' is clicked, and closes it again", async () => {
    const user = userEvent.setup();
    render(<Footer series={null} lastUpdated={null} />);

    expect(screen.queryByRole("dialog", { name: "Privacy notice" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Privacy" }));

    const dialog = screen.getByRole("dialog", { name: "Privacy notice" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/no backend server and no account/i);
    expect(dialog).toHaveTextContent(/anonymous usage statistics/i);

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog", { name: "Privacy notice" })).not.toBeInTheDocument();
  });
});

describe("Data source and freshness disclosure (018-dashboard-visual-redesign, US6)", () => {
  it("shows the source and freshness text when a series is present", () => {
    render(
      <Footer
        series={{
          location: { latitude: 59.33, longitude: 18.06, displayName: "Stockholm", source: "favorite" },
          window: "last-24-hours",
          status: "ready",
          observations: [],
          primarySource: "smhi",
        }}
        lastUpdated="2026-09-04T10:15:00.000Z"
      />
    );

    expect(screen.getByText(/SMHI observations/)).toBeInTheDocument();
    expect(screen.getByText(/Forecast updated/)).toBeInTheDocument();
  });

  it("shows no source/freshness text when there is no series", () => {
    render(<Footer series={null} lastUpdated={null} />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    expect(screen.getByText(/Weather History v/)).toBeInTheDocument();
  });
});

describe("Google Analytics tag present in index.html (016-dashboard-polish-round-two, US9)", () => {
  it("includes the gtag.js script with the configured measurement ID", () => {
    const html = readFileSync(join(process.cwd(), "index.html"), "utf-8");
    expect(html).toContain("googletagmanager.com/gtag/js?id=G-GPT0MTFG6S");
    expect(html).toContain("gtag('config', 'G-GPT0MTFG6S')");
  });
});
