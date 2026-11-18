# The 500-a-month content plan

Uriel approved this plan on 18 November 2026. The full version, with the reasoning, is the Claude Doc "500 posts a month: safe content plan for urielpapa.com" (https://claude.ai/artifact/Esv4CorpHqHSZWXLwG2yNb). This file is the working copy every scheduled task reads.

The goal is 500 pages a month by March 2027 without Google treating the site as scaled content abuse. Volume only goes up when Google is still indexing and ranking what was added the month before. A page that fails a gate is not published; the day's count is simply lower.

## Page types

| Type | URL | Words | Collection | Task |
| --- | --- | --- | --- | --- |
| Answer (one question per page) | `/answers/<slug>` | 250 to 700 | `src/content/answers` | `scheduled-tasks/answers-glossary.md` |
| Glossary term | `/glossary/<term>` | 300 to 600 | `src/content/glossary` | `scheduled-tasks/answers-glossary.md` |
| Release note | `/releases/<tool>-<version>` | 200 to 450 | `src/content/releases` | `scheduled-tasks/release-notes.md` |
| Philippine business brief | `/news/<slug>` (`phBrief: true`) | 300 to 600 | `src/content/blog` | `scheduled-tasks/ph-briefs.md` |
| Tool page | `/stack/<tool>` | 400 to 900 | `src/content/stack/<tool>.yaml` (`about`) | `scheduled-tasks/tool-pages.md` |
| Comparison | `/blog/<a>-vs-<b>` | 1,000 to 2,000 | `src/content/blog` | `scheduled-tasks/tool-pages.md` |
| News take | `/news/<slug>` | 300 to 600 | `src/content/blog` | `scheduled-tasks/daily-news.md` (unchanged, 3 a week) |
| Long guide | `/blog/<slug>` | 1,500 to 3,000 | `src/content/blog` | `scheduled-tasks/publish-longform.md` (unchanged) |
| Note, project update, event note | `/notes`, `/projects`, `/events` | as today | as today | Written with Uriel, never automatically |

## Monthly caps (the current step)

Each task counts the pages of its type published this calendar month (Manila time) before writing, and stops at the cap. The weekly check (`scheduled-tasks/weekly-check.md`) recommends the next step; **only Uriel moves the step**, by editing this table.

| Type | Dec 2026 (150) | Jan 2027 (250) | Feb 2027 (380) | Mar 2027 on (500) |
| --- | --- | --- | --- | --- |
| Answers | 50 | 85 | 120 | 160 |
| Glossary terms | 40 | 60 | 85 | 110 |
| Release notes | 20 | 40 | 60 | 80 |
| Tool pages | 15 | 20 | 25 | 30 |
| Philippine briefs | 0 | 20 | 30 | 40 |
| Comparisons | 0 | 5 | 15 | 20 |
| News takes, long guides, notes, events, projects | about 25 (as today) | about 20 | about 45 | about 60 |

**Current step: Dec 2026.** Not started: the new tasks are not scheduled yet. Uriel starts them.

Spread the work through the day: never more than 6 pages of one type in a single run, and never more than 20 pages a day in total across all tasks.

## The gates to move up a step

Read in Search Console at the start of each month, for the pages added the month before:

1. At least 75% of them indexed within 28 days (use the per-type sitemaps: `/sitemap-answers.xml`, `/sitemap-glossary.xml`, `/sitemap-releases.xml`).
2. "Crawled, currently not indexed" under 15% of them.
3. Uriel's daily sample failing 1 in 10 or fewer.
4. Non-brand clicks flat or rising.

All four pass: recommend the next step. Any fails: hold. **Pause everything** on a manual action in Search Console, or when site impressions fall 30% over 2 weeks and news decay does not explain it.

## Quality gates (every page)

`scripts/check-content.mjs` enforces 1 to 7 for answers, glossary terms and release notes on every build; `scripts/check-posts.mjs` and `scripts/check-html.mjs` cover the rest.

1. **One page per question.** Before writing, search the whole repo (`grep -ril "<key words>" src/content`) for a page that already answers it. If one does, improve that page instead. The build blocks near-duplicate questions, repeated glossary names and a release note for a version a news take already covered.
2. **Sources opened, not guessed.** Answers need at least 2 sources, glossary terms at least 1, release notes the official changelog. Every number, price, version and date links to the page it came from, opened today.
3. **Something the top results do not have**: a first-hand note from Uriel's projects, Stack or posts; a Philippine angle; a worked example or tested code; a table with real values; or a useful image.
4. **Length within range**, no padding, no intro that restates the question, no "In conclusion".
5. **House voice.** `docs/writing-brief.md`, plus the phrase list in `scripts/check-content.mjs`. First person only for experience the site already records. Uriel is named or "I", never he/him.
6. **Images and links.** Every image has descriptive alt text and a title; every link has a descriptive title (`[anchor](url "what the reader gets")`). Release notes, tool pages and Philippine briefs carry at least one real, credited image; answers and glossary terms only when the image explains something.
7. **Linked in and out.** At least 2 in-body links, one of them to a published page on this site. The templates add the hub, tool and index links, so every page has at least 2 pages linking in.
8. **Uriel's daily sample** (`scheduled-tasks/daily-sample.md`).

## Queues

- Answers: `docs/queue/answers.md`. Glossary: `docs/queue/glossary.md`. Uriel can strike any line before it is written.
- Release notes: every Stack item with a `changelog` URL is watched.
- Tool pages: Stack items without an `about` text, in the order of `docs/queue/tools.md`.

## Linking rules

- Each answer lists its glossary terms (`glossary:`), tools (`stack:`), related answers and the long post that goes deeper (`deeper:`).
- Each glossary term lists related terms, tools and up to 2 posts (`deeper:`).
- Each release note names its tool and the previous release note (`previous:`), so the tool page shows a version history.
- When a new term is published, add a link to it from the first mention in 1 or 2 existing posts where it helps the reader, with a title such as "What a tokenizer is, in the glossary".

## Logging

Every run appends a line to `docs/publish-log.md`: `- YYYY-MM-DD | <type> | published | <slug> |`, or `skipped` with the reason.
