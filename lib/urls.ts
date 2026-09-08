const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];

export function normalizeListingUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param));
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString();
}

export function sourceFromUrl(value: string) {
  return new URL(value).hostname.replace(/^www\./, "");
}
