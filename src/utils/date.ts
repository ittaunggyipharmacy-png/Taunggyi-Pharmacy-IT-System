/**
 * Safely sanitizes a date string or timestamp for PostgreSQL DATE columns.
 * Returns 'YYYY-MM-DD' if valid, or null if empty/invalid.
 */
export const sanitizeDateForDb = (value: any): string | null => {
  if (!value) return null;
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return null;
  }

  const str = String(value).trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'unknown' || str === '-') {
    return null;
  }

  // Check if it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T00:00:00');
    if (!isNaN(d.getTime())) return str;
  }

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const d = new Date(formatted + 'T00:00:00');
    if (!isNaN(d.getTime())) return formatted;
  }

  // Handle MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    const formatted = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const d = new Date(formatted + 'T00:00:00');
    if (!isNaN(d.getTime())) return formatted;
  }

  // General Date parse attempt
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    try {
      const year = parsed.getFullYear();
      // Ensure sensible year range (1900 to 2100)
      if (year >= 1900 && year <= 2100) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {
      return null;
    }
  }

  return null;
};

/**
 * Format a date string safely for display.
 */
export const formatDateDisplay = (value: any, fallback = 'N/A'): string => {
  if (!value) return fallback;
  const sanitized = sanitizeDateForDb(value);
  return sanitized || fallback;
};
