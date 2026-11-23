# Social posting brief

Every post published on urielpapa.com gets a planned set of social posts on X, LinkedIn, Threads and Facebook. Claude writes the copy, Uriel approves it, and Buffer posts it at the planned time. Nothing goes out without approval.

## How it works

```
post goes live ─▶ plan ─▶ copy written ─▶ Uriel approves ─▶ send ─▶ Buffer posts it ─▶ sync
                 (slots)   (status: draft)  (status: approved)  (scheduled)   at the slot     ("Also on" links)
```

- **`social/schedule.json`**: the strategy. Time slots per platform (Manila time), daily and weekly caps, the minimum gap between two posts on one platform, and the posting "waves" for each kind of post. Change the numbers there, not in the script.
- **`social/queue.json`**: every planned social post with its slot, copy and status. One item = one social post on one platform.
- **`scripts/social.mjs`**: plans slots, checks copy, sends to Buffer and records results. It never writes copy.
- **`docs/scheduled-tasks/social-posts.md`**: the daily Claude task that plans, writes the copy and sends what Uriel approved.

### The waves (what "strategic" means here)

| Kind | When | Posts |
| --- | --- | --- |
| `news` (a news take) | From 6 hours after planning, usually that evening; never later than the day after publishing | X, Threads, LinkedIn and Facebook, one each |
| `launch` (a new guide, explainer, note…) | Over nine days | Day 0: X and LinkedIn. Day 1: Threads and Facebook. Then new angles: X on day 3, Threads on day 6 and X on day 9 |
| `drip` (an older evergreen post) | 3 posts a week, 2 days apart | X, then Threads, then Facebook. Not LinkedIn: its 5 weekly slots go to new posts |

Other rules:

- Slots fill earliest-first, under each platform's caps. No platform posts twice within 2 hours.
- News and launch posts can take a slot held by an unsent drip post, and the drip post moves later. The drip also leaves 3 slots a week free on each platform for news.
- An item with no free slot is listed in the run summary and retried on the next run, until its delay limit passes. An unsent item whose slot passes, because it wasn't approved in time, moves to the next free slot within the limit; otherwise it expires. News on LinkedIn needs approval by mid-afternoon, since LinkedIn has no weekend slots.
- The drip rotates topics (the hub dripped least recently goes first). It prefers posts never shared, newest first, and waits 120 days before re-sharing a post.
- News takes and event notes are never dripped, because they go stale.
- Only posts published in the last 2 days get a launch wave. News only gets a wave on the day it goes live or the next day.

The default slots are starting points: weekday morning, lunch and 17:30 for LinkedIn; morning, lunch and evening for X; morning and evening for Threads; lunch and evening for Facebook. After 4-6 weeks, compare each platform's own analytics (best hours, impressions per post) and move the slots in `social/schedule.json`.

## Writing the copy

Each item has a `platform`, a `kind` and an `angle`. Write `text` (the post) and `followUps` (extra posts or comments, in order), then set `status` to `"draft"`.

- **Use the platform's skill:** X → `x-blog-insights`, LinkedIn → `linkedin-blog-insights`, Facebook → `facebook-blog-insights-taglish` (Taglish, about 65% English and 35% Tagalog). Threads has no skill of its own: use `x-blog-insights` for voice and method. Threads allows 500 characters and is more conversational, and posts with links are not suppressed there as much as on X. Still, keep the link out of the main post.
- **Angle:** read the post itself and its takeaways. Angle 1 is the post's main claim. Angle 2 and 3 are different insights from the same post (another H2's answer, a number, the story beat). Never repeat an angle already used for that post on that platform: check the queue for the slug's other items. Drip posts are a fresh take, not "ICYMI".
- **Where the link goes** (the `link` setting per platform):
  - X and Threads (`reply`): the main post has no link. `followUps[0]` is a short reply with the post URL, published as a reply under it. X's ranking suppresses posts with links.
  - LinkedIn (`first-comment`): no link in the post. `followUps[0]` becomes the first comment with the URL.
  - Facebook (`in-text`): the URL goes at the end of `text`. Uriel schedules it by hand, so no follow-up is needed.
- **Use the post URL from the item** (`url`) exactly. `scripts/social.mjs` refuses to approve an item without it.
- **Character limits:** X is 280 per post (each link counts 23), Threads 500, LinkedIn 3,000. The script checks them.
- **Identity:** use the role line the site uses now, "Builder and Founder" (`src/config.ts`). The three skills still say "Technical founder"; the site is the source of truth.
- **Facts:** only facts and figures that are in the post. No invented numbers, quotes, experiences or results. Write in first person as Uriel, and never use "he", "him" or "his" for Uriel. No hype words, no engagement bait, no hashtags on X unless they name a real event.

## Approving

- `node scripts/social.mjs review` shows everything waiting, grouped by day, with the copy and any problems.
- `node scripts/social.mjs approve <slug>` approves every draft for one post; `approve <id>` approves one item; `approve all` approves every draft. Edit the text in `social/queue.json` first if needed. Approving checks the copy again.
- `node scripts/social.mjs skip <id|slug> [reason]` drops items you don't want.
- Or just tell Claude in a session: "review the social queue", "approve the Shopify posts", "rewrite the LinkedIn one, shorter".
- **Every change to the queue must be committed and pushed** (the message starts "Social:"), in the checkout the scheduled task uses or merged into main. The scheduled task reads the queue from git. The news and long-form tasks also stop when they find uncommitted changes, so an unpushed approval would halt them.

## Sending

- `node scripts/social.mjs send` creates a Buffer post at the planned time for every approved item due in the next 2 days; later items wait for a later run. The short window keeps unsent drip posts movable when news comes in, and Buffer's free plan holds only 10 scheduled posts per channel anyway.
- **Run `send` only from the scheduled task's checkout.** The queue file is the record of what was sent. Before each post, `send` looks in Buffer for a post with the same text and adopts it instead of sending it again. Still, don't run `send` from two checkouts.
- If Buffer refuses a reply or first comment (for example, if the free plan doesn't allow it), `send` retries with the link at the end of the post. If Buffer refuses the post itself, the item becomes `failed` with Buffer's message, and nothing retries it.
- **Facebook is manual.** Buffer's free plan allows 3 channels, used for X, LinkedIn and Threads. `send` prints the Facebook posts. Schedule each one at the shown time in Meta Business Suite (business.facebook.com → Planner; it's free and has no limits), then run `node scripts/social.mjs done <id>`. To move a different platform to manual, set its `via` to `"manual"` in `social/schedule.json`.
- `node scripts/social.mjs sync` marks items Buffer has sent and adds the first X, LinkedIn and Threads link of each new post to the post's `syndication` list. That list shows as "Also on: X · LinkedIn" under the article.
- `--dry-run` on `plan`, `send` and `sync` prints what would happen and writes nothing.

## One-time setup

1. Create a free account at buffer.com and connect three channels: X (@its_uriel26), LinkedIn (the personal profile) and Threads.
2. In Buffer: Settings → API → create a key. Put it in `.env` at the repo root (never commit it): `BUFFER_API_KEY=...`. Do this in every checkout that runs `send`, including the one the scheduled task uses.
3. Run `node scripts/social.mjs channels`. It should list x, linkedin and threads.
4. Make sure facebook.com/itsuriel26 is a Facebook Page (or a profile in professional mode) that Meta Business Suite can schedule for.
5. Add the scheduled task in `docs/scheduled-tasks/social-posts.md` to the Claude desktop app.
