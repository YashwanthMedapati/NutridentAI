import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vitestBin = path.join(root, "node_modules", "vitest", "vitest.mjs");
const storageFile = path.join(root, ".vitest-localstorage");
const existingNodeOptions = process.env.NODE_OPTIONS || "";
const nodeOptions = `${existingNodeOptions} --localstorage-file=${storageFile}`.trim();

const child = spawn(
  process.execPath,
  ["--no-warnings", vitestBin, "run", "--environment", "jsdom"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
    },
  },
);

child.on("exit", code => {
  process.exit(code ?? 1);
});
