import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createPlanner, manilaClock, problems } from "../scripts/lib/social-plan.mjs";

// The real strategy, so these tests guard the rules Uriel actually posts by.
const config = JSON.parse(readFileSync(new URL("../social/schedule.json", import.meta.url), "utf8"));
const clock = manilaClock(config.timezoneOffsetHours);
// Tuesday 1 Dec 2026, 07:00 in Manila.
const NOW = Date.parse("2026-11-30T23:00:00Z");

const post = (slug, published, frame = "guide", hub = "ai") => ({
  slug,
  url: `https://urielpapa.com/blog/${slug}`,
  title: slug,
  frame,
  hub,
  published,
});

test("Manila date maths", () => {
  assert.equal(clock.localDay(NOW), "2026-12-01");
  assert.equal(clock.weekdayOf("2026-12-01"), "tue");
  assert.equal(clock.weekOf("2026-12-06"), "2026-11-30");
  assert.equal(new Date(clock.localTime("2026-12-01", "08:30")).toISOString(), "2026-12-01T00:30:00.000Z");
  assert.equal(clock.show("2026-12-01T00:30:00.000Z"), "2026-12-01 08:30 PHT");
});

test("a news take goes out on every platform the same day, never later than its wave allows", () => {
  const queue = { items: [] };
  const { added, leftOut } = createPlanner(config, NOW).planQueue(queue, [post("ai-news", "2026-12-01", "news-take")], {
    drip: false,
  });
  assert.equal(added, config.waves.news.posts.length);
  assert.deepEqual(leftOut, []);
  const lastDay = clock.addDays("2026-12-01", config.waves.news.maxDelayDays);
  for (const item of queue.items) {
    assert.equal(item.kind, "news");
    assert.ok(Date.parse(item.dueAt) >= NOW + config.waves.news.leadHours * 3600_000, item.id);
    assert.ok(clock.dayOf(item) <= lastDay, item.id);
  }
});

test("stale news is never planned", () => {
  const queue = { items: [] };
  createPlanner(config, NOW).planQueue(queue, [post("old-news", "2026-11-20", "news-take")], { drip: false });
  assert.deepEqual(queue.items, []);
});

test("a new guide gets its whole launch wave, spread out and within the caps", () => {
  const queue = { items: [] };
  createPlanner(config, NOW).planQueue(queue, [post("new-guide", "2026-12-01")], { drip: false });
  assert.equal(queue.items.length, config.waves.launch.posts.length);
  for (const item of queue.items) {
    const others = queue.items.filter(i => i !== item && i.platform === item.platform);
    for (const o of others) {
      assert.ok(Math.abs(Date.parse(o.dueAt) - Date.parse(item.dueAt)) >= config.minGapHours * 3600_000);
    }
    const sameDay = others.filter(o => clock.dayOf(o) === clock.dayOf(item)).length + 1;
    assert.ok(sameDay <= config.platforms[item.platform].dailyCap, item.id);
  }
  // Re-running plans nothing twice.
  const again = createPlanner(config, NOW).planQueue(queue, [post("new-guide", "2026-12-01")], { drip: false });
  assert.equal(again.added, 0);
});

test("the drip lines up older evergreen posts, rotating topics and skipping news", () => {
  const queue = { items: [] };
  const posts = [
    post("ai-1", "2026-06-01", "guide", "ai"),
    post("ai-2", "2026-06-02", "guide", "ai"),
    post("seo-1", "2026-06-03", "guide", "seo-geo-aeo"),
    post("auto-1", "2026-06-04", "guide", "automation"),
    post("old-news", "2026-06-05", "news-take", "ai"),
  ];
  const lines = [];
  createPlanner(config, NOW, l => lines.push(l)).planQueue(queue, posts);
  const rounds = [...new Set(queue.items.map(i => i.slug))];
  assert.ok(rounds.length > 0 && rounds.length <= Math.round((config.drip.perWeek * config.drip.horizonDays) / 7));
  assert.ok(!rounds.includes("old-news"));
  // The first three rounds cover three different hubs.
  const hubs = rounds.slice(0, 3).map(slug => posts.find(p => p.slug === slug).hub);
  assert.equal(new Set(hubs).size, hubs.length);
  assert.ok(queue.items.every(i => i.kind === "drip"));
  assert.ok(lines.some(l => l.startsWith("drip: ")));
});

test("a passed slot moves, and only approved items within the horizon are due", () => {
  const planner = createPlanner(config, NOW, () => {});
  const queue = {
    items: [
      { id: "a", platform: "x", kind: "launch", status: "approved", dueAt: "2026-12-01T04:30:00.000Z", targetDay: "2026-12-01" },
      { id: "b", platform: "facebook", kind: "launch", status: "approved", dueAt: "2026-12-01T12:00:00.000Z", targetDay: "2026-12-01" },
      { id: "c", platform: "x", kind: "launch", status: "approved", dueAt: "2026-12-20T04:30:00.000Z", targetDay: "2026-12-20" },
      { id: "d", platform: "x", kind: "launch", status: "draft", dueAt: "2026-11-30T00:30:00.000Z", targetDay: "2026-11-30" },
    ],
  };
  planner.refresh(queue);
  assert.ok(Date.parse(queue.items[3].dueAt) > NOW, "the passed draft moved forward");
  const { due, manual, viaBuffer } = planner.dueItems(queue);
  assert.deepEqual(due.map(i => i.id), ["a", "b"]);
  assert.deepEqual(manual.map(i => i.id), ["b"]);
  assert.deepEqual(viaBuffer.map(i => i.id), ["a"]);
});

test("approval problems: length, placeholders and the missing link", () => {
  const item = { platform: "x", url: "https://urielpapa.com/blog/a", text: "x".repeat(281), followUps: ["[Uriel: add]"] };
  const issues = problems(item, config);
  assert.ok(issues.some(i => i.startsWith("text is 281/280")));
  assert.ok(issues.includes("placeholder text left in"));
  assert.ok(issues.some(i => i.startsWith("the post link")));
});
