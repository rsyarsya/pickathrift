import { describe, expect, it } from "vitest";
import { orderCode } from "@/modules/admin/components/OrderParts";
import { checkoutHref, orderHref, orderReference, reviewHref } from "./links";
import type { Order } from "./order";

describe("order references", () => {
  it("distinguishes the three orders with identical prefixes found in QA", () => {
    const ids = [
      "6afa7fc0466a53435ba005c1",
      "6afa7fc0466a53435ba005c4",
      "6afa7fc0466a53435ba005c7",
    ];
    expect(ids.map((id) => orderReference({ id }))).toEqual([
      "#53435BA005C1",
      "#53435BA005C4",
      "#53435BA005C7",
    ]);
    for (const id of ids) expect(orderCode({ id })).toBe(orderReference({ id }));
  });
  it("accepts mixed-case ObjectIds and preserves non-ObjectId references", () => {
    expect(orderReference({ id: "6AFA7FC0466A53435Ba005c1" })).toBe("#53435BA005C1");
    for (const id of ["PCT-007", "legacy-order-reference", "not-a-valid-object-id-123"])
      expect(orderReference({ id })).toBe(`#${id}`);
  });
  it("keeps complete identifiers in all navigation URLs", () => {
    const order = {
      id: "6afa7fc0466a53435ba005c1",
      product: { id: "6afa7fc0466a53435ba005bb" },
    } as Order;
    expect(orderHref(order)).toBe("/pesanan/6afa7fc0466a53435ba005c1");
    expect(reviewHref(order)).toBe("/ulasan?pesanan=6afa7fc0466a53435ba005c1");
    expect(checkoutHref(order)).toBe(
      "/checkout/6afa7fc0466a53435ba005bb?pesanan=6afa7fc0466a53435ba005c1",
    );
  });
});
