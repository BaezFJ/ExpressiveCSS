/** Accept image URLs without allowing arbitrary URL schemes. */
export function imageURL(value: string | null | undefined, base: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, base);
    if (/^(?:https?:|blob:|data:image\/(?:avif|bmp|gif|jpeg|png|svg\+xml|webp|x-icon)(?:;|,))/i.test(url.href)) return url.href;
  } catch { /* Invalid images must not prevent selection. */ }
  return undefined;
}
