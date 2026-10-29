const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { page, run } = require("./update-show-ratings");

const validPage = { items: [{ name: "Test Player", series: "Live", ovr: 80 }], total_pages: 1 };

test("403 keeps the existing dated snapshot without writing and emits a workflow warning", async t => {
  t.mock.method(global, "fetch", async () => new Response("Forbidden", { status: 403 }));
  t.mock.method(fs, "readFileSync", () => 'window.UTI_SHOW_RATINGS = {"updated":"2026-10-29","ratings":{"test":80}};\n');
  const write = t.mock.method(fs, "writeFileSync", () => assert.fail("Must not overwrite cached ratings"));
  const warning = t.mock.method(console, "warn", () => {});
  await run();
  assert.equal(write.mock.callCount(), 0);
  assert.match(warning.mock.calls[0].arguments[0], /::warning::.*NOT refreshed.*2026-10-29/);
});

test("403 still fails when no usable snapshot exists", async t => {
  t.mock.method(global, "fetch", async () => new Response("Forbidden", { status: 403 }));
  t.mock.method(fs, "readFileSync", () => 'window.UTI_SHOW_RATINGS = {"ratings":{}};');
  await assert.rejects(run(), /HTTP 403/);
});

test("other HTTP errors still fail instead of silently using cached ratings", async t => {
  t.mock.method(global, "fetch", async () => new Response("Not Found", { status: 404 }));
  await assert.rejects(run(), /HTTP 404/);
});

test("retries transport errors, rate limits, and invalid JSON before returning card data", async t => {
  const delays = [];
  t.mock.method(global, "setTimeout", (callback, delay) => {
    delays.push(delay);
    queueMicrotask(callback);
  });
  t.mock.method(console, "warn", () => {});
  let calls = 0;
  t.mock.method(global, "fetch", async () => {
    calls++;
    if (calls === 1) throw new TypeError("fetch failed", { cause: { code: "ECONNRESET" } });
    if (calls === 2) return new Response("rate limited", { status: 429, headers: { "Retry-After": "10" } });
    if (calls === 3) return new Response("<html>temporary error</html>");
    return Response.json(validPage);
  });
  assert.deepEqual(await page(2), validPage);
  assert.equal(calls, 4);
  assert.deepEqual(delays, [2000, 10000, 8000]);
});

test("does not retry permanent HTTP errors", async t => {
  let calls = 0;
  t.mock.method(global, "fetch", async () => {
    calls++;
    return new Response("not found", { status: 404 });
  });
  await assert.rejects(page(3), /page=3 failed after 1 attempt\(s\): HTTP 404/);
  assert.equal(calls, 1);
});

test("fails clearly after repeated malformed card responses", async t => {
  t.mock.method(global, "setTimeout", callback => queueMicrotask(callback));
  t.mock.method(console, "warn", () => {});
  let calls = 0;
  t.mock.method(global, "fetch", async () => {
    calls++;
    return Response.json({ message: "temporarily unavailable" });
  });
  await assert.rejects(page(4), /page=4 failed after 5 attempt\(s\): Invalid card-list response/);
  assert.equal(calls, 5);
});
