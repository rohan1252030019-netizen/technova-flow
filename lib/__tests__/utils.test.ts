import { describe, it, expect } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatCurrency,
  initials,
  hoursLeft,
  timeUntil,
  isOverdue,
  avatarColor,
} from "@/lib/utils";

describe("formatDate", () => {
  it("returns an em dash for nullish input", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
  it("formats a date in en-IN locale", () => {
    const out = formatDate("2026-01-15");
    expect(out).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });
});

describe("formatRelative", () => {
  it("handles recent timestamps", () => {
    expect(formatRelative(new Date())).toBe("just now");
    expect(formatRelative(new Date(Date.now() - 5 * 60000))).toBe("5m ago");
    expect(formatRelative(new Date(Date.now() - 3 * 3600000))).toBe("3h ago");
    expect(formatRelative(new Date(Date.now() - 2 * 86400000))).toBe("2d ago");
  });
  it("falls back to date for very old timestamps", () => {
    const old = new Date("2020-01-01");
    expect(formatRelative(old)).toMatch(/\d{2}\s\w{3}\s\d{4}/);
  });
});

describe("formatCurrency", () => {
  it("formats INR with Indian grouping", () => {
    expect(formatCurrency(125000)).toContain("1,25,000");
  });
  it("handles null", () => {
    expect(formatCurrency(null)).toBe("—");
  });
  it("formats other currencies", () => {
    expect(formatCurrency(1000, "USD")).toContain("$1,000");
  });
});

describe("initials", () => {
  it("builds up to two uppercase initials", () => {
    expect(initials("rahul kumar")).toBe("RK");
    expect(initials("Aarav Sharma")).toBe("AS");
    expect(initials("single")).toBe("S");
  });
});

describe("SLA helpers", () => {
  it("computes hours remaining", () => {
    const future = new Date(Date.now() + 7200000);
    expect(hoursLeft(future)).toBe(2);
    expect(hoursLeft(null)).toBeNull();
  });
  it("formats time until a deadline", () => {
    expect(timeUntil(null)).toBe("No deadline");
    expect(timeUntil(new Date(Date.now() + 2 * 3600000))).toBe("2h remaining");
    expect(timeUntil(new Date(Date.now() + 50 * 3600000))).toBe("2d 2h remaining");
    expect(timeUntil(new Date(Date.now() - 4 * 3600000))).toContain("Overdue");
  });
  it("detects overdue deadlines", () => {
    expect(isOverdue(new Date(Date.now() - 1000))).toBe(true);
    expect(isOverdue(new Date(Date.now() + 1000))).toBe(false);
    expect(isOverdue(null)).toBe(false);
  });
});

describe("avatarColor", () => {
  it("returns a stable color per name", () => {
    expect(avatarColor("Aarav Sharma")).toBe(avatarColor("Aarav Sharma"));
    expect(avatarColor("Aarav Sharma")).not.toBe(avatarColor("Priya Nair"));
  });
});