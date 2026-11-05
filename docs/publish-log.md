# Publish log

One line per run of a scheduled task (daily news take, long-form publishing), newest at the bottom. The private dashboard at `/dashboard` reads this file, so keep the format exact:

```
- YYYY-MM-DD | task | status | slug | note
```

- **date**: the run's date in Manila time.
- **task**: `news` or `long-form`.
- **status**: `published` (all went well), `warning` (published, but something went wrong or a rule was relaxed), `skipped` (nothing published on purpose) or `failed` (the run broke).
- **slug**: the post's file name without `.mdx`, or `-` when nothing was published.
- **note**: one sentence: what went wrong, or why the run skipped. Leave empty after a clean publish.

A skipped or failed run commits only this line (no post), so the dashboard can show it. Days before 1 Nov 2026 were not logged; the dashboard fills them in from the posts' publish dates.

## Runs

- 2026-11-01 | news | published | cma-meta-commercial-terms-probe |
- 2026-11-02 | news | skipped | - | No story was both strong and verified; 5 candidates rejected (unopenable sources, outside the 48-hour window, or press-only).
- 2026-11-03 | news | published | apple-q4-2026-results |
- 2026-11-04 | news | skipped | - | First run: no story had an embeddable X or Threads post, which was required then. Wikimedia Commons could not be reached for photos.
- 2026-11-04 | news | warning | claude-message-threads-beta | Second run, after the embed rule was relaxed. The build failed once and was fixed. No photos (Wikimedia Commons unreachable) and no embed.
- 2026-11-05 | news | warning | apple-siri-ai-developer-preview | No photos (Wikimedia Commons unreachable) and no embed (no verifiable post found).
- 2026-11-06 | news | warning | openai-gpt-image-2-6-gif-svg | No photos (Wikimedia Commons unreachable) and no embed (no verifiable post found).
