const optionalNumber = (value: unknown) => value === "" || value == null ? null : Number(value);

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
