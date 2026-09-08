import assert from "node:assert/strict";
import test from "node:test";
import { searchAttributes } from "./searches";

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
});
