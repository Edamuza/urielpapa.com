/**
 * Numbers for the private /dashboard page: what has been published, what the
 * scheduled tasks did, what is queued next, what still needs indexing and how
 * the site shows up in search. Everything comes from the repository itself:
 * the content collections, docs/publish-log.md (written by the scheduled
 * tasks), docs/content-plan.md (the long-form queue) and
 * src/data/search-console.json (a Search Console and Bing snapshot).
 */
import { getCollection } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { SITE } from "@/config";
import { HUBS } from "@/data/hubs";
import searchConsole from "@/data/search-console.json";
import { isoDate, lastModified, postUrl, type Post } from "@/utils/content";

dayjs.extend(utc);
dayjs.extend(timezone);

const docs = import.meta.glob<string>("/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const PUBLISH_LOG = docs["/docs/publish-log.md"] ?? "";
const CONTENT_PLAN = docs["/docs/content-plan.md"] ?? "";

/** Today's date in Manila, where the site is published. */
export const todayManila = (now = new Date()) =>
  dayjs(now).tz(SITE.timezone).format("YYYY-MM-DD");

const addDays = (day: string, n: number) =>
  dayjs(day).add(n, "day").format("YYYY-MM-DD");

const daysBetween = (from: string, to: string) =>
  dayjs(to).diff(dayjs(from), "day");

const words = (body: string | undefined) =>
  (body ?? "")
    .replace(/^import .*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

const isNews = (p: Post) => p.data.frame === "news-take";
const isLongForm = (p: Post) =>
  p.data.frame !== "news-take" && p.data.frame !== "event-note";

/* ------------------------------------------------------------------ */
/* Content                                                            */
/* ------------------------------------------------------------------ */

/** Every blog entry, drafts included (the public helpers hide drafts in production). */
export async function allEntries() {
  const blog = await getCollection("blog");
  const published = blog.filter(p => !p.data.draft);
  const drafts = blog.filter(p => p.data.draft);
  const notes = (await getCollection("notes")).filter(n => !n.data.draft);
  const projects = (await getCollection("projects")).filter(p => !p.data.draft);
  return { blog, published, drafts, notes, projects };
}

export async function contentTotals() {
  const { published, drafts, notes, projects } = await allEntries();
  const today = todayManila();
  const last7 = published.filter(
    p => daysBetween(isoDate(p.data.published), today) < 7
  ).length;
  return {
    posts: published.length,
    news: published.filter(isNews).length,
    longForm: published.filter(isLongForm).length,
    events: published.filter(p => p.data.frame === "event-note").length,
    notes: notes.length,
    projects: projects.length,
    drafts: drafts.length,
    words:
      published.reduce((sum, p) => sum + words(p.body), 0) +
      notes.reduce((sum, n) => sum + words(n.body), 0),
    last7,
  };
}

/** Posts published per Manila day, oldest first, for the last `days` days. */
export async function postsPerDay(days = 30) {
  const { published } = await allEntries();
  const today = todayManila();
  const counts = new Map<string, { news: number; other: number }>();
  for (let i = days - 1; i >= 0; i--)
    counts.set(addDays(today, -i), { news: 0, other: 0 });
  for (const p of published) {
    const c = counts.get(isoDate(p.data.published));
    if (c) c[isNews(p) ? "news" : "other"]++;
  }
  return [...counts].map(([day, c]) => ({
    day,
    ...c,
    total: c.news + c.other,
  }));
}

/** Long-form, news and draft counts per topic hub, against the plan's targets. */
export async function hubCoverage() {
  const { published, drafts } = await allEntries();
  const targets = seedTargets();
  return HUBS.map(h => ({
    id: h.id,
    name: h.name,
    longForm: published.filter(p => p.data.hub === h.id && isLongForm(p))
      .length,
    news: published.filter(p => p.data.hub === h.id && isNews(p)).length,
    drafts: drafts.filter(p => p.data.hub === h.id).length,
    target: targets.get(h.id) ?? "",
  }));
}

/** "Target" column of the Seed table in docs/content-plan.md, per hub id. */
function seedTargets() {
  const targets = new Map<string, string>();
  for (const line of CONTENT_PLAN.split("\n")) {
    const cells = line.split("|").map(c => c.trim());
    if (cells.length < 8 || !/^[a-z-]+(, [a-z-]+)*$/.test(cells[1])) continue;
    for (const id of cells[1].split(", ")) targets.set(id, cells[7]);
  }
  return targets;
}

/** Long-form posts whose last update is oldest: Nodes are due a refresh every 3 to 6 months. */
export async function refreshQueue(limit = 6) {
  const { published } = await allEntries();
  const today = todayManila();
  return published
    .filter(isLongForm)
    .map(p => {
      const last = isoDate(lastModified(p));
      return {
        title: p.data.title,
        url: postUrl(p),
        last,
        due: addDays(last, 90),
        overdue: daysBetween(last, today) >= 90,
      };
    })
    .sort((a, b) => a.last.localeCompare(b.last))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Scheduled task runs                                                */
/* ------------------------------------------------------------------ */

export type RunStatus =
  | "published"
  | "warning"
  | "skipped"
  | "failed"
  | "no-run"
  | "unlogged"
  | "attention";

export type Run = {
  date: string;
  task: string;
  status: RunStatus;
  slug: string;
  note: string;
};

/** Lines of docs/publish-log.md: "- YYYY-MM-DD | task | status | slug | note". */
export function parsePublishLog(raw = PUBLISH_LOG): Run[] {
  const runs: Run[] = [];
  for (const line of raw.split("\n")) {
    const m = /^- (\d{4}-\d{2}-\d{2}) \|([^|]*)\|([^|]*)\|([^|]*)\|?(.*)$/.exec(
      line.trim()
    );
    if (!m) continue;
    const status = m[3].trim().toLowerCase();
    runs.push({
      date: m[1],
      task: m[2].trim(),
      status: (["published", "warning", "skipped", "failed"].includes(status)
        ? status
        : "warning") as RunStatus,
      slug: m[4].trim() === "-" ? "" : m[4].trim(),
      note: m[5].trim(),
    });
  }
  return runs;
}

/** The first day docs/publish-log.md covers; earlier days come from post dates only. */
const firstLogged = (runs: Run[]) =>
  runs.map(r => r.date).sort()[0] ?? todayManila();

/**
 * One row per daily news run for the last `days` days, newest first. Logged
 * runs come from docs/publish-log.md; days before the log started are filled
 * in from news takes' publish dates. A logged day with no line is "no-run".
 */
export async function newsRuns(days = 21) {
  const { published, blog } = await allEntries();
  const runs = parsePublishLog();
  const logStart = firstLogged(runs);
  const today = todayManila();
  const bySlug = new Map(blog.map(p => [p.id, p]));
  const rows: (Run & { title?: string; url?: string })[] = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(today, -i);
    const logged = runs.filter(r => r.date === day && r.task === "news");
    if (logged.length) {
      for (const r of [...logged].reverse()) {
        const post = r.slug ? bySlug.get(r.slug) : undefined;
        rows.push({
          ...r,
          title: post?.data.title ?? r.slug,
          url: post && !post.data.draft ? postUrl(post) : undefined,
        });
      }
      continue;
    }
    const posts = published.filter(
      p => isNews(p) && isoDate(p.data.published) === day
    );
    if (posts.length) {
      for (const p of posts)
        rows.push({
          date: day,
          task: "news",
          status: "published",
          slug: p.id,
          note:
            day < logStart
              ? "From the post's date (before the log started)."
              : "Published, but the run wrote no log line.",
          title: p.data.title,
          url: postUrl(p),
        });
    } else if (day < logStart) {
      rows.push({
        date: day,
        task: "news",
        status: "unlogged",
        slug: "",
        note: "No news take this day. Runs before the log started were not recorded.",
      });
    } else {
      rows.push({
        date: day,
        task: "news",
        status: "no-run",
        slug: "",
        note:
          day === today
            ? "Today's run has not reported yet."
            : "No post and no log line: the run may not have started.",
      });
    }
  }
  return rows;
}

/** Problems worth a look: failed, warned or skipped runs, silent days and content gaps. */
export async function problems(days = 21) {
  type Problem = { date: string; kind: RunStatus; text: string };
  const runs = await newsRuns(days);
  const today = todayManila();
  const fromRuns = parsePublishLog()
    .filter(r => r.status !== "published")
    .map(r => ({ date: r.date, kind: r.status, text: `${r.task}: ${r.note}` }));
  const silent = runs
    .filter(r => r.status === "no-run" && r.date !== today)
    .map(r => ({ date: r.date, kind: "no-run" as RunStatus, text: r.note }));
  const { published, drafts } = await allEntries();
  const content: Problem[] = [];
  const flagged = new Set(
    parsePublishLog()
      .filter(r => r.status !== "published")
      .map(r => r.slug)
  );
  for (const p of published.filter(isNews)) {
    if (flagged.has(p.id)) continue;
    const day = isoDate(p.data.published);
    if (daysBetween(day, today) >= days) continue;
    const photos = (p.body ?? "").match(/!\[[^\]]+\]\(/g)?.length ?? 0;
    if (!photos && !p.data.hero)
      content.push({
        date: day,
        kind: "attention",
        text: `"${p.data.title}" has no photos (the house rule asks for 2 or 3).`,
      });
  }
  for (const q of await longFormQueue())
    if (q.overdue)
      content.push({
        date: q.publishOn,
        kind: "attention",
        text: `Long-form "${q.title}" was due ${q.publishOn} and is still a draft${q.markers ? ` (${q.markers} [Uriel: …] spots to fill)` : ""}.`,
      });
  const queued = new Set((await longFormQueue()).map(q => q.slug));
  const strays = drafts.filter(d => !queued.has(d.id));
  for (const d of strays)
    content.push({
      date: isoDate(d.data.published),
      kind: "attention",
      text: `Draft "${d.data.title}" is not in the long-form queue.`,
    });
  return [...fromRuns, ...silent, ...content].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

/* ------------------------------------------------------------------ */
/* What's next                                                        */
/* ------------------------------------------------------------------ */

/** Rows of the "Long-form queue" table in docs/content-plan.md, joined with their files. */
export async function longFormQueue() {
  const { blog } = await allEntries();
  const today = todayManila();
  const section = CONTENT_PLAN.split(/^## /m).find(s =>
    s.startsWith("Long-form queue")
  );
  const rows = [];
  for (const line of (section ?? "").split("\n")) {
    const cells = line.split("|").map(c => c.trim());
    if (cells.length < 8 || !/^\d+$/.test(cells[1])) continue;
    const [, num, when, slug, hub, frame, question, status] = cells;
    const publishOn = /\d{4}-\d{2}-\d{2}/.exec(when)?.[0] ?? "";
    const post = blog.find(p => p.id === slug);
    const markers = (post?.body ?? "").match(/\[Uriel/g)?.length ?? 0;
    const live = post ? !post.data.draft : status === "live";
    rows.push({
      num: Number(num),
      publishOn,
      slug,
      hub,
      frame,
      question,
      title: post?.data.title ?? slug,
      url: post && live ? postUrl(post) : undefined,
      live,
      markers,
      missing: !post,
      overdue: !live && publishOn !== "" && publishOn < today,
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Search Console and Bing                                            */
/* ------------------------------------------------------------------ */

type Row = {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type SearchConsole = {
  google: {
    checkedOn: string;
    indexing: {
      lastUpdated: string | null;
      indexed: number | null;
      notIndexed: number | null;
      reasons: {
        reason: string;
        urls: { path: string; lastCrawled?: string | null }[];
      }[];
    };
    performance: {
      from: string | null;
      to: string | null;
      /** All queries and pages with impressions; the lists below hold the top rows only. */
      queryCount?: number;
      pageCount?: number;
      queries: (Row & { query: string })[];
      pages: (Row & { path: string })[];
      /** Totals per week (weeks start on Monday), oldest first. */
      weeks?: (Row & { week: string })[];
      /** Top countries by impressions (Search Console's 3-letter codes). */
      countries?: (Row & { country: string })[];
      /** Desktop, mobile and tablet. */
      devices?: (Row & { device: string })[];
    } & Partial<Row>;
    requested: { path: string; on: string }[];
  };
  /**
   * Each page's last URL Inspection. A refresh checks the pages checked
   * longest ago first, as many as fit in Vercel's time limit, and keeps the
   * rest from earlier refreshes.
   */
  inspections?: Record<string, PageInspection>;
  bing: {
    checkedOn: string;
    from: string | null;
    to: string | null;
    clicks: number | null;
    impressions: number | null;
    indexed: number | null;
    notes: string;
    /** Bing's latest daily crawl numbers (GetCrawlStats). */
    crawl?: BingCrawlDay | null;
    /** Pages in Bing's index per day, oldest first, for the trend. */
    history?: { date: string; inIndex: number; crawled: number }[];
    /** Sitemaps Bing knows about (GetFeeds). */
    sitemaps?: {
      url: string;
      status: string;
      submitted: string;
      lastCrawled: string;
      urlCount: number | null;
    }[];
    /** URLs Bing had trouble with (GetCrawlIssues), worst first. */
    issues?: { url: string; httpCode: number | null; issues: string }[];
    /** What the refresh did about Bing, e.g. submitted the sitemap. */
    actions?: string[];
    /** Pages sent to Bing's URL Submission API, and when. */
    submitted?: { path: string; on: string }[];
  };
  /** Microsoft Clarity, from its Data Export API (last 3 days at most). */
  clarity?: ClaritySnapshot;
};

export type BingCrawlDay = {
  date: string;
  crawledPages: number;
  inIndex: number;
  crawlErrors: number;
  blockedByRobots: number;
  code2xx: number;
  code3xx: number;
  code4xx: number;
  code5xx: number;
  timeouts: number;
  dnsFailures: number;
  inLinks: number;
};

export type PageInspection = {
  indexed: boolean;
  state: string;
  lastCrawled: string | null;
  /** Manila day of the inspection. */
  checked: string;
  /** Search Console's own link to this inspection, from the API. */
  link?: string;
};

/** One Clarity metric with its numeric fields, e.g. Traffic: totalSessionCount. */
export type ClarityMetric = { name: string; values: Record<string, number> };

export type ClaritySnapshot = {
  checkedOn: string;
  /** How many days back the numbers cover (Clarity allows 1 to 3). */
  days: number;
  /** Site-wide numbers per metric (no breakdown). */
  metrics: ClarityMetric[];
  /** Pages with the most sessions. */
  pages: { url: string; sessions: number; users: number | null }[];
  /** Sessions by device type. */
  devices: { device: string; sessions: number }[];
};

export const SEARCH = searchConsole as unknown as SearchConsole;

const pathOf = (url: string) =>
  url.replace(/^https?:\/\/(www\.)?urielpapa\.com/i, "").replace(/\/$/, "") ||
  "/";

/** Listing and hub pages: the Seeds that hold the content network together. */
const isSeed = (path: string) =>
  path === "/" ||
  /^\/(about|blog|news|events|notes|projects|topics|stack|now|contact)$/.test(
    path
  ) ||
  path.startsWith("/topics/");

/**
 * Pages to request indexing for next, best first: pages Search Console lists
 * as not indexed, then pages published or updated since the last check.
 * Requested pages stay listed with their request date until a new snapshot.
 */
export async function indexingQueue(pages: Set<string>) {
  const { published, notes, projects } = await allEntries();
  // The Page indexing report lags behind; anything newer than its last update is unknown to it.
  const checked = SEARCH.google.indexing.lastUpdated ?? SEARCH.google.checkedOn;
  const requested = new Map(
    SEARCH.google.requested.map(r => [pathOf(r.path), r.on])
  );
  const queue = new Map<
    string,
    {
      path: string;
      why: string;
      since?: string;
      requestedOn?: string;
      seed: boolean;
    }
  >();
  for (const { reason, urls } of SEARCH.google.indexing.reasons) {
    // Pages Google won't index on purpose (noindex, redirects, 404s) are not candidates.
    if (/noindex|redirect|404|alternate|canonical|robots/i.test(reason))
      continue;
    for (const u of urls) {
      const path = pathOf(u.path);
      if (!pages.has(path)) continue;
      queue.set(path, {
        path,
        why: reason,
        since: u.lastCrawled ?? undefined,
        requestedOn: requested.get(path),
        seed: isSeed(path),
      });
    }
  }
  const dated = [
    ...published.map(p => ({ path: postUrl(p), date: lastModified(p) })),
    ...notes.map(n => ({ path: `/notes/${n.id}`, date: n.data.published })),
    ...projects.map(p => ({ path: `/projects/${p.id}`, date: p.data.updated })),
  ];
  for (const { path, date } of dated) {
    if (!date || queue.has(path)) continue;
    const day = isoDate(date);
    if (day <= checked) continue;
    queue.set(path, {
      path,
      why: "New or updated since the report",
      since: day,
      requestedOn: requested.get(path),
      seed: false,
    });
  }
  return [...queue.values()].sort(
    (a, b) =>
      Number(Boolean(a.requestedOn)) - Number(Boolean(b.requestedOn)) ||
      Number(b.seed) - Number(a.seed) ||
      (b.since ?? "").localeCompare(a.since ?? "")
  );
}

/**
 * Search Console's home for this site's property. Its "Inspect any URL" bar
 * is at the top; the dashboard copies the page URL on click so it can be
 * pasted there. (Deep links to /search-console/inspect?resource_id=…&id=…,
 * the format Google's own API returns, answered 404 in Nov 2026.)
 */
export function gscPropertyUrl() {
  const url = new URL("https://search.google.com/search-console");
  url.searchParams.set("resource_id", SITE.url + "/");
  return url.toString();
}

/** The full URL of a path on this site, as Search Console inspects it. */
export const siteUrl = (path: string) => SITE.url + (path === "/" ? "/" : path);

/** Keyword numbers from the Search Console snapshot. */
export function keywordStats() {
  const q = SEARCH.google.performance.queries;
  const band = (lo: number, hi: number) =>
    q.filter(r => r.position >= lo && r.position < hi).length;
  return {
    total: SEARCH.google.performance.queryCount ?? q.length,
    listed: q.length,
    top3: band(0, 3.5),
    top10: band(0, 10.5),
    striking: q
      .filter(r => r.position >= 8 && r.position <= 20)
      .sort((a, b) => b.impressions - a.impressions),
    top: [...q].sort((a, b) => b.impressions - a.impressions).slice(0, 15),
    questions: q.filter(r =>
      /^(how|what|why|when|which|who|is|are|can|does|do|should)\b/i.test(
        r.query
      )
    ).length,
  };
}
