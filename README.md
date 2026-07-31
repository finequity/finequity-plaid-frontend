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
- [Technologies Used & How They’re Set Up](#technologies-used--how-theyre-set-up)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)

---

## What the App Does

1. Shows a recurring **Subscriptions** data of a user.
2. If data exists (from cache or API), it displays **uniform cards** for each recurring subscription:
   - **Name** (description), **Amount** (always positive with `$`), **Category**, **Frequency** (Monthly/Weekly), **Next** and **Last** charge dates.
3. If the user hasn’t linked a bank yet, it allows the user to connect their bank account via **Plaid Link**.
4. **After connecting**, the app displays a list of recurring subscriptions and **caches it** for 12 hours.
5. On future visits, the page **uses the cache** and **does not** call the backend unless the cache has expired.

---

## How It Works (High Level)

The app is a **one-time onboarding portal**: connect a bank once, run a first
scan, and from then on monitoring and alerts happen automatically over SMS.
`LinkPage.jsx` walks users through that as a small stage machine:

| Stage | What the user sees | Leaves when |
| --- | --- | --- |
| `LOADING` | Spinner | `/transactions` answers |
| `CONNECT` | Plaid connect card (step 1 of 3) | Bank linked |
| `ONBOARDED` | **Onboarding complete** screen (step 2 of 3) | “Show my subscriptions” clicked |
| `SCANNING` | First-scan spinner | Recurring data returns |
| `RESULTS` | Subscription list + post-scan panel (step 3 of 3) | — |
| `MESSAGE` | Expired session / error / no data | — |

Returning users whose recurring data is already cached land straight in
`RESULTS` with no setup framing — the first run is deliberately the only time
the step indicator and onboarding copy appear.

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

- **OnboardingSteps.jsx**
  - Connect bank → First scan → Your results indicator, rendered in the page
    header during onboarding only.

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
    Subscriptions.jsx             # Renders the cards
    PostScanPanel.jsx             # SMS monitoring recap + schedule-a-call CTA
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
  No recurring data comes back here. The UI shows the onboarding-complete screen
  and fetches the first scan from **Retrieve** when the user asks for it.
  (The legacy `recurring_data` exchange response is still handled — it skips
  straight to the results list.)

> Plaid token note: `public_token` must be exchanged **immediately** and only once; never replay it.

---

## Caching (to Save Cost)

- The UI caches each user’s list for **12 hours** to avoid unnecessary Pipedream calls.
- On page load:
  - If cache is **fresh** → show data.
  - If cache is **missing/expired** → call pipedream once and refresh (update) the cache.

Change the TTL in `LinkPage.jsx`:
```js
const CACHE_TTL_MS = 1000 * 60 * 60 * 12;   // 12 hours
```

LocalStorage key (per user):
```js
const cacheKey = (uid) => `recurring_cache_v1:${uid}`;
```

---

## Running the App

### Prerequisites
- Node.js 18+ and npm
- A Plaid account
- Pipedream account and workflow setups for **retrieving subscription data** and **exchanging public token for access token**

### Clone repository
```bash
git clone https://github.com/finequity/finequity-plaid-frontend.git
```

### Install all package modules
```bash
npm install
```

### Start development server
```bash
npm start
```

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

### 6) Local Cache (Front-End)
- **What**: Cache recurring subscription items per user for 12 hours to avoid repeated calls.
- **Where**: Implemented in `LinkPage.jsx` using `localStorage`.
- **Behavior**: Use cache on load; fetch only when missing/expired; update cache after Plaid recurring data success.

### 7) Netlify
- **What**: For hosting react application
- **Why**: Make the application accessible
---

## Troubleshooting

### 1) Plaid error: `INVALID_PUBLIC_TOKEN`
- You are exchanging an expired or already-used token. Exchange **immediately** in the Plaid onSuccess handler; guard against double-submission and don’t replay old Pipedream events.

### 2) Page keeps fetching on reload
- Cache TTL too short or cache not written. Confirm `writeCache()` is called.
- Do **not** clear `subs` when a `link_token` arrives—keep cached data visible until new data is fetched.

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
- Changing cache limit (ie. how long recurring subscription data remain in cache)
- Changing text content of React code 
- Changing Pipedream triggers

---