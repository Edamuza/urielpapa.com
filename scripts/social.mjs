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

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://urielpapa.com";
const CONFIG_FILE = `${ROOT}social/schedule.json`;
const QUEUE_FILE = process.env.SOCIAL_QUEUE ?? `${ROOT}social/queue.json`;
const CONTENT_DIRS = ["src/content/blog", "src/content/notes"];
const BUFFER_API = "https://api.buffer.com";
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
// Statuses that hold a slot. "skipped", "expired" and "failed" free theirs.
const LIVE = new Set(["planned", "draft", "approved", "scheduled", "manual", "sent"]);
// Statuses whose time can still move (nothing has been sent anywhere yet).
const MOVABLE = new Set(["planned", "draft", "approved"]);

const config = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
const OFFSET = config.timezoneOffsetHours * HOUR;
const NOW = process.env.SOCIAL_NOW ? Date.parse(process.env.SOCIAL_NOW) : Date.now();

const args = process.argv.slice(2);
const flag = name => args.includes(`--${name}`);
const [command = "review", ...rest] = args.filter(a => !a.startsWith("--"));
const dryRun = flag("dry-run");

// ---------- time (Manila has no daylight saving, so a fixed offset is exact) ----------

/** "YYYY-MM-DD" of a timestamp, in Manila. */
const localDay = ms => new Date(ms + OFFSET).toISOString().slice(0, 10);
/** UTC timestamp of a Manila day and "HH:MM". */
const localTime = (day, hhmm) => Date.parse(`${day}T${hhmm}:00.000Z`) - OFFSET;
const addDays = (day, n) => new Date(Date.parse(day) + n * DAY).toISOString().slice(0, 10);
const weekdayOf = day => WEEKDAYS[new Date(Date.parse(day)).getUTCDay()];
/** Monday of the Manila week a day falls in, so caps count Monday to Sunday. */
const weekOf = day => addDays(day, -((new Date(Date.parse(day)).getUTCDay() + 6) % 7));
const dayOf = item => localDay(Date.parse(item.dueAt));
const show = iso =>
  new Date(Date.parse(iso) + OFFSET).toISOString().slice(0, 16).replace("T", " ") + " PHT";

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

// ---------- slots ----------

/**
 * The earliest free slot on a platform at or after `earliest` (ms), no later
 * than the end of `lastDay`. A slot is free when the platform's daily and weekly
 * caps have room and no other post on that platform is within minGapHours.
 * Items for which `yieldable(item)` is true don't count: they can be moved.
 * `keepFree` leaves that many of the week's slots open (drip leaves room for news).
 */
function findSlot(items, platform, earliest, lastDay, yieldable = () => false, keepFree = 0) {
  const p = config.platforms[platform];
  const taken = items.filter(i => i.platform === platform && LIVE.has(i.status) && !yieldable(i));
  for (let day = localDay(earliest); day <= lastDay; day = addDays(day, 1)) {
    if (!p.days.includes(weekdayOf(day))) continue;
    if (taken.filter(i => dayOf(i) === day).length >= p.dailyCap) continue;
    const week = weekOf(day);
    if (taken.filter(i => weekOf(dayOf(i)) === week).length >= p.weeklyCap - keepFree) continue;
    for (const hhmm of p.times) {
      const ms = localTime(day, hhmm);
      if (ms < earliest) continue;
      if (taken.some(i => Math.abs(Date.parse(i.dueAt) - ms) < config.minGapHours * HOUR)) continue;
      return new Date(ms).toISOString();
    }
  }
  return undefined;
}

const unsentDrip = i => i.kind === "drip" && MOVABLE.has(i.status);

/**
 * Adds the missing items of one wave (news, launch or drip) for a post. Items
 * already in the queue under the same id are left alone, so re-running retries
 * only the ones that found no slot before. Returns [added, leftOut ids].
 */
