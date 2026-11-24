// Schedules social posts for every published post on urielpapa.com.
//
//   node scripts/social.mjs plan [--no-drip] [--dry-run]   give new posts (and some older ones) time slots
//   node scripts/social.mjs review [--all]                 print what is waiting for copy or approval
//   node scripts/social.mjs approve <id|slug|all>          approve drafts so `send` may schedule them
//   node scripts/social.mjs skip <id|slug> [reason]        drop items you don't want posted
//   node scripts/social.mjs send [--dry-run]               schedule approved items in Buffer at their slot
//   node scripts/social.mjs done <id|slug>                 mark manual (Facebook) items as scheduled by hand
//   node scripts/social.mjs sync [--dry-run]               record sent posts and add their links to `syndication`
//   node scripts/social.mjs channels                       list the Buffer channels the API key can post to
//
// Strategy (slots, caps, posting waves) lives in social/schedule.json; state in
// social/queue.json, which is committed: after approve, skip or done, commit
// and push it. Copy is written by the "social posts" scheduled task
// (docs/scheduled-tasks/social-posts.md), never by this script, and nothing is
// sent until Uriel approves it. Needs BUFFER_API_KEY (in .env, never committed)
// for send, sync and channels. SOCIAL_NOW=<ISO time> fakes the clock for tests.
// Rules: docs/social-brief.md.
/* eslint-disable no-console -- a CLI script; its output is the report. */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { entryFor } from "./content-urls.mjs";
import { field } from "./lib/content-file.mjs";
import { createPlanner, manilaClock, MOVABLE, problems as itemProblems } from "./lib/social-plan.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://urielpapa.com";
const CONFIG_FILE = `${ROOT}social/schedule.json`;
const QUEUE_FILE = process.env.SOCIAL_QUEUE ?? `${ROOT}social/queue.json`;
const CONTENT_DIRS = ["src/content/blog", "src/content/notes"];
const BUFFER_API = "https://api.buffer.com";

const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
const NOW = process.env.SOCIAL_NOW ? Date.parse(process.env.SOCIAL_NOW) : Date.now();

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const [command = "review", ...rest] = args.filter(a => !a.startsWith("--"));
const dryRun = flag("dry-run");

// Slots, waves, the drip and Manila date maths: scripts/lib/social-plan.mjs.
const planner = createPlanner(config, NOW, line => console.log(line));
const { localDay, weekdayOf, dayOf, show } = manilaClock(config.timezoneOffsetHours);

// ---------- files ----------

function loadQueue() {
  if (!existsSync(QUEUE_FILE)) return { items: [] };
  return JSON.parse(readFileSync(QUEUE_FILE, "utf8"));
}

function saveQueue(queue) {
  queue.items.sort((a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id));
  if (dryRun) return;
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2) + "\n");
}

/** Published, non-draft posts and notes with a publish date up to today. */
function livePosts(today) {
  const posts = [];
  for (const dir of CONTENT_DIRS) {
    for (const name of readdirSync(`${ROOT}${dir}`)) {
      const file = `${dir}/${name}`;
      const text = readFileSync(`${ROOT}${file}`, "utf8");
      const entry = entryFor(file, text);
      const published = String(field(text, "published") ?? "").slice(0, 10);
      if (!entry || entry.draft || !published || published > today) continue;
      posts.push({
        slug: name.replace(/\.(md|mdx)$/, ""),
        url: SITE + entry.path,
        title: field(text, "title") ?? name,
        frame: field(text, "frame") ?? "note",
        hub: entry.hub,
        published,
      });
    }
  }
  return posts.sort((a, b) => a.published.localeCompare(b.published));
}

// ---------- plan ----------

function plan() {
  const queue = loadQueue();
  const posts = livePosts(localDay(NOW));
  const { added, leftOut } = planner.planQueue(queue, posts, { drip: !flag("no-drip") });
  console.log(added ? `Planned ${added} new items.` : "Nothing new to plan.");
  if (leftOut.length)
    console.log(`No slot within the caps (retried on the next run):\n  ${leftOut.join("\n  ")}`);
  saveQueue(queue);
}

