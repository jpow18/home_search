import type { SearchRule } from "./types";

export type AgentListing = {
  title: string;
  address: string;
  price: number | null;
  currency: string;
  property_type: string;
  beds: number | null;
  baths: number | null;
  acres: number | null;
  summary: string;
  score: number;
  pros: string[];
  cons: string[];
  url: string;
  image_url: string | null;
};

const listingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["listings"],
  properties: {
    listings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title", "address", "price", "currency", "property_type", "beds", "baths",
          "acres", "summary", "score", "pros", "cons", "url", "image_url",
        ],
        properties: {
          title: { type: "string" },
          address: { type: "string" },
          price: { type: ["number", "null"] },
          currency: { type: "string" },
          property_type: { type: "string" },
          beds: { type: ["number", "null"] },
          baths: { type: ["number", "null"] },
          acres: { type: ["number", "null"] },
          summary: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 100 },
          pros: { type: "array", items: { type: "string" }, maxItems: 5 },
          cons: { type: "array", items: { type: "string" }, maxItems: 5 },
          url: { type: "string" },
          image_url: { type: ["string", "null"] },
        },
      },
    },
  },
};

function money(value: number | null) {
  return value == null ? "not set" : `$${value.toLocaleString("en-US")}`;
}

export async function findListings(rule: SearchRule): Promise<AgentListing[]> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      store: false,
      tools: [{ type: "web_search", search_context_size: "medium" }],
      text: {
        format: {
          type: "json_schema",
          name: "property_listings",
          strict: true,
          schema: listingSchema,
        },
      },
      input: `You are a careful property search agent. Search the live web for active real-estate listings that match this rule.

Search: ${rule.name}
Location: ${rule.location}
Property type: ${rule.property_type}
Price: ${money(rule.min_price)} to ${money(rule.max_price)}
Minimum bedrooms: ${rule.min_beds ?? "not set"}
Minimum acres: ${rule.min_acres ?? "not set"}
Must haves: ${rule.must_haves || "none"}
Deal breakers: ${rule.deal_breakers || "none"}

Return up to 12 current listings. Use the direct public listing URL, not a search page. Do not invent facts. Use null when a fact is not available. Score each listing from 0 to 100 against the full rule. State uncertainties as cons. Results are leads for the owner to verify, not guarantees.`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI search failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const result = await response.json();
  const outputText = result.output
    ?.flatMap((item: { content?: { type: string; text?: string }[] }) => item.content || [])
    .find((item: { type: string }) => item.type === "output_text")?.text;

  if (!outputText) throw new Error("The search agent returned no structured results.");
  return (JSON.parse(outputText) as { listings: AgentListing[] }).listings;
}
