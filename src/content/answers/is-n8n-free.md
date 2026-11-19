---
question: Is n8n free to use?
seoTitle: "Is n8n Free? Community Edition, Cloud Plans and Limits"
description: >-
  Self-hosted n8n is free for your own business's workflows under its Community
  license. n8n Cloud starts at 20 euros a month. What is allowed and what costs.
answer: >-
  Yes, if you host it yourself and only you or your team build the workflows:
  the Community edition is free under n8n's license. You still pay for the
  server. n8n Cloud, where n8n hosts it for you, starts at 20 euros a month.
hub: automation
stack:
  - n8n
glossary: []
related: []
deeper: open-source-n8n-alternatives
sources:
  - title: n8n License FAQ
    url: https://docs.n8n.io/n8n-community-license/community-license/license-faq
  - title: n8n pricing
    url: https://n8n.io/pricing/
  - title: n8n release notes
    url: https://docs.n8n.io/release-notes/
published: 2026-11-18
lastChecked: 2026-11-19
draft: false
---

## When is n8n free?

n8n is free when you run the Community edition on your own server and the workflows are built by you or people in your organization. n8n's [License FAQ](https://docs.n8n.io/n8n-community-license/community-license/license-faq "n8n's License FAQ on what the Community license allows") says that in that case "you can use n8n under the Community license for free."

The license also lets a consultant or agency build, run and maintain workflows on their own n8n instance for clients, and charge for that work. What it does not allow is hosting n8n as a service where your clients build their own workflows.

Free here means no license fee. A self-hosted instance still needs a server. I led and co-developed a [Messenger and Instagram chatbot on self-hosted n8n](/blog/n8n-messenger-instagram-chatbot "How I built an AI chatbot for Messenger and Instagram with n8n"), and that post has a rough monthly budget for a small server.

## What does n8n Cloud cost?

n8n Cloud is the paid, hosted version. n8n's [pricing page](https://n8n.io/pricing/ "n8n's official pricing page") lists these plans, in euros, billed annually, as of 18 November 2026:

| Plan       | Price per month | Workflow executions a month | Notes                          |
| ---------- | --------------- | --------------------------- | ------------------------------ |
| Starter    | 20 euros        | 2,500                       | 1 shared project               |
| Pro        | 50 euros        | 10,000                      | 3 shared projects              |
| Business   | 667 euros       | 40,000                      | Self-hosted only, 6 projects   |
| Enterprise | By quote        | Custom                      | Contact sales                  |

Every plan includes unlimited users and workflows. n8n counts executions, not steps, so a workflow with 20 nodes still counts as one run. Runs of error workflows no longer count toward the quota on any plan: on Cloud since n8n 2.38, and on self-hosted Business and Enterprise since 2.28, according to [n8n's changelog entry on error workflow executions](https://docs.n8n.io/release-notes/ "n8n's changelog and release notes").

## Which should a small business pick?

A small team with someone who can look after a Linux server usually gets the most from self-hosting, because the bill is the server alone. A team without that person is better off on n8n Cloud's Starter plan and moving up only when it runs out of executions. If the license itself is the problem, for example because clients need to build their own workflows, my list of [open-source n8n alternatives](/blog/open-source-n8n-alternatives "The best open-source n8n alternatives on GitHub") covers tools with more permissive licenses.
