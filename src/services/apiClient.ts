export function resolveApiUrl(path: string, baseUrl = ""): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export async function getApiErrorMessage(response: Response, endpoint: string): Promise<string> {
  const status = `${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const fallback = `Request to ${endpoint} failed (${status}).`;
  const responseText = await response.text();

  if (!responseText) {
    return response.status === 404
      ? `${fallback} The asset API is unavailable at this address. Verify VITE_API_BASE_URL or deploy the Node API.`
      : fallback;
  }

  try {
    const payload = JSON.parse(responseText);
    const details = Array.isArray(payload.details) ? payload.details.join(", ") : "";
    const message = typeof payload.error === "string"
      ? payload.error
      : typeof payload.message === "string"
        ? payload.message
        : details;

    return message ? `${fallback} ${message}` : fallback;
  } catch {
    const safeText = responseText.replace(/\s+/g, " ").trim().slice(0, 300);
    return response.status === 404
      ? `${fallback} The asset API is unavailable at this address. Verify VITE_API_BASE_URL or deploy the Node API.`
      : safeText ? `${fallback} ${safeText}` : fallback;
  }
}
