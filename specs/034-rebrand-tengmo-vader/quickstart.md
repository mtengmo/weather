# Quickstart: Rebrand to Tengmo Väder

## Prerequisites

- Dependencies installed (`npm install`)
- The new DNS CNAME record for `vader.tengmo.com` already points at this repo's GitHub Pages host
  (done by the user outside this repo)

## Validation scenarios

1. **Branding, local dev**
   - Run `npm run dev`, open the app in a browser.
   - Expected: browser tab title reads "Tengmo Väder"; footer reads "Tengmo Väder v{version}".

2. **Branding, tests**
   - Run `npm run test`.
   - Expected: all tests pass, including the updated `tests/integration/footer.test.tsx` and
     `tests/integration/appHeader.test.tsx` assertions for "Tengmo Väder".

3. **Icons**
   - Inspect `public/favicon-16.png`, `public/favicon-32.png`, `public/apple-touch-icon.png`,
     `public/icon-192.png`, `public/icon-512.png`.
   - Expected: all five visually match the translucent Tengmo Väder logo
     (`docs/logos/tengmovader_icon_transluent.png`), not the prior icon.

4. **Domain**
   - Inspect `public/CNAME`.
   - Expected: contains exactly `vader.tengmo.com`.
   - After deployment (GitHub Pages rebuild via the existing CI workflow), load
     `https://vader.tengmo.com/` in a browser.
   - Expected: the live app loads with no broken assets and shows the new branding/icons.

5. **Build**
   - Run `npm run build`.
   - Expected: build succeeds with no type errors.
