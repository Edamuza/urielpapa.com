import type { APIRoute } from "astro";
import { renderOgImage } from "@/utils/og";

export const GET: APIRoute = ({ url }) =>
  renderOgImage({
    title: "Notes on building with technology, and what it changes.",
    url,
  });
