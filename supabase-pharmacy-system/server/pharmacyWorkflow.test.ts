import { describe, expect, it } from "vitest";
import { canTransitionAccessRequest } from "./pharmacyWorkflow";

describe("access-control workflow transitions", () => {
  it("allows the supervised review, approval, provision, and revoke path", () => {
    expect(canTransitionAccessRequest("submitted", "manager_review")).toBe(true);
    expect(canTransitionAccessRequest("manager_review", "it_review")).toBe(true);
    expect(canTransitionAccessRequest("it_review", "approved")).toBe(true);
    expect(canTransitionAccessRequest("approved", "provisioning")).toBe(true);
    expect(canTransitionAccessRequest("provisioning", "active")).toBe(true);
    expect(canTransitionAccessRequest("active", "revoked")).toBe(true);
  });

  it("rejects status skips and terminal-state reversals", () => {
    expect(canTransitionAccessRequest("submitted", "active")).toBe(false);
    expect(canTransitionAccessRequest("rejected", "manager_review")).toBe(false);
    expect(canTransitionAccessRequest("revoked", "active")).toBe(false);
  });
});
