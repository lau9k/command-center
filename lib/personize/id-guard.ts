/**
 * Detects Personize record IDs (REC#...) including URL-encoded variants.
 * Use this guard to prevent REC# IDs from reaching Supabase UUID queries.
 */
export function isPersonizeId(id: string): boolean {
  const decoded = decodeURIComponent(id);
  return decoded.startsWith("REC#") || decoded.startsWith("REC%23");
}
