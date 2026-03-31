import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("smoke test", () => {
  it("cn utility merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("cn utility resolves Tailwind conflicts", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });
});
