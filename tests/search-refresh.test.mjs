import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectionOrder, mergeInspections, pool, refreshSearchData } from "../src/lib/refresh-core.ts";

const previous = {
  google: { indexing: { indexed: 1 }, requested: [] },
  bing: { clicks: 3, indexed: 9 },
  clarity: { metrics: [] },
  inspections: { "/a": { indexed: true, state: "Indexed", lastCrawled: null, checked: "2026-11-01" } },
};

const ports = (sources, saved = []) => ({
  sources,
  save: async data => {
    saved.push(data);
    return "abc123";
  },
  now: () => 1_000,
  budgetMs: 36_000,
});

test("a failing source keeps its previous numbers and is reported", async () => {
  const saved = [];
  const result = await refreshSearchData(
    ["/a", "/b"],
    previous,
    ports(
      {
        bing: async () => {
          throw new Error("Bing is down");
        },
        clarity: async () => ({ metrics: [{ name: "Traffic", values: { totalSessionCount: 42 } }] }),
      },
      saved,
    ),
  );
  assert.deepEqual(result.failed, ["Bing: Bing is down"]);
  assert.ok(result.notes.includes("Google skipped: no key."));
  assert.ok(result.notes.includes("Clarity: 42 sessions in the last 3 days."));
  assert.equal(result.commit, "abc123");
  assert.deepEqual(saved[0].bing, previous.bing, "Bing kept its old numbers");
  assert.deepEqual(saved[0].google, previous.google, "Google kept its old numbers");
  assert.equal(saved[0].clarity.metrics[0].values.totalSessionCount, 42);
});

test("nothing is saved when every source fails or none has a key", async () => {
  const saved = [];
  await assert.rejects(() => refreshSearchData(["/a"], previous, ports({}, saved)), /No source has a key/);
  await assert.rejects(
    () =>
      refreshSearchData(
        ["/a"],
        previous,
        ports({ clarity: () => Promise.reject(new Error("quota")) }, saved),
      ),
    /Clarity: quota/,
  );
  assert.equal(saved.length, 0);
});

test("Google gets the time budget from the clock and its result is saved", async () => {
  let until;
  const result = await refreshSearchData(
    ["/a", "/b"],
    previous,
    ports({
      google: async input => {
        until = input.until;
        return {
          google: { indexing: { indexed: 2 } },
          inspections: { "/a": {}, "/b": {} },
          checkedNow: 2,
        };
      },
    }),
  );
  assert.equal(until, 37_000);
  assert.equal(result.snapshot.google.indexing.indexed, 2);
  assert.match(result.notes[0], /^Google: checked 2 pages this time; 2 of 2 indexed\.$/);
});

test("oldest checks go first, never-checked pages before all", () => {
  const prev = { "/old": { checked: "2026-10-01" }, "/new": { checked: "2026-11-20" } };
  assert.deepEqual(inspectionOrder(["/new", "/never", "/old"], prev), ["/never", "/old", "/new"]);
});

test("pages not checked this time keep their earlier result; gone pages drop out", () => {
  const prev = { "/a": { indexed: true, checked: "old" }, "/gone": { indexed: true } };
  const { inspections, checkedNow } = mergeInspections(["/a", "/b", "/c"], [undefined, { indexed: false, checked: "new" }, null], prev);
  assert.deepEqual(inspections, { "/a": prev["/a"], "/b": { indexed: false, checked: "new" } });
  assert.equal(checkedNow, 1);
});

test("the time budget stops new inspections from starting", async () => {
  let clock = 0;
  const started = [];
  const results = await pool(
    ["/1", "/2", "/3", "/4"],
    1,
    async p => {
      started.push(p);
      clock += 10;
      return p;
    },
    25,
    () => clock,
  );
  assert.deepEqual(started, ["/1", "/2", "/3"]);
  assert.deepEqual([...results], ["/1", "/2", "/3", undefined]);
});
