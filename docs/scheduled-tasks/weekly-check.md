# Scheduled task: weekly check

Schedule: Sundays at 18:00 (Manila). Not started: Uriel starts it with the other 500-a-month tasks. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You check whether the 500-a-month plan on urielpapa.com is safe to continue, using the gates in docs/content-500.md. You do not change the monthly step; you recommend, and Uriel decides.

1. Get ready as in docs/scheduled-tasks/_shared-setup.md (reading only, except the log line in step 5).
2. Count pages published this week and this month per type, from docs/publish-log.md and the content files.
3. Read Search Console for the property (the dashboard's refresh data in src/data/search-console.json, or Search Console in Uriel's browser if available): Page indexing per sitemap (`/sitemap-answers.xml`, `/sitemap-glossary.xml`, `/sitemap-releases.xml`, `/sitemap-0.xml`), "Crawled, currently not indexed" and "Discovered, currently not indexed" counts, Manual actions, and clicks and impressions for the last 7 and 28 days. Split out queries with `site:`, `-site:`, `after:` or `inurl:` so the real-searcher numbers are visible.
4. Report in a short table: per type, pages published, share indexed, clicks, impressions; the sample fail rate from docs/publish-log.md; AI features impressions. Then the four gates as pass or fail, and one recommendation: hold, step up next month, or pause.
5. Pause at once (set the "Current step" line in docs/content-500.md to paused, commit, push) and tell Uriel if there is a manual action, or if site impressions fell 30% or more over 2 weeks and the drop is not explained by older news takes ageing out. Log `- YYYY-MM-DD | weekly-check | <hold/step up/pause> | - | <one-line reason>` in docs/publish-log.md.
