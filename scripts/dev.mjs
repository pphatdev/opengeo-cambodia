/**
 * `pnpm dev` — runs the API and the web app together, both with live reload:
 *   [api]  tsx watch src/index.ts   → http://localhost:3000  (restarts on src/ changes)
 *   [web]  vite web                 → http://localhost:5173  (hot reload on web/ changes, proxies /api to :3000)
 *
 * Open the web URL while developing. Port 3000 only serves the last `pnpm build:web` output.
 * Ctrl+C stops both. No extra dependency (e.g. concurrently) needed.
 */
import { spawn } from "node:child_process";

const isWin = process.platform === "win32";
// Fixed command strings (no user input), run through a shell so the pnpm shim resolves on Windows
const tasks = [
    { name: "api", color: "\x1b[36m", command: "pnpm exec tsx watch src/index.ts" },
    { name: "web", color: "\x1b[35m", command: "pnpm exec vite web" },
];

const children = [];
let shuttingDown = false;

function prefix(name, color, chunk, stream) {
    for (const line of chunk.toString().split(/\r?\n/)) {
        if (line.trim()) stream.write(`${color}[${name}]\x1b[0m ${line}\n`);
    }
}

function stopAll(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const child of children) {
        if (child.exitCode !== null) continue;
        // On Windows the pnpm shim spawns a process tree; taskkill /T stops all of it
        if (isWin) spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        else child.kill("SIGTERM");
    }
    setTimeout(() => process.exit(code), 300);
}

for (const task of tasks) {
    const child = spawn(task.command, { shell: true, env: { ...process.env, FORCE_COLOR: "1" } });
    child.stdout.on("data", (d) => prefix(task.name, task.color, d, process.stdout));
    child.stderr.on("data", (d) => prefix(task.name, task.color, d, process.stderr));
    child.on("exit", (code) => {
        if (!shuttingDown) {
            console.error(`${task.color}[${task.name}]\x1b[0m exited with code ${code}; stopping the other process.`);
            stopAll(code ?? 1);
        }
    });
    children.push(child);
}

console.log("\n  Dev servers starting — open \x1b[1mhttp://localhost:5173\x1b[0m (web, live reload). API: http://localhost:3000\n");

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
