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

## Photos (required: 2 or 3 per take)

Every news take carries 2 or 3 freely licensed photos that show the story's subject. `scripts/check-posts.mjs` fails the build for a take published from 4 Nov 2026 on that has fewer than 2 or more than 3, or a photo without alt text, a title or a credit line.

- **What to pick:** the actual company, product, place, agency building or person in the story when a free photo exists (for example the company's headquarters, the device, the regulator's office), otherwise a concrete photo of the subject (servers for a cloud story, a payment terminal for a payments story). No logos standing in for photos, no AI-generated images, no screenshots of press photos, no near-duplicates of a photo the post already uses.
- **Licenses:** public domain, CC0, CC BY or CC BY-SA only (Unsplash and Pexels photos are fine through their Wikimedia Commons copies). Never NC or ND, never a press or stock photo without a clear reuse license.
- **How, with fallbacks (never publish with fewer than 2 photos):**
  1. Wikimedia Commons: `node scripts/news-photo.mjs search "<words>"`, then `node scripts/news-photo.mjs add <slug> <n> "File:<name>" --alt "<what it shows>" --caption "<one sentence tying it to the story>"`.
  2. If Commons is down, rate-limited or has nothing that fits: Openverse, `node scripts/news-photo.mjs openverse "<words>"`, then `add <slug> <n> openverse:<id> …`.
  3. If both fail: the site's own credited photos, `node scripts/news-photo.mjs library "<words>"`, then `node scripts/news-photo.mjs reuse <slug> <n> <file.jpg> --caption "…"`. It needs no network and keeps the photo's original credit. Pick the closest subject (the company's office, servers, a phone, the city), and say in the run report that the photo was reused.

  The script checks the license, saves `src/assets/images/content/<slug>-<n>.jpg` and prints the image line and credit line to paste. Open the saved file and look at it before using it; write the alt text from what the photo really shows.
- **Format** (what the script prints, and what hand-added photos must match):

  ```md
  ![Alt text describing the photo](../../assets/images/content/<slug>-1.jpg "Alt text describing the photo")

  *One sentence tying the photo to the story. Photo: [Author](https://commons.wikimedia.org/wiki/File:… "Author's photo on Wikimedia Commons"), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/ "Creative Commons Attribution-ShareAlike 4.0 license").*
  ```

  The credit line sits right under its photo. Every link in it has a title.
- **Placement:** photo 1 inside "What happened?", photo 2 inside "What changed…" and an optional photo 3 inside "What does it mean…", each after a paragraph, never between a lead-in sentence and its list, and never directly next to another photo or an embed.

## Embeds (required: at least one X or Threads post)

Every news take embeds at least one X or Threads post about the story. `scripts/check-posts.mjs` fails the build for a take published from 4 Nov 2026 on without one. Add a YouTube video as well when an official one helps; at most three embeds in all.

- **Which post, in order of preference:** (1) the company's or the named executive's own post that announced the news, or a thread that explains it; (2) the official account of the product, team or agency involved; (3) a post about the story from a named, identifiable expert, company or reputable news organization's own account (for example Reuters, Bloomberg, Rappler or Inquirer). Never rumours, leaks, parody, anonymous or aggregator accounts. Only (1) and (2) can count as a source for facts (see "Facts"); a (3) post is there for the reader, and the post's text must not add claims the article doesn't support.
- If no post from any of those accounts exists for a story, that story can't be the day's take: pick the next strongest candidate that has one.
- If every reader fails (the hosts are unreachable, not the post missing), do not publish without the embed: report which hosts failed and try again later the same day.
- **YouTube:** `<YouTube id="VIDEO_ID" title="Exact title" channel="Exact channel" />`, verified with YouTube's oEmbed (see docs/enrich-brief.md).
- **X or Threads:** `<SocialPost platform="x" url="https://x.com/user/status/ID" author="Account name" handle="user" date="YYYY-MM-DD" text={"Exact post text, with \n between paragraphs"} />` (`platform="threads"` for Threads). `date` is the post's UTC date (the first 10 characters of `created_at`), which matches the dates companies give in their announcements. Get the tag with `node scripts/social-post.mjs <post URL>`: it reads the post through X's embed server, then FxTwitter, then X's oEmbed (Threads: the post page), and prints the tag with the exact text, UTC date, photos and link preview. Never type or edit the text by hand. Write links as full URLs (the expanded address, never t.co) so they show as links; drop only the trailing pic.x.com/t.co link that points at the post's own photo.
- **Photos, video and link previews:** the card shows what the post shows. Add the post's photos (up to 4) with `media={[{ src: "https://pbs.twimg.com/media/ID.jpg", alt: "…", width: 1200, height: 800 }]}`, taking `src`, `width` and `height` from `mediaDetails` in the syndication response (or `media.all` from fxtwitter). For a video, use its poster image with `type: "video"`; the poster opens X's own player. Alt text: the post's own alt text when it has one, otherwise describe the image after looking at it. If the post has a link preview, add `card={{ url: "<expanded link>", title: "…", description: "…", domain: "example.com", image: "<card image URL>", imageAlt: "…" }}` from the response's `card.binding_values`. Threads image URLs expire, so for Threads skip `media` and let the button show the photos. The post's own photos don't count toward the 2 or 3 photos above.
- The card is static: no X or Threads script loads until the reader presses "Show full post". It gives every link and image a title by itself.
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

Read src/content/blog/gpt-6-sol-luna.mdx (a published news take with credited photos and an X embed) before writing.
