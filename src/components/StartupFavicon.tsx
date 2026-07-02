import { useEffect, useMemo, useState } from "react";

interface Props {
  url: string;
  name?: string;
  size?: number;
  className?: string;
  alt?: string;
  logoUrl?: string | null;
}

function extractDomain(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

export function StartupFavicon({ url, name, size = 32, className = "", alt, logoUrl }: Props) {
  const domain = extractDomain(url);
  const sources = useMemo(() => {
    const list: string[] = [];
    if (logoUrl) list.push(logoUrl);
    if (domain) list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    return list;
  }, [domain, logoUrl]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [url, size, logoUrl]);

  // Default alt to a meaningful label so screen readers announce the logo.
  const resolvedAlt = alt ?? (name ? `${name} logo` : domain ? `${domain} logo` : "");

  if (idx >= sources.length || sources.length === 0) {
    const letter = (name || domain || "?").trim().charAt(0).toUpperCase();
    return (
      <div
        className={`inline-flex items-center justify-center bg-black/[0.06] text-black/50 font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-label={resolvedAlt || name}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt={resolvedAlt}
      width={size}
      height={size}
      className={className}
      // Neutral background kills the white-flash before the favicon paints.
      style={{ width: size, height: size, objectFit: "contain", backgroundColor: "rgba(0,0,0,0.04)" }}
      onError={() => setIdx((i) => i + 1)}
      loading="lazy"
    />
  );
}
