export type WidgetPalette = { background: string; foreground: string };

export function parseWidgetColor(value: unknown): string | undefined {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
}

function channels(hex: string): number[] {
  return [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
}

export function widgetContrast(background: string, foreground: string): number {
  const luminance = (color: string) => channels(color).map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  const a = luminance(background), b = luminance(foreground);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// Only six-digit colors can cross the frame boundary; CSS expressions cannot.
export function resolveWidgetPalette(background: unknown, foreground: unknown): WidgetPalette | undefined {
  const bg = parseWidgetColor(background);
  if (!bg) return undefined;
  const fg = parseWidgetColor(foreground);
  const safest = widgetContrast(bg, "#ffffff") > widgetContrast(bg, "#000000") ? "#ffffff" : "#000000";
  return { background: bg, foreground: fg && widgetContrast(bg, fg) >= 4.5 ? fg : safest };
}

export function widgetMutedColor(palette: WidgetPalette): string {
  const bg = channels(palette.background), fg = channels(palette.foreground);
  const mixed = "#" + fg.map((c, i) => Math.round(c * 0.78 + bg[i] * 0.22).toString(16).padStart(2, "0")).join("");
  return widgetContrast(palette.background, mixed) >= 4.5 ? mixed : palette.foreground;
}