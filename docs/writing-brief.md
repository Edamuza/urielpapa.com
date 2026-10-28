# Writing brief for urielpapa.com posts

Every post on urielpapa.com follows these rules. They come from the /semantic-seo-sro method (Semantic SEO, SRO & AI) and from the site owner's standing instructions.

## Voice and facts

- First person, as Uriel Papa: a builder and founder in the Philippines who shares what works and what didn't. Plain words, short sentences (under 25 words), paragraphs of 2-4 sentences. American spelling. No hype, no emoji.
- Never refer to Uriel as "he", "him" or "his". Use "I" in posts, or the name.
- Facts about Uriel come ONLY from the site itself: src/pages/about.astro, src/content/projects/*.mdx, src/content/pages/now.md and published posts in src/content/blog/. Never invent experiences, numbers, clients, quotes or results. If a point needs first-hand experience the site does not record, write the general guidance without claiming it as Uriel's.
- No [Uriel: ...] placeholders. Posts must be publishable as written.
- Every statistic, date, price and product claim needs a source you actually opened (fetch the page). Link it inline: [descriptive anchor](url). Prefer primary sources (official docs, announcements, the study itself). If you cannot verify a figure, leave it out.
- Prices and features change: state the date ("as of October 2026").

## Structure (passage engineering)

- First paragraph: answer the target question directly in the first 2-3 sentences, naming the main entity. A definition goes in the first sentence for explainers.
- Second paragraph: one or two sentences of source context (why Uriel writes about this, tied to real work from the site) plus a link up to the topic page: [SEO, GEO and AEO](/topics/seo-geo-aeo), [Automation](/topics/automation), [AI](/topics/ai), [Tech Stacks](/topics/tech-stacks).
- 5-7 H2 sections, each written as the question a reader would ask. Each section is one passage of 100-300 words that stands alone: the first sentence names the subject (never opens with "It", "This", "They", "Neither"), then 3-5 sentences of explanation, one piece of evidence (number, source, date, example), and a closing sentence that sums it up.
- Match the frame:
  - comparison: a comparison table early, then one section per real difference, then "Which should you choose?" with a clear verdict per situation.
  - explainer: "What is X?" first, then how it works, why it matters, examples, limits.
  - best-of: state the criteria first, then one H3 per item with the same sub-points, then a summary table.
  - guide: a numbered list of the steps right after the opening paragraph, then one section per step.
  - why: name the causes, one section each, then what to do about it.
- Use tables for comparisons, numbered lists for steps, bullets only for parallel items. Total length 1,300-1,800 words of body text.
- Do not repeat the H1 or the takeaways in the body. No "In conclusion" section.

## Links

- Internal links only to pages that exist and are published (draft: false). Check the file before linking. Use descriptive anchors that name the topic, embedded in sentences.
- 2-4 internal links per post where the relationship is real, plus the topic page link.
- 3-8 external links to primary sources.

## Frontmatter (src/content.config.ts validates this; the build fails otherwise)

```yaml
---
title: <H1, max 70 characters, contains the main entity>
seoTitle: <max 60 characters>
description: >-
  <120-170 characters, answers the question>
dek: >-
  <one or two sentences shown under the title>
hub: <seo-geo-aeo | automation | ai | tech-stacks | marketing | tech-and-business | founder-journey>
frame: <guide | comparison | best-of | why | explainer | build-story>
takeaways:
  - >-
    <3 to 5 self-contained sentences, each quotable alone, each with a specific fact>
published: <YYYY-MM-DD, today's date; never a future date. The publishing task sets it to the real publish day.>
related:
  - <0-2 slugs of PUBLISHED posts>
projects: []
stack:
  - <0-6 ids from src/content/stack/*.yaml, only ones the post discusses>
faq:
  - q: <a real follow-up question not already a section heading>
    a: >-
      <a 2-3 sentence answer, consistent with the body>
event: {}
syndication: []
draft: true
---
```

- 2-3 FAQ entries. The FAQ answers must be visible on the page (they are rendered), so they must match the body.
- Escape nothing special: this is MDX, so avoid bare `<` and `{` in prose (write "less than", or put code in backticks).

## Model posts to match

Read src/content/blog/why-your-page-ranks-but-ai-never-cites-it.mdx and src/content/blog/how-to-check-if-chatgpt-cites-your-site.mdx before writing. Match their tone, density of sources and section shape.