function addWave(queue, post, kind, baseDay) {
  const wave = config.waves[kind];
  const earliest = NOW + wave.leadHours * HOUR;
  // A drip round is its own set of items, so a post can be re-shared later.
  const tag = kind === "drip" ? `drip${baseDay}` : kind;
  const leftOut = [];
  let added = 0;
  for (const step of wave.posts) {
    if (!config.platforms[step.platform]) continue;
    const id = `${post.slug}--${tag}-${step.platform}-${step.angle}`;
    if (queue.items.some(i => i.id === id)) continue;
    const targetDay = addDays(baseDay, step.day);
    const lastDay = addDays(targetDay, wave.maxDelayDays);
    const start = Math.max(earliest, localTime(targetDay, "00:00"));
    // New posts may take a slot held by an unsent drip post; the drip post moves later.
    const yieldable = kind === "drip" ? undefined : unsentDrip;
    const keepFree = kind === "drip" ? config.drip.keepFreePerWeek : 0;
    const dueAt = findSlot(queue.items, step.platform, start, lastDay, yieldable, keepFree);
    if (!dueAt) {
      leftOut.push(`${id} (nothing free by ${lastDay})`);
      continue;
    }
    queue.items.push({
      id,
      slug: post.slug,
      url: post.url,
      title: post.title,
      frame: post.frame,
      kind,
      platform: step.platform,
      angle: step.angle,
      targetDay,
      dueAt,
      status: "planned",
      text: "",
      followUps: [],
    });
    if (yieldable) bump(queue, step.platform);
    added++;
  }
  return [added, leftOut];
}

/** Moves unsent drip posts that no longer fit (a new post took their slot or cap room). */
function bump(queue, platform) {
  for (const item of queue.items) {
    if (item.platform !== platform || !unsentDrip(item)) continue;
    const others = queue.items.filter(i => i !== item);
    const at = Date.parse(item.dueAt);
    const keepFree = config.drip.keepFreePerWeek;
    if (findSlot(others, platform, at, localDay(at), undefined, keepFree) === item.dueAt) continue;
    reslot(queue, item, Math.max(at, NOW + HOUR), "made room for a new post");
  }
}

/** Gives an unsent item the next free slot within its wave's delay limit, or expires it. */
function reslot(queue, item, from, why) {
  const wave = config.waves[item.kind];
  const lastDay = addDays(item.targetDay ?? dayOf(item), wave.maxDelayDays);
  const others = queue.items.filter(i => i !== item);
  const keepFree = item.kind === "drip" ? config.drip.keepFreePerWeek : 0;
  const next = findSlot(others, item.platform, from, lastDay, undefined, keepFree);
  if (next) {
    console.log(`  moved ${item.id} to ${show(next)}: ${why}`);
    item.dueAt = next;
  } else {
    console.log(`  expired ${item.id}: ${why}, and nothing is free by ${lastDay}`);
    item.status = "expired";
  }
}

/** Unsent items whose slot has passed (or is too close to send): move or expire them. */
function refresh(queue) {
  for (const item of queue.items) {
    if (!MOVABLE.has(item.status)) continue;
    // A draft still needs approving, so it needs some lead time; approved items only need sending.
    const lead = item.status === "approved" ? 15 * 60_000 : 2 * HOUR;
    if (Date.parse(item.dueAt) > NOW + lead) continue;
    reslot(queue, item, NOW + lead, `its slot (${show(item.dueAt)}) passed before it was sent`);
  }
}

// ---------- plan ----------

function plan() {
  const queue = loadQueue();
  const today = localDay(NOW);
  const posts = livePosts(today);
  refresh(queue);
  let added = 0;
  const leftOut = [];

  for (const post of posts) {
    const kind = post.frame === "news-take" ? "news" : "launch";
    // News older than its wave's maxDelayDays is stale and is never shared late.
    const window = kind === "news" ? config.waves.news.maxDelayDays : config.newPostWindowDays;
    if (post.published < addDays(today, -window)) continue;
    // The wave counts from the publish date, so a retry never stretches the delay limit.
    const [n, missed] = addWave(queue, post, kind, post.published);
    if (n) console.log(`${kind}: ${post.slug} (+${n} posts)`);
    added += n;
    leftOut.push(...missed);
  }

  if (!flag("no-drip")) added += planDrip(queue, posts, today);
  console.log(added ? `Planned ${added} new items.` : "Nothing new to plan.");
  if (leftOut.length)
    console.log(`No slot within the caps (retried on the next run):\n  ${leftOut.join("\n  ")}`);
  saveQueue(queue);
}

