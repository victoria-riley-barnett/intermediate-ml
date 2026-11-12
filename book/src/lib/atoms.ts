// Atoms are HTML fragments emitted by the course tooling
// (teaching/411/admin/diagrams/tools/emit_atoms.py). Never edit them here.
const fragments = import.meta.glob('/src/atoms/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface AtomData {
  name: string;
  html: string;
}

export const ATOMS_SLUG = 'atoms';

export const atoms: AtomData[] = Object.entries(fragments)
  .map(([path, html]) => ({ name: path.replace(/^.*\//, '').replace(/\.html$/, ''), html }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const findAtom = (name: string) => atoms.find((a) => a.name === name);
