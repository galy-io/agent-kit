#!/usr/bin/env node
// bg-statusline — the work in progress, on the row under the prompt.
//
// Prints one line naming the specs being coded and the briefs cleared for a spec,
// each one a clickable link into the workspace that owns it. Nothing here is
// specific to one workspace: the address and the token are resolved the way the
// `bg` CLI resolves them, so the same script serves every B.Galy account.
//
//   node bg-statusline.mjs             render (reads a cache, never the network)
//   node bg-statusline.mjs --install   wire it into the harness, keeping any status line already there
//   node bg-statusline.mjs --uninstall put back what was there before
//   node bg-statusline.mjs --refresh   fill the cache (what --install schedules, detached)
//
// Why the cache. A status line runs on a 300ms debounce, and a workstation
// running ten sessions runs ten of them. The quota that would break first is per
// address, not per session — so the render path never speaks to the network, and
// one detached refresh per TTL serves every session on the machine. The stamp is
// claimed BEFORE the refresh is spawned: nine sessions then skip instead of
// piling onto the same address at the same instant.

import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const HOME = homedir();
// The harness's own folder can be moved, and the kit's setup already honours the variable
// that moves it. Writing to ~/.claude regardless would install the row into a folder the
// harness does not read — and say it succeeded.
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
const CACHE_DIR = join(tmpdir(), "bg-statusline");
const CACHE = join(CACHE_DIR, "work");
const STAMP = join(CACHE_DIR, "work.stamp");
const CONFIG = join(CLAUDE_DIR, "bg-statusline.json");
const SHIM = join(CLAUDE_DIR, "bg-statusline.mjs");
const SETTINGS = join(CLAUDE_DIR, "settings.json");
const TTL_MS = 180_000;

const ESC = "\x1b";
const DIM = `${ESC}[0;90m`;
const TEXT = `${ESC}[0;36m`;
const RESET = `${ESC}[0m`;

// ── Credentials ───────────────────────────────────────────────────────────
// Same order as the `bg` CLI, then one fallback it does not need: a workspace
// connected through the harness alone has no `.bg/config.json` on disk, and its
// token lives in the harness's own registration. Reading it there is what makes
// the line work on a machine where nobody ran a setup script.
const CONFIG_DIRS = [".bg", ".galy"];

// A git worktree is a directory of its own, and neither the config file nor the
// harness's registration follows it there: both were written where the repository
// was first connected. So the search covers the ancestors of the working
// directory AND the ancestors of the main checkout this worktree belongs to.
function mainCheckout(dir) {
  try {
    const marker = readFileSync(join(dir, ".git"), "utf8");   // a directory here means we ARE the main checkout
    const gitdir = /^gitdir:\s*(.+)$/m.exec(marker)?.[1]?.trim();
    if (!gitdir || !/[\\/]worktrees[\\/]/.test(gitdir)) return null;
    const cut = gitdir.replace(/\\/g, "/").lastIndexOf("/.git/");
    return cut === -1 ? null : resolve(gitdir.replace(/\\/g, "/").slice(0, cut));
  } catch { return null; }
}

function searchPath(startDir) {
  const dirs = [];
  const climb = (from) => {
    let dir = resolve(from);
    for (;;) {
      if (!dirs.includes(dir)) dirs.push(dir);
      const parent = dirname(dir);
      if (parent === dir) return;
      dir = parent;
    }
  };
  const start = resolve(startDir || process.cwd());
  climb(start);
  const main = mainCheckout(start);
  if (main) climb(main);
  return dirs;
}

function fromConfigFile(dirs) {
  for (const dir of dirs) {
    for (const folder of CONFIG_DIRS) {
      const candidate = join(dir, folder, "config.json");
      if (existsSync(candidate)) {
        try { return JSON.parse(readFileSync(candidate, "utf8")); } catch { return {}; }
      }
    }
  }
  return {};
}

