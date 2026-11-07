// Reads an X or Threads post and prints a ready <SocialPost … /> tag for a
// post, with the post's exact text, its UTC date, its photos and its link
// preview. It tries several readers in turn, so one being down is not the end:
//
//   X:       X's embed server (cdn.syndication.twimg.com), then FxTwitter
//            (api.fxtwitter.com), then X's oEmbed (publish.twitter.com)
//   Threads: the post page's own preview tags (www.threads.com)
//
//   node scripts/social-post.mjs https://x.com/<handle>/status/<id>
//   node scripts/social-post.mjs https://www.threads.com/@<handle>/post/<code>
//
// Paste the tag after the paragraph it supports, with a one-line lead-in.
// Check the printed text against the post if you can; never edit it.
/* eslint-disable no-console -- a command-line helper; its output is the result. */

const UA = "Mozilla/5.0 (compatible; urielpapa.com-embeds/1.0; +https://urielpapa.com)";

const decode = s =>
  String(s ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

// MDX attribute values are quoted with ".
const attr = s => decode(s).replace(/"/g, "'").replace(/[{}<>]/g, "").trim();

async function get(url, json = true) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: json ? "application/json" : "text/html" } });
  if (!res.ok) throw new Error(`${new URL(url).host} answered ${res.status}`);
  return json ? res.json() : res.text();
}

const utcDate = value => {
  const d = new Date(typeof value === "number" && value < 1e12 ? value * 1000 : value);
  if (Number.isNaN(d.getTime())) throw new Error(`could not read the post's date (${value})`);
  return d.toISOString().slice(0, 10);
};

/** X's embed server: the most complete reader (exact text, media, link preview). */
async function syndication(id) {
  const j = await get(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=a`);
  if (!j?.text || !j.user) throw new Error("the embed server returned no post (deleted, private or age-gated)");
  let text = j.text;
  const [start, end] = j.display_text_range ?? [0, text.length];
  text = [...text].slice(start, end).join("");
  for (const u of j.entities?.urls ?? []) text = text.split(u.url).join(u.expanded_url);
  for (const m of j.entities?.media ?? []) text = text.split(m.url).join("");
  const media = (j.mediaDetails ?? []).slice(0, 4).map(m => ({
    type: m.type === "photo" ? "photo" : "video",
    src: m.media_url_https,
    alt: m.ext_alt_text || "",
    width: m.original_info?.width ?? 1200,
    height: m.original_info?.height ?? 675,
  }));
  const b = j.card?.binding_values;
  const val = k => b?.[k]?.string_value;
  const card =
    b && (val("card_url") || j.card.url)
      ? {
          url: (j.entities?.urls ?? []).find(u => u.url === (val("card_url") || j.card.url))?.expanded_url || val("card_url") || j.card.url,
          title: val("title") || "",
          description: val("description") || "",
          domain: val("vanity_url") || val("domain") || "",
          image: b.thumbnail_image_large?.image_value?.url || b.summary_photo_image_large?.image_value?.url || "",
        }
      : undefined;
  return { author: j.user.name, handle: j.user.screen_name, date: utcDate(j.created_at), text, media, card, via: "X's embed server" };
}

/** FxTwitter: the same post through a public mirror of X's API. */
async function fxtwitter(handle, id) {
  const j = await get(`https://api.fxtwitter.com/${handle}/status/${id}`);
  const t = j?.tweet;
  if (!t?.text) throw new Error(j?.message || "FxTwitter returned no post");
  const media = (t.media?.all ?? []).slice(0, 4).map(m => ({
    type: m.type === "photo" ? "photo" : "video",
    src: m.type === "photo" ? m.url : m.thumbnail_url,
    alt: m.altText || "",
    width: m.width ?? 1200,
    height: m.height ?? 675,
  }));
  return {
    author: t.author.name,
    handle: t.author.screen_name,
    date: utcDate(t.created_timestamp ?? t.created_at),
    text: t.raw_text?.text ?? t.text,
    media,
    via: "FxTwitter",
  };
}

/** X's oEmbed: text and date only, the last resort for X. */
async function oembed(url) {
  const j = await get(`https://publish.twitter.com/oembed?omit_script=1&dnt=true&url=${encodeURIComponent(url)}`);
  const p = j.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1];
  const when = j.html?.match(/<a [^>]*>([A-Z][a-z]+ \d{1,2}, \d{4})<\/a><\/blockquote>/)?.[1];
  if (!p || !when) throw new Error("oEmbed returned no post");
  const text = decode(
    p
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<a [^>]*>(pic\.(twitter|x)\.com\/\w+)<\/a>/g, "")
      .replace(/<a href="(https?:\/\/(?!t\.co)[^"]+)"[^>]*>[^<]*<\/a>/g, "$1")
      .replace(/<[^>]+>/g, "")
  ).trim();
  // oEmbed gives the date in the poster's time zone without a time; noon UTC keeps it.
  return { author: j.author_name, handle: j.author_url.split("/").pop(), date: utcDate(`${when} 12:00 UTC`), text, media: [], via: "X's oEmbed (date may be off by one day; check it)" };
}

