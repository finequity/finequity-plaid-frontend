# finequity-plaid-proxy (Cloudflare Worker)

Authenticated gateway between the Glide-embedded React frontend and the Pipedream triggers.

- Pipedream URLs + Bearer tokens live in **wrangler secrets** — never in the frontend bundle.
- Recurring data is cached in **Workers KV** per user (`tx:<uid>`, 7-day TTL) — nothing persists in the browser.
- Auth is a **per-user proof**: Glide provisions each user a random secret (stored in `USERS` KV), then computes `proof = SHA-256(userSecret:uid:ts)` and passes `#uid=..&ts=..&proof=..` to the app via URL fragment. The Worker recomputes and rejects anything stale (>15 min) or mismatched.
- **No phone number anywhere in the frontend** — Glide sends it once at provisioning; it lives in USERS KV next to the secret and the Worker attaches it (E.164-normalized) to Pipedream requests as `phoneNumber`.

## Routes

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/provision/<PROVISION_PATH_KEY>` | POST | secret path segment | Glide webhook stores `{ userId, userSecret, phoneNumber }` in USERS KV |
| `/transactions?uid&ts&proof` | GET | proof | recurring data (KV cache → Pipedream) |
| `/api/exchange` | POST | proof (in body) | Plaid public-token exchange |

## One-time setup

`wrangler` is a devDependency here, so `npx wrangler` runs the pinned local copy — no global install. It needs **Node 22+**; the React app is fine on 18.

```bash
cd worker
npm install                                           # installs wrangler

# 1. Create both KV namespaces; paste each printed id into wrangler.toml
npx wrangler kv namespace create USERS
npx wrangler kv namespace create CACHE

# 2. Set secrets (each command prompts for the value — nothing is typed on the
#    command line, so no secret lands in your shell history)
npx wrangler secret put PROVISION_PATH_KEY
npx wrangler secret put RETRIEVE_TRIGGER_URL
npx wrangler secret put RETRIEVE_TRIGGER_AUTH_TOKEN
npx wrangler secret put EXCHANGE_TRIGGER_URL
npx wrangler secret put EXCHANGE_TRIGGER_AUTH_TOKEN
npx wrangler secret put PIPEDREAM_SECRET              # optional

# 3. Set ALLOWED_ORIGIN in wrangler.toml to the React app's Netlify origin

# 4. Deploy
npx wrangler deploy
```

### What each secret is

No value belongs in this repo — `.dev.vars` is gitignored and production values live only in Cloudflare (`npx wrangler secret list` shows the names).

| Secret | What it is | Where the value comes from |
| --- | --- | --- |
| `PROVISION_PATH_KEY` | Random path segment that guards `POST /provision/<key>`; a wrong key answers 404 | Generate your own: `openssl rand -hex 24`. Must match the URL configured in Glide's Trigger Webhook action |
| `RETRIEVE_TRIGGER_URL` | Pipedream HTTP trigger for `retrieve-recurring-transactions` | The workflow's trigger URL in Pipedream |
| `RETRIEVE_TRIGGER_AUTH_TOKEN` | Sent to that trigger as `Authorization: Bearer <token>` | The token that workflow checks |
| `EXCHANGE_TRIGGER_URL` | Pipedream HTTP trigger for `access-token+recurring-transactions-workflow` | The workflow's trigger URL in Pipedream |
| `EXCHANGE_TRIGGER_AUTH_TOKEN` | Bearer token for the exchange trigger | The token that workflow checks |
| `PIPEDREAM_SECRET` | Optional. Sent as `x-gateway-secret` so Pipedream can prove the call came from this Worker | Any random string; must equal `GATEWAY_SECRET` on the Pipedream side |

Plain (non-secret) config lives in `wrangler.toml`: `ALLOWED_ORIGIN` (the exact origin the app is served from — no trailing slash) and `CACHE_TTL_SECONDS` (604800 = 7 days).

For local `wrangler dev`, the same names go in `worker/.dev.vars` (gitignored) instead, with `ALLOWED_ORIGIN` pointing at whatever origin serves the app locally. `scripts/dev.sh` creates that file with a freshly generated `PROVISION_PATH_KEY` if it's missing, and rewrites only `ALLOWED_ORIGIN` on every run — the Pipedream values are yours to fill in once.

Then set `REACT_APP_WORKER_URL` (no trailing slash) in Netlify's env vars and redeploy the frontend. Optionally set `REACT_APP_SUPPORT_SCHEDULE_URL` there too — the booking link behind the post-first-scan "Schedule a conversation" CTA. Left unset, that card points users at SMS instead of showing a dead button.

## Glide side (summary)

1. **Users table**: Row ID = `userId`; text column `userSecret` (empty until provisioned); **Row Owners on the email column** (critical — otherwise every user's secret ships to every device).
2. **Provisioning action** (on the button that opens the webview): IF `userSecret` empty → Set Column `userSecret` = Unique Identifier → Trigger Webhook to `https://<worker>/provision/<PROVISION_PATH_KEY>` with `userId` = Row ID, `userSecret` = the column, `phoneNumber` = the user's phone column (any US format — the Worker normalizes to +1XXXXXXXXXX and rejects the provision with 400 if it isn't a valid 10-digit US number) → notify "tap again". ELSE → open the screen with the Web Embed.
3. **Math column** `nowTick` = Current Date/Time (forces recomputation).
4. **JavaScript column** `webviewUrl` (p1 = userSecret, p2 = Row ID, p3 = nowTick):

