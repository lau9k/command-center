import type { HomeStatsResponse } from "@/app/api/home-stats/route";
import { notifyApiError } from "@/lib/notify-api-error";

export function homeStatsOptions() {
  return {
    queryKey: ["home", "stats"] as const,
    queryFn: async (): Promise<HomeStatsResponse> => {
      const res = await fetch("/api/home-stats");
      if (!res.ok) throw new Error("Failed to fetch home stats");
      const json = (await res.json()) as {
        data: HomeStatsResponse;
        warnings?: string[];
      };
      if (json.warnings?.length) {
        for (const label of json.warnings) {
          notifyApiError(label, new Error(`${label} query failed`));
        }
      }
      return json.data;
    },
    staleTime: 60_000,
  };
}
