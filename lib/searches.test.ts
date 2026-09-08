import assert from "node:assert/strict";
import test from "node:test";
import { matchesHardFilters, searchAttributes } from "./searches";
import type { AgentListing } from "./agent";
import type { SearchRule } from "./types";

test("validates and normalizes editable search parameters", () => {
  assert.deepEqual(searchAttributes({ name: "  Cabin  ", location: " Vermont ", min_price: "100000", max_price: "" }), {
    data: {
      name: "Cabin", location: "Vermont", property_type: "either", min_price: 100000,
      max_price: null, min_beds: null, min_acres: null, must_haves: "", deal_breakers: "", alert_email: "",
    },
  });
  assert.deepEqual(searchAttributes({ name: "Cabin", location: "Vermont", min_price: 200, max_price: 100 }), {
    error: "Minimum price cannot exceed maximum price.",
  });
  const currency = searchAttributes({ name: "Cabin", location: "Vermont", max_price: "$1,000,000" });
  assert.ok("data" in currency);
  assert.equal(currency.data.max_price, 1_000_000);
});

test("rejects listings outside hard search limits", () => {
  const rule = {
    property_type: "home", min_price: null, max_price: 1_000_000, min_beds: 3, min_acres: null,
  } as SearchRule;
  const listing = { property_type: "home", price: 2_295_000, beds: 4, acres: 28 } as AgentListing;
  assert.equal(matchesHardFilters(listing, rule), false);
  assert.equal(matchesHardFilters({ ...listing, price: 900_000 }, rule), true);
  assert.equal(matchesHardFilters({ ...listing, price: null }, rule), false);
});
