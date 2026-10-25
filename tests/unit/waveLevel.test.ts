import { describe, expect, it } from "vitest";
import { waveHeightLevel } from "../../src/services/waveLevel";

describe("waveHeightLevel", () => {
  it.each([
    [0, 1],
    [0.49, 1],
    [0.5, 2],
    [0.99, 2],
    [1, 3],
    [1.99, 3],
    [2, 4],
    [3, 4],
    [3.01, 5],
    [8, 5],
  ])("%s m -> level %s", (m, level) => {
    expect(waveHeightLevel(m)).toBe(level);
  });
});
