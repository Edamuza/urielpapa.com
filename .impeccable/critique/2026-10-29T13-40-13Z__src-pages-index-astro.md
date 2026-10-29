---
target: homepage, a post and /blog
total_score: 26
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com/src/pages/index.astro"
target_fingerprint: "sha256:b0522c6118b4822c3a25b5cd19026d6ce08b4e31516817780b0144ed5089da4a"
target_path: /Users/urielpapa/Downloads/SEMANTIC SEO, SRO & AI/urielpapa.com/src/pages/index.astro
timestamp: 2026-10-29T13-40-13Z
slug: src-pages-index-astro
---
Method: dual-agent (A: design review · B: detector + browser overlay). Views: / , /blog/geo-and-aeo-fundamentals , /blog (desktop 1440 and 375, light and dark).

## Design Health Score
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Sticky TOC has no active-section state |
| 2 | Match system / real world | 3 | "SEO, GEO and AEO", "in the sitemap" are insider terms on the homepage |
| 3 | User control and freedom | 3 | Desktop gets the full 130-word intro with no collapse |
| 4 | Consistency and standards | 2 | Header 6 / mobile 8 / footer 10 nav items; posts highlight "Writing" but breadcrumb goes via Topics; 88px axis jog after the article |
| 5 | Error prevention | 3 | Solid newsletter validation |
| 6 | Recognition over recall | 3 | Mobile TOC sits far below the first screen |
| 7 | Flexibility and efficiency | 2 | Sticky TOC only at 1280px+; /blog has no type filter |
| 8 | Aesthetic and minimalist | 2 | Flat hierarchy: every container is the same rounded bordered box; always-on "#" anchors |
| 9 | Error recovery | 3 | Clear inline errors |
| 10 | Help and documentation | 2 | Nothing explains Writing vs Notes vs News vs Events |
| Total | | 26/40 | Acceptable |

## Design Specificity Verdict
Authored: the strict black-and-white tokens, always-underlined links, Bricolage Grotesque + Albert Sans, the inverted quote bar, question H2s, the left-ruled "From the build" aside, the solid/plain/dashed stroke grammar for chips, labels and drafts. Template: the homepage order and the one rounded-bordered box used for every job. The builder claim has no visible proof on the homepage (projects only in the footer).
Deterministic scan: source scan clean but regex-only on .astro (undercount). URL scans: / 2 line-length + 1 straggler; post 15 line-length + 6 stragglers; /blog 3 line-length + 1 straggler; / at 375px 0 warnings. Root causes: max-w-read 68ch = 770px ≈ 91-95 chars (global.css:75, typography.css:8, PostCard.astro:37); FAQ.astro:12 and KeyTakeaways.astro:8 render outside the measure (1056-1123px, up to ~135 chars). No console errors, no 375px overflow, contrast AA passes (lowest 6.69:1). Both assessments agree on the measure.

## Priority Issues
1. [P1] Homepage hides its action and shows no proof of the builder claim: CTAs at y=946 (below the fold at 1440x900) behind the 130-word paragraph; filled button is "About me"; the only proof is a muted meta line; Projects not in the header. Fix: CTAs above the long paragraph at all sizes, collapse paragraph two on desktop too, a visible proof row of 3-4 linked builds, Projects in the nav. (clarify, bolder)
2. [P1] Mobile post front-matter wall: body starts at 1843px on 375x812; hub named 3 times before the body; 2-line breadcrumb repeating the title; open 7-item TOC. Fix: drop "Part of…", hide the last crumb on phones, mobile TOC in a closed details, takeaways after the TOC or capped. (distill)
3. [P1] Line length: 91-95 chars in body and card summaries, ~135 in FAQ and Key Takeaways. Fix: max-w-read to about 40rem (~75 chars); put FAQ and Key Takeaways inside the measure. (typeset, layout)
4. [P2] Inconsistent IA and axis: three nav sets, Writing vs Topics breadcrumb, 88px jog between article column and the after-article block on xl, centered newsletter after a left-aligned list on /blog. (layout)
5. [P2] Typographic seams: mobile H1 strands "I" at line ends; "#" anchors inside headings read twice by screen readers and add noise. Fix: non-breaking "I see / I build / I grow"; anchors aria-hidden and shown on hover/focus. (typeset)

## Persona Red Flags
Casey (mobile): quote bar + header take ~15% of the screen and the bar never hides; 1843px before the answer; 4 rows of topic pills on /blog; 24.5px hub chips. Jordan (first-timer): four content types unexplained; acronyms in topic names; "Pages: in the sitemap". Riley: Topics 4+3 orphan row; single-item "Recent notes" and "Seminars" columns; build-time "Updated" date.

## Minor Observations
Name appears three times in the first mobile screen; dashed stroke means both "warning callout" and "draft"; figcaption uses opacity instead of the muted token; footer "Established online" badge is a bright off-system card in dark mode; stats "Days since launch" and "Pages" read as "new site" (Uriel chose these and the placement, so they stay unless he says otherwise).

## Questions to Consider
Should the movie-quote bar scroll away on Read pages? What if the first thing under the H1 were three real builds with one number each? What would one signature container look like instead of the same box everywhere?
