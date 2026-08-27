/**
 * Input sanitization and XSS prevention utilities
 */

/**
 * Strips dangerous HTML tags, script blocks, event handlers, and null bytes from text inputs.
 */
export function sanitizeText(input: string | null | undefined, maxLength = 5000): string {
  if (!input || typeof input !== "string") return "";

  let clean = input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters (except newline, carriage return, and tab)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Encode HTML entities for script injection protection
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();

  if (clean.length > maxLength) {
    clean = clean.slice(0, maxLength);
  }

  return clean;
}

/**
 * Sanitizes filenames to prevent path traversal and shell injection
 */
export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== "string") return "attachment";

  return name
    // Strip null bytes and path traversal patterns
    .replace(/\0/g, "")
    .replace(/\.\./g, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}
