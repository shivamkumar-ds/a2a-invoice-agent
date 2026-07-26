# A2A Invoice Agent — starter implementation

Tested locally end-to-end: agent card, auth (401 without Bearer), batch
propose, exact replay, changed-content conflict (409), cross-user isolation
(404), result continuation to COMPLETED, and cancel-after-terminal (409) —
all pass. See test/smoke-test.js.

## ⚠️ Check these before submitting (marked `ASSUMPTION` in the code)

The prompt gives exact **states, actions, and data payloads**, but not every
wrapper field name (e.g. whether it's `status.state` or just `state`, exact
Agent Card key names beyond what's listed, whether Bearer token = principal
id or a fixed shared secret). Search for `ASSUMPTION` in:

- `src/agentCard.js` — Agent Card shape
- `src/server.js` — Task/status/artifact wrapper shape, and the auth model
  (currently: **any** well-formed `Bearer <token>` is accepted and its value
  is used as the user id for isolation — re-read section 4 of the prompt to
  confirm that's really what's wanted vs. one fixed secret)

Cross-check against the actual A2A 1.0 spec linked in the assignment and
adjust field names if the grader's real wire format differs.

## What's implemented

- `GET /.well-known/agent-card.json` — public, no auth
- Auth middleware: requires `Authorization: Bearer <token>` + `A2A-Version: 1.0`
  on every other route (401/400 otherwise)
- `POST {base}/message:send` — handles both:
  - initial batch (`application/vnd.ga5.invoice-claim-batch+json`) → creates
    a Task in `TASK_STATE_INPUT_REQUIRED` with one proposals artifact
  - result continuation (`application/vnd.ga5.invoice-action-results+json`)
    → validates against the stored proposal, completes the task, appends a
    receipts artifact (accepted results only)
- `GET {base}/tasks/{id}`, `GET {base}/tasks`, `POST {base}/tasks/{id}:cancel`
- Message idempotency by `(principal, messageId)` with content-hash conflict
  detection (409 `IDEMPOTENCY_CONFLICT`)
- Package decision cache by canonical package content (no repeat model calls
  across batches/Checks for the same package)
- Batched LLM call (all uncached packages in one request) + heuristic
  fallback with no API key
- Cancel/receipt race handled with a re-check immediately before commit
- Cross-user isolation: tasks are filtered/looked up by principal; mismatches
  return a generic 404

## Run locally

```bash
npm install
npm start
node test/smoke-test.js
```

## Deploy (Render)

1. Push this folder to GitHub.
2. Render → New → Web Service → connect the repo.
3. Build Command: `npm install`. Start Command: `npm start`.
4. **Do NOT set `DATA_DIR` unless you've mounted a disk** — leaving it unset
   uses `./data` (writable without a disk). Setting it to a root path like
   `/data` without a mounted volume causes an `EACCES` crash.
5. After deploy, note your URL (e.g. `https://xyz.onrender.com`), then add
   env var `A2A_BASE_URL=https://xyz.onrender.com/a2a` and redeploy — the
   Agent Card's `supportedInterfaces[0].url` must exactly match what you
   submit as the base URL.
6. (Optional) `ANTHROPIC_API_KEY` for real classification instead of the
   heuristic fallback.
7. Submit base URL: `https://xyz.onrender.com/a2a` (no trailing slash, no
   query/fragment).
8. Free tier sleeps after inactivity — set up a keep-alive ping (e.g.
   cron-job.org hitting your URL every ~10 min) so it doesn't cold-start
   during grading and blow the 45s/160s time budgets.
