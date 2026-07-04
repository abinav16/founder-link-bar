import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { COUNTRY_CENTROIDS, COUNTRY_NAMES, flagEmoji, jitter } from "@/lib/geo-centroids";
import { funName, avatarUrl } from "@/lib/fun-name";
import { Globe, Map as MapIcon, Eye, RotateCcw, Minimize2, Maximize2, Palette, UserPlus } from "lucide-react";

const MAP_THEMES = [
  { id: "dark-v11",             label: "Dark",      style: "mapbox://styles/mapbox/dark-v11",             dot: "#0c0c0f" },
  { id: "light-v11",            label: "Light",     style: "mapbox://styles/mapbox/light-v11",            dot: "#f0ede8" },
  { id: "satellite-v9",         label: "Satellite", style: "mapbox://styles/mapbox/satellite-v9",         dot: "#1a3a5c" },
  { id: "navigation-night-v1",  label: "Nav Night", style: "mapbox://styles/mapbox/navigation-night-v1",  dot: "#1a1f2e" },
  { id: "outdoors-v12",         label: "Outdoors",  style: "mapbox://styles/mapbox/outdoors-v12",         dot: "#4a7c59" },
] as const;

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? "pk.eyJ1IjoiZGFuaWVsYWJpbmF2MTYiLCJhIjoiY21tY2FlNG16MDNpcTJyc2ZoNjEzbzU2YyJ9.6DoJDeW5TxYvuEnOc2R47g";
const PIN_LIFETIME_MS = 60000; // pins stay for 60 seconds
const DEVICES = ["mobile", "desktop", "tablet"];
const OSES = ["Windows", "macOS", "iOS", "Android", "Linux"];
const BROWSERS = ["Chrome", "Safari", "Firefox", "Edge"];

const DEVICE_COLORS: Record<string, string> = {
  mobile: "#38bdf8",
  desktop: "#10b981",
  tablet: "#f59e0b",
  unknown: "#a1a1aa",
};

interface LivePin {
  id: string;
  country: string;
  device: string;
  referrerName: string;
  lng: number;
  lat: number;
  marker: mapboxgl.Marker;
  popup: mapboxgl.Popup | null;
  createdAt: number;
}

interface FeedEvent {
  id: string;
  name: string;
  flag: string;
  country: string;
  path: string;
  device: string;
  referrerName: string;
  ts: number;
}

type FilterType = "referrer" | "country" | "device";
interface ActiveFilter {
  type: FilterType;
  value: string;
}

function matchesFilter(item: { country: string; device: string; referrerName: string }, filter: ActiveFilter | null): boolean {
  if (!filter) return true;
  if (filter.type === "referrer") return item.referrerName === filter.value;
  if (filter.type === "country") return item.country === filter.value;
  if (filter.type === "device") return item.device === filter.value;
  return true;
}

