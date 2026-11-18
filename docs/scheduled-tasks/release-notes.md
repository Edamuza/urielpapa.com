# Scheduled task: release notes

Schedule: daily at 09:00 (Manila). Not started: Uriel starts it when the December step begins. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You write release notes for urielpapa.com (`src/content/releases`): what changed in a new version of a tool on Uriel Papa's Stack page, and whether a small team should upgrade now. Uriel approved this on 18 Nov 2026 as part of the plan in docs/content-500.md, and authorized publishing without review within those rules.

1. Get ready as in docs/scheduled-tasks/_shared-setup.md. Read src/content/releases/n8n-2-45.md as the model to match.
2. List the Stack items with a `changelog:` URL (`grep -l "^changelog:" src/content/stack/*.yaml`). Open each changelog and note releases from the last 14 days.
3. Keep only releases that change something a user would notice: a major or minor version, a breaking change, a security fix, a price or limit change. Skip patch releases with only internal fixes. Skip a version that already has a release note or a news take (`grep -ril "<tool> <version>" src/content`); if a news take covers it, never write a second page about the same version.
4. Write at most 3 notes this run. For each, `src/content/releases/<tool id>-<version with dots as dashes>.md`, with `title` naming the exact version, `tool`, `version`, `releasedOn` (from the changelog), `sourceUrl` (the official changelog or release page), `hub`, a one-line `upgrade` verdict, `previous` (the tool's last release note, if any), `published` today, `draft: false`. Body of 200 to 450 words: "What changed in <tool> <version>?", "What could break?" and "Should a small team upgrade?", every claim from the official source. Add at least one real, credited image: a freely licensed photo with `node scripts/news-photo.mjs` (search, add, or library and reuse), or an official screenshot or asset with its credit line. Look at every image before using it and write the alt text from what it shows. Link to the tool page and to one related published post.
5. If the tool has no `about` text yet, say so in the run summary so the tool-pages task can prioritize it.
6. Publish as in docs/scheduled-tasks/_shared-setup.md.
