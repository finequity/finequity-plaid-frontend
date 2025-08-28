import React, { useState } from "react";
import { PlaidLink } from "react-plaid-link";
import { toRecurringItems } from "../utils/precurring-data-formatter";

// your exchange endpoint that returns tag: "recurring_data"
const EXCHANGE_URL = "https://eoed1ewpys9wqba.m.pipedream.net";

export default function PlaidButton({ linkToken, onData, userId }) {
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    
    const handleSuccess = async (public_token) => {
        const uid = userId ?? localStorage.getItem("user_id");
        setLoading(true);
        setIsError(false);
        setMessage(null);

        try {
            const res = await fetch(EXCHANGE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ publicToken: public_token, userId: uid }),
            });
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);

            const data = await res.json();
            const items = await toRecurringItems(data?.response_object?.data)
            
            // Immediately bubble the data up so LinkPage can render <Subscriptions/>
            onData?.(items);

            setMessage(
                items.length ? "Recurring data retrieved." : "No recurring transactions found."
            );
        } catch (e) {
            console.error(e);
            setIsError(true);
            setMessage("There was an error retrieving recurring transactions.");
            onData?.([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ textAlign: "center" }}>
            <PlaidLink token={linkToken} onSuccess={handleSuccess}>
                Connect a bank account
            </PlaidLink>

            {loading && <p style={{ marginTop: 16 }}>Loading your recurring subscriptions…</p>}

            {!loading && message && (
                <div
                    style={{
                        marginTop: 20,
                        padding: "12px 14px",
                        borderRadius: 8,
                        backgroundColor: isError ? "#ffe0e0" : "#e7f7ee",
                        color: isError ? "#a00000" : "#0a6b3d",
                        fontWeight: 600,
                        maxWidth: 640,
                        marginInline: "auto",
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
}
