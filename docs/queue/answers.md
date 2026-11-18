# Answers queue

The answers task (`docs/scheduled-tasks/answers-glossary.md`) takes the first lines with status `queued`, top to bottom. Uriel can strike any line (change its status to `no`) or add his own at the top. Before writing, the task searches `src/content` for a page that already answers the question; if one does, it sets the status to `covered: <path>` and moves on.

Origin: `GSC` = a query from Search Console (16 Nov 2026 audit, `audit/data-2026-11-16/Queries.csv`); `audit` = a finding in that audit; `stack` = a tool on the Stack page, where the site has first-hand use; `hub` = a gap in a topic hub. Questions already answered by a post were left out (for example Maya and Apple Pay, PHP2Shell, Claude Haiku 5.5 pricing, WhatsApp service charges, llms.txt, context windows).

| Question | Hub | Origin | Status |
| --- | --- | --- | --- |
| Is n8n free to use? | automation | stack | published: is-n8n-free |
| What counts as an execution in n8n? | automation | stack | queued |
| Can self-hosted n8n run on a 1 GB server? | automation | stack | queued |
| How do I back up a self-hosted n8n instance? | automation | stack | queued |
| Does Zapier have a free plan? | automation | hub | queued |
| What does "Discovered, currently not indexed" mean in Search Console? | seo-geo-aeo | audit | queued |
| What does "Crawled, currently not indexed" mean in Search Console? | seo-geo-aeo | audit | queued |
| How long does Google take to index a new page? | seo-geo-aeo | audit | queued |
| Why does Search Console show site: queries for my pages? | seo-geo-aeo | audit | queued |
| What is IndexNow, and does Google use it? | seo-geo-aeo | hub | queued |
| How do I see AI Overviews impressions in Search Console? | seo-geo-aeo | audit | queued |
| How do I check if Perplexity cites my site? | seo-geo-aeo | GSC | queued |
| What is a good click-through rate in Search Console? | seo-geo-aeo | audit | queued |
| Does Google penalize AI-written content? | seo-geo-aeo | hub | queued |
| What is scaled content abuse in Google's spam policies? | seo-geo-aeo | hub | queued |
| How do I add my site to Bing Webmaster Tools? | seo-geo-aeo | audit | queued |
| Is Rank Math or Yoast better for a small WordPress site? | seo-geo-aeo | stack | queued |
| How do I count tokens before calling the Claude API? | ai | GSC | queued |
| What is OpenRouter, and why use it instead of one provider? | ai | stack | queued |
| Can I run an LLM on my own laptop? | ai | stack | queued |
| What is the difference between Claude Code and Cursor? | ai | stack | queued |
| What does a tokenizer do? | ai | GSC | covered: src/content/glossary/tokenizer.md |
| Is Astro good for SEO? | tech-stacks | stack | queued |
| Does an Astro site need a server? | tech-stacks | stack | queued |
| Is Keystatic free? | tech-stacks | stack | queued |
| Can Vercel host a small business site for free? | tech-stacks | stack | queued |
| What is the difference between Prisma and raw SQL? | tech-stacks | stack | queued |
| Is Laravel still worth learning in 2026? | tech-stacks | GSC | queued |
| What is Supabase Auth, and is it free? | tech-stacks | stack | queued |
| Do I need to register with the BIR to sell online in the Philippines? | tech-and-business | hub | queued |
| How do I accept GCash payments on my website? | tech-and-business | hub | queued |
| What is QR Ph? | tech-and-business | hub | queued |
| Does a small Philippine business need a Data Protection Officer? | tech-and-business | hub | queued |
| Does Maya accept international cards for online payments? | tech-and-business | GSC | queued |
| How much should a small business spend on Meta ads in the Philippines? | marketing | stack | queued |
| What is a good ROAS for a small business? | marketing | hub | queued |
| How do I add UTM tags to links I share? | marketing | hub | queued |
| How do I set up Cloudflare Turnstile on a contact form? | tech-stacks | stack | queued |
| What is Gemma, and can it run on a phone? | ai | stack | queued |
| How do I test a Laravel API with PHPUnit? | tech-stacks | stack | queued |
