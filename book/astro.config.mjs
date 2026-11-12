import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Served from GitHub Pages at /intermediate-ml/. BASE overrides it for a root deploy.
export default defineConfig({
  site: 'https://victoria-riley-barnett.github.io',
  base: process.env.BASE ?? '/intermediate-ml/',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  markdown: { processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }) },
  integrations: [mdx()],
});