// ---------- review and approval ----------

/** Problems that stop an item from being approved or sent. */
const problems = item => itemProblems(item, config);

function select(queue, target, statuses) {
  if (!target) throw new Error("Name an item id, a post slug, or all.");
  return queue.items.filter(
    i => statuses.has(i.status) && (target === "all" || i.id === target || i.slug === target)
  );
}

const indent = (text, n = 2) =>
  text
    .split("\n")
    .map(l => " ".repeat(n) + "│ " + l)
    .join("\n");

function review() {
  const queue = loadQueue();
  const waiting = ["planned", "draft", "approved", "manual", "failed"];
  const items = queue.items.filter(i => (flag("all") ? i.status !== "expired" : waiting.includes(i.status)));
  if (!items.length) return console.log("Nothing waiting. Run `plan` to line up new posts.");
  let day = "";
  for (const i of items) {
    if (dayOf(i) !== day) console.log(`\n=== ${dayOf(i)} (${weekdayOf(dayOf(i))}) ===`);
    day = dayOf(i);
    const via = config.platforms[i.platform].via === "manual" ? " (post by hand)" : "";
    console.log(`\n[${i.status}] ${show(i.dueAt)} ${i.platform}${via} angle ${i.angle} · ${i.id}`);
    console.log(`  ${i.title}\n  ${i.url}`);
    if (i.text) console.log(indent(i.text));
    for (const f of i.followUps)
      console.log(`  ↳ ${config.platforms[i.platform].link}:\n${indent(f, 4)}`);
    const issues = i.text ? problems(i) : [];
    if (issues.length) console.log(`  ! ${issues.join("; ")}`);
    if (i.note) console.log(`  note: ${i.note}`);
  }
  const counts = {};
  for (const i of items) counts[i.status] = (counts[i.status] ?? 0) + 1;
  console.log(`\n${Object.entries(counts).map(([s, n]) => `${n} ${s}`).join(", ")}`);
}

const COMMIT_HINT = "Commit and push social/queue.json so the scheduled task sees the change.";

function approve() {
  const queue = loadQueue();
  let ok = 0;
  for (const item of select(queue, rest[0], new Set(["draft"]))) {
    const issues = problems(item);
    if (issues.length) {
      console.log(`not approved: ${item.id}: ${issues.join("; ")}`);
      continue;
    }
    item.status = "approved";
    item.approvedAt = new Date(NOW).toISOString();
    ok++;
  }
  console.log(`Approved ${ok}. ${COMMIT_HINT}`);
  saveQueue(queue);
}

function skip() {
  const queue = loadQueue();
  const items = select(queue, rest[0], MOVABLE);
  for (const item of items) {
    item.status = "skipped";
    item.note = rest.slice(1).join(" ") || "skipped by hand";
  }
  console.log(`Skipped ${items.length}. ${COMMIT_HINT}`);
  saveQueue(queue);
}

function done() {
  const queue = loadQueue();
  const items = select(queue, rest[0], new Set(["manual", "approved"])).filter(
    i => config.platforms[i.platform].via === "manual"
  );
  for (const item of items) item.status = "sent";
  console.log(`Marked ${items.length} as posted by hand. ${COMMIT_HINT}`);
  saveQueue(queue);
}

// ---------- Buffer ----------

