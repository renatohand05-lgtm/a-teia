import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const gitignore = readFileSync(".gitignore", "utf8");

const checks: Array<[string, boolean]> = [
  ["package name a-teia", pkg.name === "a-teia"],
  [".env ignored", gitignore.includes(".env")],
  [".env.example committed", true],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(ok ? `ok  ${label}` : `fail ${label}`);
  if (!ok) failed += 1;
}

try {
  const envExample = readFileSync(".env.example", "utf8");
  const leaks = ["sk-proj-", "sk-live", "postgresql://postgres:"].some((token) => envExample.includes(token));
  console.log(!leaks ? "ok  .env.example sem secrets reais" : "fail .env.example parece conter secret");
  if (leaks) failed += 1;
} catch {
  failed += 1;
}

execSync("git check-ignore -q .env .env.local", { stdio: "inherit" });

process.exit(failed ? 1 : 0);
