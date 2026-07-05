# Contract conformance

Verifies that a Galy MCP endpoint honours the `galy-pm-v1` contract — and, above all, the outward-only
guarantee: **no verb ever accepts source code, a diff, or file content.**

## Run

Static only (no network) — scans the contract file for forbidden fields:

```
node runner.mjs
```

Against a live endpoint — also lists the real tool schemas, re-checks the forbidden-field invariant on
them, confirms every contract verb is advertised, and exercises the read verbs:

```
GALY_MCP_URL=https://gooal-prod.azurewebsites.net/mcp GALY_TOKEN=<token> node runner.mjs
```

Exit code `0` = all checks pass, `1` = at least one failure.

## What it checks

1. **Forbidden fields** — neither the contract nor the live schemas declare a `code` / `diff` / `patch`
   / `file_content` / `source_code` parameter.
2. **Advertised verbs** — every verb in `pm-v1.json` is present in the endpoint's `tools/list`.
3. **Read envelopes** — read verbs return `{ success: true, ... }`.

Write verbs are validated by their live schema, not invoked — calling them would mutate the connected
workspace. Pass `--write` only against a disposable sandbox account.
