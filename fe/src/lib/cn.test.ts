import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("mempertahankan token tipografi saat dipasangkan dengan warna", () => {
    expect(cn("text-display", "text-muted")).toBe("text-display text-muted");
    expect(cn("text-caption", "text-success")).toBe("text-caption text-success");
  });

  it("memakai kelas terakhir untuk tiap kelompok yang bentrok", () => {
    expect(cn("text-title", "text-muted", "text-card", "text-brand")).toBe("text-card text-brand");
  });
});
