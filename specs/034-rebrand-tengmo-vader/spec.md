# Feature Specification: Rebrand to Tengmo Väder

**Feature Branch**: `034-rebrand-tengmo-vader`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "could you add tengmovader_icons_transluent to the site? Rename the site to Tengmo Väder. can you also change google pages to vader.tengmo.com ? I have added the cname record for github."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - App carries the new name and logo (Priority: P1)

A visitor opens the app and sees it identified as "Tengmo Väder" — in the browser tab title, the installed PWA name/icon, and the footer version line — instead of the old "Weather History" name, with the new translucent Tengmo Väder logo used as the app's icon/branding image.

**Why this priority**: This is the core of the rebrand; without it the other changes (domain, asset) have no visible effect.

**Independent Test**: Load the app and inspect the browser tab title, footer text, and PWA manifest name/icon — all show "Tengmo Väder" branding and the new icon.

**Acceptance Scenarios**:

1. **Given** the app is loaded in a browser, **When** the user looks at the browser tab, **Then** the title reads "Tengmo Väder" (not "Weather History").
2. **Given** the app is loaded, **When** the user scrolls to the footer, **Then** it reads "Tengmo Väder v{version}" (not "Weather History v{version}").
3. **Given** a user installs the app as a PWA, **When** it is added to their home screen/app list, **Then** the app name shown is "Tengmo Väder" and its icon is the new translucent Tengmo Väder icon (replacing the prior favicon/PWA icons).

---

### User Story 2 - Site is reachable at the new domain (Priority: P2)

A visitor navigates to `vader.tengmo.com` and reaches the live app, since the user has already configured the DNS CNAME record on their end for this new subdomain pointing at GitHub Pages.

**Why this priority**: Depends on the DNS change the user already made outside this repo; the repo-side change (GitHub Pages custom domain config) is what completes the cutover, so it naturally follows the branding work.

**Independent Test**: After deployment, `vader.tengmo.com` resolves to the deployed GitHub Pages site.

**Acceptance Scenarios**:

1. **Given** the DNS CNAME record for `vader.tengmo.com` already points at the project's GitHub Pages host, **When** GitHub Pages is configured with `vader.tengmo.com` as its custom domain (via the repository's `public/CNAME` file), **Then** the site is served at `https://vader.tengmo.com/`.
2. **Given** the domain has changed, **When** the build is produced, **Then** no part of the app hardcodes the old `weather.tengmo.com` domain in a way that would break functionality (e.g., API user-agent strings referencing the old domain are updated to the new one).

---

### Edge Cases

- What happens to the old `weather.tengmo.com` URL after the cutover? Out of scope for this feature — no redirect is being set up; the user has only added the new CNAME. (Documented as an assumption below.)
- The new icon asset (`tengmovader_icon_transluent.png`) is a large source PNG (~1MB, from `docs/logos/`) — it must be resized/optimized into the actual favicon/PWA icon sizes the build already generates from source icons, not shipped at full size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display "Tengmo Väder" as the page `<title>` shown in the browser tab.
- **FR-002**: The system MUST display "Tengmo Väder" (not "Weather History") in the footer's version line, preserving the existing `v{APP_VERSION}` suffix behavior.
- **FR-003**: The system MUST use "Tengmo Väder" as the PWA manifest's `name` (and a suitably short `short_name`, e.g. "Tengmo Väder" or "TengmoVäder" if length constraints apply).
- **FR-004**: The system MUST use the new translucent Tengmo Väder icon (`docs/logos/tengmovader_icon_transluent.png`) as the source image for the site's favicon and PWA app icons, replacing whatever icon source is currently configured.
- **FR-005**: The system MUST serve the site from the custom domain `vader.tengmo.com` (via the `public/CNAME` file consumed by GitHub Pages), replacing the previous `weather.tengmo.com` value.
- **FR-006**: The system MUST update any other in-repo reference to the old domain name that affects runtime behavior (e.g., the reverse-geocoding API user-agent string) to reference the new domain instead.
- **FR-007**: The system MUST update the project's `README.md` title/heading to reflect the new "Tengmo Väder" name.

### Key Entities

- **Brand identity**: The display name ("Tengmo Väder") and icon asset (`tengmovader_icon_transluent.png`) used across the page title, footer, and PWA manifest.
- **Custom domain**: The GitHub Pages custom domain value (`vader.tengmo.com`), stored in `public/CNAME`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of user-facing occurrences of the old app name ("Weather History") in the browser tab title, footer, and PWA manifest are replaced with "Tengmo Väder".
- **SC-002**: The app's favicon/installed-app icon visually matches the new translucent Tengmo Väder logo within one deployment cycle.
- **SC-003**: After deployment, `https://vader.tengmo.com/` successfully loads the app with no broken assets (verified by a live check of the deployed site).

## Assumptions

- "Tengmo Väder" replaces "Weather History" everywhere the old name is user-visible (tab title, footer, PWA manifest) — this is a full rebrand, not a partial/cosmetic addition alongside the old name.
- The exact source file the user meant by "tengmovader_icons_transluent" is `docs/logos/tengmovader_icon_transluent.png` (the only matching file in `docs/logos/`; the user's phrasing has minor typos consistent with prior messages in this project).
- No HTTP redirect from the old `weather.tengmo.com` domain to the new `vader.tengmo.com` domain is being set up as part of this feature — only the new domain is configured. Setting up a redirect (e.g., via DNS/CNAME on the old domain) is the user's own responsibility outside this repo, since GitHub Pages only serves one custom domain (from `public/CNAME`) at a time.
- The user has already created the DNS CNAME record for `vader.tengmo.com` pointing at GitHub Pages (per their message); no DNS/domain-registrar action is required from this feature, only the repository-side `public/CNAME` update.
- The existing PWA icon generation pipeline (already producing multiple icon sizes from a source image, per `vite-plugin-pwa` config) can be pointed at the new source image without needing a new pipeline.
