/**
 * Keystatic CMS (ux-ui-spec.md §11). Edit locally at http://localhost:4321/keystatic,
 * or on the live site once GitHub mode is set up (see README). Field rules mirror
 * src/content.config.ts so the editor warns before the build would fail.
 */
import { collection, config, fields, singleton } from "@keystatic/core";
import { block, wrapper } from "@keystatic/core/content-components";
import { FRAMES, HUBS, STACK_GROUPS, SYNDICATION_NETWORKS } from "./src/data/hubs";

const hubOptions = HUBS.map(h => ({ label: h.name, value: h.id }));

const mdxComponents = {
  FromTheBuild: wrapper({
    label: "From the build",
    description: "1–3 sentences of evidence with a real number, linked to the project behind it.",
    schema: {
      project: fields.relationship({ label: "Project", collection: "projects" }),
    },
  }),
  Callout: wrapper({
    label: "Callout",
    description: "Note, tip or warning. Use at most two per post.",
    schema: {
      type: fields.select({
        label: "Type",
        options: [
          { label: "Note", value: "note" },
          { label: "Tip", value: "tip" },
          { label: "Warning", value: "warning" },
        ],
        defaultValue: "note",
      }),
    },
  }),
  YouTube: block({
    label: "YouTube video",
    description: "A video from a credible channel that adds to the section above it. Loads only when played.",
    schema: {
      id: fields.text({ label: "Video ID (the part after watch?v=)", validation: { length: { min: 11, max: 11 } } }),
      title: fields.text({ label: "Video title, as on YouTube" }),
      channel: fields.text({ label: "Channel name" }),
    },
  }),
  RepoCard: block({
    label: "GitHub repo card",
    description: "A GitHub repository card with its stars, license and the opening of its README. Run node scripts/update-repos.mjs after adding one.",
    schema: {
      repo: fields.text({ label: "Repository (owner/name)" }),
    },
  }),
  SponsorList: block({
    label: "Sponsor list",
    description: "The full sponsor list of an event I sponsored, with my name highlighted. Edit the list in src/data/events.json.",
    schema: {
      event: fields.text({ label: "Event id from src/data/events.json (sponsored[].id)" }),
    },
  }),
  SocialPost: block({
    label: "X or Threads post",
    description: "An official post from X or Threads that adds to the section above it, shown as a fast static card. Copy the text exactly.",
    schema: {
      platform: fields.select({
        label: "Platform",
        options: [
          { label: "X", value: "x" },
          { label: "Threads", value: "threads" },
        ],
        defaultValue: "x",
      }),
      url: fields.url({ label: "Post URL" }),
      author: fields.text({ label: "Account name" }),
      handle: fields.text({ label: "Handle, without @" }),
      date: fields.text({ label: "Date posted (YYYY-MM-DD)" }),
      text: fields.text({ label: "Post text, exactly as posted (full URLs for links)", multiline: true }),
      media: fields.array(
        fields.object({
          type: fields.select({
            label: "Type",
            options: [
              { label: "Photo", value: "photo" },
              { label: "Video (poster image)", value: "video" },
            ],
            defaultValue: "photo",
          }),
          src: fields.url({ label: "Image URL (pbs.twimg.com)" }),
          alt: fields.text({ label: "Alt text", description: "Required. Describe what the photo shows.", validation: { length: { min: 1 } } }),
          width: fields.integer({ label: "Width (px)" }),
          height: fields.integer({ label: "Height (px)" }),
        }),
        { label: "Photos or video poster (up to 4)", itemLabel: props => props.fields.alt.value || "Media" }
      ),
      card: fields.object(
        {
          url: fields.text({ label: "Link URL (leave empty for none)" }),
          title: fields.text({ label: "Title" }),
          description: fields.text({ label: "Description", multiline: true }),
          domain: fields.text({ label: "Domain, e.g. anthropic.com" }),
          image: fields.text({ label: "Preview image URL" }),
          imageAlt: fields.text({ label: "Preview image alt text", description: "Required when there is a preview image." }),
        },
        { label: "Link preview" }
      ),
    },
  }),
};

const body = (label = "Body") =>
  fields.mdx({
    label,
    components: mdxComponents,
    options: {
      image: {
        directory: "src/assets/images/content",
        publicPath: "../../assets/images/content/",
        // Site rule: every image needs alt text and a title.
        schema: {
          alt: fields.text({ label: "Alt text", description: "Required. Describe what the image shows.", validation: { length: { min: 1 } } }),
          title: fields.text({ label: "Title", description: "Required. Shown on hover; say what the image is.", validation: { length: { min: 1 } } }),
        },
      },
    },
  });

