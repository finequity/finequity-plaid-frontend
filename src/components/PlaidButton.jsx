import React, { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import TextsmsRoundedIcon from "@mui/icons-material/TextsmsRounded";
import { toRecurringItems } from "../utils/recurring-data-formatter";

// Token exchange goes through the Cloudflare Worker gateway (see ../../worker/),
// which verifies the per-user proof and holds the Pipedream credentials.
const EXCHANGE_URL = `${process.env.REACT_APP_WORKER_URL}/api/exchange`;

const BENEFITS = [
    { icon: <LockRoundedIcon />, text: "Read-only access — no money moves" },
    { icon: <TextsmsRoundedIcon />, text: "One-time setup — after this we text you updates" },
];

function Spinner({ label }) {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 6 }}>
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    border: "3px solid #dbeafe",
                    borderTopColor: "#1d4ed8",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                }}
                role="status"
                aria-label="Loading"
            />
            <Typography sx={{ fontSize: 14, color: "#94a3b8", fontWeight: 500 }}>
                {label}
            </Typography>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Box>
    );
}

/**
 * First bank connection — step 1 of onboarding.
 *
 * The exchange trigger no longer returns recurring data: it persists the access
 * token and answers { response_object: { tag: "storage_success" } }. So a
 * successful link ends this step and hands off to the "Onboarding complete"
 * screen (onLinked), where the user runs their first scan on demand.
 *
 * onData is kept for the legacy shape — an exchange that still answers with
 * `recurring_data` skips straight to the results list.
 *
 * demo=true drives the same flow off local data (no Plaid, no network) so the
 * onboarding walkthrough can be shown end-to-end. See LinkPage's USE_MOCK.
 */
export default function PlaidButton({ linkToken, onData, onLinked, uid, ts, proof, demo = false }) {
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const { open, ready, error } = usePlaidLink({
        // In demo mode there is no real link token; Plaid Link is never opened.
        token: demo ? null : linkToken,
        onSuccess: async (public_token) => {
            setLoading(true);
            setIsError(false);
            setMessage(null);
            try {
                const res = await fetch(EXCHANGE_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ publicToken: public_token, uid, ts, proof }),
                });
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                const data = await res.json();
                const tag = data?.response_object?.tag;

                if (tag === "storage_success") {
                    onLinked?.();
                } else if (tag === "recurring_data") {
                    // Legacy exchange workflow: data came back with the exchange.
                    const items = await toRecurringItems(data?.response_object?.data);
                    onData?.(items);
                } else {
                    throw new Error(`Unexpected exchange response tag: ${tag ?? "none"}`);
                }
            } catch (e) {
                console.error(e);
                setIsError(true);
                setMessage("We couldn't finish connecting your account. Please refresh and try again.");
            } finally {
                setLoading(false);
            }
        },
    });

    // Demo: stand in for the Plaid handoff + token exchange, then land on the
    // "Onboarding complete" screen exactly as the live flow does.
    const startDemoLink = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onLinked?.();
        }, 1400);
    };

    if (loading) return <Spinner label="Securing your connection…" />;

    return (
        <Box sx={{ maxWidth: 560, mx: "auto", px: { xs: 2, sm: 0 } }} aria-busy={loading}>
            {/* Main connect card */}
            <Box
                sx={{
                    bgcolor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)",
                    overflow: "hidden",
                }}
            >
                {/* Gradient banner */}
                <Box
                    sx={{
                        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                        py: 4,
                        px: 3,
                        textAlign: "center",
                        position: "relative",
                        overflow: "hidden",
                    }}
                >
                    {/* Decorative ring */}
                    <Box
                        sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%,-50%)",
                            width: 200,
                            height: 200,
                            borderRadius: "50%",
                            border: "1px solid rgba(255,255,255,0.1)",
                            pointerEvents: "none",
                        }}
                    />

                    {/* Bank icon */}
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: "18px",
                            bgcolor: "rgba(255,255,255,0.14)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            mb: 2,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        <AccountBalanceRoundedIcon sx={{ color: "#fff", fontSize: 32 }} />
                    </Box>

                    {/* First-run framing: this screen is setup, not the day-to-day app. */}
                    <Box
                        sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.6,
                            px: 1.25,
                            py: 0.5,
                            mb: 1.25,
                            borderRadius: 999,
                            bgcolor: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: "0.08em", lineHeight: 1 }}>
                            ONE-TIME SETUP · STEP 1
                        </Typography>
                    </Box>

                    <Typography
                        sx={{
                            color: "#fff",
                            fontWeight: 800,
                            fontSize: 20,
                            mb: 0.75,
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        Connect your bank
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: 14,
                            lineHeight: 1.55,
                            maxWidth: 340,
                            mx: "auto",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        Link your account once so we can find your recurring charges. After
                        this, monitoring runs on its own — no need to come back here.
                    </Typography>
                </Box>

                {/* Benefits list */}
                <Box sx={{ px: 3, py: 2.5 }}>
                    <Stack spacing={1.25}>
                        {BENEFITS.map(({ icon, text }) => (
                            <Box
                                key={text}
                                sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                            >
                                <Box
                                    sx={{
                                        width: 30,
                                        height: 30,
                                        borderRadius: "8px",
                                        bgcolor: "#eff6ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    {React.cloneElement(icon, { sx: { fontSize: 16, color: "#1d4ed8" } })}
                                </Box>
                                <Typography sx={{ fontSize: 14, color: "#334155", lineHeight: 1.4 }}>
                                    {text}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                </Box>

                {/* CTA */}
                <Box
                    sx={{
                        px: 3,
                        pb: 3,
                        pt: 0.5,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "stretch",
                        gap: 1.25,
                    }}
                >
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<AccountBalanceRoundedIcon />}
                        onClick={() => (demo ? startDemoLink() : open())}
                        disabled={!demo && !ready}
                        sx={{
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: 15,
                            textTransform: "none",
                            py: 1.4,
                            background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)",
                            boxShadow: "0 4px 14px rgba(29,78,216,0.35)",
                            "&:hover": {
                                background: "linear-gradient(90deg, #1e40af 0%, #1d4ed8 100%)",
                                boxShadow: "0 6px 20px rgba(29,78,216,0.4)",
                            },
                            "&:disabled": { background: "#e2e8f0" },
                        }}
                    >
                        Connect a bank account
                    </Button>

                    {/* Status message */}
                    {message && (
                        <Box
                            sx={{
                                borderRadius: "10px",
                                px: 2,
                                py: 1.25,
                                bgcolor: isError ? "#fef2f2" : "#f0fdf4",
                                border: "1px solid",
                                borderColor: isError ? "#fca5a5" : "#bbf7d0",
                            }}
                        >
                            <Typography
                                sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: isError ? "#b91c1c" : "#15803d",
                                    textAlign: "center",
                                }}
                            >
                                {message}
                            </Typography>
                        </Box>
                    )}

                    {error && !demo && (
                        <Typography sx={{ fontSize: 12, color: "#ef4444", textAlign: "center" }}>
                            Couldn't initialize Plaid Link. Please refresh and try again.
                        </Typography>
                    )}
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        borderTop: "1px solid #f1f5f9",
                        bgcolor: "#fafafa",
                        px: 3,
                        py: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.75,
                    }}
                >
                    <CheckCircleRoundedIcon sx={{ fontSize: 14, color: "#22c55e" }} />
                    <Typography sx={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
                        Trusted by thousands · Powered by Plaid
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
