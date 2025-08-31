# finEQUITY – Recurring Subscriptions UI (React + Plaid + Glide)

A small React interface that lets a user connect a bank via **Plaid** and view **recurring transactions / subscriptions** in a clean, responsive UI. It’s written to be approachable for non-programmers, with clear setup steps, caching to reduce API cost, and guidance for Glide integration so the correct user’s data is always shown.

---

## Table of Contents
- [What the App Does](#what-the-app-does)
- [How It Works (High Level)](#how-it-works-high-level)
- [Screens & Components](#screens--components)
- [Data & API Contracts](#data--api-contracts)
- [Caching (to Save Cost)](#caching-to-save-cost)
- [Glide Setup (Correct User ID)](#glide-setup-correct-user-id)
- [Running the App](#running-the-app)
- [Configuration](#configuration)
- [Technologies Used & How They’re Set Up](#technologies-used--how-theyre-set-up)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Extending the App](#extending-the-app)
- [Quick Command Cheatsheet](#quick-command-cheatsheet)

---

## What the App Does

1. Shows a **Subscriptions** page with a sticky header and short intro.
2. If data exists (from cache or API), it displays **uniform cards** for each recurring transaction:
   - **Name** (description), **Amount** (always positive with `$`), **Category**, **Frequency** (Monthly/Weekly), **Next** and **Last** charge dates.
3. If the user hasn’t linked a bank yet, it shows a **Connect a bank account** button powered by **Plaid Link**.
4. **After connecting**, the app sends a secure short-lived token to your backend (Pipedream or server), which returns **recurring_data**. The page **shows it immediately** and **caches it** for 12 hours.
5. On future visits, the page **uses the cache** and **does not** call the backend unless the cache has expired.

---

## How It Works (High Level)

- **LinkPage.jsx** (main page)
  - Reads `user_id` from the URL (e.g. `?user_id=abc123`).
  - Checks a **local cache** for this user:
    - If **fresh** → **renders** the Subscriptions grid.
    - If missing/expired → **calls your backend** once to get either a Plaid `link_token` or immediate `recurring_data`.
  - When the user completes Plaid Link, the page receives `recurring_data` and renders it immediately, updating the cache.

- **PlaidButton.jsx**
  - Renders the Plaid Link button using the `link_token`.
  - On success, calls your backend “exchange” endpoint with the new **public_token**.
  - Your backend returns **`tag: "recurring_data"`**. The component passes this list up to `LinkPage` via `onData(items)`.

- **Subscriptions (CardGrid)**
  - Material UI **Cards** that are responsive and uniform (fixed min width/height across rows).
  - Description + amount share the first line (description ellipsizes to avoid overflow).

- **TopBar / PageHeader**
  - Sticky AppBar with a spacer so content doesn’t hide underneath.
  - Centered page title and subtitle (“Review Your Subscriptions”).

---

## Screens & Components

```
src/
  components/
    TopBar.jsx                # Sticky AppBar + exported PageHeader
    PlaidButton.jsx           # Plaid Link; returns recurring_data via onData(...)
    Subscriptions.jsx         # (or CardGrid.jsx) renders the cards
  pages/
    LinkPage.jsx              # Main page: caching + fetch + render logic
  App.jsx, main.jsx           # App bootstrap
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
  { "response_object": { "tag": "link_token", "data": { "link_token": "..." } } }
  ```
  or
  ```json
  { "response_object": { "tag": "recurring_data", "data": [ /* items */ ] } }
  ```

- **Exchange (after Plaid Link success)**: returns
  ```json
  { "response_object": { "tag": "recurring_data", "data": [ /* items */ ] } }
  ```

> Plaid token note: `public_token` must be exchanged **immediately** and only once; never replay it.

---

## Caching (to Save Cost)

- The UI caches each user’s list for **12 hours** to avoid unnecessary backend calls.
- On page load:
  - If cache is **fresh** → show data, **no network**.
  - If cache is **missing/expired** → call backend once and refresh the cache.
- After Plaid link success, the app **shows and caches** the returned items immediately.

Change the TTL in `LinkPage.jsx`:
```js
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
```

LocalStorage key (per user):
```js
const cacheKey = (uid) => `recurring_cache_v1:${uid}`;
```

---

## Glide Setup (Correct User ID)

To ensure each user sees **their** data:

1. **Enable User Profiles**  
   Settings → *User data* → **User Profiles** → select the **Users** table and its Email column.
2. **Access** → choose **Users table** (recommended) rather than “All emails in table”.
3. In **Users** table, add a **Template** column, e.g. `WebAppURL`:
   ```
   https://YOUR-DOMAIN.com/link?user_id=[This Row → Row ID]
   ```
4. On your button action, use **Open Link** with **User Profile → WebAppURL**.

If the button lives on another table (e.g., Onboarding), add a **Single Value** column there pulling **User Profile → Row ID**, then build the template with that value.

> Do **not** use the screen’s Row ID (often Admin); always use **User Profile → Row ID**.

---

## Running the App

### Prerequisites
- Node.js 18+ and npm (or pnpm/yarn)
- A Plaid account + backend endpoints (Pipedream or server) for **retrieve** and **exchange**

### Install
```bash
npm install
```

### Start (development)
If using **Vite**:
```bash
npm run dev
```
If using **Create React App**:
```bash
npm start
```

### Build (production)
```bash
npm run build
```

Optional static serve:
```bash
# For Vite
npx serve -s dist
# For CRA
npx serve -s build
```

---

## Configuration

- **Endpoints**  
  Replace sample URLs in code with your own:
  - `RETRIEVE_URL` (returns `link_token` or `recurring_data` on page load)
  - `EXCHANGE_URL` (accepts Plaid `public_token` after link; returns `recurring_data`)

- **User identity**  
  The page reads `user_id` from the URL, accepting `user_id`, `userId`, `userid`, or `uid`. Avoid using localStorage for identity; pass it via URL (and to `PlaidButton` via props).

- **Icons / MUI**  
  Install icon pack if missing:
  ```bash
  npm i @mui/icons-material
  ```

---

## Technologies Used & How They’re Set Up

This project is deliberately lightweight and uses a few well-known tools. Below is a practical guide to what each piece does and how to set it up from scratch.

### 1) React (App Framework) + Router
- **What**: The component model and client-side navigation.
- **Why**: Fast, flexible UI with reusable components.
- **Setup**:
  - Install (already present in this repo if you cloned it). If starting fresh:
    ```bash
    # Vite (recommended)
    npm create vite@latest my-app -- --template react
    cd my-app && npm install
    ```
  - Router:
    ```bash
    npm i react-router-dom
    ```
    In `App.jsx`, define routes (simplified):
    ```jsx
    import { BrowserRouter, Routes, Route } from "react-router-dom";
    import LinkPage from "./pages/LinkPage.jsx";

    export default function App() {
      return (
        <BrowserRouter>
          <Routes>
            <Route path="/link" element={<LinkPage />} />
          </Routes>
        </BrowserRouter>
      );
    }
    ```
    The page expects a query param like `?user_id=<RowID>`.

### 2) Material UI (MUI) for Components & Icons
- **What**: Design system for buttons, cards, layout; icons via `@mui/icons-material`.
- **Why**: Consistent, accessible UI; responsive grid and AppBar.
- **Install**:
  ```bash
  npm i @mui/material @emotion/react @emotion/styled @mui/icons-material
  ```
- **Theme (optional but recommended)**:
  ```jsx
  // main.jsx
  import { ThemeProvider, createTheme } from "@mui/material/styles";
  import CssBaseline from "@mui/material/CssBaseline";
  import App from "./App.jsx";

  const theme = createTheme({
    palette: {
      primary: { main: "#1d4ed8" },   // blue AppBar
      warning: { main: "#f59e0b" },
    },
    shape: { borderRadius: 12 },
  });

  ReactDOM.createRoot(document.getElementById("root")).render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
  ```
- **Sticky AppBar pattern** (already implemented in `TopBar.jsx`):
  - Use `position="fixed"` and add a `<Toolbar />` or `theme.mixins.toolbar` spacer immediately after the AppBar.

### 3) Plaid Link (Client) + Plaid API (Server)
- **What**: Secure bank connection. **Client** opens Plaid Link with a short-lived `link_token`. After success, Plaid returns a short-lived **`public_token`**.
- **Why**: Industry-standard for connecting bank accounts.
- **Client Install**:
  ```bash
  npm i react-plaid-link
  ```
- **Server Requirements** (Node/Express, or Pipedream/Cloud Functions):
  - Must expose endpoints to:
    1. **Create Link Token** (`/api/create_link_token`) → returns `{ link_token }`
    2. **Exchange Public Token** (`/api/exchange_public_token`) → returns `{ access_token }` (server-side only)
    3. **Get Recurring Data** (`/api/recurring`) using the `access_token`
- **Server Example (Node/Express, pseudo)**:
  ```js
  import express from "express";
  import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

  const config = new Configuration({
    basePath: PlaidEnvironments.sandbox, // or development/production
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET
      }
    }
  });
  const plaid = new PlaidApi(config);
  const app = express();
  app.use(express.json());

  app.post("/api/create_link_token", async (req, res) => {
    const { userId } = req.body;
    const r = await plaid.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "finEQUITY",
      products: ["transactions"],           // add "transactions" for recurring endpoints
      country_codes: ["US"],
      language: "en",
    });
    res.json({ link_token: r.data.link_token });
  });

  app.post("/api/exchange_public_token", async (req, res) => {
    const { publicToken } = req.body;       // received immediately from Plaid Link
    const exchange = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchange.data.access_token;
    // Example recurring transactions fetch:
    const recurring = await plaid.transactionsRecurringGet({ access_token: accessToken });
    res.json({ tag: "recurring_data", data: recurring.data.transactions ?? [] });
  });

  app.listen(3001);
  ```
  > Never send the **access_token** to the browser. Keep it server-side.

- **Pipedream Setup** (if you’re not running a server):
  - Workflow A (Retrieve): Input `{ userId }` → return either `{ tag: "link_token" }` or `{ tag: "recurring_data" }`
  - Workflow B (Exchange): Input `{ publicToken, userId }` → exchange the token and return `{ tag: "recurring_data", data: [...] }`
  - Pro tip: Do **not replay** old events; Plaid will reject expired tokens (error `INVALID_PUBLIC_TOKEN`).

- **Environment Variables** (server/Pipedream):
  - `PLAID_CLIENT_ID`, `PLAID_SECRET`
  - `PLAID_ENV` = `sandbox` | `development` | `production`

### 4) Glide Integration (Passing the Right User)
- **Goal**: Open `https://YOUR-DOMAIN.com/link?user_id=<SIGNED-IN ROWID>`
- **Steps**:
  1. **Enable User Profiles** → pick **Users** table + Email column.
  2. **Access** → choose **Users table**.
  3. **Users table** → add Template `WebAppURL`:
     ```
     https://YOUR-DOMAIN.com/link?user_id=[This Row → Row ID]
     ```
  4. In your button action → **Open Link** with **User Profile → WebAppURL**.
- **Common Pitfall**: Using the screen’s Row ID (often Admin) instead of **User Profile → Row ID**.
- **Optional**: If the button lives on a non-Users table, add a **Single Value** column that pulls **User Profile → Row ID** into that row and build the template from it.

### 5) Local Cache (Front-End)
- **What**: Cache recurring items per user for 12 hours to avoid repeated calls.
- **Where**: Implemented in `LinkPage.jsx` using `localStorage`.
- **Behavior**: Use cache on load; fetch only when missing/expired; update cache after Plaid success.

### 6) Build & Deploy
- **Build**:
  ```bash
  npm run build
  ```
- **Hosting**: Any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront). For single-page apps, add a **rewrite** so unknown paths route to `index.html`.
  - Netlify `_redirects`:
    ```
    /*    /index.html   200
    ```
  - Vercel: framework preset handles SPA fallback automatically for Vite/React.

- **CORS**: If your backend lives on a different domain, enable CORS for your app’s origin on the backend routes you call.

---

## Troubleshooting

### Always shows Admin’s data
Glide link is built from the screen’s row, not **User Profile**. Fix the template to use **User Profile → Row ID**.

### Plaid error: `INVALID_PUBLIC_TOKEN`
You are exchanging an expired or already-used token. Exchange **immediately** in the Plaid onSuccess handler; guard against double-submission and don’t replay old Pipedream events.

### Page keeps fetching on reload
- Cache TTL too short or cache not written. Confirm `writeCache()` is called.
- Do **not** clear `subs` when a `link_token` arrives—keep cached data visible until new data is fetched.

### Header hides the page title
Use a fixed AppBar with a `Toolbar` spacer (already done in `TopBar.jsx`).

---

## Security Notes

- Never expose Plaid **access_token** in the browser.
- Exchange the **public_token** server-side immediately after Link success.
- Use HTTPS for all endpoints.
- Treat all user data as sensitive; follow your data handling policies.

---

## Extending the App

- **Cancel/Disable** buttons that call your backend to pause/cancel a subscription.
- **Filters/sorting** by category, amount, next charge.
- **Grouping** by bank account (“Checking”, “Savings”).
- **Empty state** education or onboarding tips when no items are found.

---

## Quick Command Cheatsheet

```bash
# install deps
npm install

# dev (Vite)
npm run dev

# dev (CRA)
npm start

# build
npm run build

# optional: serve production build locally
npx serve -s dist   # Vite
npx serve -s build  # CRA
```