// The harness records one MCP server per project. Only a project on our search
// path is ours: picking any other one would put a different workspace's queue on
// this row, which is worse than an empty row — someone would read it as theirs.
function fromHarness(dirs) {
  const path = [join(CLAUDE_DIR, ".claude.json"), join(HOME, ".claude.json")].find((p) => existsSync(p));
  if (!path) return {};
  let root;
  try { root = JSON.parse(readFileSync(path, "utf8")); } catch { return {}; }
  const pick = (servers) => {
    if (!servers) return null;
    for (const name of ["bg", "galy", ...Object.keys(servers)]) {
      const server = servers[name];
      const url = server?.url;
      const auth = server?.headers?.Authorization || server?.headers?.authorization;
      if (url && /\/mcp\/?$/i.test(url) && auth) {
        return { endpoint: url, token: String(auth).replace(/^Bearer\s+/i, "") };
      }
    }
    return null;
  };
  const projects = root.projects || {};
  for (const dir of dirs) {
    const entry = projects[dir] || projects[dir.replace(/\\/g, "/")];
    const found = pick(entry?.mcpServers);
    if (found) return found;
  }
  return pick(root.mcpServers) || {};
}

function credentials(cwd) {
  const dirs = searchPath(cwd);
  const file = fromConfigFile(dirs);
  const harness = fromHarness(dirs);
  const endpoint = process.env.GALY_ENDPOINT || file.endpoint || harness.endpoint;
  const token = process.env.GALY_TOKEN || file.token || harness.token;
  if (!endpoint || !token) return null;
  // Tolerate either form: the CLI stores the base, the harness stores the /mcp url.
  return { base: endpoint.replace(/\/+$/, "").replace(/\/mcp$/i, ""), token };
}

// ── The workspace ─────────────────────────────────────────────────────────
async function call(base, token, tool, args) {
  const response = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: args } }),
  });
  let body = await response.text();
  // Streamable HTTP answers as an event stream even for a single result.
  for (const line of body.split(/\r?\n/)) {
    if (line.startsWith("data: ")) { body = line.slice(6); break; }
  }
  const envelope = JSON.parse(body);
  if (envelope.error) throw new Error(envelope.error.message || "mcp error");
  return JSON.parse(envelope.result.content[0].text);
}

// ── Rendering ─────────────────────────────────────────────────────────────
// A title is written to be read on a page, where there is room for the whole
// sentence. On this row there is room for the name, so keep what comes before the
// first break — "Profil : identité récoltée, photo détenue" is Profil.
function shortName(title, limit) {
  const head = String(title || "").split(/\s+[—–:|·]\s+|,\s+/)[0].trim() || String(title || "").trim();
  if (head.length <= limit) return head;
  return head.slice(0, Math.max(1, limit - 1)).trimEnd() + "…";
}

function link(url, text) {
  return `${ESC}]8;;${url}${ESC}\\${TEXT}${text}${RESET}${ESC}]8;;${ESC}\\`;
}

// The row has one budget, not one per group. Items are taken in turn — a spec,
// a brief, a spec — so a long list on one side never spends the whole row and
// leaves the other side showing nothing but a count.
function measure(groups) {
  let width = 2;                                        // "bg"
  for (const { label, items, taken } of groups) {
    if (!taken.length) continue;
    const dropped = items.length - taken.length;
    width += 2 + label.length + 1;                      // separator, label, space
    width += taken.reduce((sum, name) => sum + name.length, 0) + (taken.length - 1) * 3;
    if (dropped) width += 2 + String(dropped).length;
  }
  return width;
}

