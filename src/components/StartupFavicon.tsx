import { useEffect, useMemo, useRef, useState } from "react";
import { startupLogoSources } from "@/lib/startup-logo-sources";

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
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] || "";
  }
}

export function StartupFavicon({ url, name, size = 32, className = "", alt, logoUrl }: Props) {
  const domain = extractDomain(url);
  const sources = useMemo(() => startupLogoSources(url, logoUrl), [url, logoUrl]);

  const [idx, setIdx] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => setIdx(0), [url, size, logoUrl]);
  useEffect(() => {
    // SSR images can fail before React attaches onError; recover those too.
    const image = imageRef.current;
    if (image?.complete && image.currentSrc && image.naturalWidth === 0) {
      setIdx((current) => current === idx ? current + 1 : current);
    }
  }, [idx, sources]);

  // Default alt to a meaningful label so screen readers announce the logo.
  const resolvedAlt = alt ?? (name ? `${name} logo` : domain ? `${domain} logo` : "");

  if (idx >= sources.length || sources.length === 0) {
    const letter = (name || domain || "?").trim().charAt(0).toUpperCase();
    return (
      <div
        className={`inline-flex items-center justify-center bg-muted text-muted-foreground font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-label={resolvedAlt || name}
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      ref={imageRef}
      src={sources[idx]}
      alt={resolvedAlt}
      width={size}
      height={size}
      className={`bg-muted ${className}`}
      // Neutral background kills the white-flash before the favicon paints.
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setIdx((current) => current === idx ? current + 1 : current)}
      loading="lazy"
    />
  );
}
