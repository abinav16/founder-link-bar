export type VouchTag = 'vouch' | 'clean_ux' | 'lightning_fast' | 'great_concept';
export const vouchTags: { value: VouchTag; label: string }[] = [
  { value: 'vouch', label: 'Vouch' },
  { value: 'clean_ux', label: 'Clean UX' },
  { value: 'lightning_fast', label: 'Lightning fast' },
  { value: 'great_concept', label: 'Great concept' },
];
export interface ProfileDay { date: string; day_offset: number; impressions: number; clicks: number }
export interface RelatedStartup { id: string; slug: string; name: string; description: string; website_url: string; logo_url: string | null }
export interface VouchStartup { name: string; slug: string; website_url: string; logo_url: string | null }
export interface FounderVouch extends VouchStartup { tag: VouchTag; founder_name: string; startups?: VouchStartup[] }
export function vouchStartups(vouch: FounderVouch): VouchStartup[] {
  return vouch.startups?.length ? vouch.startups : [vouch];
}
export interface ProfileInsights { daily: ProfileDay[]; vouchCount: number; vouchTags: Partial<Record<VouchTag, number>>; vouches: FounderVouch[]; related: RelatedStartup[] }
export function momentum(days: ProfileDay[]) {
  // Compare complete UTC days; today's partial traffic never implies a decline.
  const current = days.filter(d => d.day_offset >= 1 && d.day_offset <= 7).reduce((n,d) => n + Number(d.impressions), 0);
  const previous = days.filter(d => d.day_offset >= 8 && d.day_offset <= 14).reduce((n,d) => n + Number(d.impressions), 0);
  return { current, previous, change: previous > 0 ? Math.round((current - previous) / previous * 100) : null };
}
export function statsShareText(name: string, clicks: number, impressions: number, slug: string) {
  const traction = clicks > 0 ? `${clicks.toLocaleString('en-US')} clicks through @StartupBarCo` : `${impressions.toLocaleString('en-US')} network impressions on @StartupBarCo`;
  return `${name} has reached ${traction}. Built by founders, discovered together. 🚀\nhttps://startupbar.co/startup/${encodeURIComponent(slug)}`;
}