export const STARTUP_CATEGORIES = [
  "AI", "Developer Tools", "Productivity", "Marketing & Sales",
  "Design", "Creator & Media", "E-commerce", "Finance",
  "Education", "Health & Wellness", "Community", "Other",
] as const;

export type StartupCategory = typeof STARTUP_CATEGORIES[number];

export function isStartupCategory(value: unknown): value is StartupCategory {
  return typeof value === "string" && STARTUP_CATEGORIES.some((category) => category === value);
}

export function matchesStartupCategory(value: string | null | undefined, filter: string): boolean {
  return filter === "all" || (filter === "uncategorized" ? !value : value === filter);
}