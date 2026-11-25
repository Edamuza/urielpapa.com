import type { APIRoute } from "astro";
import { getAllBlogEntries, type Post } from "@/utils/content";
import { hubName } from "@/data/hubs";
import { postPhoto, renderOgImage, SITE_PHOTO } from "@/utils/og";

export async function getStaticPaths() {
  const posts = await getAllBlogEntries();
  return posts
    .filter(p => !p.data.hero)
    .map(post => ({ params: { slug: post.id }, props: { post } }));
}

export const GET: APIRoute = ({ props, url }) => {
  const { post } = props as { post: Post };
  return renderOgImage({
    title: post.data.title,
    label: hubName(post.data.hub),
    // A freely licensed photo from the post itself; never Uriel's portrait.
    art: postPhoto(post.body) ?? SITE_PHOTO,
    url,
  });
};
