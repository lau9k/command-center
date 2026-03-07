export interface SessionPromptConfig {
  label: string;
  files: string[];
  sessionDir: string;
  focusAreas: string[];
}

export const OPERATING_RULES = [
  "Separate outputs by audience (tickets vs prompts vs strategy)",
  "Perplexity research is user's job — give prompts, don't embed",
  "Cyrus tickets are specs only",
  "Ask before multi-topic responses",
  "Session handoff mandatory at end",
];

export const SESSION_PROMPTS: Record<string, SessionPromptConfig> = {
  general: {
    label: "General",
    files: [
      "CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "20-areas/infrastructure/notes/sessions/",
    focusAreas: [
      "Infrastructure",
      "Personize",
      "MEEK",
      "Hackathons",
      "Eventium",
      "Telco",
      "Cleanup",
    ],
  },
  personize: {
    label: "Personize",
    files: [
      "CLAUDE.md",
      "10-personize/CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "10-personize/notes/sessions/",
    focusAreas: [
      "SDK integration",
      "Memory pipeline",
      "Sales",
      "LinkedIn import",
    ],
  },
  meek: {
    label: "MEEK",
    files: [
      "CLAUDE.md",
      "11-meek/CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "11-meek/notes/sessions/",
    focusAreas: [
      "Telegram bot",
      "Community growth",
      "Content pipeline",
      "Token strategy",
    ],
  },
  hackathons: {
    label: "Hackathons",
    files: [
      "CLAUDE.md",
      "12-hackathons/CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "12-hackathons/notes/sessions/",
    focusAreas: [
      "Upcoming events",
      "Project submissions",
      "Team coordination",
    ],
  },
  eventium: {
    label: "Eventium",
    files: [
      "CLAUDE.md",
      "13-eventium/CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "13-eventium/notes/sessions/",
    focusAreas: [
      "Platform development",
      "Event management",
      "Integrations",
    ],
  },
  telco: {
    label: "Telco",
    files: [
      "CLAUDE.md",
      "14-telco/CLAUDE.md",
      "00-meta/DECISIONS.md",
      "00-meta/PATTERNS.md",
    ],
    sessionDir: "14-telco/notes/sessions/",
    focusAreas: [
      "Infrastructure",
      "Billing",
      "Network operations",
    ],
  },
};

export function buildSessionPrompt(config: SessionPromptConfig): string {
  const lines: string[] = [];

  lines.push("# Cowork Session Startup");
  lines.push("");
  lines.push("## Read these files first:");
  for (const file of config.files) {
    lines.push(`- Read \`${file}\``);
  }
  lines.push(`- Read the latest file from \`${config.sessionDir}\``);
  if (config.files.includes("00-meta/DECISIONS.md")) {
    lines.push("- From DECISIONS.md, focus on the last 15 entries");
  }

  lines.push("");
  lines.push("## Focus Areas:");
  for (const area of config.focusAreas) {
    lines.push(`- [ ] ${area}`);
  }

  lines.push("");
  lines.push("## Operating Rules:");
  for (const rule of OPERATING_RULES) {
    lines.push(`- ${rule}`);
  }

  lines.push("");
  lines.push("## Instructions:");
  lines.push(
    "Review the session notes and context files above, then help me work through the focus areas. " +
    "Start by summarizing what you see in the latest session file and any key decisions or patterns to be aware of."
  );

  return lines.join("\n");
}
