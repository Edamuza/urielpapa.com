import { getCollection, type CollectionEntry } from "astro:content";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { SHOW_DRAFTS, SITE } from "@/config";

dayjs.extend(utc);
dayjs.extend(timezone);

export type Post = CollectionEntry<"blog">;
export type Note = CollectionEntry<"notes">;
export type Project = CollectionEntry<"projects">;
export type Hub = CollectionEntry<"hubs">;

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

export async function getNewsletterIssues() {
  return (await getCollection("newsletter")).filter(visible).sort(byNewest);
}

/** Posts stay flat under /blog; news takes and event notes get their own sections. */
export function postUrl(post: Pick<Post, "id" | "data">): string {
  if (post.data.frame === "news-take") return `/news/${post.id}`;
  if (post.data.frame === "event-note") return `/events/${post.id}`;
  return `/blog/${post.id}`;
}

export const noteUrl = (note: Pick<Note, "id">) => `/notes/${note.id}`;
export const projectUrl = (project: Pick<Project, "id">) =>
  `/projects/${project.id}`;

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

/** Most recent meaningful date for sitemaps, feeds and "updated" labels. */
export const lastModified = (post: Post) =>
  post.data.updated ?? post.data.published;
