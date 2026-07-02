import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { remarkHeading, remarkStructure } from "fumadocs-core/mdx-plugins";

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkHeading, remarkStructure],
  },
});
