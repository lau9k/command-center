/** System tags hidden from all UI surfaces. */
export const SYSTEM_TAGS: string[] = ["personize-contact", "email-draft-ready"];

/** Friendly display labels for known tags. */
export const TAG_LABELS: Record<string, string> = {
  "social-services-hack": "Social Services Hack",
  tier2: "Tier 2",
  tier4: "Tier 4",
};

/** Tailwind color classes keyed by tag slug. */
export const TAG_COLORS: Record<string, string> = {
  outreach: "bg-blue-100 text-blue-800",
  hackathon: "bg-purple-100 text-purple-800",
  "social-services-hack": "bg-green-100 text-green-800",
  tier2: "bg-amber-100 text-amber-800",
  tier4: "bg-orange-100 text-orange-800",
};

/** Filter out system tags and "outreach" for display purposes. */
export function getDisplayTags(tags: string[]): string[] {
  const hidden = new Set([...SYSTEM_TAGS, "outreach"]);
  return tags.filter((tag) => !hidden.has(tag));
}

/** Return a friendly label for a tag, falling back to title-case. */
export function getTagLabel(tag: string): string {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