function timeAgo(ts: number, now: number): string {
  const diff = Math.round((now - ts) / 1000);
  if (diff < 8) return "just now";
  if (diff < 60) return `${diff}s ago`;
  const m = Math.round(diff / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function cleanPath(path: string): string {
  return path.split("?")[0];
}

interface LiveVisitorMapProps {
  scopeStartupId?: string;
  title?: string;
  networkMode?: boolean;
  devSimulate?: boolean;
  startupName?: string;
  startupLogoUrl?: string;
}

export function LiveVisitorMap({ scopeStartupId, title = "Live network activity", networkMode = false, devSimulate = false, startupName, startupLogoUrl }: LiveVisitorMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pinsRef = useRef<LivePin[]>([]);
  const seenRef = useRef(new Set<string>());
  const anyApprovedIdRef = useRef<string | null>(null);
  const nameCacheRef = useRef(new Map<string, { name: string; websiteUrl: string | null }>());

  const [isLive, setIsLive] = useState(false);
  const [recentCount, setRecentCount] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [referrerCounts, setReferrerCounts] = useState<Map<string, number>>(new Map());
  const [countryCounts, setCountryCounts] = useState<Map<string, { flag: string; count: number }>>(new Map());
  const [deviceCounts, setDeviceCounts] = useState<Map<string, number>>(new Map());
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [livePinIds, setLivePinIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter | null>(null);
  const activeFilterRef = useRef<ActiveFilter | null>(null);
  // Defaults to 2D: Mapbox's globe projection renders an atmosphere layer that intercepts
  // marker clicks in this version, so globe mode looks great but pins aren't clickable there.
  const [projection, setProjection] = useState<"globe" | "mercator">("globe");
  const [cardCollapsed, setCardCollapsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const projectionRef = useRef<"globe" | "mercator">("globe");
  const [mapTheme, setMapTheme] = useState("dark-v11");
  // Tracks the last style URL actually applied to the map, so we skip the initial
  // effect run (map already loaded dark-v11 in the constructor).
  const appliedThemeRef = useRef("dark-v11");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  const [cardWidth, setCardWidth] = useState(300);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const [maxCardHeight, setMaxCardHeight] = useState(500);
  const dragStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const feedCardRef = useRef<HTMLDivElement>(null);
  const statsCardRef = useRef<HTMLDivElement>(null);

  // Keep maxCardHeight in sync so the stats card never overlaps the feed panel
  useEffect(() => {
    const compute = () => {
      const container = containerRef.current;
      const feed = feedCardRef.current;
      if (container && feed) {
        setMaxCardHeight(container.offsetHeight - 12 - feed.offsetHeight - 12 - 8);
      }
    };
    compute();
    const ro = new ResizeObserver(compute);
    const container = containerRef.current;
    if (container) ro.observe(container);
    // Re-run when feed panel appears/changes size
    const interval = setInterval(() => {
      if (feedCardRef.current) { compute(); ro.observe(feedCardRef.current); clearInterval(interval); }
    }, 200);
    return () => { ro.disconnect(); clearInterval(interval); };
  }, []);

  // On mobile: keep both below-map cards at the same height (driven by stats card content)
  useEffect(() => {
    if (!isMobile) return;
    const container = document.querySelector<HTMLElement>('.flex.gap-2.p-2.items-start');
    if (!container) return;
    const [statsEl, feedEl] = container.children as unknown as HTMLElement[];
    if (!statsEl || !feedEl) return;
    const sync = () => {
      const h = statsEl.offsetHeight;
      if (h === 0) return;
      feedEl.style.height = `${h}px`;
      const scrollEl = feedEl.querySelector<HTMLElement>('.overflow-y-auto');
      if (scrollEl) scrollEl.style.maxHeight = `${Math.max(40, h - 41)}px`;
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(statsEl);
    return () => ro.disconnect();
  }, [isMobile, recentCount, feed.length]);

  async function simulateVisitor() {
    setSimulating(true);
    try {
      let targetId = scopeStartupId ?? anyApprovedIdRef.current;
      if (!targetId) {
        const { data } = await supabase.from("startups").select("id").eq("status", "approved").limit(1).maybeSingle();
        targetId = data?.id ?? null;
        anyApprovedIdRef.current = targetId;
      }
      if (!targetId) return;

      const codes = Object.keys(COUNTRY_CENTROIDS);
      const country = codes[Math.floor(Math.random() * codes.length)];
      const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
      const os = OSES[Math.floor(Math.random() * OSES.length)];
      const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];
      const path = ["/", "/pricing", "/blog", "/features"][Math.floor(Math.random() * 4)];

      const isWidgetClickExample = Math.random() < 0.3;
      const { error } = await supabase.from("impressions").insert({
        shown_startup_id: targetId,
        host_startup_id: isWidgetClickExample ? null : targetId,
        country,
        device,
        os,
        browser,
        path,
        referrer: isWidgetClickExample ? "startupbar:notapadplus.com" : "dev-simulate",
      });

      if (error) {
        // Cached target may no longer be approved — re-resolve once and retry.
        anyApprovedIdRef.current = null;
        const { data } = await supabase.from("startups").select("id").eq("status", "approved").limit(1).maybeSingle();
        const retryId = data?.id;
        if (retryId) {
          anyApprovedIdRef.current = retryId;
          await supabase.from("impressions").insert({
            shown_startup_id: retryId,
            host_startup_id: retryId,
            country,
            device,
            os,
            browser,
            path,
            referrer: "dev-simulate",
          });
        }
      }
    } finally {
      setSimulating(false);
    }
  }

  // Friendly names for well-known external referrer domains
  const KNOWN_REFERRERS: Record<string, string> = {
    "google.com": "Google", "google.co.uk": "Google", "google.ca": "Google",
    "google.com.au": "Google", "google.de": "Google", "google.fr": "Google",
    "bing.com": "Bing", "yahoo.com": "Yahoo", "duckduckgo.com": "DuckDuckGo",
    "t.co": "Twitter / X", "twitter.com": "Twitter / X", "x.com": "Twitter / X",
    "linkedin.com": "LinkedIn", "lnkd.in": "LinkedIn",
    "facebook.com": "Facebook", "instagram.com": "Instagram",
    "reddit.com": "Reddit", "old.reddit.com": "Reddit",
    "github.com": "GitHub", "gist.github.com": "GitHub",
    "news.ycombinator.com": "Hacker News",
    "producthunt.com": "Product Hunt",
    "medium.com": "Medium", "substack.com": "Substack",
    "tiktok.com": "TikTok", "youtube.com": "YouTube",
    "discord.com": "Discord", "slack.com": "Slack",
    "notion.so": "Notion", "dev.to": "Dev.to",
  };

  function parseExternalReferrer(url: string): { name: string; websiteUrl: string } | null {
    if (!url || url === "dev-simulate") return null;
    try {
      const href = url.startsWith("http") ? url : `https://${url}`;
      const hostname = new URL(href).hostname.replace(/^www\./, "");
      // Hide internal Lovable preview/published project traffic
      if (hostname.endsWith("lovableproject.com") || hostname.endsWith("lovable.app")) return null;
      const name = KNOWN_REFERRERS[hostname] ?? hostname;
      return { name, websiteUrl: href };
    } catch {
      return null;
    }
  }

  async function resolveReferrer(
    hostStartupId: string | null,
    rawReferrer?: string | null
  ): Promise<{ name: string; websiteUrl: string | null }> {
    // Priority 1: referred by another startup in the network
    if (hostStartupId) {
      const cached = nameCacheRef.current.get(hostStartupId);
      if (cached) return cached;
      const { data } = await supabase.from("startups").select("name, website_url").eq("id", hostStartupId).maybeSingle();
      const result = { name: data?.name ?? "Unknown site", websiteUrl: data?.website_url ?? null };
      nameCacheRef.current.set(hostStartupId, result);
      return result;
    }
    // Priority 2: clicked through the StartupBar widget (startupbar or startupbar:abc.site)
    if (rawReferrer?.startsWith("startupbar")) {
      const via = rawReferrer.includes(":") ? rawReferrer.split(":").slice(1).join(":") : null;
      const name = via ? `StartupBar (${via})` : "StartupBar";
      return { name, websiteUrl: "https://startupbar.co" };
    }
    // Priority 3: external referrer URL (Google, Twitter, etc.)
    if (rawReferrer) {
      const parsed = parseExternalReferrer(rawReferrer);
      if (parsed) return parsed;
    }
    // Priority 4: genuinely direct / no referrer
    return { name: "Direct", websiteUrl: null };
  }

  function faviconFor(websiteUrl: string | null): string | null {
    if (!websiteUrl) return null;
    try {
      const domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  }

  async function addPin(
    id: string,
    country: string,
    device: string,
    hostStartupId: string | null,
    os: string,
    browser: string,
    path: string | null,
    rawReferrer?: string | null
  ) {
    const centroid = COUNTRY_CENTROIDS[country];
    if (!centroid || !mapRef.current) return;

    const lat = jitter(centroid[0], 3);
    const lng = jitter(centroid[1], 3);
    const color = DEVICE_COLORS[device] ?? DEVICE_COLORS.unknown;
    const { name: referrerName, websiteUrl } = await resolveReferrer(hostStartupId, rawReferrer);
    const referrerFavicon = faviconFor(websiteUrl);
    const name = funName(id);
    const avatar = avatarUrl(id);
    const flag = flagEmoji(country);
    const countryName = COUNTRY_NAMES[country] ?? country;
    const deviceIcon = device === "mobile" ? "📱" : device === "tablet" ? "📱" : "🖥️";

    const el = document.createElement("div");
    el.className = "sb-live-pin";
    el.style.cursor = "pointer";
    el.style.width = "36px";
    el.style.height = "36px";
    el.style.pointerEvents = "auto";
    // All decorative children are pointer-events:none so hit-testing always
    // resolves to `el` itself — avoids relying on click bubbling through
    // nested markup, which Mapbox's marker/globe layering can swallow.
    el.innerHTML = `
      <div style="position:relative;width:36px;height:36px;pointer-events:none;">
        <div style="position:absolute;inset:-10px;border-radius:9999px;background:${color}40;animation:sb-pin-pulse 2s ease-out infinite;"></div>
        <div style="position:absolute;inset:0;border-radius:9999px;overflow:hidden;border:2px solid ${color};box-shadow:0 2px 10px rgba(0,0,0,0.5), 0 0 10px ${color}80;background:#18181b;">
          <img src="${avatar}" width="32" height="32" style="display:block;width:100%;height:100%;object-fit:cover;" />
        </div>
        <div style="position:absolute;bottom:-2px;right:-2px;width:14px;height:14px;border-radius:9999px;background:#18181b;display:flex;align-items:center;justify-content:center;font-size:9px;border:1.5px solid rgba(0,0,0,0.4);">${flag}</div>
      </div>
    `;

    const row = (label: string, valueHtml: string) => `
      <div style="font-size:11px;color:rgba(255,255,255,0.55);display:flex;justify-content:space-between;gap:16px;padding:4px 0;">
        <span>${label}</span>
        <span style="color:#fff;display:flex;align-items:center;gap:5px;">${valueHtml}</span>
      </div>
    `;

    const referrerValue = referrerFavicon
      ? `<img src="${referrerFavicon}" width="14" height="14" style="border-radius:3px;" />${referrerName}`
      : referrerName;

    const popupHtml = `
      <div class="sb-popup-inner" style="font-family:inherit;padding:4px;min-width:180px;max-width:220px;">
        <div style="display:flex;align-items:center;gap:8px;padding-bottom:8px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
          <img src="${avatar}" class="sb-popup-avatar" width="32" height="32" style="border-radius:9999px;background:#18181b;border:1.5px solid ${color};flex-shrink:0;" />
          <div style="min-width:0;">
            <div style="font-size:12px;font-weight:700;color:#fff;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);white-space:nowrap;">${flag} ${countryName}</div>
          </div>
        </div>
        ${row("Device", `${deviceIcon} <span style="text-transform:capitalize;">${device}</span>`)}
        ${row("OS", os)}
        ${row("Browser", browser)}
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:4px 0;"></div>
        ${row("Referrer", referrerValue)}
        ${row("Page", path ?? "/")}
      </div>
    `;

    const pinRecord: LivePin = { id, country, device, referrerName, lng, lat, marker: null as unknown as mapboxgl.Marker, popup: null, createdAt: Date.now() };

    el.addEventListener("click", (e) => {
      // Without this, the click bubbles to the map container where Mapbox's
      // default closeOnClick popup behavior immediately closes the popup we
      // just opened, in the same tick — it would never visibly appear.
      e.stopPropagation();
      const map = mapRef.current!;

      // Pick an anchor based on which quadrant of the visible map the pin sits
      // in, so the popup always opens toward the center and never gets clipped
      // by this component's own overflow-hidden edges.
      const point = map.project([lng, lat]);
      const container = map.getContainer();
      const vAnchor = point.y < container.clientHeight / 2 ? "top" : "bottom";
      const hAnchor = point.x < container.clientWidth / 2 ? "left" : "right";
      const anchor = `${vAnchor}-${hAnchor}` as mapboxgl.PopupOptions["anchor"];

      pinRecord.popup?.remove();
      const popup = new mapboxgl.Popup({ offset: 26, closeButton: true, className: "sb-live-popup", anchor, maxWidth: "240px" })
        .setHTML(popupHtml)
        .setLngLat([lng, lat])
        .addTo(map);
      pinRecord.popup = popup;
    });

    const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(mapRef.current);
    if (!matchesFilter(pinRecord, activeFilterRef.current)) {
      marker.getElement().style.display = "none";
    }
    pinRecord.marker = marker;
    pinsRef.current.push(pinRecord);
    setLivePinIds(pinsRef.current.map((p) => p.id));
  }

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [10, 25],
      zoom: 1.6,
      projection: "mercator",
      attributionControl: false,
      interactive: true,
    });
    mapRef.current = map;

    const applyFog = () => map.setFog({
      color: "rgb(9,9,11)",
      "high-color": "rgb(30,30,40)",
      "horizon-blend": 0.03,
      "space-color": "rgb(5,5,8)",
      "star-intensity": 0.2,
    });

    map.on("load", () => {
      applyFog();
      setMapReady(true);
    });

    // Stop auto-rotate when the user interacts with the map
    const stopOnInteraction = () => {
      if (!autoRotateRef.current) return;
      autoRotateRef.current = false;
      setAutoRotate(false);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
    map.on("mousedown", stopOnInteraction);
    map.on("touchstart", stopOnInteraction);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    projectionRef.current = projection;
    if (!mapRef.current || !mapReady) return;
    mapRef.current.setProjection(projection);
  }, [projection, mapReady]);

  // Auto-rotate: horizontal spin by incrementing center longitude, globe only.
  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (!autoRotate) {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      return;
    }
    let last = performance.now();
    const step = (now: number) => {
      if (!mapRef.current || !autoRotateRef.current) return;
      if (projectionRef.current === "globe") {
        const delta = now - last;
        // 5 deg/sec — one full rotation every ~72 seconds (calm ambient spin)
        const center = mapRef.current.getCenter();
        const newLng = ((center.lng + (delta / 1000) * 5) + 180) % 360 - 180;
        mapRef.current.jumpTo({ center: [newLng, center.lat] });
      }
      last = now;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [autoRotate]);

  // Theme change: skip if already applied (handles StrictMode double-fire and initial mount).
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const theme = MAP_THEMES.find((t) => t.id === mapTheme);
    if (!theme || appliedThemeRef.current === mapTheme) return;
    appliedThemeRef.current = mapTheme;
    const map = mapRef.current;
    map.setStyle(theme.style);
    map.once("style.load", () => {
      map.setFog({
        color: "rgb(9,9,11)",
        "high-color": "rgb(30,30,40)",
        "horizon-blend": 0.03,
        "space-color": "rgb(5,5,8)",
        "star-intensity": 0.2,
      });
    });
  }, [mapTheme, mapReady]);

  useEffect(() => {
    activeFilterRef.current = activeFilter;
    for (const pin of pinsRef.current) {
      const visible = matchesFilter(pin, activeFilter);
      pin.marker.getElement().style.display = visible ? "" : "none";
    }
  }, [activeFilter]);

  function toggleFilter(type: FilterType, value: string) {
    setActiveFilter((prev) => (prev?.type === type && prev.value === value ? null : { type, value }));
  }


  // Seed the summary card with today's real totals from the database, so it
  // reflects actual daily activity instead of only what streamed in live
  // since this page happened to be open.
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Reset all in-memory state so switching startups doesn't leak the
      // previous startup's pins/counts/feed onto the new one.
      for (const pin of pinsRef.current) {
        pin.popup?.remove();
        pin.marker.remove();
      }
      pinsRef.current = [];
      setLivePinIds([]);
      seenRef.current = new Set<string>();
      setFeed([]);
      setReferrerCounts(new Map());
      setCountryCounts(new Map());
      setDeviceCounts(new Map());
      setRecentCount(0);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      let query = supabase
        .from("impressions")
        .select("id, country, device, host_startup_id, referrer, path, created_at")
        .gte("created_at", startOfDay.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      // Dashboard scope: show all visits that happened ON this startup's site
      // (widget snippet fires a row per pageview with host_startup_id = this startup).
      if (scopeStartupId) query = query.eq("host_startup_id", scopeStartupId);

      const { data } = await query;
      if (!data || data.length === 0) return;


      const hostIds = new Set<string>();
      const ctryCounts = new Map<string, { flag: string; count: number }>();
      const devCounts = new Map<string, number>();

      // When scoped to a host startup (dashboard), host_startup_id == scopeStartupId
      // for every row and is not a meaningful "referrer" — treat it as null so
      // the resolver falls through to the actual referrer URL.
      const effectiveHost = (hostId: string | null): string | null =>
        scopeStartupId && hostId === scopeStartupId ? null : hostId;

      for (const row of data) {
        seenRef.current.add(row.id);
        const country = row.country?.toUpperCase();
        if (country) {
          const cur = ctryCounts.get(country);
          ctryCounts.set(country, { flag: flagEmoji(country), count: (cur?.count ?? 0) + 1 });
        }
        const device = row.device ?? "unknown";
        devCounts.set(device, (devCounts.get(device) ?? 0) + 1);
        const eh = effectiveHost(row.host_startup_id);
        if (eh) hostIds.add(eh);
      }

      const nameById = new Map<string, string>();
      if (hostIds.size > 0) {
        const { data: startups } = await supabase.from("startups").select("id, name, website_url").in("id", [...hostIds]);
        for (const s of startups ?? []) {
          nameById.set(s.id, s.name);
          nameCacheRef.current.set(s.id, { name: s.name, websiteUrl: s.website_url });
        }
      }

      function resolveReferrerSync(hostId: string | null, rawRef: string | null | undefined): string {
        if (hostId) return nameById.get(hostId) ?? "Unknown site";
        if (rawRef?.startsWith("startupbar")) {
          const via = rawRef.includes(":") ? rawRef.split(":").slice(1).join(":") : null;
          return via ? `StartupBar (${via})` : "StartupBar";
        }
        if (rawRef) {
          const parsed = parseExternalReferrer(rawRef);
          if (parsed) return parsed.name;
        }
        return "Direct";
      }

      const refCounts = new Map<string, number>();
      for (const row of data) {
        const name = resolveReferrerSync(effectiveHost(row.host_startup_id), row.referrer);
        refCounts.set(name, (refCounts.get(name) ?? 0) + 1);
      }

      // Seed feed from the 30 most recent records (already sorted newest-first)
      const seedFeed: FeedEvent[] = data.slice(0, 30).map((row) => {
        const code = row.country?.toUpperCase() ?? "US";
        const referrerName = resolveReferrerSync(effectiveHost(row.host_startup_id), row.referrer);
        return {
          id: row.id,
          name: funName(row.id),
          flag: flagEmoji(code),
          country: code,
          path: (row as { path?: string | null }).path ?? "/",
          device: row.device ?? "unknown",
          referrerName,
          ts: new Date((row as { created_at?: string }).created_at ?? Date.now()).getTime(),
        };
      });
      setFeed(seedFeed);

      setReferrerCounts(refCounts);
      setCountryCounts(ctryCounts);
      setDeviceCounts(devCounts);
      setRecentCount(data.length);

      // Drop pins on the map for the most recent visitors, so the globe
      // isn't empty when opening a dashboard for a startup that already
      // has historical activity today.
      if (mapRef.current) {
        for (const row of data.slice(0, 200).reverse()) {
          const code = row.country?.toUpperCase();
          if (!code) continue;
          addPin(
            row.id,
            code,
            row.device ?? "unknown",
            effectiveHost(row.host_startup_id),
            (row as { os?: string | null }).os ?? "unknown",
            (row as { browser?: string | null }).browser ?? "unknown",
            (row as { path?: string | null }).path ?? "/",
            row.referrer,
          );
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [scopeStartupId]);

  useEffect(() => {
    if (!mapReady) return;
    refreshData();
  }, [refreshData, mapReady]);

  useEffect(() => {
    const channelName = `live-map:${scopeStartupId ?? "network"}:${crypto.randomUUID()}`;
    const filter = scopeStartupId ? `host_startup_id=eq.${scopeStartupId}` : undefined;

    const config = filter
      ? { event: "INSERT" as const, schema: "public", table: "impressions", filter }
      : { event: "INSERT" as const, schema: "public", table: "impressions" };

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", config, (payload) => {
        const row = payload.new as {
          id: string;
          country: string | null;
          device: string | null;
          host_startup_id: string | null;
          referrer: string | null;
          os: string | null;
          browser: string | null;
          path: string | null;
        };
        if (seenRef.current.has(row.id)) return;
        seenRef.current.add(row.id);

        const code = row.country?.toUpperCase();
        if (!code) return;

        const device = row.device ?? "unknown";
        // Same normalization as refreshData: on a host-scoped dashboard, our own
        // startup id is not a referrer — fall through to the URL referrer.
        const effHost = scopeStartupId && row.host_startup_id === scopeStartupId ? null : row.host_startup_id;
        setRecentCount((c) => c + 1);
        addPin(row.id, code, device, effHost, row.os ?? "unknown", row.browser ?? "unknown", row.path, row.referrer);

        resolveReferrer(effHost, row.referrer).then(({ name: referrerName }) => {
          setFeed((prev) => [
            { id: row.id, name: funName(row.id), flag: flagEmoji(code), country: code, path: row.path ?? "/", device, referrerName, ts: Date.now() },
            ...prev,
          ].slice(0, 30));

          setReferrerCounts((prev) => {
            const m = new Map(prev);
            m.set(referrerName, (m.get(referrerName) ?? 0) + 1);
            return m;
          });
          setCountryCounts((prev) => {
            const m = new Map(prev);
            const cur = m.get(code);
            m.set(code, { flag: flagEmoji(code), count: (cur?.count ?? 0) + 1 });
            return m;
          });
          setDeviceCounts((prev) => {
            const m = new Map(prev);
            m.set(device, (m.get(device) ?? 0) + 1);
            return m;
          });
        });
      })
      .subscribe((status) => setIsLive(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [scopeStartupId]);

  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      const before = pinsRef.current.length;
      pinsRef.current = pinsRef.current.filter((p) => {
        const expired = now - p.createdAt >= PIN_LIFETIME_MS;
        if (expired) { p.marker.remove(); p.popup?.remove(); }
        return !expired;
      });
      if (pinsRef.current.length !== before) {
        setLivePinIds(pinsRef.current.map((p) => p.id));
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06]" style={{ background: "linear-gradient(180deg, #0c0c0f 0%, #09090b 100%)" }}>
      <style>{`
        @keyframes sb-pin-pulse {
          0% { transform: scale(0.4); opacity: 0.9; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-bottom-right { display: none !important; }
        .sb-live-popup .mapboxgl-popup-content {
          background: rgba(20,20,24,0.95);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .sb-live-popup .mapboxgl-popup-tip { border-top-color: rgba(20,20,24,0.95) !important; border-bottom-color: rgba(20,20,24,0.95) !important; }
        @media (max-width: 640px) {
          .sb-live-popup .mapboxgl-popup-content { padding: 0 !important; }
          .sb-live-popup-inner { padding: 2px 6px !important; min-width: 0 !important; }
          .sb-live-popup-inner .sb-popup-avatar { width: 28px !important; height: 28px !important; }
          .sb-live-popup-inner .sb-popup-name { font-size: 11px !important; }
          .sb-live-popup-inner .sb-popup-row { font-size: 10px !important; padding: 2px 0 !important; }
        }
      `}</style>
      {MAPBOX_TOKEN ? (
        <>
          {/* ── Map ── */}
          <div className="relative" style={{ aspectRatio: isMobile ? "4/3" : "800 / 380" }}>
            <div ref={containerRef} className="absolute inset-0 h-full w-full" />
            <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-neutral-950 transition-opacity duration-300 ${mapReady ? "pointer-events-none opacity-0" : "opacity-100"}`}>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-emerald-400" />
              <p className="mt-3 text-xs text-white/40">Loading globe…</p>
            </div>

            {/* ── Startup logo + name overlay ── */}
            {startupName && (
              <div className={`absolute top-2 z-10 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/70 backdrop-blur-sm px-2 py-1 ${isMobile ? "left-2" : "right-2"}`}>
                {startupLogoUrl && (
                  <img src={startupLogoUrl} width={16} height={16} className="rounded-sm shrink-0" alt="" />
                )}
                <span className="text-[11px] font-semibold text-white">{startupName}</span>
              </div>
            )}

            {/* ── Mobile controls (top-right overlay) ── */}
            {isMobile && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/70 backdrop-blur-sm px-1 py-1">
                <div className="flex items-center rounded border border-white/10 bg-white/5">
                  <button onClick={() => setProjection("globe")} title="Globe" className={`rounded-l px-1.5 py-1 transition-colors ${projection === "globe" ? "bg-white/20 text-white" : "text-white/30"}`}><Globe className="h-3 w-3" /></button>
                  <button onClick={() => setProjection("mercator")} title="Flat" className={`rounded-r px-1.5 py-1 transition-colors ${projection === "mercator" ? "bg-white/20 text-white" : "text-white/30"}`}><MapIcon className="h-3 w-3" /></button>
                </div>
                <button onClick={() => { if (projection !== "globe") setProjection("globe"); setAutoRotate((v) => !v); }} className={`rounded p-1 ${autoRotate ? "text-emerald-400" : "text-white/30"}`}>
                  <RotateCcw className={`h-3 w-3 ${autoRotate ? "animate-spin" : ""}`} style={autoRotate ? { animationDuration: "3s" } : {}} />
                </button>
                <div className="relative">
                  <button onClick={() => setShowThemePicker((v) => !v)} className={`rounded p-1 ${showThemePicker ? "text-white" : "text-white/30"}`}><Palette className="h-3 w-3" /></button>
                  {showThemePicker && (
                    <>
                      <div className="fixed inset-0 z-10" onMouseDown={() => setShowThemePicker(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 min-w-[130px] rounded-lg border border-white/10 bg-black/90 p-1.5 backdrop-blur-sm shadow-xl">
                        {MAP_THEMES.map((t) => (
                          <button key={t.id} onMouseDown={(e) => { e.stopPropagation(); setMapTheme(t.id); setShowThemePicker(false); }} className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] transition-colors ${mapTheme === t.id ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10"}`}>
                            <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: t.dot }} />{t.label}{mapTheme === t.id && <span className="ml-auto text-emerald-400">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {devSimulate && (
                  <button onClick={simulateVisitor} disabled={simulating} className="rounded p-1 text-white/30 disabled:opacity-40">
                    <UserPlus className={`h-3 w-3 ${simulating ? "animate-pulse text-emerald-400" : ""}`} />
                  </button>
                )}
                {activeFilter && (
                  <button onClick={() => setActiveFilter(null)} className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60">✕</button>
                )}
              </div>
            )}

            {/* ── Stats card (absolute overlay, top-left) — desktop only ── */}
            {!isMobile && recentCount > 0 && (
              <div
                className="absolute top-3 left-3 z-10 rounded-xl border border-white/10 bg-black/80 backdrop-blur-sm flex flex-col"
                style={{
                  width: isMobile ? 200 : cardWidth,
                  height: isMobile ? undefined : (cardHeight ?? undefined),
                  maxHeight: isMobile ? 160 : maxCardHeight,
                }}
              >
                {/* Scrollable content area */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 map-card-scroll">
                <style>{`.map-card-scroll::-webkit-scrollbar{width:3px}.map-card-scroll::-webkit-scrollbar-track{background:transparent}.map-card-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:99px}.map-card-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.3)}`}</style>
                {/* Card header: live count + controls */}
                <div className="mb-2 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="truncate text-[11px] text-white/70">{recentCount} visitor{recentCount === 1 ? "" : "s"} today</span>
                  </div>
                  <div className="relative flex shrink-0 items-center gap-0.5">
                    {/* Globe / 2D toggle */}
                    <div className="flex items-center rounded border border-white/10 bg-white/5">
                      <button
                        onClick={() => setProjection("globe")}
                        title="Globe view"
                        className={`rounded-l px-1.5 py-1 transition-colors ${projection === "globe" ? "bg-white/20 text-white" : "text-white/30 hover:text-white/70"}`}
                      >
                        <Globe className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => setProjection("mercator")}
                        title="Flat 2D view"
                        className={`rounded-r px-1.5 py-1 transition-colors ${projection === "mercator" ? "bg-white/20 text-white" : "text-white/30 hover:text-white/70"}`}
                      >
                        <MapIcon className="h-3 w-3" />
                      </button>
                    </div>
                    {/* Auto-rotate toggle — globe only */}
                    <button
                      onClick={() => {
                        if (projection !== "globe") setProjection("globe");
                        setAutoRotate((v) => !v);
                      }}
                      title={projection !== "globe" ? "Switch to globe to spin" : autoRotate ? "Stop rotation" : "Auto-rotate globe"}
                      className={`rounded p-1 transition-colors ${autoRotate ? "text-emerald-400 hover:text-emerald-300" : "text-white/30 hover:bg-white/10 hover:text-white/70"}`}
                    >
                      <RotateCcw className={`h-3 w-3 ${autoRotate ? "animate-spin" : ""}`} style={autoRotate ? { animationDirection: "normal", animationDuration: "3s" } : {}} />
                    </button>
                    {/* Theme picker */}
                    <div className="relative">
                      <button
                        onClick={() => setShowThemePicker((v) => !v)}
                        title="Map theme"
                        className={`rounded p-1 transition-colors ${showThemePicker ? "bg-white/15 text-white" : "text-white/30 hover:bg-white/10 hover:text-white/70"}`}
                      >
                        <Palette className="h-3 w-3" />
                      </button>
                      {showThemePicker && (
                        <>
                          {/* Invisible backdrop — click outside closes picker without eating the click */}
                          <div className="fixed inset-0 z-10" onMouseDown={() => setShowThemePicker(false)} />
                          <div className="absolute right-0 top-full mt-1 z-20 min-w-[130px] rounded-lg border border-white/10 bg-black/90 p-1.5 backdrop-blur-sm shadow-xl">
                            {MAP_THEMES.map((t) => (
                              <button
                                key={t.id}
                                onMouseDown={(e) => {
                                  e.stopPropagation(); // prevent backdrop closing before click fires
                                  setMapTheme(t.id);
                                  setShowThemePicker(false);
                                }}
                                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] transition-colors ${mapTheme === t.id ? "bg-white/15 text-white" : "text-white/50 hover:bg-white/10 hover:text-white/80"}`}
                              >
                                <span className="h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ background: t.dot }} />
                                {t.label}
                                {mapTheme === t.id && <span className="ml-auto text-emerald-400">✓</span>}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Simulate visitor (dev only) */}
                    {devSimulate && (
                      <button
                        onClick={simulateVisitor}
                        disabled={simulating}
                        title="Simulate random visitor"
                        className="rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70 disabled:opacity-40"
                      >
                        <UserPlus className={`h-3 w-3 ${simulating ? "animate-pulse text-emerald-400" : ""}`} />
                      </button>
                    )}
                    {/* Collapse / expand */}
                    <button
                      onClick={() => setCardCollapsed((v) => !v)}
                      title={cardCollapsed ? "Expand" : "Collapse"}
                      className="rounded p-1 text-white/30 transition-colors hover:bg-white/10 hover:text-white/70"
                    >
                      {cardCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
                    </button>
                    {/* Clear filter */}
                    {activeFilter && (
                      <button
                        onClick={() => setActiveFilter(null)}
                        title="Clear filter"
                        className="ml-0.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white/60 hover:bg-white/20 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                {!cardCollapsed && (() => {
                  // When a filter is active, cross-filter: the active dimension keeps global counts
                  // (so you can switch), other dimensions recompute from the filtered feed subset.
                  const filteredSlice = activeFilter ? feed.filter((f) => matchesFilter(f, activeFilter)) : null;

                  const xRefCounts: Map<string, number> = activeFilter?.type === "referrer"
                    ? referrerCounts
                    : (() => {
                        const m = new Map<string, number>();
                        for (const f of filteredSlice ?? feed) m.set(f.referrerName, (m.get(f.referrerName) ?? 0) + 1);
                        return m;
                      })();

                  const xCtryCounts: Map<string, { flag: string; count: number }> = activeFilter?.type === "country"
                    ? countryCounts
                    : (() => {
                        const m = new Map<string, { flag: string; count: number }>();
                        for (const f of filteredSlice ?? feed) {
                          const prev = m.get(f.country);
                          m.set(f.country, { flag: f.flag, count: (prev?.count ?? 0) + 1 });
                        }
                        return m;
                      })();

                  const xDevCounts: Map<string, number> = activeFilter?.type === "device"
                    ? deviceCounts
                    : (() => {
                        const m = new Map<string, number>();
                        for (const f of filteredSlice ?? feed) m.set(f.device, (m.get(f.device) ?? 0) + 1);
                        return m;
                      })();

                  return (
                    <div className="space-y-2">
                      <PillRow
                        label={networkMode ? "Referrers from StartupBar Widget" : "Referrers"}
                        entries={[...xRefCounts.entries()]
                          .filter(([k]) => true)
                          .sort((a, b) => b[1] - a[1])
                          .map(([k, v]) => {
                            const display = networkMode && k.startsWith("StartupBar (") ? k.slice(12, -1) : k;
                            return { display, value: k, count: v };
                          })}
                        type="referrer"
                        activeFilter={activeFilter}
                        onToggle={toggleFilter}
                      />
                      <PillRow
                        label="Countries"
                        entries={[...xCtryCounts.entries()].sort((a, b) => b[1].count - a[1].count).map(([k, v]) => ({ display: `${v.flag} ${k}`, value: k, count: v.count }))}
                        type="country"
                        activeFilter={activeFilter}
                        onToggle={toggleFilter}
                      />
                      <PillRow
                        label="Devices"
                        entries={[...xDevCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ display: k, value: k, count: v }))}
                        type="device"
                        activeFilter={activeFilter}
                        onToggle={toggleFilter}
                      />
                    </div>
                  );
                })()}
                </div>{/* end scrollable content */}

                {/* Bottom drag-handle strip — desktop only */}
                {!isMobile && <div
                  className="flex items-center justify-center h-4 cursor-nwse-resize shrink-0 group border-t border-white/[0.06]"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const el = e.currentTarget.parentElement!;
                    dragStartRef.current = { x: e.clientX, y: e.clientY, w: cardWidth, h: cardHeight ?? el.offsetHeight };
                    const onMove = (ev: MouseEvent) => {
                      if (!dragStartRef.current) return;
                      const newW = Math.max(260, Math.min(700, dragStartRef.current.w + ev.clientX - dragStartRef.current.x));
                      const maxH = maxCardHeight;
                      const newH = Math.max(120, Math.min(maxH, dragStartRef.current.h + ev.clientY - dragStartRef.current.y));
                      setCardWidth(newW);
                      setCardHeight(newH);
                    };
                    const onUp = () => {
                      dragStartRef.current = null;
                      window.removeEventListener("mousemove", onMove);
                      window.removeEventListener("mouseup", onUp);
                    };
                    window.addEventListener("mousemove", onMove);
                    window.addEventListener("mouseup", onUp);
                  }}
                >
                  <div className="flex gap-0.5 opacity-20 group-hover:opacity-60 transition-opacity">
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <div className="w-1 h-1 rounded-full bg-white" />
                  </div>
                </div>}
              </div>
            )}

            {/* ── Feed panel (absolute overlay, bottom-left) — desktop only ── */}
            {!isMobile && (() => {
              const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
              const filteredFeed = feed.filter((f) => matchesFilter(f, activeFilter));
              const livePinIdSet = new Set(livePinIds);
              const activeFromPins = filteredFeed.filter((f) => livePinIdSet.has(f.id));
              const activeFromRecent = filteredFeed.filter((f) => nowTick - f.ts < ACTIVE_WINDOW_MS);
              const activeCount = Math.max(activeFromPins.length, activeFromRecent.length);
              const activeAvatars = (activeFromPins.length >= activeFromRecent.length ? activeFromPins : activeFromRecent).slice(0, 4);
              return (
                <div ref={feedCardRef} className={`absolute bottom-3 left-3 z-10 overflow-hidden rounded-xl border border-white/10 bg-black/75 backdrop-blur-md ${isMobile ? "w-[200px]" : "w-[300px]"}`}>
                  {/* Header — active now count */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                    <div className="flex items-center gap-2">
                      {/* Stacked avatars */}
                      {activeAvatars.length > 0 && (
                        <div className="flex items-center">
                          {activeAvatars.map((f, i) => (
                            <img
                              key={f.id}
                              src={avatarUrl(f.id)}
                              width={18}
                              height={18}
                              title={f.name}
                              className="rounded-full bg-zinc-900 ring-1 ring-black"
                              style={{ marginLeft: i === 0 ? 0 : -5, position: "relative", zIndex: activeAvatars.length - i }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-[11px] font-semibold text-white tabular-nums">
                          {activeCount > 0 ? `${activeCount} active now` : "Recent visitors"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] tabular-nums text-white/20">{filteredFeed.length} today</span>
                  </div>
                  {/* Scrollable list */}
                  <div className="relative">
                    <div className="pointer-events-none absolute top-0 left-0 right-0 z-10 h-6 bg-gradient-to-b from-black/60 to-transparent" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-8 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="max-h-[104px] overflow-y-auto px-2 py-1.5" style={{ scrollbarWidth: "none" }}>
                      {filteredFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 text-white/25">
                          <Eye className="h-4 w-4 mb-1 opacity-40" />
                          <span className="text-[10px]">No visitors yet</span>
                        </div>
                      ) : (
                        <>
                          {filteredFeed.map((f, i) => (
                            <div key={f.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]">
                              <div className="relative shrink-0">
                                <img
                                  src={avatarUrl(f.id)}
                                  width={26}
                                  height={26}
                                  className="rounded-full bg-zinc-900"
                                  style={{ border: `1.5px solid ${DEVICE_COLORS[f.device] ?? DEVICE_COLORS.unknown}` }}
                                />
                                {nowTick - f.ts < ACTIVE_WINDOW_MS && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-black bg-emerald-400" />}
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                {networkMode ? (
                                  <>
                                    <div className="flex items-baseline gap-1 leading-none overflow-hidden">
                                      <span className="truncate text-[11px] font-semibold capitalize text-white">{f.name}</span>
                                      <span className="shrink-0 text-[10px] text-white/35">{f.flag} {COUNTRY_NAMES[f.country] ?? f.country}</span>
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1 overflow-hidden text-[10px] text-white/40">
                                      <span className="truncate font-medium text-white/50">
                                        {f.referrerName.startsWith("StartupBar (") ? f.referrerName.slice(12, -1) : f.referrerName}
                                      </span>
                                      <span className="shrink-0 text-white/20">·</span>
                                      <span className="truncate text-white/30">{cleanPath(f.path)}</span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-baseline gap-1 leading-none overflow-hidden">
                                      <span className="truncate text-[11px] font-semibold capitalize text-white">{f.name}</span>
                                      <span className="shrink-0 text-[10px] text-white/35">{f.flag} {COUNTRY_NAMES[f.country] ?? f.country}</span>
                                    </div>
                                    <div className="mt-0.5 truncate text-[10px] text-white/30">{cleanPath(f.path)}</div>
                                  </>
                                )}
                              </div>
                              <span className="shrink-0 text-[9px] tabular-nums text-white/20">{timeAgo(f.ts, nowTick)}</span>
                            </div>
                          ))}
                          <div className="h-3" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── Mobile: stats left + feed right, below map ── */}
          {isMobile && (() => {
            const filteredSlice = activeFilter ? feed.filter((f) => matchesFilter(f, activeFilter)) : null;
            const xRefCounts: Map<string, number> = activeFilter?.type === "referrer" ? referrerCounts : (() => { const m = new Map<string, number>(); for (const f of filteredSlice ?? feed) m.set(f.referrerName, (m.get(f.referrerName) ?? 0) + 1); return m; })();
            const xCtryCounts: Map<string, { flag: string; count: number }> = activeFilter?.type === "country" ? countryCounts : (() => { const m = new Map<string, { flag: string; count: number }>(); for (const f of filteredSlice ?? feed) { const prev = m.get(f.country); m.set(f.country, { flag: f.flag, count: (prev?.count ?? 0) + 1 }); } return m; })();
            const xDevCounts: Map<string, number> = activeFilter?.type === "device" ? deviceCounts : (() => { const m = new Map<string, number>(); for (const f of filteredSlice ?? feed) m.set(f.device, (m.get(f.device) ?? 0) + 1); return m; })();
            const filteredFeed = feed.filter((f) => matchesFilter(f, activeFilter));
            const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
            const livePinIdSet = new Set(livePinIds);
            const activeCount = Math.max(
              filteredFeed.filter((f) => livePinIdSet.has(f.id)).length,
              filteredFeed.filter((f) => nowTick - f.ts < ACTIVE_WINDOW_MS).length,
            );
            return (
              <div className="flex gap-2 p-2 items-start border-t border-white/[0.06]" style={{ background: "rgba(0,0,0,0.85)" }}>
                {/* Left: X Visitors (stats) */}
                {recentCount > 0 && (
                  <div ref={statsCardRef} className="flex-1 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/80" style={{ alignSelf: "flex-start", height: "fit-content" }}>
                    <div className="px-3 pt-2.5 pb-1 border-b border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="truncate text-[10px] font-semibold text-white">{recentCount} visitors today</span>
                      </div>
                      {activeFilter && (
                        <button onClick={() => setActiveFilter(null)} className="ml-1 shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/60 hover:bg-white/20">✕</button>
                      )}
                    </div>
                    <div className="px-2 pt-2 pb-1 space-y-1.5">
                      <PillRow
                        label={networkMode ? "Referrers from StartupBar Widget" : "Referrers"}
                        entries={[...xRefCounts.entries()].filter(([k]) => networkMode ? k !== "Direct" && !["Google","Bing","Yahoo","DuckDuckGo","Twitter / X","LinkedIn","Facebook","Instagram","Reddit","GitHub","Hacker News","Product Hunt","Medium","Substack","TikTok","YouTube","Discord","Slack","Notion","Dev.to"].includes(k) : true).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ display: networkMode && k.startsWith("StartupBar (") ? k.slice(12, -1) : k, value: k, count: v }))}
                        type="referrer" activeFilter={activeFilter} onToggle={toggleFilter}
                      />
                      <PillRow
                        label="Countries"
                        entries={[...xCtryCounts.entries()].sort((a, b) => b[1].count - a[1].count).map(([k, v]) => ({ display: `${v.flag} ${k}`, value: k, count: v.count }))}
                        type="country" activeFilter={activeFilter} onToggle={toggleFilter}
                      />
                      <PillRow
                        label="Devices"
                        entries={[...xDevCounts.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ display: k, value: k, count: v }))}
                        type="device" activeFilter={activeFilter} onToggle={toggleFilter}
                      />
                    </div>
                  </div>
                )}
                {/* Right: Recent visitors (feed) */}
                {(
                  <div ref={feedCardRef} className="flex-1 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/75">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        </span>
                        <span className="text-[10px] font-semibold text-white">{activeCount > 0 ? `${activeCount} active` : "Recent"}</span>
                      </div>
                      <span className="text-[9px] tabular-nums text-white/20">{filteredFeed.length} today</span>
                    </div>
                    <div className="overflow-y-auto px-1.5 py-1" style={{ maxHeight: 220, scrollbarWidth: "none" }}>
                      {filteredFeed.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 text-white/25">
                          <Eye className="h-4 w-4 mb-1 opacity-40" />
                          <span className="text-[10px]">No visitors yet</span>
                        </div>
                      ) : (
                        <>
                          {filteredFeed.map((f, i) => (
                            <div key={f.id} className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-white/[0.05]">
                              <div className="relative shrink-0">
                                <img src={avatarUrl(f.id)} width={22} height={22} className="rounded-full bg-zinc-900" style={{ border: `1.5px solid ${DEVICE_COLORS[f.device] ?? DEVICE_COLORS.unknown}` }} />
                                {i === 0 && <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-black bg-emerald-400" />}
                              </div>
                              <div className="min-w-0 flex-1 overflow-hidden">
                                <div className="flex items-baseline gap-1 overflow-hidden leading-none">
                                  <span className="truncate text-[10px] font-semibold capitalize text-white">{f.name}</span>
                                  <span className="shrink-0 text-[9px] text-white/35">{f.flag}</span>
                                </div>
                                <div className="truncate text-[9px] text-white/30">{cleanPath(f.path)}</div>
                              </div>
                              <span className="shrink-0 text-[8px] tabular-nums text-white/20">{timeAgo(f.ts, nowTick)}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </>
      ) : (
        <div className="relative" style={{ aspectRatio: "800 / 380" }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs text-white/40">Mapbox token not set yet.</p>
            <p className="text-[11px] text-white/25">
              Add a free public token to <code className="rounded bg-white/10 px-1 py-0.5">VITE_MAPBOX_TOKEN</code> in .env — get one at{" "}
              <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
                account.mapbox.com
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PillRow({
  label,
  entries,
  type,
  activeFilter,
  onToggle,
}: {
  label: string;
  entries: { display: string; value: string; count: number }[];
  type: FilterType;
  activeFilter: ActiveFilter | null;
  onToggle: (type: FilterType, value: string) => void;
}) {
  if (entries.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-[10px] text-white/40">{label}</div>
      <div className="flex gap-1 overflow-x-auto" style={{ flexWrap: "nowrap", scrollbarWidth: "none" }}>
        {entries.map((e) => {
          const isActive = activeFilter?.type === type && activeFilter.value === e.value;
          return (
            <button
              key={e.value}
              onClick={() => onToggle(type, e.value)}
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize whitespace-nowrap transition-colors ${
                isActive ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {e.display} <span className={isActive ? "text-black/50" : "text-white/40"}>({e.count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
