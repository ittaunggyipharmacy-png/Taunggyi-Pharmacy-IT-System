/** Converts a short internal username into the pharmacy-auth email namespace. */
export function normalizePharmacyLogin(usernameOrEmail: string): string {
  const normalized = usernameOrEmail.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}@taunggyipharmacy.local`;
}
