import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A chapter is a reading order: prose that composes pages and atoms by name.
const chapters = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/chapters' }),
  schema: z.object({
    title: z.string(),
    number: z.union([z.string(), z.number()]),
    order: z.number(),
    description: z.string(),
    draft: z.boolean().default(true),
  }),
});

// A page is one reference entry: one idea, short enough to be composed into
// any chapter that needs it, and linked from anywhere it is mentioned. A page has
// no draft flag of its own: it is published when a published chapter composes it.
const pages = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    frame: z.enum(['representation', 'transformation', 'evidence']).optional(),
  }),
});

export const collections = { chapters, pages };
