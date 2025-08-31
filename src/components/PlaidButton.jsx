import React, { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import Button from "@mui/material/Button";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import { toRecurringItems } from "../utils/precurring-data-formatter";

const EXCHANGE_URL = "https://eoed1ewpys9wqba.m.pipedream.net";

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
            aria-label="Loading"
            role="status"
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

export default function PlaidButton({ linkToken, onData, userId }) {
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    // Hook lets us open Plaid from any custom-styled button
    const { open, ready, error } = usePlaidLink({
        token: linkToken,
        onSuccess: async (public_token) => {
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
                const items = await toRecurringItems(data?.response_object?.data);

                // Immediately bubble the data up so LinkPage can render <Subscriptions/>
                onData?.(items);
            } catch (e) {
                console.error(e);
                setIsError(true);
                setMessage("There was an error retrieving recurring transactions.");
                onData?.([]);
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <div style={{ textAlign: "center" }} aria-busy={loading}>
            {/* Hide button while loading; show spinner */}
            {loading ? (
                <Loader />
            ) : (
                <>
                    <div
                        style={{
                            maxWidth: 720,
                            margin: "0 auto 24px",
                            textAlign: "center",
                            padding: "16px 20px",
                            background: "linear-gradient(180deg,#f8fbff 0%, #f3f6ff 100%)",
                            border: "1px solid #e6edff",
                            borderRadius: 12,
                            boxShadow: "0 1px 2px rgba(15,23,42,0.06)",
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                color: "#334155",
                                fontSize: 16,
                                lineHeight: 1.6,
                            }}
                        >
                            Connect your bank to securely scan recent transactions and identify recurring
                            charges and subscriptions. <strong>We use read-only access via Plaid</strong>—no
                            money moves and your credentials aren’t stored. After the scan, you’ll see each
                            subscription’s amount, frequency, and next charge so you can review or cancel
                            what you don’t need.
                        </p>
                    </div>

                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AccountBalanceRoundedIcon />}
                        onClick={() => open()}
                        disabled={!ready}
                        sx={{
                            px: 3,
                            py: 1,
                            borderRadius: "999px",
                            fontWeight: 700,
                            textTransform: "none",
                        }}
                    >
                        Connect a bank account
                    </Button>

                </>

            )}

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

            {error && !loading && (
                <div style={{ marginTop: 8, color: "#a00000", fontSize: 12 }}>
                    Couldn’t initialize Plaid Link. Please refresh and try again.
                </div>
            )}
        </div>
    );
}
