import { clsx, type ClassValue } from "clsx";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(iso?: string): string {
  if (!iso) return "—";
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: es });
  } catch {
    return iso;
  }
}

export function formatDate(iso?: string, fmt = "d MMM yyyy"): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), fmt, { locale: es });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return format(parseISO(iso), "d MMM · HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

export function formatNumber(n?: number): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function formatPercent(n?: number, digits = 1): string {
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

export function formatEur(n?: number): string {
  if (n == null) return "—";
  return `${n.toFixed(2).replace(".", ",")}€`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
