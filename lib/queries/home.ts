import type { HomeStatsResponse } from "@/app/api/home-stats/route";

export function homeStatsOptions() {
  return {
    queryKey: ["home", "stats"] as const,
    queryFn: async (): Promise<HomeStatsResponse> => {
      const res = await fetch("/api/home-stats");
      if (!res.ok) throw new Error("Failed to fetch home stats");
      const json = (await res.json()) as { data: HomeStatsResponse };
      return json.data;
    },
    staleTime: 60_000,
  };
}
