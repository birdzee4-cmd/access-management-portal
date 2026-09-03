import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";

if (!existsSync(".env")) {
  throw new Error(
    "Local .env was not found. Copy .env.example to .env and enter the untracked local Entra values.",
  );
}

loadEnvFile(".env");

const npmCli = process.env.npm_execpath;
const command = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const args = npmCli
  ? [npmCli, "run", "start", "-w", "@access-portal/api"]
  : ["run", "start", "-w", "@access-portal/api"];

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
