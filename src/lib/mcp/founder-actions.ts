import { z } from "zod";
import { startupInput, trafficJson } from "./startup-rules";

export const editInput = {
  startup_id: z.string().uuid().describe("Owned startup ID from list_my_startups."),
  name: startupInput.name.optional(),
  description: startupInput.description.optional(),
  category: startupInput.category.optional(),
  logo_url: z.string().url().max(2000).nullable().optional().describe("An existing logo uploaded to your own StartupBar storage folder, or null to restore the favicon. Upload new files from Account."),
};

export function editPatch(status: string, current: { name: string; description: string }, input: { name?: string; description?: string; category?: string; logo_url?: string | null }, now = new Date()) {
  const textChanged = (input.name !== undefined && input.name !== current.name) || (input.description !== undefined && input.description !== current.description);
  return {
    ...(textChanged ? status === "approved"
      ? { pending_name: input.name ?? current.name, pending_description: input.description ?? current.description, edit_status: "pending", edit_submitted_at: now.toISOString() }
      : { name: input.name ?? current.name, description: input.description ?? current.description, status: "pending" as const } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.logo_url !== undefined ? { logo_url: input.logo_url } : {}),
  };
}

export function ownedLogo(url: string, projectUrl: string, uid: string) {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(projectUrl).origin && parsed.pathname.startsWith(`/storage/v1/object/public/startup-logos/${uid}/`) && !parsed.username && !parsed.password && !parsed.search && !parsed.hash;
  } catch { return false; }
}

export function comparisonWindows(days: 7 | 30, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - 1);
  const currentStart = new Date(end); currentStart.setUTCDate(currentStart.getUTCDate() - days + 1);
  const previousEnd = new Date(currentStart); previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousStart.getUTCDate() - days + 1);
  const date = (v: Date) => v.toISOString().slice(0, 10);
  return { current_start: date(currentStart), current_end: date(end), previous_start: date(previousStart), previous_end: date(previousEnd), days };
}

type TrafficRow = { date: string; impressions_received: number; clicks_received: number; impressions_given: number; clicks_given: number };
export function compareTraffic(rows: TrafficRow[], windows: ReturnType<typeof comparisonWindows>) {
  const sum = (start: string, end: string) => trafficJson(rows.filter(r => r.date >= start && r.date <= end).reduce((a, r) => ({
    impressions_received: a.impressions_received + Number(r.impressions_received), clicks_received: a.clicks_received + Number(r.clicks_received), impressions_given: a.impressions_given + Number(r.impressions_given), clicks_given: a.clicks_given + Number(r.clicks_given),
  }), { impressions_received: 0, clicks_received: 0, impressions_given: 0, clicks_given: 0 }));
  const current = sum(windows.current_start, windows.current_end);
  const previous = sum(windows.previous_start, windows.previous_end);
  const delta = (value: number, before: number) => ({ change: value - before, change_percent: before > 0 ? Math.round((value - before) / before * 10000) / 100 : null });
  return { current, previous, changes: {
    impressions_received: delta(current.impressions_received, previous.impressions_received), clicks_received: delta(current.clicks_received, previous.clicks_received),
    impressions_delivered: delta(current.impressions_delivered, previous.impressions_delivered), clicks_delivered: delta(current.clicks_delivered, previous.clicks_delivered),
    ctr_percentage_points: Math.round((current.ctr_percent - previous.ctr_percent) * 100) / 100,
  } };
}

export function installationAdvice(v: Record<string, unknown>) {
  const issues: string[] = [];
  if (v.error) issues.push("The website could not be checked reliably. Retry the check before changing the installation.");
  if (v.idMismatch) issues.push("The snippet uses another startup ID. Replace it with the snippet returned here.");
  if (v.cspBlocked) issues.push("Your website security policy blocks the loader. Allow scripts from https://startupbar.co.");
  if (v.cspFrameBlocked) issues.push("Your website security policy blocks the bar frame. Allow frames from https://startupbar.co.");
  if (v.consentBlocked) issues.push("The snippet is behind consent. Check your consent integration and the installation requirements in the application.");
  if (v.conditionalInstall) issues.push("The snippet is conditional. Install the visible bar consistently on your published pages.");
  if (v.trackMode) issues.push("This is a tracking-only installation, not the required visible bar.");
  if (v.suspicious) issues.push("The installation could not be trusted. Review it in the application.");
  if (v.installed !== true && issues.length === 0) issues.push("The scan did not confirm the matching visible bar. Check the published snippet and reload; bundled or inner-page installs may need an in-app check.");
  return issues;
}