/** Keeps drip.perWeek older evergreen posts lined up over the next drip.horizonDays. */
function planDrip(queue, posts, today) {
  const d = config.drip;
  const starts = new Map(); // slug -> first day of its drip round, for rounds still ahead
  for (const i of queue.items) {
    if (i.kind !== "drip" || !LIVE.has(i.status) || dayOf(i) < today) continue;
    if (!starts.has(i.slug) || dayOf(i) < starts.get(i.slug)) starts.set(i.slug, dayOf(i));
  }
  const wanted = Math.round((d.perWeek * d.horizonDays) / 7);
  if (starts.size >= wanted) return 0;

  // Last time each post was in the queue at all (a skipped post counts too, so a
  // post Uriel turned down is not offered again until reshareAfterDays pass).
  const last = new Map();
  for (const i of queue.items) {
    if (i.status === "expired") continue;
    if ((last.get(i.slug) ?? "") < dayOf(i)) last.set(i.slug, dayOf(i));
  }
  const cutoff = addDays(today, -d.reshareAfterDays);
  const newSince = addDays(today, -config.newPostWindowDays);
  const candidates = posts.filter(
    p =>
      !d.skipFrames.includes(p.frame) &&
      p.published < newSince &&
      !(last.get(p.slug) >= cutoff)
  );
  // Rotate topics: prefer the hub dripped least recently, then never-shared, then newest.
  const hubLast = new Map();
  for (const i of queue.items.filter(i => i.kind === "drip" && LIVE.has(i.status))) {
    const hub = posts.find(p => p.slug === i.slug)?.hub;
    if (hub && (hubLast.get(hub) ?? "") < dayOf(i)) hubLast.set(hub, dayOf(i));
  }

  const gap = Math.max(1, Math.floor(7 / d.perWeek));
  const lastStart = [...starts.values()].sort().pop();
  let base = addDays(today, 1);
  if (lastStart && addDays(lastStart, gap) > base) base = addDays(lastStart, gap);
  const horizonEnd = addDays(today, d.horizonDays);
  let rounds = starts.size;
  let added = 0;
  while (rounds < wanted && base <= horizonEnd && candidates.length) {
    candidates.sort(
      (a, b) =>
        (hubLast.get(a.hub) ?? "").localeCompare(hubLast.get(b.hub) ?? "") ||
        Number(last.has(a.slug)) - Number(last.has(b.slug)) ||
        b.published.localeCompare(a.published)
    );
    const post = candidates.shift();
    const [count] = addWave(queue, post, "drip", base);
    if (!count) continue; // no room for this one; try the next post on the same day
    console.log(`drip: ${post.slug} from ${base} (+${count} posts)`);
    hubLast.set(post.hub, base);
    added += count;
    rounds++;
    base = addDays(base, gap);
  }
  return added;
}

// ---------- review and approval ----------

/** Characters as X counts them, roughly: every link is 23. Others count plain length. */
function length(platform, text) {
  if (platform !== "x") return [...text].length;
  return [...text.replace(/https?:\/\/\S+/g, "x".repeat(23))].length;
}

/** Problems that stop an item from being approved or sent. */
function problems(item) {
  const { maxChars, link } = config.platforms[item.platform];
  const out = [];
  if (!item.text.trim()) out.push("no text");
  for (const [n, t] of [item.text, ...item.followUps].entries()) {
    const len = length(item.platform, t);
    if (len > maxChars) out.push(`${n ? `follow-up ${n}` : "text"} is ${len}/${maxChars} characters`);
  }
  const all = [item.text, ...item.followUps].join("\n");
  if (/\[Uriel|TODO|lorem/i.test(all)) out.push("placeholder text left in");
  if (link !== "none" && !all.includes(item.url)) out.push(`the post link (${item.url}) is missing`);
  return out;
}

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
  refresh(queue);
  const horizon = NOW + config.send.horizonDays * DAY;
  const approved = queue.items.filter(i => i.status === "approved");
  const due = approved.filter(i => Date.parse(i.dueAt) <= horizon);
  const manual = due.filter(i => config.platforms[i.platform].via === "manual");
  const viaBuffer = due.filter(i => config.platforms[i.platform].via === "buffer");

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
