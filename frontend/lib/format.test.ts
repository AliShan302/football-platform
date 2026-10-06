import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("Pakistan time formatting", () => {
  it("converts UTC timestamps to Pakistan Standard Time", () => {
    expect(formatDateTime("2026-10-06T23:30:00Z")).toBe("7 Oct 2026, 04:30 PKT");
  });

  it("formats calendar dates consistently in the Pakistan timezone", () => {
    expect(formatDate("2026-10-07")).toBe("7 Oct 2026");
  });
});
