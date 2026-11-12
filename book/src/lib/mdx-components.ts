import Atom from '../components/Atom.astro';
import Page from '../components/Page.astro';
import Ref from '../components/Ref.astro';
import Side from '../components/Side.astro';

/**
 * Components available to every .mdx entry without an explicit import.
 * Pass this to `<Content components={...} />` wherever content is rendered.
 */
export const mdxComponents = { Atom, Page, Ref, Side };
