export function log(action: string, details?: string): void {
  const timestamp = new Date().toISOString();
  const message = details ? `[${timestamp}] ${action}: ${details}` : `[${timestamp}] ${action}`;
  console.log(message);
}

export function logError(action: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`[${timestamp}] ERROR ${action}: ${errorMsg}`);
}
