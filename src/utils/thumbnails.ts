import type { ImageMetadata } from "astro";
import type { Post } from "@/utils/content";

/** A small picture for a post in a list, with the alt text and title every image needs. */
export type Thumb = { src: ImageMetadata; alt: string; title: string };

// Every image a post can use, keyed by file name (posts link them as
// ../../assets/images/content/<file> or ../../assets/images/blog/<file>).
const images = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/images/{content,blog}/*.{jpg,jpeg,png,webp,avif}",
  { eager: true }
);
const byFile = new Map(
  Object.entries(images).map(([path, mod]) => [
    path.split("/").pop() as string,
    mod.default,
  ])
);

// The first Markdown image in a post body: ![alt](path "title")
const FIRST_IMAGE =
  /!\[([^\]]+)\]\(\s*[^)\s]*assets\/images\/(?:content|blog)\/([^)\s"]+)(?:\s+"([^"]*)")?\s*\)/;

/**
 * The post's thumbnail for lists: its hero image if it has one (set in
 * Keystatic), otherwise the first image in its body. Undefined when neither
 * exists, so the list shows the post without a picture.
 */
export function postThumb(
  post: Pick<Post, "data" | "body">
): Thumb | undefined {
  const { hero, heroAlt, title } = post.data;
  if (hero && heroAlt) return { src: hero, alt: heroAlt, title: heroAlt };
  const match = FIRST_IMAGE.exec(post.body ?? "");
  if (!match) return undefined;
  const [, alt, file, imageTitle] = match;
  const src = byFile.get(file);
  if (!src) return undefined;
  return { src, alt, title: imageTitle || alt || title };
}
