import { format } from 'date-fns';

export const formatStorage = (bytes: string | number | undefined | null) => {
  if (bytes === undefined || bytes === null || bytes === "") return "--";
  const b = Number(bytes);
  if (isNaN(b) || b < 0) return "--";
  if (b === 0) return "0 B";
  if (b >= 1024 * 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024 / 1024).toFixed(2)} TB`;
  if (b >= 1024 * 1024 * 1024) return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${b} B`;
};

export const safeFormat = (date: any, formatStr: string): string => {
  if (!date) return "--";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "--";
    return format(d, formatStr);
  } catch {
    return "--";
  }
};

export const formatId = (id: string | undefined | null): string => {
  if (!id) return "#00000";
  if (id.length <= 8) return `#${id}`;
  return `#${id.slice(0, 8)}`;
};

export const isHistorical = (dateStr: string | undefined | null): boolean => {
  if (!dateStr) return false;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return date.getTime() < thirtyDaysAgo.getTime();
  } catch {
    return false;
  }
};
