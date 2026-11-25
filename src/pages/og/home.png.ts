import type { APIRoute } from "astro";
import { renderOgImage } from "@/utils/og";

// The home page's social image, the only card with Uriel's portrait.
export const GET: APIRoute = ({ url }) =>
  renderOgImage({
    title: "I see the problem. I build the solution. I grow the business.",
    lines: [
      "I see the problem.",
      "I build the solution.",
      "I grow the business.",
    ],
    art: "portrait",
    url,
  });
