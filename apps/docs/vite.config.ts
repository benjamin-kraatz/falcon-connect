import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import mdx from "fumadocs-mdx/vite";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

/** Relative MDX links like `./FC-SEC-008-...` resolve under the current page and produce bogus nested URLs during prerender crawl (404). Prefer root-relative hrefs, e.g. `/docs/reviews/.../FC-SEC-008-...`. */
function isBogusNestedReviewLink(path: string): boolean {
  return /\/FC-SEC-[^/]+\/FC-SEC-[^/]+/.test(path);
}

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    mdx(await import("./source.config")),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        filter: (page) => !isBogusNestedReviewLink(page.path),
      },
    }),
    react(),
    // please see https://tanstack.com/start/latest/docs/framework/react/guide/hosting#nitro for guides on hosting
    nitro({
      preset: "vercel",
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      tslib: "tslib/tslib.es6.js",
    },
  },
});
