# Contract: `<HowItWorks />` panel and `Footer`'s new control

## `<HowItWorks onClose={() => void} />`

**Contract**: Renders a `role="dialog"` element with an accessible name (e.g.
`aria-label="How this works"`), a visible close control that calls `onClose`, and static content
covering (per FR-002): what the app shows overall; the 24-hour/3-day/7-day views; the observed
vs. forecast visual distinction; the data sources and how they're combined; the UV risk
indicator; and the weather-warning banner. Reads no props beyond `onClose` — no data fetch, no
app state.

## `Footer`'s new button

**Contract**: A `<button type="button">` labeled "How this works" (or equivalent), positioned
alongside the existing "Privacy" button, toggling a local open/closed state that conditionally
renders `<HowItWorks onClose={...} />` — exactly mirroring how `privacyOpen`/`PrivacyNotice`
already work in the same file. Opening/closing this panel never changes any prop passed into
`Footer` and never triggers a re-fetch of `series`/`lastUpdated`/anything else the footer already
displays.
