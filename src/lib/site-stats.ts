/**
 * Build-time numbers for the home page stats: unique visitors from GA4 and
 * search impressions from Search Console, both since launch. Each value is
 * undefined when its env vars are missing or the API call fails, so the page
 * hides that tile instead of showing a made-up number.
 */
import { createSign } from "node:crypto";
import {
  GA4_PROPERTY_ID,
  GOOGLE_SERVICE_ACCOUNT_JSON,
  GSC_SITE_URL,
} from "astro:env/server";
import {
  getAllBlogEntries,
  getHubs,
  getNewsletterIssues,
  getNewsTakes,
  getNotes,
  getPosts,
  getProjects,
  noteUrl,
  postUrl,
  projectUrl,
} from "@/utils/content";
import { pageCount, pageHref } from "@/utils/pagination";

export const LAUNCH_DATE = "2026-10-17";

/** Routes that never appear in the sitemap (keep in step with SITEMAP_EXCLUDE in astro.config.ts). */
const NOT_IN_SITEMAP = [
  "/404",
  "/search",
  "/contact/thanks",
  "/newsletter/thanks",
];

/** Public pages, counted at build the way the sitemap lists them. */
export async function countPages(): Promise<number> {
  const paths = new Set<string>();
  // Fixed pages: every .astro file in src/pages without a [param] in its path.
  for (const file of Object.keys(import.meta.glob("/src/pages/**/*.astro"))) {
    if (file.includes("[")) continue;
    const path =
      file
        .replace(/^\/src\/pages/, "")
        .replace(/\.astro$/, "")
        .replace(/\/index$/, "") || "/";
    if (!NOT_IN_SITEMAP.includes(path)) paths.add(path);
  }
  for (const p of await getAllBlogEntries()) paths.add(postUrl(p));
  for (const n of await getNotes()) paths.add(noteUrl(n));
  for (const p of await getProjects()) paths.add(projectUrl(p));
  for (const h of await getHubs()) paths.add(`/topics/${h.id}`);
  for (const i of await getNewsletterIssues()) paths.add(`/newsletter/${i.id}`);
  // Listing pages after the first: /blog/page/2, /news/page/2 and so on.
  const listings = [
    ["/blog", (await getPosts()).length],
    ["/news", (await getNewsTakes()).length],
  ] as const;
  for (const [base, total] of listings)
    for (let page = 2; page <= pageCount(total); page++)
      paths.add(pageHref(base, page));
  return paths.size;
}

const SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

async function post(url: string, body: unknown, token?: string) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** OAuth access token for the service account (JWT bearer grant). */
async function accessToken(): Promise<string> {
  const key = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON!) as {
    client_email: string;
    private_key: string;
  };
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: SCOPES.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(key.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`token → ${res.status}`);
  return (await res.json()).access_token;
}

async function visitors(token: string): Promise<number> {
  const data = await post(
    `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
    {
      dateRanges: [{ startDate: LAUNCH_DATE, endDate: "today" }],
      metrics: [{ name: "totalUsers" }],
    },
    token
  );
  return Number(data.rows?.[0]?.metricValues?.[0]?.value ?? 0);
}

async function impressions(token: string): Promise<number> {
  const data = await post(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE_URL)}/searchAnalytics/query`,
    {
      startDate: LAUNCH_DATE,
      endDate: new Date().toISOString().slice(0, 10),
    },
    token
  );
  return Number(data.rows?.[0]?.impressions ?? 0);
}

export type SiteStats = { visitors?: number; impressions?: number };

let cached: Promise<SiteStats> | undefined;

export function getSiteStats(): Promise<SiteStats> {
  cached ??= (async () => {
    if (!GOOGLE_SERVICE_ACCOUNT_JSON) return {};
    let token: string;
    try {
      token = await accessToken();
    } catch (e) {
      // Build log only, so a broken key or missing access is visible in Vercel.
      // eslint-disable-next-line no-console
      console.warn("[site-stats] Google sign-in failed:", (e as Error).message);
      return {};
    }
    const settle = async (on: boolean, fn: () => Promise<number>) => {
      if (!on) return undefined;
      try {
        return await fn();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[site-stats]", (e as Error).message);
        return undefined;
      }
    };
    const [v, i] = await Promise.all([
      settle(Boolean(GA4_PROPERTY_ID), () => visitors(token)),
      settle(true, () => impressions(token)),
    ]);
    return { visitors: v, impressions: i };
  })();
  return cached;
}
