#!/usr/bin/env node
// galy-setup — one-command onboarding for the Galy Agent Kit.
//
//   npx -y github:galy-io/agent-kit <token> --endpoint https://<your-workspace>.galy.cloud
//
// Does four things, in order, each best-effort with a clear message on failure:
//   a) installs the plugin via the Claude CLI (marketplace add + install), or prints
//      manual steps if `claude` isn't on PATH;
//   b) registers the Galy MCP endpoint for THIS project, with the address and the token
//      written literally into the local scope — so the connection does not depend on an
//      environment variable that only one launcher knows how to set;
//   c) writes .galy/config.json { endpoint, token } for the `galy` CLI, and makes sure the
//      whole .galy/ directory is gitignored — neither the token nor the workflow mirror, which
//      carries a consent decision, ever lands in a committable file;
//   d) smoke-tests the endpoint (GET /api/pm/search?q=ping) with the token.
//
// Why the local scope and not an env var. The kit used to ship a .mcp.json holding one
// hardcoded address and `Bearer ${GALY_TOKEN}`. Galy is multi-tenant: every workspace
// answers on its own host, so a single baked-in address authenticates nobody, and the
// env var left the token to be persisted by hand — on Windows that meant `setx`, which
// writes it in clear into the user's registry. `claude mcp add --scope local` stores both
// values outside the repository, keyed to this project, with nothing to export and
// nothing to commit.
//
// Zero dependencies. Node 18+ (global fetch, spawnSync).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const MARKETPLACE = "galy-io/agent-kit";
// The whole directory, not just config.json. `.galy/` also holds workflow-defaults.json, which
// now carries a consent decision — whether the end of an onboarding sends a retrospective back
// to Galy. A per-file ignore left that one tracked, so one developer's answer would have been
// committed and applied to everyone who cloned. Ignoring the directory is the only version of
// this that stays correct as the directory grows.
const GITIGNORE_LINE = ".galy/";

// How the Claude CLI is spelled depends on how it was installed, and guessing wrong is not a
// loud failure: the two steps that matter — installing the plugin and registering the MCP
// endpoint — were silently skipped, and the client was left with a config file and nothing
// connected. The native installer ships `claude.exe`; an npm install ships `claude.cmd`, which
// recent Node refuses to spawn without a shell (EINVAL). So we try, in order, and remember what
// answered.
const CANDIDATES = process.platform === "win32"
  ? [{ cmd: "claude.exe" }, { cmd: "claude" }, { cmd: "claude.cmd", shell: true }]
  : [{ cmd: "claude" }];

let resolved;

/** The first spelling that answers `--version`, or null when the CLI is genuinely absent. */
function claudeCli() {
  if (resolved !== undefined) return resolved;
  for (const candidate of CANDIDATES) {
    const probe = spawnSync(candidate.cmd, ["--version"], { encoding: "utf8", shell: candidate.shell });
    if (!probe.error && probe.status === 0) {
      resolved = candidate;
      return resolved;
    }
  }
  resolved = null;
  return resolved;
}

function runClaude(args, options = {}) {
  const cli = claudeCli();
  if (cli === null) return { status: 1, error: new Error("claude not found") };
  return spawnSync(cli.cmd, args, { shell: cli.shell, ...options });
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--endpoint") { out.endpoint = argv[++i]; }
    else if (a === "-h" || a === "--help") { out.help = true; }
    else out._.push(a);
  }
  return out;
}