const sources = (min: number) =>
  fields.array(
    fields.object({
      title: fields.text({ label: "Page title", validation: { length: { min: 3 } } }),
      url: fields.url({ label: "URL", validation: { isRequired: true } }),
    }),
    {
      label: "Sources",
      description: `Pages you opened and took facts from. At least ${min}.`,
      itemLabel: p => p.fields.title.value || "Source",
      validation: { length: { min } },
    }
  );

const syndication = fields.array(
  fields.object({
    network: fields.select({
      label: "Network",
      options: SYNDICATION_NETWORKS.map(n => ({ label: n, value: n })),
      defaultValue: "linkedin",
    }),
    url: fields.url({ label: "URL", validation: { isRequired: true } }),
  }),
  { label: "Also on (syndication links)", description: "Add after reposting.", itemLabel: p => p.fields.network.value }
);

export default config({
  storage: import.meta.env.PROD
    ? { kind: "github", repo: { owner: "Edamuza", name: "urielpapa.com" } }
    : { kind: "local" },
  ui: {
    brand: { name: "urielpapa.com" },
    navigation: {
      Writing: ["blog", "notes", "newsletter"],
      "Short pages": ["answers", "glossary", "releases"],
      Site: ["hubs", "projects", "stack", "now"],
    },
  },
  collections: {
    blog: collection({
      label: "Posts, news takes and event notes",
      slugField: "title",
      path: "src/content/blog/*",
      // Posts, news takes and event notes live in different sections; this route redirects to the right one.
      previewUrl: "/preview/blog/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      columns: ["title", "published"],
      schema: {
        title: fields.slug({
          name: {
            label: "Title (H1)",
            description: "Phrase it like the question. 70 characters or fewer.",
            validation: { length: { min: 1, max: 70 } },
          },
          slug: { label: "Slug", description: "Lowercase, hyphens, no dates." },
        }),
        seoTitle: fields.text({
          label: "SEO title",
          description: "60 characters or fewer, main entity first. ' | Uriel Papa' is added automatically.",
          validation: { length: { min: 1, max: 60 } },
        }),
        description: fields.text({
          label: "Meta description",
          description: "120–170 characters: the answer plus a reason to click.",
          multiline: true,
          validation: { length: { min: 120, max: 170 } },
        }),
        dek: fields.text({ label: "Dek", description: "1–2 sentence summary under the title.", multiline: true, validation: { length: { min: 1 } } }),
        hub: fields.select({ label: "Topic hub", description: "Exactly one.", options: hubOptions, defaultValue: "ai" }),
        frame: fields.select({
          label: "Format",
          description: "News takes appear under /news and event notes under /events.",
          options: FRAMES.map(f => ({ label: f.label, value: f.id })),
          defaultValue: "guide",
        }),
        takeaways: fields.array(fields.text({ label: "Takeaway", multiline: true }), {
          label: "Key takeaways",
          description: "3–5 full sentences that name the entity. The first answers the title.",
          itemLabel: p => p.value,
          validation: { length: { min: 3, max: 5 } },
        }),
        businessImpact: fields.array(fields.text({ label: "Line", multiline: true }), {
          label: "How this affects business (optional)",
          description: "2–4 short lines. Explains, never pitches. Leave empty if there's nothing real to say.",
          itemLabel: p => p.value,
          validation: { length: { max: 4 } },
        }),
        sourceUrl: fields.url({ label: "Source URL", description: "Required for news takes: the official announcement." }),
        published: fields.date({ label: "Published", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        updated: fields.date({ label: "Updated", description: "Only for material changes." }),
        updateNote: fields.text({ label: "Update note", description: "What changed, shown at the top of the post." }),
        related: fields.array(fields.relationship({ label: "Post", collection: "blog" }), {
          label: "Related posts",
          description: "At most 2: same entity or the natural next step.",
          itemLabel: p => p.value ?? "",
          validation: { length: { max: 2 } },
        }),
        projects: fields.array(fields.relationship({ label: "Project", collection: "projects" }), {
          label: "Projects referenced",
          itemLabel: p => p.value ?? "",
        }),
        stack: fields.array(fields.relationship({ label: "Tool", collection: "stack" }), {
          label: "Stack",
          description: "At most 6.",
          itemLabel: p => p.value ?? "",
          validation: { length: { max: 6 } },
        }),
        faq: fields.array(
          fields.object({
            q: fields.text({ label: "Question" }),
            a: fields.text({ label: "Answer", multiline: true }),
          }),
          { label: "FAQ (optional)", description: "Only if the body really answers these.", itemLabel: p => p.fields.q.value }
        ),
        hero: fields.image({ label: "Hero image", directory: "src/assets/images/blog", publicPath: "../../assets/images/blog/" }),
        // Keystatic can't make one field required only when another is filled, so
        // the build (content.config.ts) and check-content.mjs enforce this one.
        heroAlt: fields.text({ label: "Hero image alt text", description: "Required when there is a hero image: saving works, but the build fails without it." }),
        event: fields.object(
          {
            name: fields.text({ label: "Event name" }),
            startDate: fields.text({ label: "Start date", description: "YYYY-MM or YYYY-MM-DD" }),
            endDate: fields.text({ label: "End date" }),
            venue: fields.text({ label: "Venue" }),
            city: fields.text({ label: "City" }),
            organizer: fields.text({ label: "Organizer", description: "Required for event notes: Google flags an event without one." }),
            organizerUrl: fields.url({ label: "Organizer website", description: "Optional. Falls back to the event website." }),
            url: fields.url({ label: "Event website" }),
          },
          { label: "Event details", description: "Event notes only. Leave the name empty for other posts." }
        ),
        syndication,
        draft: fields.checkbox({ label: "Draft", description: "Drafts never appear on the live site.", defaultValue: true }),
        body: body(),
      },
    }),

    notes: collection({
      label: "Notes",
      slugField: "title",
      path: "src/content/notes/*",
      previewUrl: "/notes/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      schema: {
        title: fields.slug({ name: { label: "Title", validation: { length: { min: 1, max: 70 } } } }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 50, max: 170 } } }),
        hub: fields.select({ label: "Topic hub", options: hubOptions, defaultValue: "ai" }),
        published: fields.date({ label: "Published", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        related: fields.relationship({ label: "Longer post on this", collection: "blog" }),
        syndication,
        draft: fields.checkbox({ label: "Draft", defaultValue: true }),
        body: fields.mdx({ label: "Body (100–400 words)", extension: "md", components: {} }),
      },
    }),

    newsletter: collection({
      label: "Newsletter issues",
      slugField: "title",
      path: "src/content/newsletter/*",
      previewUrl: "/newsletter/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      schema: {
        title: fields.slug({ name: { label: "Issue title", validation: { length: { min: 1, max: 70 } } } }),
        description: fields.text({ label: "Summary", multiline: true, validation: { length: { min: 50, max: 170 } } }),
        published: fields.date({ label: "Sent on", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        draft: fields.checkbox({ label: "Draft", defaultValue: true }),
        body: fields.mdx({ label: "Issue", components: {} }),
      },
    }),

    hubs: collection({
      label: "Topic hubs",
      slugField: "title",
      path: "src/content/hubs/*",
      previewUrl: "/topics/{slug}",
      format: { contentField: "body" },
      schema: {
        title: fields.slug({ name: { label: "Hub name (H1)" }, slug: { label: "Slug", description: "Don't change: posts refer to it." } }),
        seoTitle: fields.text({ label: "SEO title", validation: { length: { min: 1, max: 60 } } }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 120, max: 170 } } }),
        summary: fields.text({ label: "One-line summary", description: "Shown on hub cards." }),
        order: fields.integer({ label: "Order", defaultValue: 1 }),
        startHere: fields.array(
          fields.object({
            post: fields.relationship({ label: "Post", collection: "blog", validation: { isRequired: true } }),
            reason: fields.text({ label: "Why start here (one line)" }),
          }),
          { label: "Start here (up to 3)", itemLabel: p => p.fields.post.value ?? "", validation: { length: { max: 3 } } }
        ),
        body: fields.mdx({ label: "Intro passage (150–250 words)", extension: "md", components: {} }),
      },
    }),

    projects: collection({
      label: "Projects",
      slugField: "title",
      path: "src/content/projects/*",
      previewUrl: "/projects/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      schema: {
        title: fields.slug({ name: { label: "Project name" } }),
        seoTitle: fields.text({ label: "SEO title", description: "Name plus what it is, e.g. 'TravelEase: Tagaytay Trip Planning Portal'. 47 characters or fewer keeps ' | Uriel Papa'.", validation: { length: { max: 60 } } }),
        updated: fields.date({ label: "Updated", description: "Only for material changes to the case study." }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 80, max: 170 } } }),
        summary: fields.text({ label: "Summary", description: "Problem, what was built, result.", multiline: true }),
        outcome: fields.text({ label: "One-line outcome", description: "Shown in the projects list." }),
        period: fields.text({ label: "Period", description: "e.g. July to October 2026" }),
        year: fields.integer({ label: "Year", defaultValue: 2026 }),
        role: fields.text({ label: "Role" }),
        team: fields.text({ label: "Team" }),
        status: fields.text({ label: "Status", description: "e.g. Live, Internal system" }),
        kind: fields.select({
          label: "Schema type",
          options: [
            { label: "Internal system or other work (CreativeWork)", value: "CreativeWork" },
            { label: "Live product (SoftwareApplication)", value: "SoftwareApplication" },
          ],
          defaultValue: "CreativeWork",
        }),
        liveUrl: fields.url({ label: "Live URL" }),
        stack: fields.array(fields.relationship({ label: "Tool", collection: "stack" }), { label: "Stack", itemLabel: p => p.value ?? "" }),
        hubs: fields.multiselect({ label: "Related topic hubs", options: hubOptions }),
        order: fields.integer({ label: "Order in list", defaultValue: 100 }),
        featured: fields.checkbox({ label: "Featured", description: "Show it as a large card at the top of the Projects sections on the home and projects pages.", defaultValue: false }),
        showOnHome: fields.checkbox({ label: "Show on the home page", description: "Untick for agency work that should only appear on the projects page. The home page shows the top 5 ticked projects, featured first.", defaultValue: true }),
        draft: fields.checkbox({ label: "Draft", defaultValue: false }),
        repo: fields.text({ label: "GitHub repository", description: 'Shown as a card on the project page, as "owner/name", e.g. Edamuza/Travel_Ease.' }),
        cover: fields.image({ label: "Featured image", description: "Required. Shown on the project cards.", directory: "src/assets/images/content", publicPath: "../../assets/images/content/", validation: { isRequired: true } }),
        coverAlt: fields.text({ label: "Featured image alt text", description: "Required. Describe what the image shows; it is also used as the image title.", validation: { length: { min: 1 } } }),
        body: body("Case study"),
      },
    }),

    answers: collection({
      label: "Answers",
      slugField: "question",
      path: "src/content/answers/*",
      previewUrl: "/answers/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      columns: ["question", "published"],
      schema: {
        question: fields.slug({
          name: { label: "Question (as people type it, ends with ?)", validation: { length: { min: 5, max: 70 } } },
        }),
        seoTitle: fields.text({ label: "SEO title (optional, 60 max)", validation: { length: { max: 60 } } }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 120, max: 170 } } }),
        answer: fields.text({ label: "Short answer (about 40 words, shown first)", multiline: true, validation: { length: { min: 40, max: 300 } } }),
        hub: fields.select({ label: "Topic hub", options: hubOptions, defaultValue: "ai" }),
        stack: fields.array(fields.relationship({ label: "Tool", collection: "stack" }), { label: "Tools mentioned", itemLabel: p => p.value ?? "Tool" }),
        glossary: fields.array(fields.relationship({ label: "Term", collection: "glossary" }), { label: "Glossary terms used", itemLabel: p => p.value ?? "Term" }),
        related: fields.array(fields.relationship({ label: "Answer", collection: "answers" }), { label: "Related answers", itemLabel: p => p.value ?? "Answer" }),
        deeper: fields.relationship({ label: "Long post that goes deeper", collection: "blog" }),
        sources: sources(2),
        published: fields.date({ label: "Published", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        lastChecked: fields.date({ label: "Last checked", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        draft: fields.checkbox({ label: "Draft", defaultValue: true }),
        body: body("Body (250–700 words)"),
      },
    }),

    glossary: collection({
      label: "Glossary",
      slugField: "term",
      path: "src/content/glossary/*",
      previewUrl: "/glossary/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      columns: ["term", "hub"],
      schema: {
        term: fields.slug({ name: { label: "Term", validation: { length: { min: 2, max: 60 } } } }),
        heading: fields.text({ label: "Heading (H1), as people ask it", description: "For example \"What is a tokenizer?\". Leave empty for \"What is <term>?\"." }),
        aka: fields.array(fields.text({ label: "Other name" }), { label: "Also called", itemLabel: p => p.value }),
        seoTitle: fields.text({ label: "SEO title (optional, 60 max)", validation: { length: { max: 60 } } }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 120, max: 170 } } }),
        definition: fields.text({ label: "One-sentence definition", multiline: true, validation: { length: { min: 40, max: 300 } } }),
        hub: fields.select({ label: "Topic hub", options: hubOptions, defaultValue: "ai" }),
        stack: fields.array(fields.relationship({ label: "Tool", collection: "stack" }), { label: "Tools", itemLabel: p => p.value ?? "Tool" }),
        related: fields.array(fields.relationship({ label: "Term", collection: "glossary" }), { label: "Related terms", itemLabel: p => p.value ?? "Term" }),
        deeper: fields.array(fields.relationship({ label: "Post", collection: "blog" }), { label: "Read more (posts)", itemLabel: p => p.value ?? "Post" }),
        sources: sources(1),
        published: fields.date({ label: "Published", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        lastChecked: fields.date({ label: "Last checked", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        draft: fields.checkbox({ label: "Draft", defaultValue: true }),
        body: body("Body (300–600 words, with an example)"),
      },
    }),

    releases: collection({
      label: "Release notes",
      slugField: "title",
      path: "src/content/releases/*",
      previewUrl: "/releases/{slug}",
      format: { contentField: "body" },
      entryLayout: "content",
      columns: ["title", "releasedOn"],
      schema: {
        title: fields.slug({
          name: { label: "Title (with the exact version)", validation: { length: { min: 5, max: 70 } } },
          slug: { label: "Slug", description: "<tool id>-<version>, e.g. astro-7-1" },
        }),
        seoTitle: fields.text({ label: "SEO title (optional, 60 max)", validation: { length: { max: 60 } } }),
        description: fields.text({ label: "Meta description", multiline: true, validation: { length: { min: 120, max: 170 } } }),
        tool: fields.relationship({ label: "Tool (from the Stack)", collection: "stack", validation: { isRequired: true } }),
        version: fields.text({ label: "Version", validation: { length: { min: 1 } } }),
        releasedOn: fields.date({ label: "Released on", validation: { isRequired: true } }),
        sourceUrl: fields.url({ label: "Official changelog or release page", validation: { isRequired: true } }),
        hub: fields.select({ label: "Topic hub", options: hubOptions, defaultValue: "tech-stacks" }),
        upgrade: fields.text({ label: "Should a small team upgrade now? (one line)", validation: { length: { min: 20, max: 200 } } }),
        previous: fields.relationship({ label: "Previous release note", collection: "releases" }),
        sources: sources(0),
        published: fields.date({ label: "Published", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        draft: fields.checkbox({ label: "Draft", defaultValue: true }),
        body: body("Body (200–450 words)"),
      },
    }),

    stack: collection({
      label: "Stack items",
      slugField: "name",
      path: "src/content/stack/*",
      previewUrl: "/stack#{slug}",
      format: { data: "yaml" },
      columns: ["name", "group"],
      schema: {
        name: fields.slug({ name: { label: "Name" }, slug: { label: "Anchor id", description: "Used in /stack#id links." } }),
        group: fields.select({
          label: "Group",
          options: STACK_GROUPS.map(g => ({ label: g.label, value: g.id })),
          defaultValue: "languages-frameworks",
        }),
        use: fields.text({ label: "What I use it for (one line)" }),
        url: fields.url({ label: "Official site" }),
        order: fields.integer({ label: "Order within group", defaultValue: 100 }),
        about: fields.text({
          label: "Tool page text",
          description: "Two or three paragraphs, blank line between them. The tool page (/stack/<id>) is only built once this is written.",
          multiline: true,
        }),
        hub: fields.select({ label: "Topic hub (tool page)", options: [{ label: "None", value: "" }, ...hubOptions], defaultValue: "" }),
        pricing: fields.text({ label: "Pricing, in one or two sentences" }),
        pricingSource: fields.url({ label: "Pricing source" }),
        pricingChecked: fields.date({ label: "Pricing checked on" }),
        alternatives: fields.array(fields.relationship({ label: "Tool", collection: "stack" }), { label: "Alternatives", itemLabel: p => p.value ?? "Tool" }),
        changelog: fields.url({ label: "Official changelog (watched by the release-notes task)" }),
      },
    }),
  },

  singletons: {
    now: singleton({
      label: "Now page",
      path: "src/content/pages/now",
      previewUrl: "/now",
      format: { contentField: "body" },
      entryLayout: "content",
      schema: {
        title: fields.text({ label: "Title", defaultValue: "What I'm doing now" }),
        description: fields.text({ label: "Meta description" }),
        updated: fields.date({ label: "Updated", defaultValue: { kind: "today" }, validation: { isRequired: true } }),
        body: fields.mdx({ label: "Now (5–8 lines)", extension: "md", components: {} }),
      },
    }),
  },
});
