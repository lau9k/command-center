import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getGitHubStats } from "@/lib/github";
import { withErrorHandler } from "@/lib/api-error-handler";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const GITHUB_OWNER = "lau9k";
const GITHUB_REPO = "command-center";

export const GET = withErrorHandler(async function GET() {
  const supabase = createServiceClient();

  // 1. Check for a recent cached row (< 10 min old)
  const { data: cached } = await supabase
    .from("github_stats")
    .select(
      "total_prs, merged_prs, open_prs, merge_rate, last_commit_sha, last_commit_message, last_commit_date, build_status, fetched_at"
    )
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return NextResponse.json({
        totalPRs: cached.total_prs,
        mergedPRs: cached.merged_prs,
        openPRs: cached.open_prs,
        mergeRate: cached.merge_rate,
        lastCommitSha: cached.last_commit_sha,
        lastCommitMessage: cached.last_commit_message,
        lastCommitDate: cached.last_commit_date,
        buildStatus: cached.build_status,
        fetchedAt: cached.fetched_at,
        source: "cache",
      });
    }
  }

  // 2. Cache is stale or missing — call GitHub API
  const stats = await getGitHubStats(GITHUB_OWNER, GITHUB_REPO);

  if (!stats) {
    // GitHub API unreachable — return last cached value if available
    if (cached) {
      return NextResponse.json({
        totalPRs: cached.total_prs,
        mergedPRs: cached.merged_prs,
        openPRs: cached.open_prs,
        mergeRate: cached.merge_rate,
        lastCommitSha: cached.last_commit_sha,
        lastCommitMessage: cached.last_commit_message,
        lastCommitDate: cached.last_commit_date,
        buildStatus: cached.build_status,
        fetchedAt: cached.fetched_at,
        source: "stale-cache",
      });
    }
    return NextResponse.json(
      { error: "GitHub API unreachable and no cached data available" },
      { status: 503 }
    );
  }

  // 3. Insert fresh stats into Supabase cache
  const { error: insertError } = await supabase
    .from("github_stats")
    .insert({
      total_prs: stats.totalPRs,
      merged_prs: stats.mergedPRs,
      open_prs: stats.openPRs,
      merge_rate: stats.mergeRate,
      last_commit_sha: stats.lastCommitSha,
      last_commit_message: stats.lastCommitMessage,
      last_commit_date: stats.lastCommitDate,
      build_status: stats.buildStatus,
      fetched_at: stats.fetchedAt,
    });

  if (insertError) {
    console.error("[github/stats] Failed to cache stats:", insertError.message);
  }

  return NextResponse.json({
    totalPRs: stats.totalPRs,
    mergedPRs: stats.mergedPRs,
    openPRs: stats.openPRs,
    mergeRate: stats.mergeRate,
    lastCommitSha: stats.lastCommitSha,
    lastCommitMessage: stats.lastCommitMessage,
    lastCommitDate: stats.lastCommitDate,
    buildStatus: stats.buildStatus,
    fetchedAt: stats.fetchedAt,
    source: "live",
  });
});
