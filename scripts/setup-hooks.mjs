import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "inherit"
  });

  console.log("Git hooks path configured to .githooks");
} catch (error) {
  console.error("Unable to configure core.hooksPath");
  process.exit(error.status ?? 1);
}
