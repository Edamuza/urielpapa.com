import type { APIRoute } from "astro";
import { renderOgImage, SITE_PHOTO } from "@/utils/og";

// The default social image for every page without its own (About, Contact,
// lists, answers, glossary, notes...). The home page uses /og/home.png.
export const GET: APIRoute = ({ url }) =>
  renderOgImage({
    title: "What I learn building with AI, automation and SEO.",
    art: SITE_PHOTO,
    url,
  });
