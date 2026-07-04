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