function render(base, specs, briefs) {
  const budget = Number(process.env.BG_STATUSLINE_WIDTH || 110);
  const groups = [
    { label: "spec", path: "specs", items: specs, taken: [], ids: [] },
    { label: "brief", path: "briefs", items: briefs, taken: [], ids: [] },
  ];
  for (let rank = 0; groups.some((g) => rank < g.items.length); rank += 1) {
    for (const group of groups) {
      const item = group.items[rank];
      if (!item) continue;
      const name = shortName(item.title, 28);
      group.taken.push(name);
      group.ids.push(item.id);
      if (measure(groups) > budget) {                   // it did not fit: count it instead
        group.taken.pop();
        group.ids.pop();
      }
    }
  }
  const segments = groups.filter((g) => g.taken.length).map((g) => {
    const parts = g.taken.map((name, i) => link(`${base}/${g.path}/${g.ids[i]}`, name));
    const dropped = g.items.length - g.taken.length;
    const more = dropped ? ` ${DIM}+${dropped}${RESET}` : "";
    return `${DIM}${g.label}${RESET} ${parts.join(` ${DIM}·${RESET} `)}${more}`;
  });
  return segments.length ? `${DIM}bg${RESET} ` + segments.join(`  ${DIM}|${RESET}  `) : "";
}

// ── Modes ─────────────────────────────────────────────────────────────────
async function refresh(cwd) {
  const creds = credentials(cwd);
  if (!creds) return 1;
  const [specs, briefs] = await Promise.all([
    call(creds.base, creds.token, "feature_spec_list", { status: "InProgress" }),
    call(creds.base, creds.token, "feature_brief_list", { status: "Ready" }),
  ]);
  const line = render(creds.base, specs.specs || [], briefs.briefs || []);
  mkdirSync(CACHE_DIR, { recursive: true });
  // Atomic: a status line may read this at any instant, and the harness cancels
  // an in-flight status line script — a half-written cache would be shown as is.
  const temporary = `${CACHE}.${process.pid}`;
  writeFileSync(temporary, line, "utf8");
  renameSync(temporary, CACHE);
  return 0;
}

function stale() {
  try { return Date.now() - statSync(STAMP).mtimeMs >= TTL_MS; } catch { return true; }
}

function scheduleRefresh(cwd) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(STAMP, "");   // claimed before the spawn, not after it
    spawn(process.execPath, [SELF, "--refresh"], {
      cwd: cwd && existsSync(cwd) ? cwd : undefined,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
  } catch { /* a status line never reports its own failures */ }
}

function chained(command, input) {
  if (!command) return "";
  try {
    const shell = process.platform === "win32" ? process.env.COMSPEC || "cmd.exe" : "/bin/sh";
    const args = process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command];
    return execFileSync(shell, args, { input, encoding: "utf8", timeout: 5000, windowsHide: true }).replace(/\s+$/, "");
  } catch { return ""; }
}

function readConfig() {
  try { return JSON.parse(readFileSync(CONFIG, "utf8")); } catch { return {}; }
}

async function main() {
  const input = await new Promise((done) => {
    let data = "";
    if (process.stdin.isTTY) return done("");
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => done(data));
    process.stdin.on("error", () => done(""));
  });
  let session = {};
  try { session = JSON.parse(input); } catch { /* rendering does not need it */ }
  const cwd = session.cwd || session.workspace?.current_dir || process.cwd();

  if (stale()) scheduleRefresh(cwd);

  const above = chained(readConfig().chain, input);
  let line = "";
  try { line = readFileSync(CACHE, "utf8"); } catch { /* first run */ }

  const rows = [above, line].filter((row) => row && row.trim());
  if (rows.length) process.stdout.write(rows.join("\n"));
}

// ── Installation ──────────────────────────────────────────────────────────
// The harness reads `statusLine` and `footerLinksRegexes` from user settings only,
// so installing means editing that file — carefully: a status line already there
// is someone's work, and it is kept, chained above ours rather than replaced.
function shimSource() {
  return `#!/usr/bin/env node
// Installed by bg --install. Finds the kit's current status line script and runs it,
// so a plugin update — which changes the folder's name — does not break the row.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";

const roots = [];
const plugins = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "plugins");
const walk = (dir, depth) => {
  if (depth < 0 || !existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const here = join(dir, entry.name);
    const candidate = join(here, "statusline", "bg-statusline.mjs");
    if (existsSync(candidate)) roots.push(candidate);
    walk(here, depth - 1);
  }
};
walk(join(plugins, "marketplaces"), 3);
walk(join(plugins, "cache"), 4);
const script = process.env.BG_STATUSLINE_SCRIPT
  || roots.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (script) await import(pathToFileURL(script).href);   // a home folder can hold an accent
`;
}