async function buffer(query, variables = {}) {
  try {
    process.loadEnvFile(`${ROOT}.env`);
  } catch {
    // No .env file; the key may be in the environment already.
  }
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("Set BUFFER_API_KEY in .env (Buffer → Settings → API).");
  const res = await fetch(BUFFER_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors?.length)
    throw new Error(`Buffer API ${res.status}: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

/** Buffer channel per platform (X is "twitter" in Buffer), with its organization. */
async function channels() {
  const data = await buffer(`{ account { organizations { id name } } }`);
  const result = {};
  for (const org of data.account.organizations) {
    const { channels: list } = await buffer(
      `query($id: OrganizationId!) { channels(input: { organizationId: $id }) { id name service isQueuePaused } }`,
      { id: org.id }
    );
    for (const c of list) {
      const platform = c.service === "twitter" ? "x" : c.service;
      result[platform] ??= { ...c, organizationId: org.id };
    }
  }
  return result;
}

async function listChannels() {
  const found = await channels();
  for (const [platform, c] of Object.entries(found))
    console.log(`${platform}: ${c.name} (${c.service}, ${c.id})${c.isQueuePaused ? " PAUSED" : ""}`);
  for (const [platform, p] of Object.entries(config.platforms))
    if (p.via === "buffer" && !found[platform])
      console.log(`! ${platform} is set to go through Buffer but no ${platform} channel is connected`);
}

/** The channel's most recent posts in the given statuses: id, text, due time, link. */
async function channelPosts(channel, statuses) {
  const data = await buffer(
    `query($org: OrganizationId!, $ch: [ChannelId!], $st: [PostStatus!]) {
      posts(first: 100, input: { organizationId: $org, filter: { channelIds: $ch, status: $st },
        sort: [{ field: dueAt, direction: desc }] }) {
        edges { node { id text dueAt status externalLink } }
      }
    }`,
    { org: channel.organizationId, ch: [channel.id], st: statuses }
  );
  return data.posts.edges.map(e => e.node);
}

const CREATE = `mutation($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id dueAt } }
    ... on MutationError { message }
  }
}`;

async function send() {
  const queue = loadQueue();
  planner.refresh(queue);
  const { approved, due, manual, viaBuffer } = planner.dueItems(queue);

  if (viaBuffer.length) {
    const found = dryRun ? {} : await channels();
    const existing = {};
    for (const item of viaBuffer) {
      const ch = found[item.platform];
      if (!dryRun && !ch) {
        console.log(`${item.id}: no ${item.platform} channel in Buffer; connect one and re-run`);
        continue;
      }
      if (dryRun) {
        console.log(`would schedule ${item.id} at ${show(item.dueAt)}:`);
        console.log(JSON.stringify(postInput(item, "<channel id>"), null, 2));
        continue;
      }
      existing[item.platform] ??= await channelPosts(ch, ["scheduled", "sending", "sent", "error"]);
      const posts = existing[item.platform];
      // Already in Buffer (sent from another checkout, or the queue was not saved): adopt it.
      const twin = posts.find(p => p.text.trim() === item.text.trim());
      if (twin) {
        item.status = twin.status === "sent" ? "sent" : "scheduled";
        item.bufferId = twin.id;
        console.log(`${item.id}: already in Buffer (${twin.id}); not sent again`);
        saveQueue(queue);
        continue;
      }
      if (posts.filter(p => p.status === "scheduled").length >= config.send.bufferQueueLimit) {
        console.log(`${item.id}: Buffer's ${item.platform} queue is full; it goes on a later run`);
        continue;
      }
      let result = (await buffer(CREATE, { input: postInput(item, ch.id) })).createPost;
      if (!result.post && item.followUps.length) {
        // The reply or first comment was refused (the plan may not allow it): put the link in the post.
        const plain = { ...item, text: `${item.text}\n\n${item.followUps.join("\n\n")}`, followUps: [] };
        if (!problems(plain).length) {
          console.log(`${item.id}: Buffer refused the follow-up (${result.message}); retrying with the link in the post`);
          result = (await buffer(CREATE, { input: postInput(plain, ch.id) })).createPost;
          if (result.post) Object.assign(item, { text: plain.text, followUps: [] });
        }
      }
      if (!result.post) {
        console.log(`${item.id}: Buffer refused it: ${result.message}`);
        item.status = "failed";
        item.note = `Buffer: ${result.message}`;
        saveQueue(queue);
        continue;
      }
      item.status = "scheduled";
      item.bufferId = result.post.id;
      posts.push({ id: result.post.id, text: item.text, status: "scheduled" });
      console.log(`scheduled ${item.id} for ${show(item.dueAt)}`);
      saveQueue(queue); // after every post, so a crash never loses track of one
    }
  }

  if (manual.length) {
    console.log("\nSchedule these by hand in Meta Business Suite (business.facebook.com → Planner),");
    console.log("then run `node scripts/social.mjs done <id>` for each:");
    for (const item of manual) {
      if (!dryRun) item.status = "manual";
      console.log(`\n${show(item.dueAt)} · ${item.platform} · ${item.id}\n${indent(item.text)}`);
    }
  }
  const later = approved.length - due.length;
  if (later)
    console.log(`\n${later} approved items are due after the next ${config.send.horizonDays} days; a later run sends them.`);
  if (!viaBuffer.length && !manual.length) console.log("Nothing approved is due yet.");
  saveQueue(queue);
}

