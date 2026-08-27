import { describe, it, expect } from "vitest";
import { sanitizeText, sanitizeFileName } from "@/lib/sanitize";
import { checkRateLimit } from "@/lib/rate-limit";
import { validatePasswordStrength } from "@/lib/utils";

describe("Input Sanitization & XSS Prevention", () => {
  it("strips script tags and malicious event handlers from user text", () => {
    const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="stealCookies()">Hello World';
    const sanitized = sanitizeText(maliciousInput);

    expect(sanitized).not.toContain("<script>");
    expect(sanitized).not.toContain("</script>");
    expect(sanitized).toContain("&lt;script&gt;");
    expect(sanitized).toContain("Hello World");
  });

  it("strips null bytes and control characters to prevent injection", () => {
    const nullByteInput = "admin\0.password";
    const sanitized = sanitizeText(nullByteInput);
    expect(sanitized).toBe("admin.password");
  });

  it("sanitizes filenames against path traversal attacks", () => {
    const dangerousPath = "../../../etc/passwd.pdf";
    const cleanName = sanitizeFileName(dangerousPath);

    expect(cleanName).not.toContain("..");
    expect(cleanName).not.toContain("/");
    expect(cleanName).toContain("passwd.pdf");
  });
});

describe("API Sliding-Window Rate Limiting", () => {
  it("allows requests under the rate limit threshold", () => {
    const key = `test-ip-${Date.now()}`;
    const res1 = checkRateLimit(key, { maxRequests: 3, windowMs: 5000 });
    const res2 = checkRateLimit(key, { maxRequests: 3, windowMs: 5000 });

    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);
  });

  it("blocks requests exceeding the rate limit and provides retryAfter", () => {
    const key = `test-blocked-${Date.now()}`;
    checkRateLimit(key, { maxRequests: 2, windowMs: 5000 });
    checkRateLimit(key, { maxRequests: 2, windowMs: 5000 });
    const res3 = checkRateLimit(key, { maxRequests: 2, windowMs: 5000 });

    expect(res3.allowed).toBe(false);
    expect(res3.remaining).toBe(0);
    expect(res3.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("Password Complexity & Security", () => {
  it("enforces strong password policy", () => {
    expect(validatePasswordStrength("weak").valid).toBe(false);
    expect(validatePasswordStrength("12345678").valid).toBe(false);
    expect(validatePasswordStrength("NoSpecial123").valid).toBe(false);
    expect(validatePasswordStrength("Enterprise#Secure2026").valid).toBe(true);
  });
});
