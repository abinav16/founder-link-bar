import { addDays, format, isValid, parseISO, startOfDay } from "date-fns";

export function isNewsletterSunday(date: Date, now = new Date()): boolean {
  return isValid(date) && date.getDay() === 0 && startOfDay(date) > startOfDay(now);
}

export function isNewsletterDateAvailable(date: Date, bookedDates: readonly string[], now = new Date()): boolean {
  return isNewsletterSunday(date, now) && !bookedDates.includes(format(date, "yyyy-MM-dd"));
}

export function nextAvailableNewsletterSunday(bookedDates: readonly string[], now = new Date()): string | undefined {
  let date = addDays(startOfDay(now), 1);
  for (let i = 0; i < 730; i++, date = addDays(date, 1)) {
    if (isNewsletterDateAvailable(date, bookedDates, now)) return format(date, "yyyy-MM-dd");
  }
  return undefined;
}

export function parseNewsletterDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = parseISO(value);
  return isValid(date) && date.getDay() === 0 ? value : undefined;
}

export function newsletterDateLabel(value?: string): string {
  const valid = parseNewsletterDate(value);
  return valid ? format(parseISO(valid), "EEEE, d MMMM yyyy") : "Choose a Sunday";
}