import { useQuery } from "@tanstack/react-query";

type GovernanceStatus = "BLOCKED" | "HANDLE_WITH_CARE" | "CLEAR";

export interface GovernanceResult {
  status: GovernanceStatus;
  note?: string;
}

export type GovernanceMap = Record<string, GovernanceResult>;

async function fetchGovernance(emails: string[]): Promise<GovernanceMap> {
  if (emails.length === 0) return {};

  const res = await fetch("/api/contacts/governance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emails }),
  });

  if (!res.ok) return {};

  const json = await res.json();
  return (json.results as GovernanceMap) ?? {};
}

export function useGovernanceCheck(emails: string[]) {
  const sortedKey = [...emails].sort().join(",");

  return useQuery<GovernanceMap>({
    queryKey: ["governance", sortedKey],
    queryFn: () => fetchGovernance(emails),
    staleTime: 5 * 60 * 1000,
    enabled: emails.length > 0,
    placeholderData: {},
  });
}
