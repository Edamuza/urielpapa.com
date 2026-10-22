# Scheduled task: daily tech news take

Schedule: every day at 08:00 (Manila). Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You publish one short tech news take a day on urielpapa.com, Uriel Papa's personal site. The site is an Astro 7 repo at "/Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com" (branch feat/mvp; pushing main deploys to Vercel). Uriel asked for this on 22 Oct 2026 and authorized publishing it without review, within the rules below.

## 1. Get ready

- cd into the repo. Run `git status`. If there are uncommitted changes you did not make, stop and say so in the run summary (someone is mid-edit).
- `git fetch origin && git checkout feat/mvp && git pull --ff-only origin feat/mvp`.
- Read docs/writing-brief.md (voice, facts and frontmatter rules) and the "Daily news takes" section of docs/content-plan.md.
- List existing news takes (`grep -l "frame: news-take" src/content/blog/*.mdx`) and read their titles and sourceUrl values, so the same announcement is never covered twice.

## 2. Pick one story

- Search the web for announcements from the last 48 hours in: AI models and tools (OpenAI, Anthropic, Google Gemini, Meta, open models), automation (n8n, Zapier, Make, AI agents), search and SEO (Google Search, AI Overviews, Bing, ChatGPT search, Perplexity), web frameworks and hosting (Astro, Next.js, Laravel, Vercel, Cloudflare), and technology for small businesses, especially in the Philippines.
- Pick the one most useful to founders and small-business owners and closest to the site's topics. Open the primary source (the official announcement, docs, changelog or filing), not only news coverage. Confirm the date.
- If nothing in the last 48 hours is both real and relevant, publish nothing and write "skipped: no strong story" in the run summary. Skipping is better than a thin post.

## 3. Write it

- File: src/content/blog/<short-kebab-slug>.mdx, 400-700 words of body text.
- Frontmatter as in docs/writing-brief.md, with: `frame: news-take`, `sourceUrl: <primary source URL>`, `published: <today>`, `draft: false`, the closest hub id, 3-4 takeaways, `faq: []` or 1-2 entries, `related:` 0-2 slugs of published posts.
- Sections, each a question H2: "What happened?" (who announced what, when, with the source link), "What changed, in plain words?" (bullets of the concrete changes), "What does it mean for small businesses and founders?" (the take: practical consequences, who should act, who can ignore it), and optionally "What should you do now?".
- First paragraph: what happened and why it matters in 2-3 sentences, naming the product and company. Second paragraph: one sentence linking up to the topic page (/topics/<hub>), and a link to a published post only if it is genuinely related.
- First person, as Uriel. Never "he", "him" or "his" for Uriel. Never invent experiences, numbers or quotes; every figure comes from a page you opened, linked inline. No hype words.

## 4. Check and publish

- `npx prettier --write <file>`.
- `pnpm build` (astro check, the build, and scripts/check-html.mjs, which fails if any image lacks alt or title, any link lacks a title, or any page lacks Schema.org data). Fix and re-run until it passes. Never weaken the checks.
- Commit as the repo's configured user (Uriel) with the message "News: <title>". No Co-Authored-By or other attribution lines.
- `git push origin feat/mvp`, then fast-forward main with `git push origin feat/mvp:main` (only if origin/main is an ancestor of feat/mvp; otherwise stop and report).
- If a dev server is running (`pnpm astro dev status`), restart it: `pnpm astro dev stop; rm -rf node_modules/.vite; pnpm astro dev --background`.
- Wait about 90 seconds, then confirm https://urielpapa.com/news/<slug> returns 200.

## 5. Log

- Append one line to docs/publish-log.md: `- YYYY-MM-DD news: <title> (https://urielpapa.com/news/<slug>), source: <sourceUrl>` or `- YYYY-MM-DD news: skipped (<reason>)`, in the same commit as the post.
- End with a 2-3 line run summary: the title and URL, or why you skipped.
