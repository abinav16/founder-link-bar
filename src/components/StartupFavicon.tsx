import { useEffect, useMemo, useState } from "react";

interface Props {
  url: string;
  name?: string;
  size?: number;
  className?: string;
  alt?: string;
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

export function StartupFavicon({ url, name, size = 32, className = "", alt = "" }: Props) {
  const domain = extractDomain(url);
  const origin = useMemo(() => {
    if (!domain) return "";
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).origin;
    } catch {
      return `https://${domain}`;
    }
  }, [domain, url]);
  const sources = useMemo(() => {
    if (!domain) return [];
    return [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=${Math.max(size * 2, 64)}`,
    ];
  }, [domain, size]);


  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [url, size]);

  if (idx >= sources.length || sources.length === 0) {
    const letter = (name || domain || "?").trim().charAt(0).toUpperCase();
    return (
      <div
        className={`inline-flex items-center justify-center bg-black/[0.06] text-black/50 font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-label={alt || name}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={sources[idx]}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setIdx((i) => i + 1)}
      loading="lazy"
    />
  );
}