function fail(msg) { console.error(`\n✗ ${msg}\n`); process.exit(1); }
function step(msg) { console.log(`\n• ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }
function warn(msg) { console.log(`  ! ${msg}`); }

const HELP = `galy-setup — connect your agent to your Galy workspace

  npx -y github:galy-io/agent-kit <token> --endpoint https://<your-workspace>.galy.cloud

  <token>       your Galy API token
  --endpoint    the address of your workspace

Both are on one page in Galy: Settings → Connect your assistant. It prints this exact
command, address already filled in — copy it from there rather than typing it.

Galy never sees your code. This connects your assistant to your Galy workspace —
it does not give Galy access to your repository.`;

// (a) Install the plugin through the Claude CLI, if present.
function installPlugin(haveClaude) {
  step("Installing the Galy plugin via the Claude CLI");
  if (!haveClaude) {
    warn("`claude` not found on PATH — skipping the automatic install.");
    console.log("    Install it yourself later with:");
    console.log(`      claude plugin marketplace add ${MARKETPLACE}`);
    console.log("      claude plugin install galy");
    return;
  }
  const run = (args) => runClaude(args, { stdio: "inherit" }).status === 0;
  if (run(["plugin", "marketplace", "add", MARKETPLACE]) && run(["plugin", "install", "galy"])) {
    ok("plugin installed.");
  } else {
    warn("the Claude CLI reported an error — finish the install by hand:");
    console.log(`      claude plugin marketplace add ${MARKETPLACE}`);
    console.log("      claude plugin install galy");
  }
}

// (b) Register the MCP endpoint for this project, with literal values.
function registerMcp(haveClaude, endpoint, token) {
  step("Registering the Galy MCP endpoint for this project");
  const url = `${endpoint}/mcp`;

  if (!haveClaude) {
    warn("`claude` not found on PATH — register it yourself once it is installed:");
    console.log(`      claude mcp add --scope local galy --transport http ${url} \\`);
    console.log(`        --header "Authorization: Bearer <your-token>"`);
    return;
  }

  // Re-running setup with a fresh token must replace the old entry, not collide with it.
  runClaude(["mcp", "remove", "galy", "-s", "local"], { encoding: "utf8" });

  const added = runClaude([
    "mcp", "add", "--scope", "local", "galy",
    "--transport", "http", url,
    "--header", `Authorization: Bearer ${token}`,
  ], { encoding: "utf8" });

  if (added.status !== 0) {
    warn(`the Claude CLI refused the registration: ${(added.stderr || added.stdout || "").trim().slice(0, 200)}`);
    console.log("    Register it by hand:");
    console.log(`      claude mcp add --scope local galy --transport http ${url} \\`);
    console.log(`        --header "Authorization: Bearer <your-token>"`);
    return;
  }
  ok(`galy → ${url} (local scope: this project only, nothing committed).`);

  // A second definition of the same name is the failure that looks like nothing: the local
  // one wins, and whichever the user thought they were editing sits there being ignored.
  const projectConfig = join(process.cwd(), ".mcp.json");
  if (existsSync(projectConfig)) {
    try {
      const parsed = JSON.parse(readFileSync(projectConfig, "utf8"));
      if (parsed?.mcpServers?.galy) {
        warn(".mcp.json also declares a server named `galy`. The local one now wins.");
        console.log("    Keep one of the two:  claude mcp remove galy -s project");
      }
    } catch { /* an unreadable .mcp.json is not this command's problem */ }
  }
}

// (c) Write .galy/config.json for the CLI, and make sure it is gitignored.
function writeConfig(endpoint, token) {
  step("Writing local config for the `galy` CLI");
  const dir = join(process.cwd(), ".galy");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify({ endpoint, token }, null, 2) + "\n", "utf8");
  ok(`${path}`);

  const gitignore = join(process.cwd(), ".gitignore");
  const hasGit = existsSync(join(process.cwd(), ".git"));
  if (existsSync(gitignore)) {
    const body = readFileSync(gitignore, "utf8");
    // Only a directory-wide rule counts. An older `.galy/config.json` line is NOT enough: it
    // leaves every other file in there tracked, which is how the mirror would get committed.
    const ignored = body.split(/\r?\n/).some((l) => {
      const t = l.trim();
      return t === ".galy" || t === ".galy/" || t === "/.galy" || t === "/.galy/";
    });
    if (ignored) ok(".galy/ already gitignored.");
    else { appendFileSync(gitignore, `${body.endsWith("\n") ? "" : "\n"}${GITIGNORE_LINE}\n`); ok(`added ${GITIGNORE_LINE} to .gitignore.`); }
  } else if (hasGit) {
    writeFileSync(gitignore, `${GITIGNORE_LINE}\n`, "utf8");
    ok(`created .gitignore with ${GITIGNORE_LINE}.`);
  } else {
    warn("no .gitignore and no git repo here — make sure nothing in .galy/ is ever committed.");
  }
}

// (d) Prove the connection, and name the failure when there is one.
//
// Three failures wear the same face if you only make one call — a wrong host, a workspace that
// does not exist at that address, and a rejected token — and each sends the reader after a
// different problem. So we make two calls, in the order that narrows:
//
//   /health   anonymous, outside the rate limiter. It answers when the ADDRESS is right.
//             Network error -> unreachable address. 404 -> the address answers, but no
//             workspace lives there.
//   /mcp      with the token. 401/403 -> the token. 404 -> the address serves Galy but not
//             the MCP route, on an image older than the profile fix.
//
// And it is /mcp we prove, not /api/pm. Those are two different doors: the REST one is what the
// `galy` CLI uses, the MCP one is what the ASSISTANT uses — the whole point of this command.
// Testing only the first announced "token accepted" on instances where the agent would then
// have found no tool at all, which is the single outcome this script exists to rule out.
async function smoke(endpoint, token) {
  step("Testing the connection");

  let health;
  try {
    health = await fetch(`${endpoint}/health`, { headers: { "Accept": "application/json" } });
  } catch (e) {
    fail(`unreachable address: nothing answered at ${endpoint}.
  ${e.message}
  Check the address itself — a typo in the host reads exactly like this.`);
  }

  if (health.status === 404) {
    fail(`no workspace at ${endpoint}.
  Something answers there, but it serves no Galy workspace: the subdomain is probably not
  yours. The exact address is printed on your own "Connect my agent" screen.`);
  }
  if (!health.ok) {
    fail(`${endpoint} answered HTTP ${health.status} on /health — that address does not serve a Galy instance.`);
  }
  ok("address reachable, a Galy workspace answers there.");

  // The MCP handshake, with the token: exactly what the assistant does on its first call.
  let mcp;
  try {
    mcp = await fetch(`${endpoint}/mcp`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "galy-setup", version: "1" } },
      }),
    });
  } catch (e) {
    fail(`the address answered but /mcp did not: ${e.message}`);
  }

  if (mcp.status === 401 || mcp.status === 403) {
    fail(`token rejected by ${endpoint} (${mcp.status}).
  The workspace is there, so this is the token: revoked, mistyped, or minted for another
  workspace. Mint a fresh one on ${endpoint}/account/assistant`);
  }
  if (mcp.status === 404) {
    fail(`${endpoint} serves a Galy workspace but no MCP endpoint (404 on /mcp).
  That instance predates the fix that serves /mcp on the delivered profile — ask whoever
  operates it to move it up a version.`);
  }
  if (!mcp.ok) fail(`/mcp answered HTTP ${mcp.status}.`);
  await mcp.text();
  ok("token accepted — your assistant can reach this workspace.");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }

  const token = args._[0];
  if (!token) fail("missing token.\n" + HELP);
  // No default address on purpose: Galy is multi-tenant, and a guessed host fails as a 401
  // that reads like a bad token — sending the user after the wrong problem.
  if (!args.endpoint) fail("missing --endpoint.\n" + HELP);
  const endpoint = args.endpoint.replace(/\/+$/, "").replace(/\/mcp$/i, "");
  if (!/^https?:\/\//i.test(endpoint)) fail(`--endpoint must be a full url, got "${args.endpoint}".`);
  if (!/^[0-9a-f]{64}$/i.test(token)) warn("token doesn't look like a 64-hex string — continuing anyway.");

  console.log("Galy Claude Kit — setup");
  const haveClaude = claudeCli() !== null;
  installPlugin(haveClaude);
  registerMcp(haveClaude, endpoint, token);
  writeConfig(endpoint, token);
  await smoke(endpoint, token);

  console.log("\n✅ Assistant connected — Galy never sees your code.");
  console.log("   Reopen Claude Code here: a server declared while it was running is only seen");
  console.log("   at the next start. It will then tell you where your practices stand.\n");
}

main().catch((e) => fail(e.message));
