import { NextRequest, NextResponse } from "next/server";
import {
  isRedisAvailable,
  getCacheStats,
  getL1Size,
} from "@/lib/cache/redis";

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const secret = process.env.API_SECRET;
  if (!secret) return false;
  return authHeader.slice(7) === secret;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redisAvailable = isRedisAvailable();
  let connected = false;
  let keyCount: number | null = null;

  if (redisAvailable) {
    // Dynamic import to access the Redis instance for ping/dbsize
    const { Redis } = await import("@upstash/redis");
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      const redis = new Redis({ url, token });
      try {
        const pong = await redis.ping();
        connected = pong === "PONG";
        keyCount = await redis.dbsize();
      } catch {
        connected = false;
      }
    }
  }

  const stats = getCacheStats();

  return NextResponse.json({
    redis: {
      connected,
      keyCount,
    },
    l1: {
      size: getL1Size(),
    },
    stats: {
      hits: stats.hits,
      misses: stats.misses,
      hitRate: stats.hitRate,
    },
  });
}
