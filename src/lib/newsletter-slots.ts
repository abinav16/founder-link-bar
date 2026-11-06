import { format, isValid, parseISO, startOfDay } from "date-fns";

export function isNewsletterSunday(date: Date, now = new Date()): boolean {
  return isValid(date) && date.getDay() === 0 && startOfDay(date) > startOfDay(now);
}

export function parseNewsletterDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && date.getDay() === 0 ? value : undefined;
}

export function newsletterDateLabel(value?: string): string {
  const valid = parseNewsletterDate(value);
  return valid ? format(parseISO(valid), "Sunday, d MMMM yyyy") : "Choose a Sunday";
}