function install() {
  const creds = credentials(process.cwd());
  if (!creds) {
    process.stderr.write("No workspace. Run bg:connect first, or set GALY_ENDPOINT and GALY_TOKEN.\n");
    return 1;
  }
  mkdirSync(dirname(SHIM), { recursive: true });
  writeFileSync(SHIM, shimSource(), "utf8");

  let settings = {};
  if (existsSync(SETTINGS)) {
    writeFileSync(`${SETTINGS}.bg-backup`, readFileSync(SETTINGS));
    settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
  }
  const ours = `node "${SHIM}"`;
  const previous = settings.statusLine?.command;
  const config = readConfig();
  if (previous && previous !== ours && !previous.includes("bg-statusline")) {
    config.chain = previous;                       // kept, and printed above our row
  }
  writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n", "utf8");
  settings.statusLine = { ...(settings.statusLine || {}), type: "command", command: ours };

  // Badges on the footer row, for an id that goes past in the conversation. The
  // harness renders at most five and drops the oldest, so two patterns is the budget.
  const mine = new Set([`${creds.base}/briefs/{id}`, `${creds.base}/specs/{id}`]);
  settings.footerLinksRegexes = [
    ...(settings.footerLinksRegexes || []).filter((entry) => !mine.has(entry?.url)),
    { type: "regex", pattern: "\\b[Bb]riefs?\\s+#?(?<id>\\d{1,5})\\b", url: `${creds.base}/briefs/{id}`, label: "brief {id}" },
    { type: "regex", pattern: "\\b[Ss]pecs?\\s+#?(?<id>\\d{1,5})\\b", url: `${creds.base}/specs/{id}`, label: "spec {id}" },
  ];
  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n", "utf8");
  process.stdout.write(`Status line installed for ${creds.base}.${config.chain ? " Your previous status line is kept, above it." : ""}\n`);
  return 0;
}

function uninstall() {
  if (!existsSync(SETTINGS)) return 0;
  const settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
  const config = readConfig();
  if (config.chain) settings.statusLine = { type: "command", command: config.chain };
  else delete settings.statusLine;
  if (settings.footerLinksRegexes) {
    settings.footerLinksRegexes = settings.footerLinksRegexes.filter((e) => !/\/(briefs|specs)\/\{id\}$/.test(e?.url || ""));
    if (!settings.footerLinksRegexes.length) delete settings.footerLinksRegexes;
  }
  writeFileSync(SETTINGS, JSON.stringify(settings, null, 2) + "\n", "utf8");
  for (const path of [SHIM, CONFIG, CACHE, STAMP]) { try { unlinkSync(path); } catch { /* already gone */ } }
  process.stdout.write("Status line removed.\n");
  return 0;
}

const mode = process.argv[2];
try {
  if (mode === "--install") process.exit(install());
  else if (mode === "--uninstall") process.exit(uninstall());
  // Never process.exit() after a fetch on Windows: the socket is still closing,
  // and libuv asserts on a handle it is already tearing down. Setting the code and
  // letting the loop drain costs a detached process a few idle seconds, nothing more.
  else if (mode === "--refresh") process.exitCode = await refresh(process.cwd());
  else await main();
} catch (error) {
  // A status line that reports its own failure spends the row on itself. It stays
  // silent and keeps the previous cache; an install, which was asked for, speaks.
  if (mode === "--install" || mode === "--uninstall") {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
  process.exitCode = 0;
}
