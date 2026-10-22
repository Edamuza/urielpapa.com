# Scheduled task: publish the next long-form post

Schedule: Tuesdays and Fridays at 09:00 (Manila). Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You publish the next long-form post on urielpapa.com, Uriel Papa's personal site, following the queue in docs/content-plan.md. The site is an Astro 7 repo at "/Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com" (branch feat/mvp; pushing main deploys to Vercel). Uriel asked for this on 22 Oct 2026.

## 1. Get ready

- cd into the repo. Run `git status`. If there are uncommitted changes you did not make, stop and say so in the run summary.
- `git fetch origin && git checkout feat/mvp && git pull --ff-only origin feat/mvp`.
- Read docs/content-plan.md, section "Long-form queue", and docs/writing-brief.md.

## 2. Pick the post

- The post to publish is the first row in the queue whose status is "draft" and whose "Publish on" date is today or earlier.
- If none is due, stop and write "nothing due" in the run summary.
- Open its file (src/content/blog/<slug>.mdx). If it contains "[Uriel" anywhere, or `draft: true` is missing, stop and report: it still needs Uriel's input.

## 3. Final check before publishing

- Re-read the post against docs/writing-brief.md. Open each external link and confirm it still loads (fix or remove dead links). Confirm prices, model names and dates are still current; if something changed, correct it and keep the source link.
- Make sure every internal link points to a post that is published (`draft: false`); remove or reword links to unpublished drafts.

## 4. Publish

- In the post: set `draft: false` and `published:` to today's date.
- Add a link to the new post from the one or two published posts it most directly extends, in a sentence where it adds meaning (descriptive anchor, no "click here"). If the post's hub has a "Start here" list in src/content/hubs/<hub>.md with fewer than 3 entries and the post is a good starting point, add it there.
- In docs/content-plan.md, change that row's status to "live".
- `npx prettier --write` on every file you changed.
- `pnpm build`. It must pass (astro check, build, and scripts/check-html.mjs: every image has alt and title, every link has a title, every page has Schema.org data). Fix and re-run; never weaken the checks.
- Commit as the repo's configured user (Uriel): "Publish <title>". No Co-Authored-By or other attribution lines.
- `git push origin feat/mvp`, then `git push origin feat/mvp:main` (only if origin/main is an ancestor; otherwise stop and report).
- If a dev server is running (`pnpm astro dev status`), restart it: `pnpm astro dev stop; rm -rf node_modules/.vite; pnpm astro dev --background`.
- Wait about 90 seconds and confirm https://urielpapa.com/blog/<slug> returns 200.

## 5. Log

- Append to docs/publish-log.md: `- YYYY-MM-DD long-form: <title> (https://urielpapa.com/blog/<slug>)`, in the same commit.
- End with a 2-3 line run summary: what was published and the URL, or why nothing was.
