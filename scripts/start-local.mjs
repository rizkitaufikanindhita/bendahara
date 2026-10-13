import { copyFileSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = path.join(root, "dist", "server", "wrangler.json");
if (!existsSync(config)) { console.error("Jalankan npm run build terlebih dahulu."); process.exit(1); }
const localSecret = path.join(root, ".dev.vars");
if (!existsSync(localSecret)) { console.error("Buat .dev.vars berisi SESSION_SECRET minimal 32 karakter."); process.exit(1); }
copyFileSync(localSecret, path.join(root, "dist", "server", ".dev.vars"));
const child = spawn(process.execPath, ["--import", "./scripts/sites-env.mjs", "./node_modules/wrangler/bin/wrangler.js", "dev", "--config", "dist/server/wrangler.json", "--local", "--persist-to", ".wrangler/state", "--ip", "127.0.0.1", "--inspector-port", "0", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 1));
