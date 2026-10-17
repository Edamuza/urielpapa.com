import { defineCollection, reference } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import {
  FRAME_IDS,
  HUB_IDS,
  STACK_GROUP_IDS,
  SYNDICATION_NETWORKS,
} from "@/data/hubs";

/**
 * Collections follow plan/schema-and-technical.md §3. Keystatic
 * (keystatic.config.ts) writes the same fields, and these schemas are the
 * build-time "publish guard": a post that breaks an SEO rule fails the build.
 */

// Keystatic writes empty optional text fields as "" or null; treat both as absent.
const optionalText = z
  .string()
  .nullish()
  .transform(v => (v ? v : undefined));

const optionalUrl = z
  .string()
  .url()
  .or(z.literal(""))
  .nullish()
  .transform(v => (v ? v : undefined));

const optionalDate = z
  .union([z.coerce.date(), z.literal(""), z.null()])
  .optional()
  .transform(v => (v instanceof Date ? v : undefined));

const syndication = z
  .array(
    z.object({
      network: z.enum(SYNDICATION_NETWORKS),
      url: z.url(),
    })
  )
  .default([]);

const blog = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/blog" }),
  schema: ({ image }) =>
    z
      .object({
        title: z.string().max(70, "Title (H1) must be 70 characters or fewer"),
        seoTitle: z
          .string()
          .max(60, "SEO title must be 60 characters or fewer"),
        description: z
          .string()
          .min(120, "Meta description must be at least 120 characters")
          .max(170, "Meta description must be 170 characters or fewer"),
        dek: z.string(),
        hub: z.enum(HUB_IDS),
        frame: z.enum(FRAME_IDS),
        takeaways: z
          .array(z.string())
          .min(3, "Add at least 3 key takeaways")
          .max(5, "Use at most 5 key takeaways"),
        businessImpact: z.array(z.string()).max(4).default([]),
        sourceUrl: optionalUrl,
        published: z.coerce.date(),
        updated: optionalDate,
        updateNote: optionalText,
        related: z.array(reference("blog")).max(2).default([]),
        projects: z.array(reference("projects")).default([]),
        stack: z.array(reference("stack")).max(6).default([]),
        faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
        hero: image().optional().nullable(),
        heroAlt: optionalText,
        // Keystatic always writes the event object; an empty name means "not an event note".
        event: z.preprocess(
          v =>
            v && typeof v === "object" && "name" in v && v.name ? v : undefined,
          z
            .object({
              name: z.string(),
              startDate: z.string(),
              endDate: optionalText,
              venue: optionalText,
              city: optionalText,
              organizer: optionalText,
              url: optionalUrl,
            })
            .optional()
        ),
        syndication,
        draft: z.boolean().default(false),
      })
      .refine(d => !d.hero || d.heroAlt, {
        message: "The hero image needs alt text",
        path: ["heroAlt"],
      })
      .refine(d => d.frame !== "news-take" || d.sourceUrl, {
        message: "A news take needs the source URL of the announcement",
        path: ["sourceUrl"],
      })
      .refine(d => d.frame !== "event-note" || d.event, {
        message: "An event note needs the event details",
        path: ["event"],
      }),
});

const notes = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/notes" }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(50).max(170),
    hub: z.enum(HUB_IDS),
    published: z.coerce.date(),
    related: reference("blog").nullish(),
    syndication,
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/projects",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(80).max(170),
    summary: z.string(),
    outcome: z.string(),
    period: z.string(),
    year: z.number(),
    role: z.string(),
    team: optionalText,
    status: z.string(),
    kind: z.enum(["SoftwareApplication", "CreativeWork"]),
    liveUrl: optionalUrl,
    stack: z.array(reference("stack")).default([]),
    hubs: z.array(z.enum(HUB_IDS)).default([]),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

const hubs = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/hubs" }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().max(60),
    description: z.string().min(120).max(170),
    summary: z.string(),
    order: z.number(),
    startHere: z
      .array(z.object({ post: reference("blog"), reason: z.string() }))
      .max(3)
      .default([]),
  }),
});

const stack = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/content/stack" }),
  schema: z.object({
    name: z.string(),
    group: z.enum(STACK_GROUP_IDS),
    use: z.string(),
    url: optionalUrl,
    order: z.number().default(100),
  }),
});

const newsletter = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.{md,mdx}",
    base: "./src/content/newsletter",
  }),
  schema: z.object({
    title: z.string().max(70),
    description: z.string().min(50).max(170),
    published: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated: z.coerce.date(),
  }),
});

export const collections = {
  blog,
  notes,
  projects,
  hubs,
  stack,
  newsletter,
  pages,
};
