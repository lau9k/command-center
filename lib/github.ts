import "server-only";

export interface GitHubRepoStats {
  totalPRs: number;
  mergedPRs: number;
  openPRs: number;
  mergeRate: number;
  lastCommitSha: string | null;
  lastCommitMessage: string | null;
  lastCommitDate: string | null;
  buildStatus: "success" | "failure" | "pending" | "unknown";
  fetchedAt: string;
}

interface GitHubPR {
  state: string;
  merged_at: string | null;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    committer: { date: string } | null;
  };
}

interface GitHubWorkflowRun {
  conclusion: string | null;
  status: string;
}

interface GitHubWorkflowRunsResponse {
  workflow_runs: GitHubWorkflowRun[];
}

const GITHUB_API_BASE = "https://api.github.com";

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function githubFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: getHeaders(),
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.error(`[GitHub API] ${path} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`[GitHub API] fetch failed for ${path}:`, err);
    return null;
  }
}

export async function getPRStats(
  owner: string,
  repo: string
): Promise<{ totalPRs: number; mergedPRs: number; openPRs: number; mergeRate: number } | null> {
  // Fetch closed PRs (includes merged) and open PRs in parallel
  const [closedPRs, openPRs] = await Promise.all([
    githubFetch<GitHubPR[]>(
      `/repos/${owner}/${repo}/pulls?state=closed&per_page=100`
    ),
    githubFetch<GitHubPR[]>(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=100`
    ),
  ]);

  if (!closedPRs || !openPRs) return null;

  const mergedCount = closedPRs.filter((pr) => pr.merged_at !== null).length;
  const totalCount = closedPRs.length + openPRs.length;
  const mergeRate = totalCount > 0 ? Math.round((mergedCount / totalCount) * 100) : 0;

  return {
    totalPRs: totalCount,
    mergedPRs: mergedCount,
    openPRs: openPRs.length,
    mergeRate,
  };
}

export async function getRepoStats(
  owner: string,
  repo: string
): Promise<{
  lastCommitSha: string | null;
  lastCommitMessage: string | null;
  lastCommitDate: string | null;
  buildStatus: "success" | "failure" | "pending" | "unknown";
} | null> {
  const [commits, runs] = await Promise.all([
    githubFetch<GitHubCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=1`
    ),
    githubFetch<GitHubWorkflowRunsResponse>(
      `/repos/${owner}/${repo}/actions/runs?per_page=1`
    ),
  ]);

  const latestCommit = commits?.[0] ?? null;
  const latestRun = runs?.workflow_runs?.[0] ?? null;

  let buildStatus: "success" | "failure" | "pending" | "unknown" = "unknown";
  if (latestRun) {
    if (latestRun.conclusion === "success") buildStatus = "success";
    else if (latestRun.conclusion === "failure") buildStatus = "failure";
    else if (latestRun.status === "in_progress" || latestRun.status === "queued")
      buildStatus = "pending";
  }

  return {
    lastCommitSha: latestCommit?.sha ?? null,
    lastCommitMessage: latestCommit?.commit.message ?? null,
    lastCommitDate: latestCommit?.commit.committer?.date ?? null,
    buildStatus,
  };
}

export async function getGitHubStats(
  owner: string,
  repo: string
): Promise<GitHubRepoStats | null> {
  const [prStats, repoStats] = await Promise.all([
    getPRStats(owner, repo),
    getRepoStats(owner, repo),
  ]);

  if (!prStats && !repoStats) return null;

  return {
    totalPRs: prStats?.totalPRs ?? 0,
    mergedPRs: prStats?.mergedPRs ?? 0,
    openPRs: prStats?.openPRs ?? 0,
    mergeRate: prStats?.mergeRate ?? 0,
    lastCommitSha: repoStats?.lastCommitSha ?? null,
    lastCommitMessage: repoStats?.lastCommitMessage ?? null,
    lastCommitDate: repoStats?.lastCommitDate ?? null,
    buildStatus: repoStats?.buildStatus ?? "unknown",
    fetchedAt: new Date().toISOString(),
  };
}
