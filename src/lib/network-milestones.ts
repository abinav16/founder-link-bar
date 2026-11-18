export interface MilestoneStartup {
  id: string;
  created_at: string;
  clicks: number;
  impressions: number;
}
export interface MilestoneDay { startup_id: string; day_offset: number; clicks: number; received: number }
export interface NetworkMilestone { key: string; startupId: string; text: string; when: string; fresh: boolean; t: number }
const DAY = 86400000;
const CLICK_STEPS = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const VIEW_STEPS = [100, 1000, 5000, 10000, 25000, 50000, 100000];
const DAY_STEPS = [7, 30, 60, 90, 100, 180, 365, 730];
const fmt = (n: number) => n >= 1000 ? `${n / 1000}K` : String(n);

/** UTC calendar-day history, reconstructed from recorded daily counts, not 24h estimates. */
export function buildMilestoneFeed(startups: MilestoneStartup[], daily: MilestoneDay[], now: number): NetworkMilestone[] {
  const today = Math.floor(now / DAY) * DAY;
  const since = today - 6 * DAY;
  const items: NetworkMilestone[] = [];
  const add = (s: MilestoneStartup, key: string, text: string, t: number) => {
    if (t < since || t > now) return;
    const ago = Math.floor((today - Math.floor(t / DAY) * DAY) / DAY);
    items.push({ key: `${s.id}:${key}`, startupId: s.id, text, t, when: ago === 0 ? "Today" : `${ago}d ago`, fresh: ago === 0 });
  };
  for (const s of startups) {
    const days = daily.filter(d => d.startup_id === s.id && d.day_offset >= 0 && d.day_offset <= 6).sort((a,b) => b.day_offset - a.day_offset);
    let clicks = Math.max(0, s.clicks - days.reduce((sum,d) => sum + Number(d.clicks), 0));
    let views = Math.max(0, s.impressions - days.reduce((sum,d) => sum + Number(d.received), 0));
    for (const d of days) {
      const nextClicks = clicks + Number(d.clicks);
      const nextViews = views + Number(d.received);
      const t = today - d.day_offset * DAY;
      for (const step of CLICK_STEPS) if (clicks < step && nextClicks >= step) add(s, `click:${step}`, step === 1 ? "Got its first network click" : `Reached ${fmt(step)} clicks`, t);
      for (const step of VIEW_STEPS) if (views < step && nextViews >= step) add(s, `view:${step}`, `Passed ${fmt(step)} views`, t);
      clicks = nextClicks; views = nextViews;
    }
    const created = Date.parse(s.created_at);
    for (const step of DAY_STEPS) add(s, `days:${step}`, step >= 365 ? `${step / 365} year${step > 365 ? "s" : ""} in the network` : `${step} days in the network`, created + step * DAY);
    add(s, "joined", "Joined the network", created);
  }
  return items.sort((a,b) => b.t - a.t || a.key.localeCompare(b.key));
}