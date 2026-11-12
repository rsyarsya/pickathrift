import { describe, expect, it } from "vitest";
import { ratingSummary, reviewEligibility, validateReview } from "./review";

describe("ulasan Buyer", () => {
  it("membuka ulasan hanya untuk pesanan selesai yang belum pernah diulas", () => {
    expect(reviewEligibility({ status: "DIKIRIM" })).toBe("locked");
    expect(reviewEligibility({ status: "DIBATALKAN" })).toBe("locked");
    expect(reviewEligibility({ status: "SELESAI" })).toBe("ready");
    expect(
      reviewEligibility({
        status: "SELESAI",
        review: { rating: 4, body: "Barang bagus.", author: "Dinda", createdAt: 0 },
      }),
    ).toBe("sent");
  });

  it("memvalidasi rating bulat dan panjang isi ulasan", () => {
    expect(validateReview({ rating: 0, body: "  Bagus  " })).toEqual({
      rating: "Pilih bintang dulu.",
      body: "Minimal 10 karakter. Kurang 5 lagi.",
    });
    expect(validateReview({ rating: 4.5, body: "a".repeat(501) })).toHaveProperty("body");
    expect(validateReview({ rating: 5, body: "a".repeat(500) })).toEqual({});
  });

  it("menghitung ringkasan dari ulasan yang tersedia", () => {
    const summary = ratingSummary([{ rating: 5 }, { rating: 5 }, { rating: 2 }]);
    expect(summary.total).toBe(3);
    expect(summary.average).toBe(4);
    expect(summary.distribution.find(({ rating }) => rating === 5)?.percent).toBe(67);
    expect(ratingSummary([]).average).toBe(0);
  });
});
