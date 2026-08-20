import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

export const isHistorical = (dateStr: string) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 30;
};

export const formatId = (id: string) => {
  if (!id) return "";
  if (id.length > 12) {
    return id.slice(0, 8).toUpperCase();
  }
  return id;
};
