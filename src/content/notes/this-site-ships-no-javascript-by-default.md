---
title: This Site Ships No JavaScript by Default
description: How urielpapa.com is built with Astro static pages, small islands of JavaScript only where needed, Tailwind CSS and Keystatic as a git-based CMS.
hub: tech-stacks
published: 2026-10-17
related: null
syndication: []
draft: false
---

Most pages on this site send no JavaScript to your browser at all. They are plain HTML and CSS, built ahead of time.

I built urielpapa.com with Astro, a framework made for content sites. Astro renders every page to static HTML at build time, so a post is ready to read the moment it arrives. Nothing has to download, run and then draw the page.

JavaScript only shows up where a feature needs it, as small "islands" on an otherwise static page:

- **Theme toggle**, to switch between light and dark.
- **Search**, powered by Pagefind on the search page.
- **Code copy buttons** on code blocks.
- **Form enhancement**, so forms can give inline feedback.

Styling comes from Tailwind CSS, compiled at build time into plain CSS, so there is no styling library running in the browser either.

Posts, notes, projects and topic pages are Markdown and MDX files in the site's git repository. I edit them through Keystatic, a git-based CMS, so every change is a file in the repository with its own history. There is no database to run or back up.

The build also checks each post before it goes live. A title over 70 characters, a missing meta description or a post without a topic hub fails the build instead of shipping.

