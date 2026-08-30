---
name: connect
description: Connect this repository to a Galy workspace, or diagnose a connection that is not answering — 401, wrong address, missing token, two servers with the same name. Registers the MCP endpoint for this project without the user pasting anything into a config file, and never writes a token into a committable file.
---

# connect — wire this repository to a Galy workspace

The user is here because the `mcp__galy__*` tools answer nothing, or because they have never connected.
Both cases end the same way: one `galy-setup` command, run in their repository.

## What has to be true

Two values, and neither may be typed into a tracked file:

- **the address of their instance** — `https://<their-workspace>.galy.cloud`, their own host. There is
  no single Galy address to hardcode: this is a multi-tenant product, and every workspace answers on its
  own name. A kit that assumed one address would authenticate nobody.
- **their token** — minted by them, shown once.

Both are on the same page, and they never leave the machine: **Connect my agent**, in the top bar of
any screen, at `https://<their-workspace>.galy.cloud/account/assistant`. Every active member of the
workspace reaches it and mints **their own** token — borrowing an administrator's would attribute
their check-ins, their writes and every access-log line to somebody else. The page prints the exact
command, address already filled in, with a copy button.

## Diagnose first, so you ask for the right thing

Run these before saying anything. They are read-only and cost a second.

```bash
claude mcp get galy        # what is registered for this project, and in which scope
```

Read the answer against these four, which cover nearly every case:

| What you see | What it means | What to do |
|---|---|---|
| no server named `galy` | never connected here | ask for the setup command below |
| the URL contains `${GALY_MCP_URL}` unexpanded | it is declared through an environment variable nobody set | re-run setup; it registers literal values and stops depending on the shell |
| `401` / `unauthorized` on any call | the token is revoked, belongs to another workspace, or its bearer's account was closed — the instance refuses a token whose membership is no longer active | a new token on the same page, then setup again; if that also fails, their account itself is closed and only an owner reopens it |
| `galy` defined in **two** scopes | two definitions, and the local one wins — often the broken one loses silently, or the wrong one wins | keep one: `claude mcp remove galy -s project` or `-s local` |

## The command

```
npx -y github:galy-io/agent-kit <token> --endpoint https://<their-workspace>.galy.cloud
```

**Not `npx galy-setup`.** That package is published on no registry: npm answers `E404 Not Found`, and
a developer who has never seen Galy work concludes the product does not exist. The plugin repository is
public and `npx` runs it as it is. The day the package is published, the short form comes back — here
and on the screen, together.

It registers the MCP endpoint for **this project only**, writes `.galy/config.json` for the `galy` CLI,
makes sure that file is gitignored, and tests the connection before claiming success.

**Never run it yourself with a token the user pasted into the conversation.** Ask them to run it, or to
run it with `!` in front so the shell handles the value and it never lands in a transcript. A token in a
conversation is a token in a log, in a backup, and in whatever the transcript is later fed to.

## After it succeeds

Say what changed, in one line, then get out of the way — the user came to work, not to configure.

If this repository has never been observed, offer the `galy:audit` skill: it tours the ground, says
where the practices stand against the twenty criteria, and records what it saw. It reads and proposes;
it changes nothing on its own.

## What this skill never does

- **Never write a token into a tracked file** — not `.mcp.json`, not a settings file that git can see,
  not a shell profile in the repository.
- **Never print a token back**, not even truncated, not even to confirm it was read.
- **Never store one in the Windows registry via `setx`**, or in a shell profile: that leaves the value
  in clear for every process on the machine, and a token opens the whole workspace.
- **Never guess the workspace address.** Ask. A wrong host does not fail loudly — it fails as a 401 that
  looks like a bad token, and sends the user hunting for the wrong problem.
