/**
 * The rules of the dashboard's search refresh, with the outside world passed
 * in: which sources to read, where to save, and the clock. The real Google,
 * Bing, Clarity and GitHub calls live in src/lib/search-refresh.ts; the tests
 * (tests/search-refresh.test.mjs) pass fakes. No Astro imports here, so Node
 * can load this file directly.
 */
import type {
  ClaritySnapshot,
  PageInspection,
  SearchConsole,
} from "./dashboard";

/** One step of a refresh, for the dashboard's progress bar. */
export type RefreshStep = {
  /** What is happening now, in plain words. */
  label: string;
  /** Rough share of the whole refresh that is done, 0 to 100. */
  percent: number;
};

export type GoogleRead = {
  google: SearchConsole["google"];
  inspections: Record<string, PageInspection>;
  checkedNow: number;
};

/** A source is left out when its key isn't set. */
export type RefreshSources = {
  google?: (input: {
    pages: string[];
    previous: SearchConsole["google"];
    inspections: Record<string, PageInspection>;
    step: (s: RefreshStep) => void;
    /** Start no new URL Inspection after this time (ms). */
    until: number;
  }) => Promise<GoogleRead>;
  bing?: (
    pages: string[],
    previous: SearchConsole["bing"]
  ) => Promise<SearchConsole["bing"]>;
  clarity?: () => Promise<ClaritySnapshot>;
};

export type RefreshPorts = {
  sources: RefreshSources;
  /** Saves the snapshot; returns the commit id, if any. */
  save: (data: SearchConsole) => Promise<string | undefined>;
  now: () => number;
  /** How long URL Inspections may keep starting, in ms. */
  budgetMs: number;
};

/**
 * Runs `fn` over `items`, `limit` at a time, starting no new item after
 * `until` (a `now()` time). Items never started stay undefined.
 */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (t: T) => Promise<R>,
  until = Infinity,
  now: () => number = Date.now
): Promise<(R | undefined)[]> {
  const out: (R | undefined)[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length && now() < until) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

/** Pages never checked come first, then the ones checked longest ago. */
export const inspectionOrder = (
  pages: string[],
  previous: Record<string, PageInspection>
) =>
  [...pages].sort((a, b) =>
    (previous[a]?.checked ?? "").localeCompare(previous[b]?.checked ?? "")
  );

/**
 * This refresh's inspections: fresh results where there are some, earlier
 * ones for pages not checked (or failed) this time. Pages no longer in the
 * list are dropped.
 */
export function mergeInspections(
  order: string[],
  results: (PageInspection | null | undefined)[],
  previous: Record<string, PageInspection>
) {
  const inspections: Record<string, PageInspection> = {};
  let checkedNow = 0;
  order.forEach((p, i) => {
    const fresh = results[i];
    if (fresh) checkedNow++;
    const kept = fresh ?? previous[p];
    if (kept) inspections[p] = kept;
  });
  return { inspections, checkedNow };
}

/** A source's error message, cut short for the result note. */
const why = (e: unknown) =>
  String(e instanceof Error ? e.message : e).slice(0, 220);

/**
 * Reads every source that has a key, at the same time, saves the snapshot,
 * and says what changed. A source that fails keeps its previous numbers and
 * is listed in `failed`. `step` hears about each stage, for the dashboard's
 * progress bar. Throws when no source could be read.
 */
export async function refreshSearchData(
  pages: string[],
  previous: SearchConsole,
  ports: RefreshPorts,
  step: (s: RefreshStep) => void = () => {}
) {
  const { sources } = ports;
  const until = ports.now() + ports.budgetMs;
  const notes: string[] = [];
  const failed: string[] = [];
  const next: SearchConsole = { ...previous };

  const google = sources.google?.({
    pages,
    previous: previous.google,
    inspections: previous.inspections ?? {},
    step,
    until,
  });
  const bing = sources.bing?.(pages, previous.bing);
  const clarity = sources.clarity?.();

  const [g, b, c] = await Promise.allSettled([google, bing, clarity]);
  step({ label: "Saving the new numbers to GitHub", percent: 94 });

  if (!google) notes.push("Google skipped: no key.");
  else if (g.status === "rejected") failed.push(`Google: ${why(g.reason)}`);
  else if (g.value) {
    next.google = g.value.google;
    next.inspections = g.value.inspections;
    const known = Object.keys(g.value.inspections).length;
    notes.push(
      `Google: checked ${g.value.checkedNow} pages this time; ${g.value.google.indexing.indexed} of ${pages.length} indexed` +
        (known < pages.length
          ? `, ${pages.length - known} not checked yet (the next refresh continues).`
          : ".")
    );
  }
  if (!bing) notes.push("Bing skipped: no key.");
  else if (b.status === "rejected") failed.push(`Bing: ${why(b.reason)}`);
  else if (b.value) {
    next.bing = b.value;
    notes.push(
      `Bing: ${b.value.clicks} clicks, ${b.value.indexed ?? "–"} indexed.`,
      ...(b.value.actions ?? [])
    );
  }
  if (!clarity) notes.push("Clarity skipped: no CLARITY_API_TOKEN.");
  else if (c.status === "rejected") failed.push(`Clarity: ${why(c.reason)}`);
  else if (c.value) {
    next.clarity = c.value;
    const sessions =
      c.value.metrics.find(m => /traffic/i.test(m.name))?.values
        .totalSessionCount ?? 0;
    notes.push(`Clarity: ${sessions} sessions in the last 3 days.`);
  }

  const read = [google && g, bing && b, clarity && c].filter(
    r => r && r.status === "fulfilled"
  ).length;
  if (!read)
    throw new Error(failed.join(" ") || "No source has a key in Vercel.");
  const commit = await ports.save(next);
  return { notes, failed, commit, snapshot: next };
}
