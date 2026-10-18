import { describe, expect, it } from "vitest";
import { stripStationAutoSuffix } from "../../src/services/locationName";

describe("stripStationAutoSuffix", () => {
  it("removes a trailing ' Aut' automatic-station marker", () => {
    expect(stripStationAutoSuffix("Uppsala Aut")).toBe("Uppsala");
  });

  it("removes a trailing ' A' automatic-station marker", () => {
    expect(stripStationAutoSuffix("Stockholm A")).toBe("Stockholm");
  });

  it("leaves names without the marker unchanged", () => {
    expect(stripStationAutoSuffix("Uppsala")).toBe("Uppsala");
    expect(stripStationAutoSuffix("Uppsala Flygplats")).toBe("Uppsala Flygplats");
  });

  it("only strips a whole trailing word, not a fragment of one", () => {
    expect(stripStationAutoSuffix("Vidsel Aut")).toBe("Vidsel");
    expect(stripStationAutoSuffix("Lidingö Aut")).toBe("Lidingö");
    expect(stripStationAutoSuffix("Nordaut")).toBe("Nordaut");
    expect(stripStationAutoSuffix("Aust")).toBe("Aust");
  });

  it("is case-sensitive to SMHI's convention", () => {
    expect(stripStationAutoSuffix("Uppsala aut")).toBe("Uppsala aut");
    expect(stripStationAutoSuffix("Uppsala a")).toBe("Uppsala a");
  });

  it("does not strip a name that is only the marker", () => {
    expect(stripStationAutoSuffix("Aut")).toBe("Aut");
    expect(stripStationAutoSuffix("A")).toBe("A");
  });
});
