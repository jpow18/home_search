import assert from "node:assert/strict";
import test from "node:test";
import { retrieveListingSearch, startListingSearch } from "./agent";
import type { SearchRule } from "./types";

test("starts and retrieves an OpenAI search without holding one request open", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  const requests: { url: string; body?: string }[] = [];
  process.env.OPENAI_API_KEY = "test-key";
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
  }
});
