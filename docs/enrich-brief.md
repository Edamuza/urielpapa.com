# Brief: videos and further resources on urielpapa.com posts

Each post gets one relevant YouTube video and a short list of further resources, so readers can go deeper. Follow docs/writing-brief.md for voice and facts.

## The video

- One video per post (a long post may have two only if each supports a different section). Prefer recognised, well-received channels: the official channel of the product or organization (Google Search Central, Google, Anthropic, OpenAI, Vercel, Next.js, Laravel, n8n, Cloudflare, PHP Foundation, Node.js, Ahrefs, Semrush), established educators (freeCodeCamp, Fireship, IBM Technology, CS50, Computerphile, Andrej Karpathy) or a conference talk by the people involved. For news takes, the official announcement or launch video is best when one exists.
- The video must match the section it sits under, be accurate today (for AI, search and security, prefer videos from 2025-2026) and not contradict the post.
- Verify every video before using it: `curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json"` must return JSON. Use its `title` and `author_name` exactly. If you cannot find a credible, relevant video, add none and say so in your report. Never guess an ID.
- Place it right after the paragraph or section it supports, never before the first H2 (the answer comes first). Introduce it with one sentence that says what the video shows and why it helps, for example: "Google's own explainer shows how crawling and indexing work in five minutes:".
- Syntax (MDX, on its own lines with a blank line before and after):

```mdx
<YouTube id="KyCYyoGusqs" title="How does Google Search work?" channel="Google Search Central" />
```

  If the title contains a double quote, write the attribute as `title={'Title with "quotes"'}`. Escape nothing else.

## Further resources

- Add a section near the end of the body: `## Where can you learn more?` followed by 3-5 bullets for long posts, 2-4 for news takes.
- Each bullet: a descriptive link to a resource not already linked in the post, then a dash and one plain sentence on what the reader gets from it. Example: `- [Google's guide to AI features and your website](https://developers.google.com/...) - Google's own rules for appearing in AI Overviews and AI Mode.`
- Good resources: official documentation, standards, free tools, checklists, advisories, original research, well-maintained guides. No affiliate pages, no thin listicles, no paywalled pages, no pages you did not open.
- Internal links count too: add a published post (draft: false) on the site when it is the best next read.

## Rules

- Change nothing else in the post: not the frontmatter, dates, sections or wording (except the one lead-in sentence per video and the new section).
- Do not commit, push, build or run the dev server; other agents edit other posts at the same time.
