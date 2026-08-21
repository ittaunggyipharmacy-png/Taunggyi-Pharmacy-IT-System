import { createSign } from "node:crypto";
import { describe, expect, it } from "vitest";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri: string;
};

const encode = (value: string) => Buffer.from(value).toString("base64url");

async function getDriveToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${encode(JSON.stringify({ iss: account.client_email, scope: "https://www.googleapis.com/auth/drive.metadata.readonly", aud: account.token_uri, iat: now, exp: now + 300 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch(account.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  expect(response.ok).toBe(true);
  return (await response.json()) as { access_token: string };
}

describe("Google Drive scoped integration", () => {
  it("can read metadata for the configured root folder", async () => {
    const rawAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
    const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    expect(rawAccount).toBeTruthy();
    expect(folderId).toBeTruthy();

    const token = await getDriveToken(JSON.parse(rawAccount!) as ServiceAccount);
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}?fields=id`, {
      headers: { authorization: `Bearer ${token.access_token}` },
    });
    expect(response.ok).toBe(true);
    expect((await response.json()).id).toBe(folderId);
  });
});
