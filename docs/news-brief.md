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

## Frontmatter specifics

```yaml
frame: news-take
sourceUrl: https://<primary source>
published: 2026-10-22
updated omitted
businessImpact: []
related: [] or up to 2 published slugs
projects: []
draft: false
```

`published` is 2026-10-22 for every take written now (never a later date). Hub: the closest of ai, automation, tech-and-business, seo-geo-aeo, tech-stacks, marketing, founder-journey. Security incidents in developer tools go under tech-stacks; incidents about business software or certificates go under tech-and-business; search spam and SERP poisoning go under seo-geo-aeo.

## Model

Read src/content/blog/astro-7-content-sites.mdx (a published news take) before writing.
