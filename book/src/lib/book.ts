import { getCollection, type CollectionEntry } from 'astro:content';

export type Chapter = CollectionEntry<'chapters'>;
export type Page = CollectionEntry<'pages'>;

export const url = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
export const pageUrl = (slug: string) => url(`p/${slug}/`);
export const chapterUrl = (slug: string) => url(`${slug}/`);

const composed = (body = '') => [...body.matchAll(/<Page\s+name="([^"]+)"/g)].map((m) => m[1]);
const refs = (body = '') => [...body.matchAll(/<Ref\s+to="([^"]+)"/g)].map((m) => m[1]);

/** Chapters in reading order. Drafts show in development only. */
export async function chapters(): Promise<Chapter[]> {
  const visible = (c: Chapter) => import.meta.env.DEV || !c.data.draft;
  return (await getCollection('chapters', visible)).sort((a, b) => a.data.order - b.data.order);
}

/** Pages that exist on the site: all of them in development, otherwise those a published chapter composes. */
export async function pages(): Promise<Page[]> {
  const all = await getCollection('pages');
  const live = import.meta.env.DEV ? null : new Set((await chapters()).flatMap((c) => composed(c.body)));
  return all.filter((p) => !live || live.has(p.id)).sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export async function isLive(slug: string) {
  return (await pages()).some((p) => p.id === slug);
}

/** Where a page is composed (chapters) and where it is linked from (pages and chapters). */
export async function backlinks(slug: string) {
  const [cs, ps] = [await chapters(), await pages()];
  return {
    composedIn: cs.filter((c) => composed(c.body).includes(slug)),
    linkedFrom: [
      ...ps.filter((p) => p.id !== slug && refs(p.body).includes(slug)),
      ...cs.filter((c) => refs(c.body).includes(slug)),
    ],
  };
}
