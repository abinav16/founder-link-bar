import { z } from "zod";
import { STARTUP_CATEGORIES } from "@/lib/startup-categories";
import { heartbeatProvesInstall } from "@/lib/widget-install-evidence";

export const startupInput = {
  name: z.string().trim().min(2).max(60).describe("Startup name, 2–60 characters."),
  website_url: z.string().trim().url().max(200).refine(v => /^https?:\/\//i.test(v) && !new URL(v).username && !new URL(v).password, "Use a public HTTP or HTTPS website URL.").describe("Public website URL."),
  description: z.string().trim().min(10).max(100).describe("One-line description, 10–100 characters."),
  category: z.enum(STARTUP_CATEGORIES).describe("Startup category from the supported vocabulary."),
};

export function startupHealth(s: { banned: boolean; status: string; membership_mode: string; supporter_until: string | null; widget_last_heartbeat_at: string | null; widget_currently_visible: boolean | null; iframe_blocked: boolean | null }, now = Date.now()) {
  if (s.banned) return "Suspended";
  if (s.status === "rejected") return "Changes required before approval";
  if (s.membership_mode === "supporter" && s.supporter_until && new Date(s.supporter_until).getTime() > now) return "Supporter — no visible bar required";
  if (s.iframe_blocked || s.widget_currently_visible === false) return "Bar needs attention";
  if (heartbeatProvesInstall(s.widget_last_heartbeat_at, now)) return "Bar activity confirmed within the last 24 hours";
  return "Bar activity not recently confirmed — this does not prove it is removed";
}

export function utcWindowStart(days: 7 | 30, now = new Date()) {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

export function trafficJson(s: { impressions_received: number; clicks_received: number; impressions_given: number; clicks_given: number }) {
  return { impressions_received: Number(s.impressions_received), clicks_received: Number(s.clicks_received), impressions_delivered: Number(s.impressions_given), clicks_delivered: Number(s.clicks_given), ctr_percent: s.impressions_received > 0 ? Math.round(s.clicks_received / s.impressions_received * 10000) / 100 : 0 };
}

export function installationAccepted(v: Record<string, unknown>) {
  return v.installed === true && !v.error && !v.trackMode && !v.suspicious && !v.cspBlocked && !v.cspFrameBlocked && !v.idMismatch && !v.consentBlocked && !v.conditionalInstall;
}