/** createPost input: the link goes where the platform's `link` rule puts it. */
function postInput(item, channelId) {
  const input = {
    channelId,
    text: item.text,
    schedulingType: "automatic",
    mode: "customScheduled",
    dueAt: item.dueAt,
  };
  if (!item.followUps.length) return input;
  if (item.platform === "linkedin")
    input.metadata = { linkedin: { firstComment: item.followUps.join("\n\n") } };
  else if (item.platform === "x" || item.platform === "threads") {
    const key = item.platform === "x" ? "twitter" : "threads";
    input.metadata = { [key]: { thread: [item.text, ...item.followUps].map(text => ({ text })) } };
  }
  return input;
}

async function sync() {
  const queue = loadQueue();
  const open = queue.items.filter(i => i.status === "scheduled" && i.bufferId);
  if (!open.length) return console.log("Nothing scheduled in Buffer to check.");
  const found = await channels();
  const sent = new Map();
  for (const platform of new Set(open.map(i => i.platform))) {
    if (!found[platform]) continue;
    for (const p of await channelPosts(found[platform], ["sent", "error"])) sent.set(p.id, p);
  }
  const links = [];
  for (const item of open) {
    const post = sent.get(item.bufferId);
    if (!post) continue;
    if (post.status === "error") {
      item.status = "failed";
      item.note = "Buffer could not publish it; see the post in Buffer";
      console.log(`failed: ${item.id}`);
      continue;
    }
    item.status = "sent";
    if (/^https?:\/\/\S+$/.test(post.externalLink ?? "")) item.postUrl = post.externalLink;
    console.log(`sent: ${item.id} ${item.postUrl ?? ""}`);
    // The first share of a new post is what the article's "Also on" line links to.
    if (item.postUrl && item.kind !== "drip" && item.angle === 1) links.push(item);
  }
  for (const item of links) addSyndication(item);
  saveQueue(queue);
}

/** Adds `- network, url` to the post's syndication list, once per network. */
function addSyndication(item) {
  const file = CONTENT_DIRS.flatMap(d => [".mdx", ".md"].map(ext => `${ROOT}${d}/${item.slug}${ext}`)).find(
    existsSync
  );
  if (!file) return;
  const text = readFileSync(file, "utf8");
  const fm = text.match(/^---\r?\n[\s\S]*?\r?\n---/)?.[0] ?? "";
  if (fm.includes(`network: ${item.platform}\n`)) return;
  const entry = `  - network: ${item.platform}\n    url: ${item.postUrl}\n`;
  let next;
  if (/^syndication: \[\]$/m.test(fm))
    next = fm.replace(/^syndication: \[\]$/m, `syndication:\n${entry.trimEnd()}`);
  else if (/^syndication:$/m.test(fm))
    next = fm.replace(/^syndication:\n((?: {2}.*\n)*)/m, `syndication:\n$1${entry}`);
  else next = fm.replace(/\r?\n---$/, `\nsyndication:\n${entry}---`);
  if (dryRun) return console.log(`would add ${item.platform} link to ${item.slug}`);
  writeFileSync(file, text.replace(fm, next));
  console.log(`added ${item.platform} link to ${item.slug}`);
}

const commands = { plan, review, approve, skip, done, send, sync, channels: listChannels };
if (!commands[command]) {
  console.error(`Unknown command "${command}". Use: ${Object.keys(commands).join(", ")}.`);
  process.exit(1);
}
await commands[command]();
