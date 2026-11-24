import { getCollection, type CollectionEntry } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { SHOW_DRAFTS, SITE } from "@/config";
import { pathFor } from "@/lib/routes.mjs";

dayjs.extend(utc);
dayjs.extend(timezone);

export type Post = CollectionEntry<"blog">;
export type Note = CollectionEntry<"notes">;
export type Project = CollectionEntry<"projects">;
export type Hub = CollectionEntry<"hubs">;
export type Answer = CollectionEntry<"answers">;
export type Term = CollectionEntry<"glossary">;
export type Release = CollectionEntry<"releases">;
export type Tool = CollectionEntry<"stack">;

const visible = (e: { data: { draft?: boolean } }) =>
  SHOW_DRAFTS || !e.data.draft;

const byNewest = <T extends { data: { published: Date } }>(a: T, b: T) =>
  b.data.published.getTime() - a.data.published.getTime();

/** Every visible entry in the blog collection (long posts, news takes, event notes). */
export async function getAllBlogEntries(): Promise<Post[]> {
  return (await getCollection("blog")).filter(visible).sort(byNewest);
}

/** Long posts only: guides, comparisons, explainers, build stories. */
export async function getPosts(): Promise<Post[]> {
  return (await getAllBlogEntries()).filter(
    p => p.data.frame !== "news-take" && p.data.frame !== "event-note"
  );
}

export async function getNewsTakes(): Promise<Post[]> {
  return (await getAllBlogEntries()).filter(p => p.data.frame === "news-take");
}

export async function getEventNotes(): Promise<Post[]> {
  return (await getAllBlogEntries()).filter(p => p.data.frame === "event-note");
}

export async function getNotes(): Promise<Note[]> {
  return (await getCollection("notes")).filter(visible).sort(byNewest);
}

export async function getProjects(): Promise<Project[]> {
  return (await getCollection("projects"))
    .filter(visible)
    .sort((a, b) => a.data.order - b.data.order);
}

export async function getHubs(): Promise<Hub[]> {
  return (await getCollection("hubs")).sort(
    (a, b) => a.data.order - b.data.order
  );
}

export async function getAnswers(): Promise<Answer[]> {
  return (await getCollection("answers")).filter(visible).sort(byNewest);
}

/** Glossary terms, A to Z. */
export async function getTerms(): Promise<Term[]> {
  return (await getCollection("glossary"))
    .filter(visible)
    .sort((a, b) =>
      a.data.term.localeCompare(b.data.term, "en", { sensitivity: "base" })
    );
}

/** Release notes, newest release first. */
export async function getReleases(): Promise<Release[]> {
  return (await getCollection("releases"))
    .filter(visible)
    .sort(
      (a, b) =>
        b.data.releasedOn.getTime() - a.data.releasedOn.getTime() ||
        b.data.published.getTime() - a.data.published.getTime()
    );
}

/** Stack items that have a written tool page (an `about` text). */
export async function getToolPages(): Promise<Tool[]> {
  return (await getCollection("stack"))
    .filter(t => t.data.about)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export async function getNewsletterIssues() {
  return (await getCollection("newsletter")).filter(visible).sort(byNewest);
}

// URLs come from the route catalogue (src/lib/routes.mjs), shared with the scripts.

/** Posts stay flat under /blog; news takes and event notes get their own sections. */
export const postUrl = (post: Pick<Post, "id" | "data">): string =>
  pathFor("blog", { id: post.id, frame: post.data.frame });

export const noteUrl = (note: Pick<Note, "id">) => pathFor("notes", note);
export const projectUrl = (project: Pick<Project, "id">) =>
  pathFor("projects", project);
export const hubUrl = (hub: Pick<Hub, "id">) => pathFor("hubs", hub);

export const answerUrl = (a: Pick<Answer, "id">) => pathFor("answers", a);
export const termUrl = (t: Pick<Term, "id">) => pathFor("glossary", t);
export const releaseUrl = (r: Pick<Release, "id">) => pathFor("releases", r);
/** The tool's own page when it has one, else its row on /stack. */
export const toolUrl = (t: Pick<Tool, "id" | "data">) =>
  pathFor("stack", { id: t.id, about: t.data.about });

export function readingTime(body: string | undefined): number {
  const words = (body ?? "")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export const formatDate = (date: Date, format = "D MMM YYYY") =>
  dayjs(date).tz(SITE.timezone).format(format);

export const isoDate = (date: Date) =>
  dayjs(date).tz(SITE.timezone).format("YYYY-MM-DD");

/**
 * Full ISO 8601 date-time in Manila time, e.g. 2026-10-22T08:00:00+08:00, for
 * JSON-LD and article meta tags. Same instant as the stored date (so it agrees
 * with the sitemap and the date shown on the page), written with the +08:00 offset.
 */
export const isoDateTime = (date: Date) =>
  dayjs(date).tz(SITE.timezone).format("YYYY-MM-DDTHH:mm:ssZ");

/** Most recent meaningful date for sitemaps, feeds and "updated" labels. */
export const lastModified = (post: Post) =>
  post.data.updated ?? post.data.published;
