import assert from "node:assert/strict";
import test from "node:test";
import { normalizeListingUrl, sourceFromUrl } from "./urls";

test("normalizes listing URLs for reliable deduplication", () => {
  assert.equal(
    normalizeListingUrl("https://www.example.com/house/42/?utm_source=email#photos"),
    "https://www.example.com/house/42",
  );
  assert.equal(sourceFromUrl("https://www.example.com/house/42"), "example.com");
});
