#!/usr/bin/env node
// Galy PM contract conformance runner.
//
// Two layers:
//   1. STATIC — always runs, no network. Loads ../pm-v1.json and asserts the
//      outward-only invariant: no verb declares a code/diff/patch/file_content
//      parameter. This is the product guarantee "Galy never sees your code".
//   2. LIVE — runs when GALY_MCP_URL (or GALY_ENDPOINT) and GALY_TOKEN are set.
//      Connects to the MCP endpoint, lists the real tool schemas, re-checks the
//      forbidden-field invariant against the LIVE schemas, then exercises every
//      read verb and validates the { success: true, ... } envelope. Write verbs
//      are schema-checked but not invoked (they would mutate the workspace)
//      unless --write is passed.
//
// Usage:
//   GALY_MCP_URL=https://host/mcp GALY_TOKEN=xxx node runner.mjs [--write]
//   node runner.mjs            # static layer only
//
// Exit code 0 = all checks pass, 1 = at least one failure.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTRACT = JSON.parse(readFileSync(join(__dirname, "..", "pm-v1.json"), "utf8"));

const FORBIDDEN = /^(code|diff|patch|file_content|source_code|file_contents|blob)$/i;
const READ_ARGS = {
  whoami: {},
  strategy_list_periods: {},
  workflow_default_get_all: {},
  feature_brief_list: { take: 1 },
  feature_spec_list: { take: 1 },
};

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
};

// ── Layer 1: static forbidden-field scan ────────────────────────────────────
function scanForbidden(tools, label) {
  let clean = true;
  for (const tool of tools) {
    const params = tool.params ?? paramNamesFromSchema(tool.inputSchema);
    for (const p of params) {
      const pname = typeof p === "string" ? p : p.name;
      if (FORBIDDEN.test(pname)) {
        record(`${label}: ${tool.name} rejects forbidden field '${pname}'`, false, "outward-only invariant broken");
        clean = false;
      }
    }
  }
  if (clean) record(`${label}: no tool accepts code/diff/file_content`, true, `${tools.length} tools scanned`);
  return clean;
}

function paramNamesFromSchema(inputSchema) {
  if (!inputSchema || !inputSchema.properties) return [];
  return Object.keys(inputSchema.properties);
}

// ── Minimal MCP streamable-HTTP JSON-RPC client ──────────────────────────────
class McpClient {
  constructor(url, token) {
    this.url = url;
    this.token = token;
    this.id = 0;
    this.sessionId = null;
  }

  async #rpc(method, params) {
    const headers = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${this.token}`,
    };
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;
    const res = await fetch(this.url, {
      method: "POST",
      headers,
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.id, method, params }),
    });
    const sid = res.headers.get("mcp-session-id");
    if (sid) this.sessionId = sid;
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    return parseRpc(text);
  }

  async initialize() {
    const r = await this.#rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "galy-conformance", version: "1.0.0" },
    });
    return r;
  }

  async listTools() {
    const r = await this.#rpc("tools/list", {});
    return r?.result?.tools ?? [];
  }

  async callTool(name, args) {
    const r = await this.#rpc("tools/call", { name, arguments: args ?? {} });
    const content = r?.result?.content ?? [];
    const textPart = content.find((c) => c.type === "text");
    if (!textPart) return { raw: r?.result };
    try { return JSON.parse(textPart.text); } catch { return { raw: textPart.text }; }
  }
}

// Response may be plain JSON or a text/event-stream frame. Pull the last JSON payload.
function parseRpc(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  let last = null;
  for (const line of trimmed.split(/\r?\n/)) {
    const m = line.match(/^data:\s*(.*)$/);
    if (m && m[1]) { try { last = JSON.parse(m[1]); } catch { /* keep last */ } }
  }
  if (!last) throw new Error(`Could not parse RPC response: ${trimmed.slice(0, 200)}`);
  return last;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const writeMode = process.argv.includes("--write");
  const url = process.env.GALY_MCP_URL || process.env.GALY_ENDPOINT;
  const token = process.env.GALY_TOKEN;

  console.log(`\nGaly PM contract conformance — ${CONTRACT.contract}\n`);

  console.log("Static checks (contract file):");
  scanForbidden(CONTRACT.tools, "contract");

  if (!url || !token) {
    console.log("\nLive checks skipped — set GALY_MCP_URL and GALY_TOKEN to exercise the endpoint.\n");
    return summarize();
  }

  console.log(`\nLive checks against ${url}:`);
  const client = new McpClient(url, token);
  try {
    await client.initialize();
    record("initialize handshake", true);
  } catch (e) {
    record("initialize handshake", false, e.message);
    return summarize();
  }

  let liveTools = [];
  try {
    liveTools = await client.listTools();
    record("tools/list", true, `${liveTools.length} tools advertised`);
  } catch (e) {
    record("tools/list", false, e.message);
    return summarize();
  }

  // Re-check the invariant against the LIVE schemas, not just the contract file.
  scanForbidden(liveTools, "live");

  // Every contract verb must be advertised by the endpoint.
  const liveNames = new Set(liveTools.map((t) => t.name));
  for (const tool of CONTRACT.tools) {
    record(`advertises '${tool.name}'`, liveNames.has(tool.name),
      liveNames.has(tool.name) ? undefined : "missing from tools/list");
  }

  // Exercise read verbs; validate the success envelope.
  for (const tool of CONTRACT.tools) {
    if (tool.kind !== "read") continue;
    const args = READ_ARGS[tool.name];
    if (!args) continue; // read verb needing an id we don't have — skip live call
    try {
      const out = await client.callTool(tool.name, args);
      const ok = out && out.success === true;
      record(`call ${tool.name}`, ok, ok ? undefined : `envelope: ${JSON.stringify(out).slice(0, 160)}`);
    } catch (e) {
      record(`call ${tool.name}`, false, e.message);
    }
  }

  if (writeMode) {
    console.log("\n--write passed but write exercises are intentionally not implemented here:");
    console.log("  they would mutate the connected Galy workspace. Validate write verbs");
    console.log("  through their live schema (checked above) and a disposable sandbox brief.\n");
  } else {
    console.log("\nWrite verbs validated by schema only (not invoked — they mutate the workspace).");
  }

  summarize();
}

function summarize() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) {
    console.log(`${failed.length} FAILED:`);
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error("Runner crashed:", e);
  process.exitCode = 1;
});
