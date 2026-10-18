import { defineMiddleware } from "astro:middleware";
import { addLinkTitles } from "@/utils/linkTitles.mjs";

// Every link needs a title, like every image needs alt text and a title.
// Runs on each page as it is prerendered at build time and on every request
// in dev, so localhost shows the same HTML as production.
export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const path = context.url.pathname;
  if (
    path.startsWith("/keystatic") ||
    path.startsWith("/api/keystatic") ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return response;
  }
  const html = addLinkTitles(await response.text());
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
});
