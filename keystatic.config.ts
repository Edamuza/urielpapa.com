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
      text: fields.text({ label: "Post text, exactly as posted", multiline: true }),
    },
  }),
};

const body = (label = "Body") =>
  fields.mdx({
    label,
    components: mdxComponents,
    options: {
      image: { directory: "src/assets/images/content", publicPath: "../../assets/images/content/" },
    },
  });

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
        heroAlt: fields.text({ label: "Hero image alt text", description: "Required when there is a hero image." }),
        event: fields.object(
          {
            name: fields.text({ label: "Event name" }),
            startDate: fields.text({ label: "Start date", description: "YYYY-MM or YYYY-MM-DD" }),
            endDate: fields.text({ label: "End date" }),
            venue: fields.text({ label: "Venue" }),
            city: fields.text({ label: "City" }),
            organizer: fields.text({ label: "Organizer" }),
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
        draft: fields.checkbox({ label: "Draft", defaultValue: false }),
        body: body("Case study"),
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
