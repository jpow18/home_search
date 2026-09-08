import type { AgentListing } from "./agent";
import type { SearchRule } from "./types";

const optionalNumber = (value: unknown) => {
  if (value === "" || value == null) return null;
  const cleaned = String(value).replace(/[$,\s]/g, "");
  return cleaned ? Number(cleaned) : null;
};

export function matchesHardFilters(listing: AgentListing, rule: SearchRule) {
  if (rule.property_type !== "either" && listing.property_type !== rule.property_type) return false;
  if (rule.min_price != null && (listing.price == null || listing.price < rule.min_price)) return false;
  if (rule.max_price != null && (listing.price == null || listing.price > rule.max_price)) return false;
  if (rule.min_beds != null && (listing.beds == null || listing.beds < rule.min_beds)) return false;
  if (rule.min_acres != null && (listing.acres == null || listing.acres < rule.min_acres)) return false;
  return true;
}

export function searchAttributes(input: unknown) {
  if (!input || typeof input !== "object") return { error: "Invalid search data." } as const;
  const body = input as Record<string, unknown>;
  const name = String(body.name || "").trim();
  const location = String(body.location || "").trim();
  const propertyType = ["home", "land", "either"].includes(String(body.property_type)) ? String(body.property_type) : "either";
  const alertEmail = String(body.alert_email || "").trim();

  if (!name || !location) return { error: "Name and location are required." } as const;
  if (alertEmail && !/^\S+@\S+\.\S+$/.test(alertEmail)) return { error: "Enter a valid alert email." } as const;

  const data = {
    name,
    location,
    property_type: propertyType,
    min_price: optionalNumber(body.min_price),
    max_price: optionalNumber(body.max_price),
    min_beds: optionalNumber(body.min_beds),
    min_acres: optionalNumber(body.min_acres),
    must_haves: String(body.must_haves || "").trim(),
    deal_breakers: String(body.deal_breakers || "").trim(),
    alert_email: alertEmail,
  };

  const numbers = [data.min_price, data.max_price, data.min_beds, data.min_acres].filter((value) => value != null);
  if (numbers.some((value) => !Number.isFinite(value) || value! < 0)) return { error: "Numeric filters must be zero or greater." } as const;
  if (data.min_price != null && data.max_price != null && data.min_price > data.max_price) {
    return { error: "Minimum price cannot exceed maximum price." } as const;
  }
  return { data } as const;
}
