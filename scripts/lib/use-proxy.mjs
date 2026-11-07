// Node's fetch ignores HTTPS_PROXY unless NODE_USE_ENV_PROXY is set when Node
// starts. Cloud sessions reach the internet only through that proxy, so a script
// that imports this first re-runs itself once with the variable set.
import { spawnSync } from "node:child_process";

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const run = spawnSync(process.execPath, process.argv.slice(1), {
    stdio: "inherit",
    env: { ...process.env, NODE_USE_ENV_PROXY: "1", NODE_NO_WARNINGS: "1" },
  });
  process.exit(run.status ?? 1);
}
