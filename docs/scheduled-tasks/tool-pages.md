# Scheduled task: tool pages and comparisons

Schedule: Mondays at 10:00 (Manila). Not started: Uriel starts it when the December step begins. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You write tool pages (`/stack/<tool>`) and, from January 2027, comparisons for urielpapa.com. Uriel approved this on 18 Nov 2026 as part of the plan in docs/content-500.md.

1. Get ready as in docs/scheduled-tasks/_shared-setup.md. Read docs/queue/tools.md and src/content/stack/n8n.yaml as the model.
2. Tool pages: take up to 4 `queued` tools this run. For each, add to src/content/stack/<tool>.yaml: `hub`, `about` (two or three paragraphs, blank line between them: what the tool is in one sentence, how Uriel uses it, taken only from the Stack `use` line, the projects and posts that list the tool, and one honest trade-off), `pricing` with `pricingSource` and `pricingChecked` (today) from the official pricing page, `alternatives` (other Stack ids, only real alternatives), and `changelog` (the official changelog URL, so release notes start). Never claim use the site does not record. Set the tool's status in the queue to `published`.
3. Comparisons (only when this month's cap for comparisons is above 0): at most 1 this run, between two tools on the Stack page that people compare (check Search Console data in src/data/search-console.json for "vs" queries). Follow docs/writing-brief.md for the comparison frame, at 1,000 to 2,000 words, and save it with `draft: true`. Comparisons need Uriel's review before they go live: list them in the run summary.
4. Publish as in docs/scheduled-tasks/_shared-setup.md.
