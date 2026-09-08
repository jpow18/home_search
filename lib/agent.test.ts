import assert from "node:assert/strict";
import test from "node:test";
import { retrieveListingSearch, startListingSearch } from "./agent";
import type { SearchRule } from "./types";

test("starts and retrieves an OpenAI search without holding one request open", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const originalRentCastKey = process.env.RENTCAST_API_KEY;
  const requests: { url: string; body?: string }[] = [];
  process.env.OPENAI_API_KEY = "test-key";
  delete process.env.RENTCAST_API_KEY;
  globalThis.fetch = (async (input, init) => {
    requests.push({ url: String(input), body: init?.body as string | undefined });
    if (init?.method === "POST") return Response.json({ id: "resp_123", status: "queued" });
    return Response.json({
      id: "resp_123",
      status: "completed",
      output: [{ content: [{ type: "output_text", text: '{"listings":[]}' }] }],
    });
  }) as typeof fetch;

  const rule: SearchRule = {
    id: "search-1", name: "Cabin", location: "Vermont", property_type: "home",
    min_price: null, max_price: 500000, min_beds: 2, min_acres: null,
    must_haves: "", deal_breakers: "", alert_email: "", active: true, created_at: "",
  };

  try {
    assert.deepEqual(await startListingSearch(rule), { id: "resp_123", status: "queued" });
    assert.equal(JSON.parse(requests[0].body || "{}").background, true);
    assert.deepEqual(await retrieveListingSearch("resp_123"), { id: "resp_123", status: "completed", listings: [] });
    assert.equal(requests[1].url, "https://api.openai.com/v1/responses/resp_123");
  } finally {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalKey;
    process.env.RENTCAST_API_KEY = originalRentCastKey;
  }
});

test("uses RentCast candidates to ground the web search", async () => {
  const originalFetch = globalThis.fetch;
  const originalOpenAIKey = process.env.OPENAI_API_KEY;
  const originalRentCastKey = process.env.RENTCAST_API_KEY;
  const requests: { url: string; body?: string; rentCastKey?: string | null }[] = [];
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.RENTCAST_API_KEY = "test-rentcast-key";
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    requests.push({ url, body: init?.body as string | undefined, rentCastKey: new Headers(init?.headers).get("X-Api-Key") });
    if (url.startsWith("https://api.rentcast.io/")) {
      return Response.json([{
        id: "listing-1", formattedAddress: "10 Pine Trail, Asheville, NC 28801", price: 450000,
        propertyType: "Single Family", bedrooms: 3, bathrooms: 2, lotSize: 87120,
        daysOnMarket: 4, listedDate: "2026-09-01", mlsName: "Canopy MLS", mlsNumber: "123",
      }]);
    }
    return Response.json({ id: "resp_456", status: "queued" });
  }) as typeof fetch;

  const rule: SearchRule = {
    id: "search-2", name: "Mountain home", location: "Asheville, NC + 40 miles", property_type: "home",
    min_price: 200000, max_price: 500000, min_beds: 2, min_acres: 1,
    must_haves: "Trees", deal_breakers: "Flood zone", alert_email: "", active: true, created_at: "",
  };

  try {
    assert.deepEqual(await startListingSearch(rule), { id: "resp_456", status: "queued" });
    const rentCastUrl = new URL(requests[0].url);
    assert.equal(requests[0].rentCastKey, "test-rentcast-key");
    assert.equal(rentCastUrl.searchParams.get("address"), "Asheville, NC");
    assert.equal(rentCastUrl.searchParams.get("radius"), "40");
    assert.equal(rentCastUrl.searchParams.get("limit"), "500");
    assert.equal(rentCastUrl.searchParams.get("price"), "200000:500000");
    assert.equal(rentCastUrl.searchParams.get("bedrooms"), "2:*");
    assert.equal(rentCastUrl.searchParams.get("lotSize"), "43560:*");
    const openAIBody = JSON.parse(requests[1].body || "{}");
    assert.match(openAIBody.input, /10 Pine Trail/);
    assert.match(openAIBody.input, /search the wider web/);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalOpenAIKey;
    process.env.RENTCAST_API_KEY = originalRentCastKey;
  }
});
