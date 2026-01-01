import { spawn } from "bun";
import { join } from "path";

const BACKEND_DIR = join(process.cwd(), "packages/backend");
const FRONTEND_DIR = join(process.cwd(), "packages/frontend");
const BACKEND_PORT = 4000;
const FRONTEND_PORT = 3000;

console.log("🚀 Starting Plexus Dev Stack...");

// 1. Start Backend in Watch Mode
const backend = spawn(["bun", "run", "--watch", "src/index.ts"], {
  cwd: BACKEND_DIR,
  env: { ...process.env, PORT: BACKEND_PORT.toString() },
  stdout: "inherit",
  stderr: "inherit",
});

// 2. Start Frontend Server (delegated to package script)
console.log("🌐 [Frontend] Starting Dev Server (Port 3000)...");
const frontend = spawn(["bun", "run", "dev-server.ts"], {
  cwd: FRONTEND_DIR,
  stdout: "inherit",
  stderr: "inherit",
});

console.log(`👀 Watching for changes...`);

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping...");
  backend.kill();
  frontend.kill();
  process.exit(0);
});