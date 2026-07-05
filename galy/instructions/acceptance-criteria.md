# Acceptance criteria — shared convention

Every spec must list explicitly how **the assistant itself** verifies, at the end of dev, that the
requested outcome is delivered. These are **not** automated tests (build / unit / integration are
already covered by your CI) — they are the manual checks the assistant runs against the running app
before it says "done". Referenced by `feature-spec`, `feature-implement`, `feature-followup`.

Acceptance tests are stored on the spec via `feature_spec_add_acceptance_test` (kind `visual` or
`nonvisual`); the `verificationMd` field holds *how to check* — a URL, a command, a query — never
source code.

## Format

### Visual delivery (UI, page, modal, component, email)

- **Pages to open**: local URL + the production URL expected after deploy
- **What to see**: precise description (text, state, layout, breakpoint, hover, dark mode if relevant)
- **Interactions to test**: clicks, inputs, navigation
- **Tool**: your browser-automation MCP; attach a screenshot to the final report

### Non-visual delivery (batch, worker, API, computation, migration)

- **Pages/endpoints to exercise locally**: the URL that runs the changed code
- **Endpoints to call**: URL + payload + expected response
- **Verification queries**: the read that proves the observable effect in your data store

## When to fill it

- **`feature-spec`**: add the acceptance tests as the spec is written, before the phases.
- **`feature-implement`**: walk each test, screenshot every visual block, attach to the final report,
  and set each test's status.
- **`feature-followup`**: replay the same tests in production and report pass/fail.

A delivery with no filled acceptance criteria is not verifiable — refuse it.
