import DOMPurify from "dompurify";

/**
 * Sanitize untrusted text content.
 * Strips all HTML tags by default (plain text output).
 */
export function sanitizeText(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize HTML content, allowing safe tags only.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") return dirty;
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
      "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}
