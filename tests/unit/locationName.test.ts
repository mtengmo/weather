import { describe, expect, it } from "vitest";
import { placeNameOnly } from "../../src/services/locationName";

describe("placeNameOnly (049-show-only-place)", () => {
  it("keeps only the place from a full 'place, region, country' name", () => {
    expect(placeNameOnly("Uppsala, Uppsala County, Sweden")).toBe("Uppsala");
  });

  it("returns a bare name (no comma) unchanged", () => {
    expect(placeNameOnly("Uppsala")).toBe("Uppsala");
  });

  it("trims whitespace immediately after the first comma", () => {
    expect(placeNameOnly("Springfield,   Illinois, USA")).toBe("Springfield");
  });
});
