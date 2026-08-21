import { describe, expect, it } from "vitest";
import { isThreeWayMatch } from "../shared/pharmacyRules";

describe("isThreeWayMatch", () => {
  it("accepts equal purchase-order, receipt, and invoice values", () => {
    expect(isThreeWayMatch(125000, 125000, 125000)).toBe(true);
  });

  it("accepts only insignificant decimal variance", () => {
    expect(isThreeWayMatch(100, 100.004, 100)).toBe(true);
  });

  it("rejects a material difference between purchasing documents", () => {
    expect(isThreeWayMatch(100000, 95000, 100000)).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isThreeWayMatch(100, Number.NaN, 100)).toBe(false);
  });
});
