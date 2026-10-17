import type { APIRoute } from "astro";
import { getNewsTakes, type Post } from "@/utils/content";
import { markdownCopy } from "@/utils/markdownCopy";

export async function getStaticPaths() {
  const posts = await getNewsTakes();
  return posts.map(post => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props }) =>
  markdownCopy((props as { post: Post }).post);
