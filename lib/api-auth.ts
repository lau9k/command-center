/**
 * Validates the API key from the Authorization header against the
 * DASHBOARD_API_KEY environment variable.
 */
export function validateApiKey(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const expected = process.env.DASHBOARD_API_KEY;
  if (!expected) return false;

  return token === expected;
}
