import assert from "node:assert/strict";
import test from "node:test";
import { GET } from "../app/api/cron/route";

test("runtime inspection requires cron authorization and performs no network work", async () => {
  const previousSecret = process.env.CRON_SECRET;
  const previousFetch = globalThis.fetch;
  process.env.CRON_SECRET = "runtime-test-only";
  globalThis.fetch = async () => { throw new Error("Unexpected network request"); };
  try {
    const url = "https://example.test/api/cron?runtime=1";
    assert.equal((await GET(new Request(url))).status, 401);
    const response = await GET(new Request(url, { headers: { authorization: "Bearer runtime-test-only" } }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { node: process.versions.node, brotli: process.versions.brotli });
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    globalThis.fetch = previousFetch;
  }
});
