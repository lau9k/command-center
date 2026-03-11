import "server-only";

const LATE_SO_API_URL = "https://api.late.so";

interface LatesoPostPayload {
  text: string;
  platform: string;
  scheduledFor?: string;
}

interface LatesoPostResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

function getApiKey(): string {
  const key = process.env.LATE_SO_API_KEY;
  if (!key) {
    throw new Error("LATE_SO_API_KEY is not configured");
  }
  return key;
}

export async function createPost(
  payload: LatesoPostPayload
): Promise<LatesoPostResponse> {
  const res = await fetch(`${LATE_SO_API_URL}/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      text: payload.text,
      platform: payload.platform,
      scheduledFor: payload.scheduledFor,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Late.so API error (${res.status}): ${body}`
    );
  }

  return res.json() as Promise<LatesoPostResponse>;
}
