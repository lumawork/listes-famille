import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
await mkdir("assets", { recursive: true });
await build({
  entryPoints: ["src/main.tsx"],
  outfile: "assets/app.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome100", "safari16"],
  minify: true,
  legalComments: "linked",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
});
console.log("Notre Maison: assets/app.js reconstruit. Aucun déploiement.");
