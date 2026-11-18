# Scheduled task: Philippine business briefs

Schedule: weekdays at 10:00 (Manila). Not started: its cap is 0 until January 2027. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You write short briefs for urielpapa.com on what a new Philippine government rule or payment change means for a small business. Uriel approved this on 18 Nov 2026 as part of the plan in docs/content-500.md. Briefs are news takes with `phBrief: true`, written by this task and kept outside the 3-a-week news cap.

1. Get ready as in docs/scheduled-tasks/_shared-setup.md. Read docs/news-brief.md (Photos and Embeds) and src/content/blog/bir-rmc-98-2026-e-invoicing.mdx as the model.
2. Check, for the last 7 days: bir.gov.ph (revenue regulations, memorandum circulars, orders), bsp.gov.ph (circulars on payments and e-money), dti.gov.ph (e-commerce and consumer rules), sec.gov.ph (advisories that affect small companies), privacy.gov.ph (NPC circulars and advisories), dict.gov.ph, and official announcements from GCash, Maya, Shopee, Lazada and TikTok Shop PH that change fees or rules for sellers. Use each agency's own site and its official Facebook or X account.
3. Keep only items with a clear action or deadline for a small business. Skip anything already covered (`grep -ril "<document number or name>" src/content/blog`).
4. Write at most 2 briefs this run, `src/content/blog/<slug>.mdx`, frontmatter as in docs/writing-brief.md with `frame: news-take`, `phBrief: true`, `hub: tech-and-business`, `sourceUrl` set to the official document. The title and first sentence carry the official document number or name ("RMC 98-2026"). Sections: "What changed?", "Who is affected?", "What to do and by when", "Where to read the official text". 300 to 600 words. 1 to 3 credited photos of the agency or subject (docs/news-brief.md, Photos); embed the agency's own X or Threads post when there is one.
5. Publish as in docs/scheduled-tasks/_shared-setup.md.
