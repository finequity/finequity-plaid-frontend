/**
 * LinkPage.jsx
 * 
 * -------------
 * 
 * Main page responsible for:
 *  - Reading the user_id from the URL
 *  - Serving cached recurring data (to save cost) or fetching from backend once if cache is missing/expired
 *  - Rendering either: a loader, the Subscriptions grid, the Plaid connect UI, or a status message
 *  - Caching fresh results and updating UI when Plaid returns recurring data
 */
import React, { useEffect, useState, useCallback } from "react";
import PlaidButton from "../components/PlaidButton.jsx";
import { useSearchParams } from "react-router-dom";
import TopBar, { PageHeader } from "../components/TopBar";
import Subscriptions from "../components/Subscriptions.jsx";
import { toRecurringItems } from "../utils/recurring-data-formatter.js";

// Base url
const BASE_URL = process.env.REACT_APP_RETRIEVE_RECURRING_TRANSACTIONS_TRIGGER;

// ----- Local cache (no auto-refresh) -----
// TTL is 12 hours; adjust as needed to control how often the API is called.
const CACHE_TTL_MS = Number(process.env.REACT_APP_CACHE_TTL_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Namespace the cache by user_id so each user sees only their own cached list.
const cacheKey = (uid) => `recurring_cache_v1:${uid}`;

// Safely read a user's cached items. Returns `null` if missing/invalid/expired.
const readCache = (uid) => {
    try {
        const raw = localStorage.getItem(cacheKey(uid));
        if (!raw) return null;                       // nothing cached
        const obj = JSON.parse(raw);
        if (!obj?.items || !Array.isArray(obj.items) || !obj.ts) return null; // invalid shape
        if (Date.now() - obj.ts > CACHE_TTL_MS) return null;                  // expired
        return obj.items; // fresh items
    } catch {
        // If parsing fails or localStorage errors, fail safely with null.
        return null;
    }
};

// Write items to cache with a timestamp for TTL tracking.
const writeCache = (uid, items) => {
    try {
        localStorage.setItem(cacheKey(uid), JSON.stringify({ ts: Date.now(), items }));
    } catch { }
};

const LinkPage = () => {
    // linkToken: if backend returns a link_token, we show the Plaid connect flow
    const [linkToken, setLinkToken] = useState(null);

    // extract user_id from query string (?user_id=...)
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("user_id");

    // user-visible status & loading state
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    // subs: normalized recurring items to display
    const [subs, setSubs] = useState([]);

    // Encapsulated fetch that hits the backend *once* when no fresh cache exists.
    const fetchFromApi = useCallback(async () => {
        if (!userId) return;         // guard: we need userId to ask the backend
        setLoading(true);
        setMessage("");

        try {
            // POST to your backend (Pipedream/Server) with this userId.
            // The backend responds with either a link_token or recurring_data.
            const res = await fetch(BASE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

            const data = await res.json();
            const tag = data?.response_object?.tag;

            if (tag === "recurring_data") {
                // We received recurring data; normalize and display.
                const items = await toRecurringItems(data?.response_object?.data);

                setSubs(items);
                writeCache(userId, items);     // cache on successful fetch
                setLinkToken(null);            // no need to show connect UI
                setMessage(items.length ? "" : "No recurring transactions found.");
            } else if (tag === "link_token") {
                // We received a link_token; render the Plaid button so the user can connect.
                const token = data?.response_object?.data?.link_token;

                setLinkToken(token);
                // IMPORTANT: do not clear subs here; keep any cached data visible for a smoother UX.
                setMessage("");
            } else {
                // Edge case: unexpected payload
                setMessage("No data returned.");
            }
        } catch (err) {
            // Network or server error: surface a friendly message
            console.error("Error retrieving recurring data:", err);
            setMessage("Error retrieving data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        // Validate presence of userId from query string
        if (!userId) {
            console.error("Missing user_id");
            setLoading(false);
            return;
        }

        // Persist userId locally so PlaidButton can read it if not passed as a prop
        localStorage.setItem("user_id", userId);

        // 1) Serve fresh cache immediately and skip network
        const cached = readCache(userId);
        if (cached && cached.length) {
            setSubs(cached);     // show cached items
            setLinkToken(null);  // no need to show connect UI if we have data
            setMessage("");
            setLoading(false);
            return;              // stop here; no fetch, no timers
        }

        // 2) No (fresh) cache → do a single backend fetch
        fetchFromApi();
    }, [userId, fetchFromApi]);

    // Tiny inline spinner used in a few places
    const Loader = () => (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div
                style={{
                    width: 28,
                    height: 28,
                    border: "3px solid #c7eadb",
                    borderTopColor: "#0a6b3d",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    // Fired by PlaidButton after a successful link; Plaid exchange endpoint returns recurring_data.
    // We normalize, cache, and render; also hide the connect UI once data arrives.
    const handlePlaidData = (items) => {
        if (Array.isArray(items)) {
            setSubs(items);
            writeCache(userId, items);   // Cache from Plaid success
            setLinkToken(null);          // Hide connect UI now that we have data
            setMessage(items.length ? "" : "No recurring transactions found.");
        }
    };

    
    return (
        <>
            {/* Sticky top bar + page title/description */}
            <TopBar />
            <PageHeader />

            {/* Main content area; conditional rendering based on state */}
            <div style={{ minHeight: "calc(100vh - 80px)", width: "100%" }}>
                {loading ? (
                    // A) Loading state (initial fetch or transition)
                    <Loader />
                ) : subs.length > 0 ? (
                    // B) We have subscriptions → render the grid
                    <Subscriptions items={subs} />
                ) : linkToken ? (
                    // C) No data yet but we have a link_token → show Plaid connect UI
                    <div style={{ display: "grid", placeItems: "center", padding: "48px 16px" }}>
                        <div style={{ textAlign: "center" }}>
                            <PlaidButton linkToken={linkToken} userId={userId} onData={handlePlaidData} />
                        </div>
                    </div>
                ) : (
                    // D) Fallback message (e.g., error or empty with no link_token)
                    <div
                        style={{
                            padding: "12px 14px",
                            borderRadius: "90px",
                            backgroundColor: "#e7f7ee",
                            color: "#0a6b3d",
                            fontWeight: 600,
                            textAlign: "center",
                            maxWidth: 640,
                            margin: "48px auto",
                        }}
                    >
                        {message || "Ready."}
                    </div>
                )}
            </div>
        </>
    );
};

export default LinkPage;
