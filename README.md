# finEQUITY – Recurring Subscriptions UI (Glide + Plaid + Pipedream + React)

A React interface that lets a user connect a bank via **Plaid** and view **recurring transactions / subscriptions** in a clean, responsive UI. It’s written to be approachable for non-programmers, with clear setup steps, caching to reduce API cost, and guidance for Glide integration so the correct user’s data is always shown.

---

## Table of Contents
- [What the App Does](#what-the-app-does)
- [How It Works (High Level)](#how-it-works-high-level)
- [Screens & Components](#screens--components)
- [Data & API Contracts](#data--api-contracts)
- [Caching (to Save Cost)](#caching-to-save-cost)
- [Running the App](#running-the-app)
- [Configuration (environment variables & secrets)](#configuration-environment-variables--secrets)
- [Technologies Used & How They’re Set Up](#technologies-used--how-theyre-set-up)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

---

## What the App Does

1. Shows a recurring **Subscriptions** data of a user.
2. If data exists (from cache or API), it displays **uniform cards** for each recurring subscription:
   - **Name** (description), **Amount** (always positive with `$`), **Category**, **Frequency** (Monthly/Weekly), **Next** and **Last** charge dates.
3. If the user hasn’t linked a bank yet, it allows the user to connect their bank account via **Plaid Link**.
4. **After connecting**, the app runs a first scan and displays the list of recurring subscriptions. The Worker **caches that list in Workers KV for 7 days**, so repeat visits cost nothing at Plaid or Pipedream.
5. Two dialogs bookend the first scan: one the moment the data lands, and one a few minutes into reading the list offering a call with the support team.

---

## How It Works (High Level)

The app is a **one-time onboarding portal**: connect a bank once, run a first scan, and from then on monitoring and alerts happen automatically over SMS. `LinkPage.jsx` walks users through that as a small stage machine:

| Stage | What the user sees | Leaves when |
| --- | --- | --- |
| `LOADING` | Spinner | `/transactions` answers |
| `CONNECT` | Plaid connect card (step 1 of 3) | Bank linked |
| `ONBOARDED` | **Onboarding complete** screen (step 2 of 3) | “Show my subscriptions” clicked |
| `SCANNING` | First-scan spinner | Recurring data returns |
| `SKIPPED` | **Scan skipped** confirmation — user opted out of the first scan | “Show my subscriptions” clicked (skipping is reversible) |
| `RESULTS` | Subscription list + post-scan panel (step 3 of 3) | — |
| `MESSAGE` | Expired session / error / no data | — |

Returning users whose recurring data is already cached land straight in `RESULTS` with no setup framing — the first run is deliberately the only time the step indicator and onboarding copy appear.

- **LinkPage.jsx** (main page)
  - Reads `uid`/`ts`/`proof` from the URL **fragment** (set by Glide) and scrubs it.
  - Calls the Worker's `/transactions` once: `recurring_data` → `RESULTS`,
    `link_token` → `CONNECT`.
  - Owns the stage machine above, including the first scan triggered from the
    onboarding-complete screen.

- **PlaidButton.jsx**
  - Renders the Plaid Link button using the `link_token`.
  - On success, posts the `public_token` to the Worker's `/api/exchange`.
  - The exchange **persists the access token and returns `storage_success`** — no
    recurring data comes back with it. The component reports that up via
    `onLinked()`; `LinkPage` then shows the onboarding-complete screen, and the
    first scan happens later through `/transactions`.
  - Still handles the legacy `recurring_data` exchange shape via `onData(items)`.

- **OnboardingComplete.jsx**
  - Post-link reassurance: setup is finished, monitoring is automatic, signing
    back in is optional. Carries the “Show my subscriptions” CTA that runs the
    first scan.

- **PostScanPanel.jsx**
  - Shown under the results: restates that monitoring continues over SMS, and
    offers a call with the support team for questions about the findings
    (booking link from `REACT_APP_SUPPORT_SCHEDULE_URL`; falls back to SMS when
    unset).

- **PostScanDialog.jsx**
  - Both first-scan dialogs, one component with a `variant`:
    - `"scan"` opens the instant recurring data lands, before the list has been
      read. Its only button, “View my subscriptions”, hands over to the results.
    - `"support"` opens `SUPPORT_DIALOG_DELAY_MS` (3 minutes) after that
      hand-over. Its only button books a call. Skipped entirely when
      `REACT_APP_SUPPORT_SCHEDULE_URL` is unset — a dialog whose one action is
      missing would just be an obstacle.
  - Neither is given an `onClose` and Escape is disabled, so a backdrop click
    can't dismiss them: the **X** in the header is the only way out (plus the
    scan dialog's own button, which is that dialog's whole point).

- **ScanSkipped.jsx**
  - Confirmation for a user who opted out of running the first scan. Closes the
    loop (“you can leave, we'll text you”) and still offers the scan, so the
    choice is reversible for as long as the page is open.

- **OnboardingSteps.jsx**
  - Connect bank → First scan → Your results indicator, rendered in the page
    header during onboarding only.

- **Footer.jsx**
  - Site footer. Its Support link uses `REACT_APP_SUPPORT_SCHEDULE_URL` when set
    and otherwise points users at SMS, same as the panel above it.

- **Subscriptions (CardGrid)**
  - Material UI **Cards** that are responsive and uniform

- **TopBar / PageHeader**
  - Sticky AppBar with a spacer so content doesn’t hide underneath.
  - Centered page title and subtitle (“Review Your Subscriptions”).

---

## Screens & Components

```
src/
  components/
    TopBar.jsx                    # AppBar + exported PageHeader (stage-aware copy)
    PlaidButton.jsx               # Plaid Link; reports success via onLinked()
    OnboardingComplete.jsx        # "You're all set" screen + first-scan CTA
    OnboardingSteps.jsx           # 3-step first-run progress indicator
    ScanSkipped.jsx               # Confirmation when the first scan is skipped
    Subscriptions.jsx             # Renders the cards; exports countFlagged()
    PostScanDialog.jsx            # The two first-scan dialogs (scan / support)
    PostScanPanel.jsx             # SMS monitoring recap + schedule-a-call CTA
    Footer.jsx                    # Footer; Support link or SMS fallback
  pages/
    LinkPage.jsx                  # Main page: onboarding stage machine + fetching
  utils/
    recurring-data-formatter.js   # Contains method for formatting recurring subscriptions in a form suitable for card display
  mocks/
    recurring-mock-response.js    # Demo data (USE_MOCK replays the onboarding path)
  App.jsx, index.jsx              # App bootstrap

```

**Design details**
- Built with **Material UI** (MUI).
- Icons from `@mui/icons-material` (e.g., Category, Calendar, Clock, History).
- Amounts are formatted as **USD** and displayed as absolute values (no negatives).
- Category values like `FOOD_AND_DRINK_RESTAURANT` are humanized to “Food and Drink Restaurant”.

---

## Data & API Contracts

**Recurring item** shape expected by the UI:

```json
{
  "account_id": "abc123",
  "description": "Spotify",
  "personal_finance_category": { "detailed": "DIGITAL_MUSIC" },
  "frequency": "MONTHLY",
  "average_amount": { "amount": 9.99 },
  "predicted_next_date": "2025-09-14",
  "last_date": "2025-08-14"
}
```

**Backend responses**

- **Retrieve (page load)**: returns either
  ```json
  { "response_object": { "tag": "link_token", "userId": "BgK5628e97e9-72J", "data": {...} } }
  ```
  or
  ```json
  { "response_object": { "tag": "recurring_data", "userId": "BgK5628e97e9-72J", "data": {...} } }
  ```

- **Exchange (after Plaid Link success)**: stores the access token and returns
  ```json
  { "response_object": { "tag": "storage_success", "userId": "BgK5628e97e9-72J", "data": "Access token persisted to the data store successfully!" } }
  ```
  No recurring data comes back here. The UI shows the onboarding-complete screen and fetches the first scan from **Retrieve** when the user asks for it. (The legacy `recurring_data` exchange response is still handled — it skips straight to the results list.)

> Plaid token note: `public_token` must be exchanged **immediately** and only once; never replay it.

---

## Caching (to Save Cost)

Caching is **server-side, in Workers KV** — the browser stores nothing. Each user's recurring data is written to the `CACHE` namespace under `tx:<uid>` the first time Pipedream returns it, and `GET /transactions` answers from there until it expires.

| | |
| --- | --- |
| Where | `CACHE` KV namespace, key `tx:<uid>` |
| TTL | `CACHE_TTL_SECONDS` in `worker/wrangler.toml` — **604800 (7 days)** |
| Written by | `cacheRecurringData()` in `worker/src/index.js`, for `recurring_data` responses only — never link tokens or errors |

Change the TTL by editing `CACHE_TTL_SECONDS` in `worker/wrangler.toml` and redeploying. To force one user's next visit to hit Pipedream again, delete their cache key (run from `worker/`):

```bash
npx wrangler kv key list   --binding CACHE --remote          # find the uid
npx wrangler kv key delete "tx:<uid>" --binding CACHE --remote
```

Swap `--remote` for `--local` to do the same against `wrangler dev` state. Deleting `tx:<uid>` only drops the cached list — the stored access token lives in the `USERS` namespace and is untouched.

---

## Running the App

### Quick start (one command)

```bash
npm run dev          # or: ./scripts/dev.sh
```

`scripts/dev.sh` does the whole tunnelled setup described below in one go: it opens a cloudflared quick tunnel for each port, writes the resulting URLs into `.env` (`REACT_APP_WORKER_URL`) and `worker/.dev.vars` (`ALLOWED_ORIGIN`), starts `wrangler dev` on Node 22+ and the CRA dev server, provisions a test user into local KV, and prints two things when everything is up:

- the **UI's Cloudflare tunnel URL** — the origin to paste into Glide's Web Embed;
- a **signed link** (`#uid&ts&proof`) to open in a browser, also copied to the clipboard. Press Enter in the terminal for a fresh one — proofs expire after 15 minutes.

It installs `worker/`'s dependencies on first run (`wrangler` is a devDependency there), so nothing is fetched on the fly mid-startup.

On Ctrl-C it stops everything and **restores `.env` and `worker/.dev.vars`** to what they were, so no dead tunnel URL survives into a Netlify build.

| Flag | Effect |
| --- | --- |
| `--no-tunnel` | Skip the tunnels and use `localhost` origins (UI work only — the Glide iframe and Plaid production mode both need https) |
| `--uid` / `--secret` / `--phone` | Override the provisioned test user (defaults `test-user-1` / `dev-secret-1` / `415-555-1234`) |
| `--keep-config` | Leave the tunnel URLs in the config files on exit |

Logs and the config backups live in `.dev-run/` (gitignored). The Pipedream trigger URLs and tokens in `worker/.dev.vars` are never touched — the script only rewrites `ALLOWED_ORIGIN`, and warns if the triggers are unset.

> `.dev-run/worker.log` is wrangler's request log, so it contains the local `PROVISION_PATH_KEY` in the provisioning request path. It's gitignored — don't paste it into an issue or a chat without redacting that segment.

The sections below describe the same setup done by hand.

### Prerequisites
- Node.js 18+ and npm — **plus Node 22+ for `wrangler dev`**, which refuses to start on anything older. `nvm use 22` in the Worker terminal is enough; the React app is happy on 18.
- A Plaid account
- Pipedream account and workflow setups for **retrieving subscription data** and **exchanging public token for access token**
- [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) for the tunnelled setup below (`brew install cloudflared`)

### Configuration (environment variables & secrets)

**No real value belongs in this repository.** `.env`, `worker/.dev.vars` and the production secrets are all gitignored or stored in Cloudflare; the tables below say what each name is for and where the value comes from.

**Frontend — `.env`** (read by CRA at build/start; also set these in Netlify for production). `REACT_APP_*` values are **inlined into the public bundle**, so nothing secret may go here.

| Name | What it is | Where the value comes from |
| --- | --- | --- |
| `REACT_APP_WORKER_URL` | Origin of the Worker the app calls, **no trailing slash** | The deployed `*.workers.dev` URL for production; `http://localhost:8787` or a cloudflared tunnel URL locally (`scripts/dev.sh` writes this for you) |
| `REACT_APP_SUPPORT_SCHEDULE_URL` | Booking link behind “Schedule a conversation” (panel, footer, support dialog) | Your scheduling tool's public link. Leave empty and both spots fall back to SMS instead of rendering a dead button |

**Worker — `worker/.dev.vars`** (local `wrangler dev` only, gitignored). Same names as the deployed secrets, so local behaviour matches production:

| Name | What it is | Where the value comes from |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | Exact origin the app is served from — becomes `Access-Control-Allow-Origin`. No trailing slash | `http://localhost:3000`, or the app's tunnel URL when tunnelling |
| `RETRIEVE_TRIGGER_URL` | Pipedream trigger for `retrieve-recurring-transactions` | Pipedream workflow's HTTP trigger URL |
| `RETRIEVE_TRIGGER_AUTH_TOKEN` | Bearer token sent to that trigger | Pipedream workflow's configured auth token |
| `EXCHANGE_TRIGGER_URL` | Pipedream trigger for the public-token exchange | Pipedream workflow's HTTP trigger URL |
| `EXCHANGE_TRIGGER_AUTH_TOKEN` | Bearer token sent to that trigger | Pipedream workflow's configured auth token |
| `PROVISION_PATH_KEY` | Random path segment guarding the Glide provisioning webhook | Generate your own: `openssl rand -hex 24` |
| `PIPEDREAM_SECRET` | Optional `x-gateway-secret` header so Pipedream can verify the caller | Must equal `GATEWAY_SECRET` in Pipedream; optional |

Production values for those same names are **Wrangler secrets**, never files — `cd worker && npx wrangler secret put <NAME>` prompts for each one. Full walkthrough in [worker/README.md](worker/README.md#one-time-setup).

**Pipedream** holds `PLAID_CLIENT_ID`, `PLAID_SECRET` and `PLAID_ENV` (`sandbox` | `production`) as workflow environment variables. Plaid credentials never touch this repo or the Worker.

### Clone repository
```bash
git clone https://github.com/finequity/finequity-plaid-frontend.git
```

### Install all package modules
```bash
npm install                 # React app
cd worker && npm install    # Worker (wrangler) — needs Node 22+
```

`scripts/dev.sh` runs both for you if they haven't been installed yet.

### Start development server

Two terminals — the Worker proxy and the React app:

```bash
cd worker && npx wrangler dev     # http://localhost:8787  (needs Node 22+)
npm start                         # http://localhost:3000
```

With `REACT_APP_WORKER_URL=http://localhost:8787` in `.env` and `ALLOWED_ORIGIN=http://localhost:3000` in `worker/.dev.vars`, that is the whole setup. The app still needs a signed `#uid&ts&proof` fragment to get past the session check — see [Local testing](worker/README.md#local-testing) in the Worker README for provisioning a test user and minting one.

### Serving over a cloudflared tunnel

Plain `localhost` is fine for working on the UI. You need public **https** origins in two cases: previewing the app **inside the Glide iframe**, and **Plaid Link in production mode**. `cloudflared` quick tunnels give you both without deploying.

Both ports get their own tunnel — the app is served from one, and an https page cannot call a `http://localhost` Worker (browsers block it as mixed content), so the Worker needs the other.

**1. Open both tunnels first**, each in its own terminal. Do this before editing config: the URLs are random per run, and knowing them up front saves restarting the servers to pick up changed values.

```bash
cloudflared tunnel --url http://localhost:8787   # → Worker  tunnel URL
cloudflared tunnel --url http://localhost:3000   # → App     tunnel URL
```

Each prints a `https://<random-words>.trycloudflare.com` URL. Expect a connection error in the log until the service behind it is up in step 3 — the tunnel itself is fine.

**2. Point the two sides at each other.**

| File | Key | Value |
| --- | --- | --- |
| `.env` | `REACT_APP_WORKER_URL` | the **Worker** tunnel URL (`:8787`) |
| `worker/.dev.vars` | `ALLOWED_ORIGIN` | the **App** tunnel URL (`:3000`) |

`ALLOWED_ORIGIN` is what the Worker sends back as `Access-Control-Allow-Origin`, so it must match the origin the browser loads the app from exactly — no trailing slash. Get it wrong and every call fails CORS in the browser while `curl` still works.

**3. Start both servers** as in the previous section. CRA inlines `REACT_APP_*` at startup, so `npm start` has to come *after* step 2 — restart it after any change to `.env`.

**4. Mint a proof URL against the tunnel origin** — pass it as the third argument so the fragment lands on the tunnelled app rather than `localhost`:

```bash
cd worker
node dev-url.mjs <userSecret> <uid> https://<app-tunnel>.trycloudflare.com
```

Open that URL, or drop it into Glide's webview to test the embedded path. The proof is valid for **15 minutes** — re-run to mint a fresh one.

**Notes**
- Quick tunnel URLs change on **every** restart, so steps 1–2 repeat each session. Restart `cloudflared` and you must update the config and restart the server on that side.
- If hot reload doesn't reconnect over the tunnel, start the app with `WDS_SOCKET_PORT=443 npm start` — the dev-server websocket otherwise tries to reach port 3000 on the tunnel host. Only affects hot reload, not the app.
- No `DANGEROUSLY_DISABLE_HOST_CHECK` needed: this project sets no CRA `proxy`, so the dev server already accepts requests for any `Host`.
- **Before building for Netlify**, restore the deployed Worker URL in `.env` (`https://finequity-plaid-proxy.dev-bernard.workers.dev`) — a committed tunnel URL is dead the moment the tunnel closes.

### Build (production)
```bash
npm run build
```

### Pipedream workflows
- Ensure that the workflows `retrieve-recurring-transactions` and `access-token+recurring-transactions-workflow` have been deployed

---

## Technologies Used

This project is deliberately lightweight and uses a few well-known tools. Below is a practical guide to what each piece does.

### 1) React (App Framework) + Router
- **What**: The component model and client-side navigation.
- **Why**: Fast, flexible UI with reusable components.

### 2) Material UI (MUI)
- **What**: Design system for buttons, cards, layout; icons via `@mui/icons-material`.
- **Why**: Consistent, accessible UI; responsive grid and AppBar.

### 3) Plaid
- **What**: Secure bank connection. **Client** opens Plaid Link with a short-lived `link_token`. After success, Plaid returns a short-lived **`public_token`**.
- **Why**: Industry-standard for connecting bank accounts.
- **Client Install**:
  ```bash
  npm i react-plaid-link
  ```

### 4) Pipedream
- Workflow A (retrieve-recurring-transactions): Input `{ userId }` → return either `{ tag: "link_token" }` or `{ tag: "recurring_data" }`
- Workflow B (access-token+recurring-transactions-workflow): Input `{ publicToken, userId }` → exchange the token, persist it, and return `{ tag: "storage_success", data: "..." }`. The first scan is then served by Workflow A.
- Environment Variables:
  - `PLAID_CLIENT_ID`, `PLAID_SECRET`
  - `PLAID_ENV` = `sandbox` | `production`
- Pro tip: Do **not replay** old events; Plaid will reject expired tokens (error `INVALID_PUBLIC_TOKEN`).

### 5) Glide
- **Why**: Initiates the entire recurring subscription workflow via a button click

### 6) Cloudflare Worker + Workers KV
- **What**: The authenticated gateway between this app and Pipedream, and the cache in front of it. See [worker/README.md](worker/README.md).
- **Why**: Pipedream URLs and bearer tokens stay out of the browser bundle, and recurring data is cached per user in KV (`tx:<uid>`, 7 days) rather than in the browser.

### 7) Netlify
- **What**: For hosting react application
- **Why**: Make the application accessible
---

## Troubleshooting

### 1) Plaid error: `INVALID_PUBLIC_TOKEN`
- You are exchanging an expired or already-used token. Exchange **immediately** in the Plaid onSuccess handler; guard against double-submission and don’t replay old Pipedream events.

### 2) Page keeps calling Pipedream on reload
- The cache is in Workers KV, not the browser. Check the key exists: `npx wrangler kv key list --binding CACHE --remote` (from `worker/`).
- Nothing is cached unless Pipedream answered with tag `recurring_data` — a `link_token` or an error is deliberately never written.
- `wrangler tail` shows what the Worker actually returned for that request.

### 3) Recurring subscriptions not being fetched from Pipedream
- Ensure that workflows have been deployed
- Ensure that the correct trigger url is being called in React

---

## Security Notes

- Never expose Plaid **access_token** in the browser.
- Exchange the **public_token** server-side immediately after Link success.
- Use HTTPS for all endpoints.
- Treat all user data as sensitive.
- For each workflow in Pipedream, prevent logging.

---

## Possible scenarios which can occur/change

- If finequity.org wants to change the netlify domain.
- Changing cache limit (`CACHE_TTL_SECONDS` in `worker/wrangler.toml`)
- Changing how long results are read before the support dialog appears (`SUPPORT_DIALOG_DELAY_MS` in `LinkPage.jsx`)
- Changing text content of React code
- Changing Pipedream triggers

---