#!/usr/bin/env node
// galy — cross-platform CLI for the Galy project-management API.
//
// Talks REST to /api/pm/* on your Galy endpoint. Mirrors the MCP verbs your
// Claude Code uses, but is shell-friendly: list/search work items, and pull/push
// the large markdown bodies of briefs and specs as local files so you never have
// to shove a whole body through a tool argument.
//
// Strictly outward: this CLI reads strategy/briefs/specs and writes back their
// text (bodies, statuses). It never sends your source code — there is no verb
// that reads a repository file.
//
// Config resolution (first hit wins per field):
//   env GALY_ENDPOINT / GALY_TOKEN
//   .galy/config.json  ({ "endpoint": "...", "token": "..." }) searched upward from cwd
//
// Content buffer: .tmp/galy-content/<type>/<id>.md with fields delimited by
//   <!-- @field <name> -->
//
// Commands:
//   galy whoami
//   galy search <query> [--type brief|spec] [--status <s>] [--limit <n>]
//   galy brief <id>
//   galy brief list [--status <s>] [--domain <d>] [--query <q>] [--limit <n>]
//   galy spec <id>
//   galy spec list [--brief <id>] [--status <s>] [--query <q>] [--limit <n>]
//   galy content pull <type> <id>      # type = feature-brief | feature-spec
//   galy content push <type> <id>

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const CONTENT_FIELDS = {
  "feature-brief": ["problem", "vision", "executive"],
  "feature-spec": ["executive", "problem", "solution"],
};

// ── Config ────────────────────────────────────────────────────────────────
function findConfig(startDir) {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, ".galy", "config.json");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function loadConfig() {
  let fromFile = {};
  const path = findConfig(process.cwd());
  if (path) {
    try { fromFile = JSON.parse(readFileSync(path, "utf8")); }
    catch (e) { die(`Cannot parse ${path}: ${e.message}`); }
  }
  const endpoint = process.env.GALY_ENDPOINT || fromFile.endpoint;
  const token = process.env.GALY_TOKEN || fromFile.token;
  if (!endpoint) die("No endpoint. Set GALY_ENDPOINT or .galy/config.json { \"endpoint\": ... }.");
  if (!token) die("No token. Set GALY_TOKEN or .galy/config.json { \"token\": ... }. Get one from galy.io → Settings → Connect your assistant.");
  return { endpoint: endpoint.replace(/\/+$/, ""), token };
}

// ── HTTP ──────────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const { endpoint, token } = loadConfig();
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) die(`${method} ${path} → HTTP ${res.status}: ${json.error || text.slice(0, 300)}`);
  return json;
}

// ── Content buffer ──────────────────────────────────────────────────────────
function bufferPath(type, id) {
  return join(process.cwd(), ".tmp", "galy-content", type, `${id}.md`);
}

function serializeFields(type, fields) {
  const order = CONTENT_FIELDS[type] || Object.keys(fields);
  const names = order.filter((n) => n in fields).concat(Object.keys(fields).filter((n) => !order.includes(n)));
  return names.map((n) => `<!-- @field ${n} -->\n${(fields[n] ?? "").trim()}\n`).join("\n");
}

function parseFields(text) {
  const fields = {};
  const re = /<!--\s*@field\s+([\w-]+)\s*-->/g;
  const marks = [];
  let m;
  while ((m = re.exec(text))) marks.push({ name: m[1], start: m.index, end: re.lastIndex });
  for (let i = 0; i < marks.length; i++) {
    const body = text.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].start : text.length);
    fields[marks[i].name] = body.trim();
  }
  return fields;
}

// ── Commands ──────────────────────────────────────────────────────────────
async function cmdWhoami() {
  const r = await api("GET", "/api/pm/whoami");
  print(r);
}

async function cmdSearch(args) {
  const q = args._[0];
  if (!q) die("Usage: galy search <query> [--type brief|spec] [--status <s>] [--limit <n>]");
  const params = new URLSearchParams({ q });
  if (args.type) params.set("type", args.type);
  if (args.status) params.set("status", args.status);
  if (args.limit) params.set("limit", args.limit);
  print(await api("GET", `/api/pm/search?${params}`));
}

async function cmdBrief(args) {
  const first = args._[0];
  if (first === "list") {
    const params = new URLSearchParams();
    for (const k of ["status", "domain", "query", "limit"]) if (args[k]) params.set(k, args[k]);
    return print(await api("GET", `/api/pm/briefs?${params}`));
  }
  if (!first) die("Usage: galy brief <id> | galy brief list [--status ...] [--domain ...]");
  print(await api("GET", `/api/pm/briefs/${first}`));
}

async function cmdSpec(args) {
  const first = args._[0];
  if (first === "list") {
    const params = new URLSearchParams();
    if (args.brief) params.set("briefId", args.brief);
    for (const k of ["status", "query", "limit"]) if (args[k]) params.set(k, args[k]);
    return print(await api("GET", `/api/pm/specs?${params}`));
  }
  if (!first) die("Usage: galy spec <id> | galy spec list [--brief <id>] [--status ...]");
  print(await api("GET", `/api/pm/specs/${first}`));
}

async function cmdContent(args) {
  const [action, type, id] = args._;
  if (!["pull", "push"].includes(action) || !type || !id) {
    die("Usage: galy content pull|push <type> <id>   (type = feature-brief | feature-spec)");
  }
  const path = bufferPath(type, id);

  if (action === "pull") {
    const r = await api("GET", `/api/pm/content/${type}/${id}`);
    const fields = r.fields || r;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, serializeFields(type, fields), "utf8");
    console.log(`Pulled ${type} ${id} → ${path}`);
    return;
  }

  // push
  if (!existsSync(path)) die(`No buffer at ${path}. Run 'galy content pull ${type} ${id}' first.`);
  const fields = parseFields(readFileSync(path, "utf8"));
  if (Object.keys(fields).length === 0) die(`No <!-- @field ... --> sections found in ${path}.`);
  await api("PUT", `/api/pm/content/${type}/${id}`, { fields });
  console.log(`Pushed ${type} ${id} (${Object.keys(fields).join(", ")})`);
}

// ── arg parsing / output ────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function print(obj) { console.log(JSON.stringify(obj, null, 2)); }
function die(msg) { console.error(`galy: ${msg}`); process.exit(1); }

const HELP = `galy — Galy project-management CLI

  galy whoami
  galy search <query> [--type brief|spec] [--status <s>] [--limit <n>]
  galy brief <id>
  galy brief list [--status <s>] [--domain <d>] [--query <q>] [--limit <n>]
  galy spec <id>
  galy spec list [--brief <id>] [--status <s>] [--query <q>] [--limit <n>]
  galy content pull <type> <id>     # type = feature-brief | feature-spec
  galy content push <type> <id>

Config: env GALY_ENDPOINT / GALY_TOKEN, or .galy/config.json { "endpoint", "token" }.
Galy never sees your code — this CLI only carries work items and their text.`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  switch (cmd) {
    case "whoami": return cmdWhoami();
    case "search": return cmdSearch(args);
    case "brief": return cmdBrief(args);
    case "spec": return cmdSpec(args);
    case "content": return cmdContent(args);
    case undefined:
    case "-h":
    case "--help":
    case "help": return console.log(HELP);
    default: die(`Unknown command '${cmd}'. Run 'galy help'.`);
  }
}

main().catch((e) => die(e.message));