```javascript
// p3 is unused except to force recomputation as time passes
if (!p1) return "";
const ts = Date.now();
const data = new TextEncoder().encode(`${p1}:${p2}:${ts}`);
const buf = await crypto.subtle.digest("SHA-256", data);
const proof = [...new Uint8Array(buf)]
  .map(b => b.toString(16).padStart(2, "0")).join("");
return `https://<your-netlify-app>/#uid=${p2}&ts=${ts}&proof=${proof}`;
```

5. **Web Embed** component pointed at `webviewUrl`.

**Calibrating the provision handler:** Glide wraps webhook values in its own JSON. Fire one test provision and run `npx wrangler tail` — if the body shape isn't recognized, the Worker logs `provision: unrecognized body shape: ...`; adjust the `pick`/`src` lines in `handleProvision` to match, redeploy.

## Pipedream side

- Both workflows receive `{ userId, phoneNumber }` — the phone comes from the provisioned USERS KV record (E.164, e.g. `+14155551234`), so no Glide-API lookup is needed.
- Optional hardening: add a first code step that rejects requests whose `x-gateway-secret` header ≠ `GATEWAY_SECRET` env var (same value as the Worker's `PIPEDREAM_SECRET` secret). Keep/rotate the existing Bearer checks — the Worker still sends `Authorization: Bearer <token>`.

## Local testing

The one-command path is `./scripts/dev.sh` from the repo root — it starts both servers, wires the origins together, provisions a test user and prints a signed URL (see the [main README](../README.md#quick-start-one-command)). The manual equivalent:

```bash
# Terminal 1
cd worker && npx wrangler dev        # http://localhost:8787  (Node 22+)

# Provision a fake user into local KV (values arbitrary but consistent):
curl -X POST "http://localhost:8787/provision/$(grep PROVISION_PATH_KEY .dev.vars | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{"params":{"userId":"test-user-1","userSecret":"dev-secret-1","phoneNumber":"415-555-1234"}}'

# Mint a fragment URL (mirrors the Glide JS column):
node dev-url.mjs dev-secret-1 test-user-1

# Terminal 2 (repo root)
cd .. && npm start                   # open the printed URL
```

Cache inspection and eviction (`--local` for `wrangler dev` state, `--remote` for production; same flags for the `USERS` namespace):

```bash
npx wrangler kv key list   --binding CACHE --local
npx wrangler kv key delete "tx:<uid>" --binding CACHE --local
```

Deleting `tx:<uid>` forces that user's next `/transactions` to go to Pipedream and re-cache. It does not touch their stored access token, which lives under `user:<uid>` in `USERS` — delete that only if you want the user re-provisioned from Glide.
