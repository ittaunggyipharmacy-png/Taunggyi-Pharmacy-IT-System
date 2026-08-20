/**
 * Utility functions for department management, sorting, formatting and validation
 * in the Taunggyi Pharmacy IT System.
 */

/**
 * Sorts departments alphabetically, placing 'IT' (case-insensitive) at index 0.
 * Filters out empty/whitespace strings and deduplicates values.
 */
export function sortDepartments(departments: (string | null | undefined)[]): string[] {
  if (!departments || !Array.isArray(departments)) return [];

  const seen = new Set<string>();
  const cleaned: string[] = [];

  for (const dept of departments) {
    if (!dept || typeof dept !== 'string') continue;
    const trimmed = dept.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      cleaned.push(trimmed);
    }
  }

  const itEntry = cleaned.find(d => d.toLowerCase() === 'it');
  const nonItEntries = cleaned
    .filter(d => d.toLowerCase() !== 'it')
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  if (itEntry) {
    // Preserve canonical casing if user typed 'IT' or custom
    return [itEntry, ...nonItEntries];
  }

  return nonItEntries;
}

export interface DepartmentOption {
  value: string;
  label: string;
  isLegacy?: boolean;
}

/**
 * Prepares options for a department select dropdown, inserting a Legacy option
 * if the currently assigned department is not in the configured list.
 */
export function formatDepartmentOptions(
  configuredDepts: string[],
  currentOrLegacyDept?: string | null
): DepartmentOption[] {
  const sorted = sortDepartments(configuredDepts);
  const options: DepartmentOption[] = sorted.map(dept => ({
    value: dept,
    label: dept,
    isLegacy: false
  }));

  if (currentOrLegacyDept && typeof currentOrLegacyDept === 'string') {
    const trimmed = currentOrLegacyDept.trim();
    if (trimmed) {
      const exists = sorted.some(d => d.toLowerCase() === trimmed.toLowerCase());
      if (!exists) {
        // Prepend or append legacy option
        options.push({
          value: trimmed,
          label: `Legacy: ${trimmed}`,
          isLegacy: true
        });
      }
    }
  }

  return options;
}

/**
 * Validates a new department name before adding to system settings.
 */
export function validateDepartmentName(
  newDept: string,
  existingDepts: string[] = []
): { valid: boolean; error?: string } {
  if (typeof newDept !== 'string') {
    return { valid: false, error: 'Department name must be a string' };
  }

  const trimmed = newDept.trim();
  if (!trimmed) {
    return { valid: false, error: 'Department name cannot be empty' };
  }

  if (trimmed.length > 60) {
    return { valid: false, error: 'Department name cannot exceed 60 characters' };
  }

  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Department name contains invalid characters' };
  }

  const isDuplicate = existingDepts.some(d => (d || '').trim().toLowerCase() === trimmed.toLowerCase());
  if (isDuplicate) {
    return { valid: false, error: `Department "${trimmed}" already exists` };
  }

  return { valid: true };
}
