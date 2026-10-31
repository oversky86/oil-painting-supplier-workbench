/** Carrier tracking page. Shopify's own URL wins; UPS and FedEx have a direct fallback. */
export function carrierTrackingUrl(
  company?: string | null,
  number?: string | null,
  url?: string | null,
): string | null {
  const provided = url?.trim();
  if (provided) return provided;
  const trackingNumber = number?.trim();
  if (!trackingNumber) return null;
  const carrier = (company || "").trim().toLowerCase();
  if (carrier === "ups") {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  }
  if (carrier === "fedex") {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  }
  return null;
}
