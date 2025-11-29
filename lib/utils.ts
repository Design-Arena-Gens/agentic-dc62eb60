import { differenceInCalendarMonths, differenceInYears, format, isValid, parse } from "date-fns";

const DATE_PATTERNS = [
  "yyyy-MM-dd",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd MMM yyyy",
  "d MMM yyyy",
  "dd.MM.yyyy",
  "yyyyMMdd",
  "yyMMdd"
];

function coerceCentury(twoDigitYear: number): number {
  const currentYear = new Date().getFullYear() % 100;
  const century = new Date().getFullYear() - currentYear;
  const computed = century + twoDigitYear;
  if (twoDigitYear - currentYear > 50) {
    return century - 100 + twoDigitYear;
  }
  if (currentYear - twoDigitYear > 50) {
    return century + 100 + twoDigitYear;
  }
  return computed;
}

export function parseFlexibleDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d{6}$/.test(trimmed)) {
    const year = coerceCentury(Number(trimmed.slice(0, 2)));
    const month = Number(trimmed.slice(2, 4));
    const day = Number(trimmed.slice(4, 6));
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (isValid(candidate)) {
      return format(candidate, "yyyy-MM-dd");
    }
  }

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) {
      return format(parsed, "yyyy-MM-dd");
    }
  }
  return null;
}

export function normalizeName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[^A-Za-z\s'-]/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function monthsUntil(dateIso: string): number | null {
  const parsed = parse(dateIso, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return null;
  const now = new Date();
  return differenceInCalendarMonths(parsed, now);
}

export function calculateAge(dateIso: string): number | null {
  const parsed = parse(dateIso, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return null;
  return differenceInYears(new Date(), parsed);
}

export function averagedConfidence(values: number[]): number {
  if (!values.length) return 0;
  const filtered = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (!filtered.length) return 0;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}
