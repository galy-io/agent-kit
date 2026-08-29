#!/usr/bin/env node
// galy-setup — one-command onboarding for the Galy Claude Kit.
//
//   npx galy-setup <token> --endpoint https://<your-workspace>.galy.cloud
//
// Does four things, in order, each best-effort with a clear message on failure:
//   a) installs the plugin via the Claude CLI (marketplace add + install), or prints
//      manual steps if `claude` isn't on PATH;
//   b) registers the Galy MCP endpoint for THIS project, with the address and the token
//      written literally into the local scope — so the connection does not depend on an
//      environment variable that only one launcher knows how to set;
//   c) writes .galy/config.json { endpoint, token } for the `galy` CLI, and makes sure it
//      is gitignored — the token never lands in a committable file;
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

const MARKETPLACE = "galy-io/claude-kit";
const GITIGNORE_LINE = ".galy/config.json";
const CLAUDE = process.platform === "win32" ? "claude.cmd" : "claude";

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

const HELP = `galy-setup — connect your Claude Code to your Galy workspace

  npx galy-setup <token> --endpoint https://<your-workspace>.galy.cloud

  <token>       your Galy API token
  --endpoint    the address of your workspace

Both are on one page in Galy: Settings → Connect your assistant. It prints this exact
command, address already filled in — copy it from there rather than typing it.

Galy never sees your code. This connects your assistant to your Galy workspace —
it does not give Galy access to your repository.`;

function claudeAvailable() {
  return !spawnSync(CLAUDE, ["--version"], { encoding: "utf8" }).error;
}

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
  const run = (args) => spawnSync(CLAUDE, args, { stdio: "inherit" }).status === 0;
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
  spawnSync(CLAUDE, ["mcp", "remove", "galy", "-s", "local"], { encoding: "utf8" });

  const added = spawnSync(CLAUDE, [
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
    const ignored = body.split(/\r?\n/).some((l) => {
      const t = l.trim();
      return t === GITIGNORE_LINE || t === ".galy" || t === ".galy/";
    });
    if (ignored) ok(".galy/config.json already gitignored.");
    else { appendFileSync(gitignore, `${body.endsWith("\n") ? "" : "\n"}${GITIGNORE_LINE}\n`); ok(`added ${GITIGNORE_LINE} to .gitignore.`); }
  } else if (hasGit) {
    writeFileSync(gitignore, `${GITIGNORE_LINE}\n`, "utf8");
    ok(`created .gitignore with ${GITIGNORE_LINE}.`);
  } else {
    warn("no .gitignore and no git repo here — make sure .galy/config.json is never committed.");
  }
}

// (d) Smoke-test the endpoint with the token.
async function smoke(endpoint, token) {
  step("Testing the connection");
  try {
    const res = await fetch(`${endpoint}/api/pm/search?q=ping`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      fail(`${endpoint} rejected the token (${res.status}).\n  Either the token is revoked, or it belongs to a different workspace than --endpoint.\n  Both the address and a fresh token are on: ${endpoint}/account/assistant`);
    }
    if (!res.ok) fail(`the endpoint returned HTTP ${res.status}. Check the --endpoint url.`);
    await res.text();
    ok("endpoint reachable and token accepted.");
  } catch (e) {
    fail(`could not reach ${endpoint}: ${e.message}`);
  }
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
  const haveClaude = claudeAvailable();
  installPlugin(haveClaude);
  registerMcp(haveClaude, endpoint, token);
  writeConfig(endpoint, token);
  await smoke(endpoint, token);

  console.log("\n✅ Assistant connecté — Galy never sees your code.");
  console.log("   Open Claude Code here: it will tell you where your practices stand.\n");
}

main().catch((e) => fail(e.message));
