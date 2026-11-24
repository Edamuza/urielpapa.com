// The social planner: which post gets which slot on which platform, and what
// is due to send. Pure functions of the queue, the posts, the strategy
// (social/schedule.json) and the time, so tests/social-plan.test.mjs can run
// the scheduling rules with a fake clock. scripts/social.mjs does the files,
// the command line and Buffer.

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
// Statuses that hold a slot. "skipped", "expired" and "failed" free theirs.
export const LIVE = new Set(["planned", "draft", "approved", "scheduled", "manual", "sent"]);
// Statuses whose time can still move (nothing has been sent anywhere yet).
export const MOVABLE = new Set(["planned", "draft", "approved"]);

/**
 * Date maths in the site's time zone (Manila has no daylight saving, so a
 * fixed offset is exact). Days are "YYYY-MM-DD" strings.
 * @param {number} offsetHours
 */
export function manilaClock(offsetHours) {
  const OFFSET = offsetHours * HOUR;
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
  return { localDay, localTime, addDays, weekdayOf, weekOf, dayOf, show };
}

/**
 * The planner for one strategy and one moment. `log` gets a line for every
 * item it moves or expires and every drip round it starts.
 * @param {any} config  social/schedule.json
 * @param {number} now  the current time, in ms
 * @param {(line: string) => void} [log]
 */
export function createPlanner(config, now, log = () => {}) {
  const NOW = now;
  const { localDay, localTime, addDays, weekdayOf, weekOf, dayOf, show } = manilaClock(config.timezoneOffsetHours);

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
      log(`  moved ${item.id} to ${show(next)}: ${why}`);
      item.dueAt = next;
    } else {
      log(`  expired ${item.id}: ${why}, and nothing is free by ${lastDay}`);
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
      log(`drip: ${post.slug} from ${base} (+${count} posts)`);
      hubLast.set(post.hub, base);
      added += count;
      rounds++;
      base = addDays(base, gap);
    }
    return added;
  }

  /**
   * Gives new posts their waves and keeps the drip lined up. Mutates the
   * queue; returns how many items were added and the ids that found no slot.
   */
  function planQueue(queue, posts, { drip = true } = {}) {
    const today = localDay(NOW);
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
      if (n) log(`${kind}: ${post.slug} (+${n} posts)`);
      added += n;
      leftOut.push(...missed);
    }
    if (drip) added += planDrip(queue, posts, today);
    return { added, leftOut };
  }

  /** Approved items due within the send horizon, split by how they are sent. */
  function dueItems(queue) {
    const horizon = NOW + config.send.horizonDays * DAY;
    const approved = queue.items.filter(i => i.status === "approved");
    const due = approved.filter(i => Date.parse(i.dueAt) <= horizon);
    return {
      approved,
      due,
      manual: due.filter(i => config.platforms[i.platform].via === "manual"),
      viaBuffer: due.filter(i => config.platforms[i.platform].via === "buffer"),
    };
  }

  return { findSlot, refresh, planQueue, dueItems, show };
}

/** Characters as X counts them, roughly: every link is 23. Others count plain length. */
export function length(platform, text) {
  if (platform !== "x") return [...text].length;
  return [...text.replace(/https?:\/\/\S+/g, "x".repeat(23))].length;
}

/** Problems that stop an item from being approved or sent. */
export function problems(item, config) {
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
