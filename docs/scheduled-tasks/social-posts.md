# Scheduled task: social posts

Schedule: every day at 10:00 and 18:00 (Manila). The 10:00 run comes after the 08:00 news take, so a new take is planned and drafted the same morning. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You plan, write and send the social posts for urielpapa.com, Uriel Papa's personal site, following docs/social-brief.md. The site is an Astro 7 repo at "/Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com" (branch feat/mvp; pushing main deploys to Vercel). Uriel asked for this on 17 Nov 2026. He approves every social post himself. Approve only the items he names in his reply (see "When Uriel replies"), and never send anything he has not approved. This checkout is the only one that runs `send`.

## 1. Get ready

- cd into the repo. Run `git status`. If there are uncommitted changes you did not make, stop and say so in the run summary.
- `git fetch origin && git checkout feat/mvp && git pull --ff-only origin feat/mvp`, then `git merge --ff-only origin/main` (or `git merge --no-edit origin/main` if the branches have split; stop and report if that conflicts).
- Read docs/social-brief.md.

## 2. Plan

- `node scripts/social.mjs plan`. It gives new posts and a few older ones time slots in social/queue.json, with status "planned". Note the items it lists under "No slot within the caps"; they go in the summary.

## 3. Write the copy

- For each item with status "planned" whose slot is in the next 7 days, write its copy as docs/social-brief.md describes. Load the platform's skill first (x-blog-insights for X and Threads, linkedin-blog-insights, facebook-blog-insights-taglish), and read the post itself (src/content/blog/<slug>.mdx or src/content/notes/<slug>.mdx), not only its title.
- Set `text` and `followUps` in social/queue.json and change `status` to "draft". Leave every other field as it is.
- Run `node scripts/social.mjs review` and fix every problem it lists (length, missing link, placeholder text).

## 4. Send what Uriel approved

- `node scripts/social.mjs send`. It schedules approved items in Buffer and prints the Facebook posts that need scheduling by hand. If it fails because BUFFER_API_KEY is missing or Buffer refuses the key, report that and continue: the drafts are still useful.
- `node scripts/social.mjs sync`. It marks posts Buffer has sent and adds their links to the posts' `syndication` lists.

## 5. Commit

- If social/queue.json or any post changed: `pnpm build` must pass when a post file changed (sync edits frontmatter). Commit as the repo's configured user (Uriel) with the message "Social: <what changed, e.g. drafts for 2 posts, 3 scheduled>". No Co-Authored-By or other attribution lines.
- `git push origin feat/mvp`, then `git push origin feat/mvp:main` (only if origin/main is an ancestor of feat/mvp; otherwise stop and report).

## 6. Summary

End with a short run summary, written for Uriel:
- The drafts waiting for approval, each as one line: date and time, platform, post title, and the first line of the copy. Tell him: "Reply 'approve all', or name the posts to approve or change." Mention news drafts first, since news on LinkedIn must be approved by mid-afternoon.
- What was scheduled in Buffer, and anything that failed, expired or found no slot.
- The Facebook posts to schedule by hand in Meta Business Suite: the time, then the full text.

## When Uriel replies

If Uriel answers a run summary (in this task's thread or a new session) with approvals or changes:

- Edit the copy he asks to change in social/queue.json, and run `node scripts/social.mjs review` to check it.
- Approve exactly what he named: `node scripts/social.mjs approve <id|slug>`, or `approve all` only if he said "approve all".
- Commit and push at once ("Social: approve <what>"), as in step 5. An approval left uncommitted halts the news and long-form tasks.
- Then, only in this task's checkout (the path above), run `node scripts/social.mjs send`, and commit and push again if it changed the queue. In any other checkout, leave sending to the next scheduled run.
