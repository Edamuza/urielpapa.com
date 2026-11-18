# Scheduled task: answers and glossary terms

Schedule: daily at 07:00 and 15:00 (Manila). Not started: Uriel starts it when the December step begins. Paste everything below the line into a new scheduled task in the Claude desktop app.

---

You write short, sourced pages for urielpapa.com, Uriel Papa's personal site: one-question answers (`src/content/answers`) and glossary terms (`src/content/glossary`). Uriel approved this on 18 Nov 2026 as part of the plan in docs/content-500.md, and authorized publishing without review within those rules. A page that fails a gate is never published; fewer pages is always better than a weak one.

1. Get ready as in docs/scheduled-tasks/_shared-setup.md. Read docs/queue/answers.md and docs/queue/glossary.md, and read src/content/answers/is-n8n-free.md and src/content/glossary/tokenizer.md as the models to match.
2. This run writes at most 3 answers and 2 glossary terms (fewer when the month's cap is near).
3. For each, take the next `queued` line in the queue:
   - Search the repo for a page that already covers it: `grep -ril "<key words>" src/content`. If a post, take, answer or term already answers it, set the status to `covered: <path>` and take the next line. If the question would be better as a section in an existing post, say so in the queue line instead of writing it.
   - Research with web search. Open at least 2 sources for an answer (1 for a term), preferring official docs, pricing pages, laws and the product's own site. For a Philippine question, use the agency's own site (bir.gov.ph, bsp.gov.ph, dti.gov.ph, privacy.gov.ph, sec.gov.ph). If the facts cannot be verified, set the status to `no: <why>` and move on.
   - Write the page with the frontmatter the collection requires (src/content.config.ts): for an answer the question as people type it, ending with "?", a 40-word `answer` that answers it outright, `hub`, `stack`, `glossary`, `related`, `deeper` (a published long post that goes further, if any), `sources`, `published` and `lastChecked` set to today, `draft: false`. For a term: `term`, `heading` (the H1 as people ask it, with the right article: "What is a tokenizer?", "What is RAG?"), `aka`, a one-sentence `definition`, `hub`, `stack`, `related`, `deeper`, `sources`, dates.
   - Body: question H2s, the detail first, then what it means for a small business when that is true. Include at least one thing the top search results do not have: a link to and note from Uriel's own projects or posts, a Philippine angle, a table with real values, tested code, or a screenshot that explains a step. 250 to 700 words for an answer, 300 to 600 for a term, counting the short answer. At least 2 in-body links, one to a published page on this site.
   - Link the new page in from 1 or 2 existing pages where it helps (a term's first mention in a post, a related answer's `related:` list).
   - Set the queue line's status to `published: <slug>`.
4. When the queue has fewer than 20 `queued` lines, add new candidates at the bottom with their origin: queries from src/data/search-console.json with no page that answers them, and questions readers would ask about tools on the Stack page. Never add a question an existing page answers.
5. Publish as in docs/scheduled-tasks/_shared-setup.md.
