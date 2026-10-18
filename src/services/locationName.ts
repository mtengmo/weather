/** Shortens a location's full "place, region, country" name (as built by `geocodingApi.ts` for
 *  search results) down to just the place itself — everything before the first comma. A name
 *  with no comma (already bare) is returned unchanged. Used wherever a *selected* location's
 *  name is shown, as opposed to a search-results list, which keeps the full disambiguating form
 *  (049-show-only-place). */
export function placeNameOnly(fullName: string): string {
  const commaIndex = fullName.indexOf(",");
  return commaIndex === -1 ? fullName : fullName.slice(0, commaIndex).trim();
}

/** SMHI appends an " Aut" (automatic station) or " A" marker to some station names, e.g.
 *  "Uppsala Aut". This drops only that trailing marker, for display. Case-sensitive on purpose:
 *  it matches SMHI's exact convention, so a real name ending in e.g. "a" is untouched. A name
 *  that is nothing but the marker is returned unchanged. */
export function stripStationAutoSuffix(stationName: string): string {
  return stationName.replace(/^(.*\S)\s+(?:Aut|A)$/, "$1");
}
