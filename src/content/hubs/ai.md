---
title: AI, in Depth
seoTitle: "AI, in Depth: How LLMs, Tokens and Harnesses Work"
description: How large language models really work, from tokenization and context windows to AI harnesses like Claude Code, Cursor and OpenCode, and local vs API models.
summary: How large language models work, what tokens and context windows are, and the tools built around them.
order: 1
startHere:
  - post: what-is-tokenization
    reason: Start with tokens, the unit every model reads, writes, limits and charges by.
---

Here I write about how large language models (LLMs) actually work, for anyone who uses AI tools and wants to understand what is happening underneath. That means the building blocks: tokenization, context windows, prompting, and the difference between a model and the harness around it.

A model like Claude, GPT, Gemini or Gemma is only part of the picture. Harnesses such as Claude Code, Cursor and OpenCode decide what the model sees, which tools it can call and how its work is checked. Platforms like OpenRouter give one way to reach many models, and tools like LM Studio let you run a local LLM on your own machine. Choosing between local and API models is a real trade-off in cost, privacy and quality, and I cover it here too.

My own work in this area includes custom Claude skills, a multi-agent Claude Code pipeline that audits a full production codebase in under 6 minutes, and an AI chatbot for Messenger and Instagram that runs on OpenRouter. I also co-developed [Tell Liora](/projects/tell-liora), an offline mobile app that pairs an on-device Gemma model with 8 WHO decision tables.

Posts here aim to leave you understanding something better than before: plain explanations first, with the technical details and sources for anyone who wants to go deeper.
