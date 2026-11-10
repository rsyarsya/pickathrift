import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("mempertahankan token tipografi saat dipasangkan dengan warna", () => {
    expect(cn("text-hero", "text-muted")).toBe("text-hero text-muted");
    expect(cn("text-helper", "text-success")).toBe("text-helper text-success");
  });

  it("memakai kelas terakhir untuk tiap kelompok yang bentrok", () => {
    expect(cn("text-page", "text-muted", "text-card", "text-brand")).toBe("text-card text-brand");
  });
});
