import React, { useEffect, useState, useCallback } from "react";
import PlaidButton from "../components/PlaidButton.jsx";
import { useSearchParams } from "react-router-dom";
import TopBar, { PageHeader } from "../components/TopBar";
import Subscriptions from "../components/Subscriptions.jsx";
import { toRecurringItems } from "../utils/precurring-data-formatter.js";

// ----- Local cache (no auto-refresh) -----
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12h; adjust as needed
const cacheKey = (uid) => `recurring_cache_v1:${uid}`;

const readCache = (uid) => {
    try {
        const raw = localStorage.getItem(cacheKey(uid));
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (!obj?.items || !Array.isArray(obj.items) || !obj.ts) return null;
        if (Date.now() - obj.ts > CACHE_TTL_MS) return null; // expired
        return obj.items; // fresh
    } catch {
        return null;
    }
};

const writeCache = (uid, items) => {
    try {
        localStorage.setItem(cacheKey(uid), JSON.stringify({ ts: Date.now(), items }));
    } catch { }
};

const LinkPage = () => {
    const [linkToken, setLinkToken] = useState(null);
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("user_id");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [subs, setSubs] = useState([]);

    const fetchFromApi = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setMessage("");

        try {
            const res = await fetch("https://eo9sbw0f05oko1.m.pipedream.net", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

            const data = await res.json();
            const tag = data?.response_object?.tag;

            if (tag === "recurring_data") {
                const items = await toRecurringItems(data?.response_object?.data);
                setSubs(items);
                writeCache(userId, items);     // cache on successful fetch
                setLinkToken(null);
                setMessage(items.length ? "" : "No recurring transactions found.");
            } else if (tag === "link_token") {
                const token = data?.response_object?.data?.link_token;
                setLinkToken(token);
                // IMPORTANT: do not clear subs here; keep any cached data visible.
                setMessage("");
            } else {
                setMessage("No data returned.");
            }
        } catch (err) {
            console.error("Error retrieving recurring data:", err);
            setMessage("Error retrieving data. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            console.error("Missing user_id");
            setLoading(false);
            return;
        }
        localStorage.setItem("user_id", userId);

        // 1) Serve cache if fresh; skip network.
        const cached = readCache(userId);
        if (cached && cached.length) {
            setSubs(cached);
            setLinkToken(null);
            setMessage("");
            setLoading(false);
            return; // no network call, no timers
        }

        // 2) No (fresh) cache → fetch once.
        fetchFromApi();
    }, [userId, fetchFromApi]);

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

    // Fired by PlaidButton after a successful link; it already returns recurring_data.
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
            <TopBar />
            <PageHeader />

            <div style={{ minHeight: "calc(100vh - 80px)", width: "100%" }}>
                {loading ? (
                    <Loader />
                ) : subs.length > 0 ? (
                    <Subscriptions items={subs} />
                ) : linkToken ? (
                    <div style={{ display: "grid", placeItems: "center", padding: "48px 16px" }}>
                        <div style={{ textAlign: "center" }}>
                            <h2 style={{ margin: 0, marginBottom: 12 }}>Connect Your Bank</h2>
                            <PlaidButton linkToken={linkToken} userId={userId} onData={handlePlaidData} />
                        </div>
                    </div>
                ) : (
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
