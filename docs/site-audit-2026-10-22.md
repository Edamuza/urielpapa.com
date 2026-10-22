---
description: First site audit of urielpapa.com against seo-master-plan.md (22 Oct 2026): what was checked, the findings, the scored action list and the status of each action. Read when deciding what SEO work to do next or checking whether an audit item is done.
prepared: 2026-10-22
full_report: https://claude.ai/artifact/3xoAy6YfPHPDhVjiMsCXik
---

# Site audit, 22 Oct 2026

The full report with tables is the Claude Doc linked above (`full_report`). This file is the working copy for the repo: the findings in one line each and the action list with status. Update the Status column as items are finished.

**Verdict.** Nothing blocks crawling, indexing, speed or measurement; the live site matches `schema-and-technical.md` almost line for line. The gaps are identity (the name search still returns other people), content balance against the plan, and first data.

## Actions

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Submit `sitemap-index.xml` in Search Console and Bing Webmaster Tools; request indexing for the homepage, About and the live posts | Uriel | Open |
| 2 | Push feat/mvp to main (31 news takes, pagination, videos, resources, these fixes) | Uriel says "push it to main" | Open |
| 3 | GA4 Admin: mark `newsletter_signup`, `contact_submit`, `work_with_me_click` as key events; create the "AI assistants" channel group (regex in `schema-and-technical.md` §5); link Search Console | Uriel | Open |
| 4 | Move the sticky quote bar out of the text flow | Claude | Done on feat/mvp: the bar is last in the HTML and `order-first` shows it on top |
| 5 | Align profiles (same name, photo, bio, link); mark agency profiles closed; add Threads, Instagram, Reddit or dev.to to `sameAs` only when the accounts exist | Uriel | Open |
| 6 | Titles over 60 characters; descriptions outside 140 to 160 | Claude | Descriptions: done on feat/mvp (7 rewritten). Titles: done on the Mac working copy (the " \| Uriel Papa" suffix is dropped past 60 characters), lands with its next push |
| 7 | Run the 20-prompt AI visibility set on 1 Nov; export Search Console and GA4 about 20 Nov | Uriel, then Claude | Open, dated |
| 8 | Two `related` posts on every post, long posts first | Claude | Partly: the Mac working copy links the 12 news takes nothing else links to. Still open: a second `related` post on the 25 posts that have one, and a first on the 7 that have none (live long posts only, so no live post links to a draft) |
| 9 | Group long posts above news takes on hub pages | Claude | Done on feat/mvp: "Guides and notes on…" then "News takes on…" |
| 10 | Add real builds as projects (the n8n chatbot first) and give the long posts without one a "From the build" box | Uriel for the facts, Claude for the pages | Open: needs project facts from Uriel |
| 11 | Rebalance the draft queue (see `seo-master-plan.md` §6) | Uriel decides, Claude drafts | Open |
| 12 | Repost each post with UTM links and record them in `syndication` | Uriel | Open |

Smaller findings: `rss_click` is in the measurement plan but not sent by the site (add it or drop it from the plan); the PageSpeed Insights API quota was spent on 22 Oct, so field data waits for Search Console's Core Web Vitals report from late November.

## What the master plan sets (summary for sessions that cannot open the project Library)

The plan itself is `seo-master-plan.md` in the project Library; it holds internal notes, so only the parts needed to judge the site are repeated here.

- **Purpose.** Share knowledge and the latest tech news with people who are interested in the same topics. Not a way to compete with other developers; the newsletter, "Work with me" line and Contact page stay quiet and never get in the way of reading.
- **Seven hubs.** AI in Depth, Automation, Technology and Business, SEO GEO and AEO, Tech Stacks, Marketing, The Founder's Journey. Formats: long posts, notes, news takes (dated, never refreshed to look new) and event notes.
- **Capacity.** 1 long post plus 1 to 2 notes or news takes a week; publish less rather than lower quality.
- **Phases.** 0 foundations (weeks 1 to 2), 1 launch set (days 1 to 30), 2 build the network (days 31 to 90: every hub has 3 or more posts), 3 deepen (months 4 to 6), 4 keep current (months 7 to 12).
- **Targets (relative; replace after 8 weeks of data).** At 3 months: 12 to 15 indexed posts, own pages and profiles in the top 5 for "Uriel Papa", cited on 1 to 2 of 20 AI prompts, first 50 newsletter subscribers. At 12 months: 50+ indexed posts, cited on 8 to 10 of 20 prompts, about 500 subscribers.
- **Workstreams.** Technical and eligibility, writing and passages, content, identity and trust, sharing, AEO and GEO, newsletter and contact, measurement.
- **Rules that matter for edits.** Write the agency in the past tense; never fabricate experience; sensitive topics (payroll, tax, labour law) cite the government source and say it is not advice; no paid links, link networks or hidden text.

## Re-check

After pushing, re-run the page audit script on the homepage and one post: the first 60 words of body text should be the page's own, and a scan of all built pages should show no title over 60 characters.
