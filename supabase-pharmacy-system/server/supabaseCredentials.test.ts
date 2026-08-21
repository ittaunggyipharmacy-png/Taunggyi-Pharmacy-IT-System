import { describe, expect, it } from "vitest";

describe("Supabase browser configuration", () => {
  it("authenticates a lightweight public settings request", async () => {
    const projectUrl = process.env.VITE_SUPABASE_URL;
    const publishableKey = process.env.VITE_SUPABASE_ANON_KEY;

    expect(projectUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(publishableKey).toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/settings`, {
      headers: { apikey: publishableKey! },
    });

    expect(response.ok).toBe(true);
  });
});
