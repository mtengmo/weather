import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useWarningDismissal } from "../../src/hooks/useWarningDismissal";

describe("useWarningDismissal (032-dashboard-polish-round-seven, US4)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with an empty dismissed set when nothing has been dismissed before", () => {
    const { result } = renderHook(() => useWarningDismissal());
    expect(result.current.dismissedIds.size).toBe(0);
  });

  it("adds an id to dismissedIds when dismiss is called", () => {
    const { result } = renderHook(() => useWarningDismissal());

    act(() => result.current.dismiss("1-100"));

    expect(result.current.dismissedIds.has("1-100")).toBe(true);
  });

  it("persists a dismissal across a fresh hook instance (simulated reload)", () => {
    const { result: first } = renderHook(() => useWarningDismissal());
    act(() => first.current.dismiss("1-100"));

    const { result: second } = renderHook(() => useWarningDismissal());

    expect(second.current.dismissedIds.has("1-100")).toBe(true);
  });

  it("does not affect a different warning id", () => {
    const { result } = renderHook(() => useWarningDismissal());
    act(() => result.current.dismiss("1-100"));

    expect(result.current.dismissedIds.has("2-200")).toBe(false);
  });

  it("yields an empty set, never throws, when localStorage holds unparseable data", () => {
    localStorage.setItem("weather-app:dismissed-warnings:v1", "{not json");

    const { result } = renderHook(() => useWarningDismissal());

    expect(result.current.dismissedIds.size).toBe(0);
  });

  it("yields an empty set when localStorage holds a non-array value", () => {
    localStorage.setItem("weather-app:dismissed-warnings:v1", JSON.stringify({ not: "an array" }));

    const { result } = renderHook(() => useWarningDismissal());

    expect(result.current.dismissedIds.size).toBe(0);
  });
});
