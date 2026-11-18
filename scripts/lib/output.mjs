// Where `astro build` puts the static site, which depends on the deploy target.
// DEPLOY_TARGET=vps builds for the Node adapter (dist/client, served by Nginx on
// the VPS); anything else builds for Vercel (.vercel/output/static).
// Run directly, it prints the directory, for shell use in package.json.
import { argv } from "node:process";
import { fileURLToPath } from "node:url";

export const VPS = process.env.DEPLOY_TARGET === "vps";
export const STATIC_DIR = VPS ? "dist/client" : ".vercel/output/static";

if (argv[1] === fileURLToPath(import.meta.url)) console.log(STATIC_DIR); // eslint-disable-line no-console
