/** CSP permission and slot placeholders are not proof of a native iframe. */
export function hasNativeWidgetFrame(html: string): boolean {
  return /<iframe\b[^>]*\bsrc\s*=\s*["']https?:\/\/(?:www\.)?startupbar\.co\/widget\/bar(?:[?"'#]|\s)/i.test(html);
}