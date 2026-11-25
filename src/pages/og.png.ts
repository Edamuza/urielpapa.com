import type { APIRoute } from "astro";
import { renderOgImage } from "@/utils/og";

// The default social image: home, About and every page without its own.
export const GET: APIRoute = ({ url }) =>
  renderOgImage({
    title: "I see the problem. I build the solution. I grow the business.",
    lines: [
      "I see the problem.",
      "I build the solution.",
      "I grow the business.",
    ],
    url,
  });
