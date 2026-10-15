// Deterministic fun name + avatar URL derived from a visitor id.
const ADJECTIVES = [
  "silent", "clever", "brave", "quiet", "bright", "swift", "gentle", "curious",
  "eager", "fuzzy", "jolly", "lucky", "mellow", "nimble", "plucky", "quirky",
  "rapid", "sly", "sunny", "tiny", "wild", "witty", "zesty", "cosmic",
  "electric", "hidden", "misty", "noble", "polar", "royal", "shy", "wandering",
];

const ANIMALS = [
  "otter", "fox", "wolf", "lynx", "panda", "koala", "tiger", "eagle",
  "hawk", "owl", "whale", "dolphin", "seal", "moose", "bear", "raven",
  "sparrow", "falcon", "puma", "jaguar", "cheetah", "gecko", "heron", "badger",
  "beaver", "ferret", "hedgehog", "narwhal", "octopus", "penguin", "quokka", "walrus",
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function funName(id: string): string {
  const h = hashString(id);
  const adj = ADJECTIVES[h % ADJECTIVES.length];
  const animal = ANIMALS[(h >>> 8) % ANIMALS.length];
  return `${adj} ${animal}`;
}

export function avatarUrl(id: string): string {
  // DiceBear pixel-art avatars, seeded by visitor id for stable identity.
  return `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(id)}`;
}

const AVATAR_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#14b8a6", "#f97316"];

/** Local data-URI avatar used when the DiceBear request fails or rate-limits. */
export function avatarFallback(id: string): string {
  const h = hashString(id || "visitor");
  const color = AVATAR_COLORS[h % AVATAR_COLORS.length];
  const initials = funName(id || "visitor")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${color}'/><text x='32' y='42' font-family='sans-serif' font-size='26' font-weight='700' fill='#ffffff' text-anchor='middle'>${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** onError handler for JSX <img> tags: swaps a broken remote avatar for the local fallback. */
export function handleAvatarError(e: { currentTarget: HTMLImageElement }) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = avatarFallback(img.dataset.sbid ?? "");
}
