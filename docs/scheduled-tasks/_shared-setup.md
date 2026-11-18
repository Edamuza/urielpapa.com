# Shared steps for the 500-a-month tasks

The tasks in `answers-glossary.md`, `release-notes.md`, `ph-briefs.md`, `tool-pages.md`, `daily-sample.md` and `weekly-check.md` all start and end the same way. Each one says "Get ready as in _shared-setup.md" and "Publish as in _shared-setup.md".

## Get ready

- The repo is at "/Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com" (branch feat/mvp; pushing main deploys to Vercel).
- cd into the repo. Run `git status`. If there are uncommitted changes you did not make, stop and say so in the run summary.
- `git fetch origin && git checkout feat/mvp && git pull --ff-only origin feat/mvp`, then `git merge --ff-only origin/main`, or `git merge --no-edit origin/main` if the branches have split (stop and report if that conflicts).
- Read `docs/content-500.md` (types, caps, gates), `docs/writing-brief.md` (voice and facts) and the queue file the task uses.
- Read the "Current step" line in `docs/content-500.md`. If it says the new tasks are not started, or the step is paused, publish nothing and log `skipped | not started` or `skipped | paused`.
- Count the pages of your type published this calendar month (Manila time), from their `published:` dates. At the month's cap, publish nothing and log `skipped | monthly cap reached`.

## Publish

- `pnpm exec prettier --write` on every file you changed.
- `pnpm build`. It must pass: `check-content.mjs` (the quality gates), `check-posts.mjs`, `astro check`, the build and `check-html.mjs` (alt and title on every image, a title on every link, no broken internal links). Fix the page and re-run. If a page cannot pass, delete it, log why, and go on. Never weaken a check or skip one.
- Commit as the repo's configured user (Uriel) with no Co-Authored-By or other attribution lines: "<Type>: <titles>".
- `git push origin feat/mvp`, then `git push origin feat/mvp:main` only if origin/main is an ancestor of HEAD; otherwise stop and report.
- Wait about 90 seconds and check that each new URL returns 200.
- Run `node scripts/indexnow.mjs` if it exists for the new URLs.
- Append one line per page to `docs/publish-log.md` in the same commit: `- YYYY-MM-DD | <type> | published | <slug> |`, or `skipped` / `failed` with the reason.
- End with a run summary of 2 or 3 lines: what was published with links, or why nothing was.

## Facts and voice, every page

- Every number, price, version and date comes from a page you opened today, linked where it is used.
- First person only for experience the site already records (projects, Stack `use` lines, published posts, the About page). Never invent tests, clients, results or quotes. Never refer to Uriel as he/him.
- Every image has descriptive alt text and a title, and a credit line under it. Every link has a descriptive title: `[anchor](url "what the reader gets")`.
