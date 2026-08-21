import { createSign } from "node:crypto";
import { TRPCError } from "@trpc/server";
import type { ApprovedActor } from "./pharmacyWorkflow";

type ServiceAccount = { client_email: string; private_key: string; token_uri: string };
const driveScope = "https://www.googleapis.com/auth/drive";

function config() {
  const rawAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON;
  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rawAccount || !folderId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The scoped Google Drive integration is not configured." });
  return { account: JSON.parse(rawAccount) as ServiceAccount, folderId };
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: string) => Buffer.from(value).toString("base64url");
  const unsigned = `${encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${encode(JSON.stringify({ iss: account.client_email, scope: driveScope, aud: account.token_uri, iat: now, exp: now + 300 }))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key).toString("base64url")}`;
  const response = await fetch(account.token_uri, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }) });
  if (!response.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Google Drive authentication failed." });
  return (await response.json() as { access_token: string }).access_token;
}

function requireDocumentManager(actor: ApprovedActor) {
  if (!["super_admin", "it_supervisor", "document_manager"].includes(actor.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Your pharmacy role cannot manage scoped documents." });
  }
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const { account } = config();
  const token = await accessToken(account);
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Google Drive rejected this scoped document action." });
  return response;
}

export async function listScopedDocuments() {
  const { folderId } = config();
  const query = new URLSearchParams({ q: `'${folderId}' in parents and trashed = false`, fields: "files(id,name,mimeType,webViewLink,createdTime,parents)", orderBy: "createdTime desc", pageSize: "100", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
  const response = await driveFetch(`files?${query.toString()}`);
  return (await response.json() as { files: unknown[] }).files;
}

export async function uploadScopedDocument(actor: ApprovedActor, input: { name: string; mimeType: string; contentBase64: string }) {
  requireDocumentManager(actor);
  const { folderId, account } = config();
  const token = await accessToken(account);
  const boundary = `pharmacy-${crypto.randomUUID()}`;
  const content = Buffer.from(input.contentBase64, "base64");
  if (!content.length || content.length > 10 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Documents must be between 1 byte and 10 MB." });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: input.name, mimeType: input.mimeType, parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": `multipart/related; boundary=${boundary}` }, body });
  if (!response.ok) throw new TRPCError({ code: "BAD_REQUEST", message: "Google Drive rejected this document upload." });
  return await response.json();
}

export async function deleteScopedDocument(actor: ApprovedActor, fileId: string) {
  requireDocumentManager(actor);
  const { folderId } = config();
  const metadata = await driveFetch(`files/${fileId}?fields=id,parents&supportsAllDrives=true`);
  const file = await metadata.json() as { parents?: string[] };
  if (!file.parents?.includes(folderId)) throw new TRPCError({ code: "FORBIDDEN", message: "This document is outside the pharmacy Drive folder." });
  await driveFetch(`files/${fileId}?supportsAllDrives=true`, { method: "DELETE" });
  return { success: true };
}
