# urielpapa.com

Uriel Papa's personal site: a place to share what I learn about AI, automation, technology and business, SEO/GEO/AEO, tech stacks, marketing and the founder's journey, for people interested in the same topics. It also has a newsletter, a quiet "work with me" line and a contact page.

Built with [Astro](https://astro.build) and Tailwind CSS 4, started from the [AstroPaper](https://github.com/satnaing/astro-paper) theme (MIT, see `LICENSE`) and reworked into a black and white design. Content is edited with [Keystatic](https://keystatic.com). Hosting target: Vercel.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:4321, drafts are visible in dev
pnpm build        # type-check, build, Vercel routes, Pagefind search index
```

Open the CMS at <http://localhost:4321/keystatic> while `pnpm dev` runs. In local mode it edits the files in `src/content/` directly; commit and push them like code.

To preview drafts in a build (for example a Vercel preview deployment), set `PUBLIC_SHOW_DRAFTS=true`. Drafts get a banner and `noindex`, and never appear in production builds, the RSS feed, the sitemap or `llms.txt`.

## Where things are

| Path                                                                                | What                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/config.ts`                                                                     | Name, job title, email, social profiles, newsletter and contact wording. Values to confirm are marked there.                                                                                                              |
| `src/data/hubs.ts`                                                                  | The seven topic hubs, post formats and stack groups                                                                                                                                                                       |
| `src/data/events.json`                                                              | Events attended and talks given (the "Talks I've given" table appears once it has entries)                                                                                                                                |
| `src/content.config.ts`                                                             | Content schemas. They double as the publish guard: SEO title over 60 characters, a description outside 120–170, fewer than 3 takeaways, a hero image without alt text or a news take without a source all fail the build. |
| `keystatic.config.ts`                                                               | CMS fields, mirroring the schemas                                                                                                                                                                                         |
| `src/content/blog/`                                                                 | Long posts, news takes (`frame: news-take`, shown at `/news/…`) and event notes (`frame: event-note`, shown at `/events/…`)                                                                                               |
| `src/content/notes/`, `projects/`, `hubs/`, `stack/`, `newsletter/`, `pages/now.md` | The other collections                                                                                                                                                                                                     |
| `src/layouts/ArticleLayout.astro`                                                   | The post template: takeaways, "From the build", business box, FAQ, author box, share links, keep reading, newsletter, work-with-me                                                                                        |
| `src/styles/theme.css`                                                              | Black and white tokens for light and dark mode                                                                                                                                                                            |
| `src/pages/api/`                                                                    | The only server routes: contact form and newsletter signup                                                                                                                                                                |
| `scripts/vercel-routes.mjs`                                                         | Adds the www → apex redirect and the headers for `.md` copies to Vercel's build output                                                                                                                                    |

MDX bodies can use two components without importing them:

```mdx
<FromTheBuild project="vite-seo-erp">

115 pages, 144 data models and 5,241 automated tests in under 3 months.

</FromTheBuild>

<Callout type="tip">

Short note, tip or warning.

</Callout>
```

## Deploy on Vercel

1. Import the repository in Vercel. The Astro preset and `pnpm build` are detected.
2. Add the domain `urielpapa.com` (and `www.urielpapa.com`, which redirects to the apex).
3. Add environment variables as each feature is switched on:

| Variable                                                           | For                                                                                                                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`                                                   | Contact form emails via [Resend](https://resend.com) (verify the urielpapa.com sending domain there)                                                                                         |
| `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`                           | Optional; default to `work@urielpapa.com` and `urielpapa.com <contact@urielpapa.com>`                                                                                                        |
| `BUTTONDOWN_API_KEY`                                               | Newsletter signups via [Buttondown](https://buttondown.com) (double opt-in is set in Buttondown)                                                                                             |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                | Optional Cloudflare Turnstile spam check on the contact form                                                                                                                                 |
| `PUBLIC_GA4_ID`                                                    | Optional GA4; loads after the first interaction. Events sent: `newsletter_signup`, `contact_submit`, `work_with_me_click`, `fromthebuild_click`, `next_post_click`, `outbound_profile_click` |
| `PUBLIC_GOOGLE_SITE_VERIFICATION`, `PUBLIC_BING_SITE_VERIFICATION` | Search Console and Bing Webmaster Tools verification                                                                                                                                         |
| `PUBLIC_SHOW_DRAFTS`                                               | `true` on preview deployments only                                                                                                                                                           |

Until the Resend and Buttondown keys are set, the forms answer with a polite message pointing to email or RSS.

### Editing on the live site (Keystatic GitHub mode)

Production builds use GitHub storage for `Edamuza/urielpapa.com`. After the first deploy, open `https://urielpapa.com/keystatic` and follow Keystatic's prompt to create its GitHub App; it gives you `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` to add in Vercel. Saving in the editor then commits to the repository and Vercel redeploys.

### Upgrading Keystatic

Keystatic's versions are locked in `pnpm-lock.yaml` and never update by themselves. The Preview link in each entry's editor comes from Keystatic's `previewUrl` setting in `keystatic.config.ts`, plus our own redirect at `src/pages/preview/blog/[slug].ts` that sends posts to `/blog`, `/news` or `/events`.

To upgrade:

1. Work on a branch and run `pnpm update @keystatic/core @keystatic/astro`.
2. Run `pnpm build`. If a new version removes or renames a setting we use, the type check fails and names the exact line.
3. Run `pnpm dev`, open a post in `/keystatic`, save it, and click Preview to confirm it opens the right page.

After changing `astro.config.ts` or `keystatic.config.ts`, stop and start `pnpm dev` again. The dev server's automatic restart stops picking up content edits, so saved changes would not show.

If a future version ever drops `previewUrl`, the preview URLs keep working when typed in (for example `/preview/blog/<slug>`), and a "View on site" link can be added to the entries another way.

### Favicons and app icons

The "UP" monogram is drawn in `scripts/generate-icons.mjs`. After changing it, run `node scripts/generate-icons.mjs` to rewrite `public/favicon.svg` (follows light and dark mode), `favicon.ico`, `apple-touch-icon.png`, the 192, 512 and maskable 512 icons and `site.webmanifest`, then commit the files.

## SEO and AI visibility

- JSON-LD on every page (WebSite + Person), plus BlogPosting, BreadcrumbList, CollectionPage, ProfilePage, ContactPage and FAQPage where the content is visible.
- `/robots.txt` allows search, AI search and AI training crawlers (plan: `schema-and-technical.md` §4). If the site ever moves behind Cloudflare, turn off its AI bot blocking.
- `/sitemap-index.xml`, a full-content `/rss.xml`, a generated `/llms.txt`, and a Markdown copy of every post at its URL plus `.md` (noindex, canonical header).
- Each sitemap entry carries a `lastmod` from the entry's `updated` date (else `published`), so Google recrawls what changed. Keep `updated` accurate when you edit a post.
- IndexNow (Bing, Yandex, Naver, Seznam, Yep): after each Vercel production deploy, `.github/workflows/indexnow.yml` runs `scripts/indexnow.mjs`, which submits the changed posts plus the list pages, or the whole sitemap when layouts or config changed. The key is the file name of `public/59f21d6790c85a447f402bf2529b4a2f.txt`; to rotate it, replace that file with a new 32-character hex name containing the same value. Preview with `DRY_RUN=1 node scripts/indexnow.mjs <from-sha> <to-sha>`. Google doesn't use IndexNow, and its Indexing API is only for job and livestream pages.
- A 1200×630 black and white OG image is generated for every post at `/og/<slug>.png`.
- Fonts are self-hosted from `@fontsource` packages; the only JavaScript is the theme toggle, search, code copy, sharing and form enhancement.

## Before launch

- Replace the "UP" monogram with a real photo: put it in `public/images/` and set `SITE.photo` in `src/config.ts`.
- Confirm the values marked in `src/config.ts` (job title, newsletter frequency, the "kind of work" line and reply time on Contact) and add the X, Threads, Instagram, Facebook and Reddit profiles.
- Finish the draft posts: search for `[Uriel to add` and `[verify` in `src/content/`, then untick Draft.
