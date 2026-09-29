/** Editor preview links require a Lovable login, so always share the public site. */
export const PUBLIC_SITE_ORIGIN = "https://stream-scene-34.lovable.app";

export function shareOrigin() {
  if (typeof window === "undefined") return PUBLIC_SITE_ORIGIN;
  const host = window.location.hostname;
  const isPreview =
    /(^|\.)(id-preview[^.]*|[0-9a-f-]{36})\./.test(host) ||
    host.includes("lovableproject") ||
    host.includes("localhost");
  return isPreview ? PUBLIC_SITE_ORIGIN : window.location.origin;
}
