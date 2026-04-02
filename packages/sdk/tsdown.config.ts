import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "effect/index": "src/effect/index.ts",
  },
  format: "esm",
  platform: "node",
  fixedExtension: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  dts: true,
  deps: {
    neverBundle: ["effect", "effect/ParseResult", "zod", "jose"],
  },
});
