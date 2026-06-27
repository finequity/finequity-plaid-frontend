import React, { useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { toRecurringItems } from "../utils/recurring-data-formatter";

const EXCHANGE_URL = process.env.REACT_APP_ACCESS_TOKEN_RECURRING_TRANSACTIONS_TRIGGER;

const BENEFITS = [
    { icon: <LockRoundedIcon />, text: "Read-only access — no money moves" },
    { icon: <VisibilityOffRoundedIcon />, text: "Your credentials are never stored" },
    { icon: <ShieldRoundedIcon />, text: "Bank-level 256-bit encryption via Plaid" },
];

function Spinner() {
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
                Fetching your subscriptions…
            </Typography>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Box>
    );
}

export default function PlaidButton({ linkToken, onData, userId, phoneNumber }) {
    const [message, setMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

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
                    body: JSON.stringify({ publicToken: public_token, userId: uid, phoneNumber }),
                });
                if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
                const data = await res.json();
                const items = await toRecurringItems(data?.response_object?.data);
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

    if (loading) return <Spinner />;

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
                        Securely scan your transactions to identify recurring subscriptions and charges.
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
                        onClick={() => open()}
                        disabled={!ready}
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

                    {error && (
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
