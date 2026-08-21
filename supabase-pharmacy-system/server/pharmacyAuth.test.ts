import { describe, expect, it } from "vitest";
import { normalizePharmacyLogin } from "../shared/pharmacyAuth";

describe("normalizePharmacyLogin", () => {
  it("maps an internal username into the pharmacy sign-in namespace", () => {
    expect(normalizePharmacyLogin("admin")).toBe("admin@taunggyipharmacy.local");
  });

  it("preserves a supplied email address after normalizing whitespace and case", () => {
    expect(normalizePharmacyLogin(" Admin@TaunggyiPharmacy.local ")).toBe("admin@taunggyipharmacy.local");
  });
});
