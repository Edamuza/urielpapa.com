# News take brief for urielpapa.com

A news take is a short post (frame `news-take`, shown under /news) on a real announcement or incident, with Uriel's practical take. Follow docs/writing-brief.md for voice, facts, links and frontmatter, plus these rules.

## What qualifies

- A real, verifiable event: a release, announcement, policy change, study, outage or security incident, ideally from the last 60 days (August to October 2026).
- It must connect to one of the site's topics: AI, automation, technology and business, SEO/GEO/AEO, tech stacks, marketing, the founder's journey. Ask: would a founder or small-business owner in the Philippines, or a developer building for them, change something after reading it?
- One announcement per take. Never two takes on the same event: check existing files first (`grep -l "frame: news-take" src/content/blog/*.mdx`, then read their titles and `sourceUrl`).

## Facts

- Open the primary source (official announcement, advisory, changelog, CVE record, postmortem, filing) and set it as `sourceUrl`. Use news coverage only as a secondary link.
- Every date, version number, CVE ID, figure and quote must come from a page you opened, linked inline.
- If you cannot verify that an event happened as described, do not write it. Report it back instead.
- Security incidents: name the affected product and versions, the CVE or advisory ID if one exists, the date disclosed, what an attacker could do, whether it was exploited in the wild (only if the source says so), and the fixed version. Never include exploit code or step-by-step attack instructions. Focus on what to check and how to fix it.

## Shape

- Standard take: 450-750 words of body text. In-depth security take: 900-1,400 words.
- First paragraph: what happened and why it matters, in 2-3 sentences, naming the company and product.
- Second paragraph: one sentence linking up to the topic page, and a link to a published post only where it is genuinely related.
- H2 questions, in this order: "What happened?", "What changed, in plain words?" (or, for incidents, "Who is affected?" and "How serious is it?"), "What does it mean for small businesses and founders?", "What should you do now?" (a numbered checklist for incidents). In-depth security takes can add a timeline table and a "What can we learn from it?" section.
- Takeaways: 3-4 quotable sentences, each with a specific fact.

## Embeds (only when they add value)

Embed a YouTube video, an X post or thread, or a Threads post when it genuinely helps the reader: the official announcement video, the company's or executive's own post that broke the news, or a thread that explains it. Skip embeds when nothing fits; they are never required, and one or two per take is plenty.

- **YouTube:** `<YouTube id="VIDEO_ID" title="Exact title" channel="Exact channel" />`, verified with YouTube's oEmbed (see docs/enrich-brief.md).
- **X or Threads:** `<SocialPost platform="x" url="https://x.com/user/status/ID" author="Account name" handle="user" date="YYYY-MM-DD" text={"Exact post text, with \n between paragraphs"} />` (`platform="threads"` for Threads). Copy the text exactly from the post, read through `https://cdn.syndication.twimg.com/tweet-result?id=ID&token=a` or `https://api.fxtwitter.com/user/status/ID` for X. Write links as full URLs (the expanded address, never t.co) so they show as links; drop only the trailing pic.x.com/t.co link that points at the post's own photo. Only official company or named-executive accounts, as in "Facts" above.
- **Photos, video and link previews:** the card shows what the post shows. Add the post's photos (up to 4) with `media={[{ src: "https://pbs.twimg.com/media/ID.jpg", alt: "…", width: 1200, height: 800 }]}`, taking `src`, `width` and `height` from `mediaDetails` in the syndication response (or `media.all` from fxtwitter). For a video, use its poster image with `type: "video"`; the poster opens X's own player. Alt text: the post's own alt text when it has one, otherwise describe the image after looking at it. If the post has a link preview, add `card={{ url: "<expanded link>", title: "…", description: "…", domain: "example.com", image: "<card image URL>", imageAlt: "…" }}` from the response's `card.binding_values`. Threads image URLs expire, so for Threads skip `media` and let the button show the photos.
- The card is static: no X or Threads script loads until the reader presses "Show the post on X/Threads".
- Put the embed right after the paragraph it supports, with a one-line lead-in ("Moonshot announced it on X:"), never before the first H2.

## Frontmatter specifics

```yaml
frame: news-take
sourceUrl: https://<primary source>
published: <today, YYYY-MM-DD>
updated omitted
businessImpact: []
related: [] or up to 2 published slugs
projects: []
draft: false
```

`published` is the day the take goes live (never a later date). Hub: the closest of ai, automation, tech-and-business, seo-geo-aeo, tech-stacks, marketing, founder-journey. Security incidents in developer tools go under tech-stacks; incidents about business software or certificates go under tech-and-business; search spam and SERP poisoning go under seo-geo-aeo.

## Model

Read src/content/blog/astro-7-content-sites.mdx (a published news take) before writing.