/** Threads: the post page's own preview tags. */
async function threads(url) {
  const html = await get(url, false);
  const meta = name => html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`))?.[1];
  const text = meta("og:description");
  const title = meta("og:title") ?? "";
  if (!text) throw new Error("the Threads page had no post text (it may need a login)");
  const handle = url.match(/@([\w.]+)/)[1];
  const author = decode(title.replace(/\s*\(@[\w.]+\).*$/, "")) || handle;
  const iso = html.match(/"taken_at":(\d{10})/)?.[1] ?? html.match(/datetime="([^"]+)"/)?.[1];
  if (!iso) throw new Error("could not read the Threads post's date; copy it from the post");
  return { author, handle, date: utcDate(/^\d+$/.test(iso) ? Number(iso) : iso), text: decode(text), media: [], via: "the Threads page" };
}

async function read(url) {
  const x = url.match(/^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/(\w+)\/status\/(\d+)/);
  const readers = x
    ? [() => syndication(x[2]), () => fxtwitter(x[1], x[2]), () => oembed(url)]
    : /threads\.(com|net)\/@[\w.]+\/post\//.test(url)
      ? [() => threads(url.replace("threads.net", "threads.com")), () => threads(url.replace("threads.com", "threads.net"))]
      : null;
  if (!readers) throw new Error("Give an x.com/<handle>/status/<id> or threads.com/@<handle>/post/<code> URL");
  const errors = [];
  for (const reader of readers) {
    try {
      return { ...(await reader()), platform: x ? "x" : "threads", url: x ? `https://x.com/${x[1]}/status/${x[2]}` : url };
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(`No reader could open the post:\n  ${errors.join("\n  ")}`);
}

const url = process.argv[2];
try {
  const p = await read(url ?? "");
  const text = p.text.replace(/\n{3,}/g, "\n\n").trim();
  const parts = [
    `<SocialPost platform="${p.platform}"`,
    `url="${p.url}"`,
    `author="${attr(p.author)}"`,
    `handle="${p.handle}"`,
    `date="${p.date}"`,
    `text={${JSON.stringify(text)}}`,
  ];
  if (p.platform === "x" && p.media.length) {
    const media = p.media.map(m => ({ ...(m.type === "video" ? { type: "video" } : {}), src: m.src, alt: m.alt || "DESCRIBE THIS IMAGE", width: m.width, height: m.height }));
    parts.push(`media={${JSON.stringify(media)}}`);
  }
  if (p.platform === "x" && p.card?.url && p.card.title) {
    parts.push(`card={${JSON.stringify({ ...p.card, imageAlt: p.card.image ? "DESCRIBE THIS IMAGE" : undefined })}}`);
  }
  console.error(`Read through ${p.via}.`);
  if (parts.some(s => s.includes("DESCRIBE THIS IMAGE"))) {
    console.error("Replace each DESCRIBE THIS IMAGE with alt text after looking at the image.");
  }
  console.log(`${parts.join(" ")} />`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
