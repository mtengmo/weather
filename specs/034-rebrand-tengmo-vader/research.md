# Research: Rebrand to Tengmo Väder

## Decision: Icon regeneration approach

**Decision**: Reuse the existing scratchpad `imgtools/resize.mjs` (sharp-based) script pattern that
originally produced the current `public/*.png` set from `docs/logos/tengmovader_icon.png`, pointed
at `docs/logos/tengmovader_icon_transluent.png` instead, writing the same five output files at the
same sizes (16, 32, 180, 192, 512).

**Rationale**: `public/*.png` are committed static binaries, not generated at build time — there is
no in-repo build step to hook into. The prior branding pass already established this exact
resize-and-commit workflow for this exact icon family, so repeating it keeps the two consistent.

**Alternatives considered**: Adding an npm dependency (`sharp`) to the project itself to regenerate
icons as part of `npm run build` — rejected as scope creep; the project has never generated its own
favicons at build time, and doing so now is unrelated to this rebrand.

## Decision: Domain cutover scope

**Decision**: Update only `public/CNAME` and the one runtime string that embeds the old domain
(`src/services/geocoding.ts`'s reverse-geocoding user-agent). No redirect from
`weather.tengmo.com` is configured.

**Rationale**: GitHub Pages serves exactly one custom domain per repo (from `public/CNAME`); the
user has already added the new DNS record and did not ask for the old domain to keep working. This
matches the spec's Assumptions section.

**Alternatives considered**: Keeping both domains alive via a redirect — out of scope per the
spec's explicit assumption; would require action outside this repo (on the old domain's own DNS/host),
which the user has not requested.

## Decision: Manifest `short_name`

**Decision**: Use `"Tengmo Väder"` for both `name` and `short_name` in the PWA manifest (`å`/`ä`
render fine in home-screen labels on evergreen mobile OSes; length is well under typical
`short_name` truncation limits of ~12 characters used by Android/iOS home screens... actually 12
chars is tight). Re-evaluated: use `"Tengmo Väder"` for `name` and `"TengmoVäder"` (no space) for
`short_name` to stay closer to common `short_name` length guidance, matching the FR-003 allowance.

**Rationale**: FR-003 explicitly allows a short_name variant "if length constraints apply" —
`short_name` is used for the home-screen label under the icon, where shorter names avoid
truncation.

**Alternatives considered**: Reusing "Weather" as a generic short_name — rejected, contradicts the
rebrand's intent (SC-001 requires the old name gone everywhere user-visible).
