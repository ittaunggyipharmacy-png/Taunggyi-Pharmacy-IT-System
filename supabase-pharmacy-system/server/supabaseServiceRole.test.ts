import { describe, expect, it } from "vitest";

describe("Supabase server configuration", () => {
  it("authenticates a lightweight service-role request", async () => {
    const projectUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(projectUrl).toMatch(/^https:\/\/[a-z0-9-]+\.supabase\.co$/);
    expect(serviceRoleKey).toBeTruthy();

    const response = await fetch(`${projectUrl}/auth/v1/admin/users?per_page=1`, {
      headers: {
        apikey: serviceRoleKey!,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    expect(response.ok).toBe(true);
  });
});
