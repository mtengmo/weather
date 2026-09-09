/** Shortens a location's full "place, region, country" name (as built by `geocodingApi.ts` for
 *  search results) down to just the place itself — everything before the first comma. A name
 *  with no comma (already bare) is returned unchanged. Used wherever a *selected* location's
 *  name is shown, as opposed to a search-results list, which keeps the full disambiguating form
 *  (049-show-only-place). */
export function placeNameOnly(fullName: string): string {
  const commaIndex = fullName.indexOf(",");
  return commaIndex === -1 ? fullName : fullName.slice(0, commaIndex).trim();
}
