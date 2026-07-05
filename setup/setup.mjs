#!/usr/bin/env node
// galy-setup — one-command onboarding for the Galy Claude Kit.
//
//   npx galy-setup <token> [--endpoint <url>]
//
// Does four things, in order, each best-effort with a clear message on failure:
//   a) installs the plugin via the Claude CLI (marketplace add + install), or prints
//      manual steps if `claude` isn't on PATH;
//   b) writes .galy/config.json { endpoint, token } in the current repo and makes sure
//      it is gitignored — the token never lands in a committable file;
//   c) prints the shell export the plugin's .mcp.json needs (Authorization: Bearer
//      ${GALY_TOKEN}) so headless runs pick the token up too;
//   d) smoke-tests the endpoint (GET /api/pm/search?q=ping) with the token.
//
// Zero dependencies. Node 18+ (global fetch, spawnSync).

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_ENDPOINT = "https://gooal-prod.azurewebsites.net";
const MARKETPLACE = "galy-io/claude-kit";
const GITIGNORE_LINE = ".galy/config.json";

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

  npx galy-setup <token> [--endpoint <url>]

  <token>       your Galy API token (galy.io → Settings → Connect your assistant)
  --endpoint    Galy host (default ${DEFAULT_ENDPOINT})

Galy never sees your code. This connects your assistant to your Galy workspace —
it does not give Galy access to your repository.`;

// (a) Install the plugin through the Claude CLI, if present.
function installPlugin() {
  step("Installing the Galy plugin via the Claude CLI");
  const claude = spawnSync(process.platform === "win32" ? "claude.cmd" : "claude", ["--version"], { encoding: "utf8" });
  if (claude.error) {
    warn("`claude` not found on PATH — skipping the automatic install.");
    console.log("    Install it yourself later with:");
    console.log(`      claude plugin marketplace add ${MARKETPLACE}`);
    console.log("      claude plugin install galy");
    return;
  }
  const run = (args) => {
    const r = spawnSync(process.platform === "win32" ? "claude.cmd" : "claude", args, { stdio: "inherit" });
    return r.status === 0;
  };
  if (run(["plugin", "marketplace", "add", MARKETPLACE]) && run(["plugin", "install", "galy"])) {
    ok("plugin installed.");
  } else {
    warn("the Claude CLI reported an error — finish the install by hand:");
    console.log(`      claude plugin marketplace add ${MARKETPLACE}`);
    console.log("      claude plugin install galy");
  }
}

// (b) Write .galy/config.json and make sure it is gitignored.
function writeConfig(endpoint, token) {
  step("Writing local config");
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

// (c) Tell the user how to persist the token for the MCP header ${GALY_TOKEN}.
function printExport(token) {
  step("Persisting the token for the MCP endpoint");
  console.log("  The plugin's .mcp.json sends `Authorization: Bearer ${GALY_TOKEN}`.");
  console.log("  Add this to your shell profile so every session picks it up:");
  if (process.platform === "win32") {
    console.log(`      setx GALY_TOKEN ${token}                # PowerShell / cmd, new shells`);
    console.log(`      $env:GALY_TOKEN = "${token}"            # current PowerShell session`);
  } else {
    console.log(`      echo 'export GALY_TOKEN=${token}' >> ~/.profile && export GALY_TOKEN=${token}`);
  }
  ok("the CLI also reads the token from .galy/config.json, so it works without the export.");
}

// (d) Smoke-test the endpoint with the token.
async function smoke(endpoint, token) {
  step("Testing the connection");
  try {
    const res = await fetch(`${endpoint}/api/pm/search?q=ping`, {
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    });
    if (res.status === 401 || res.status === 403) {
      fail("the endpoint rejected the token (401/403). Copy a fresh token from galy.io → Settings → Connect your assistant.");
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
  const endpoint = (args.endpoint || DEFAULT_ENDPOINT).replace(/\/+$/, "").replace(/\/mcp$/i, "");
  if (!/^[0-9a-f]{64}$/i.test(token)) warn("token doesn't look like a 64-hex string — continuing anyway.");

  console.log("Galy Claude Kit — setup");
  installPlugin();
  writeConfig(endpoint, token);
  printExport(token);
  await smoke(endpoint, token);

  console.log("\n✅ Assistant connecté — Galy never sees your code.\n");
}

main().catch((e) => fail(e.message));
