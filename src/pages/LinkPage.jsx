import React, { useEffect, useState, useCallback, useRef } from "react";
import PlaidButton from "../components/PlaidButton.jsx";
import TopBar, { PageHeader } from "../components/TopBar";
import Footer from "../components/Footer";
import Subscriptions from "../components/Subscriptions.jsx";
import { toRecurringItems } from "../utils/recurring-data-formatter.js";
import { MOCK_RESPONSE } from "../mocks/recurring-mock-response.js";

// MUI layout + typography
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

// Icons for sidebars (Risk Guide + security footer only)
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import RemoveRedEyeRoundedIcon from "@mui/icons-material/RemoveRedEyeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

// ─── Mock mode ─────────────────────────────────────────────────────────────────
// Set to true to bypass the API and use local test data (see ../mocks/recurring-mock-response.js).
// Must remain false in production.
const USE_MOCK = false;

// ─── API config ────────────────────────────────────────────────────────────────
// All requests go through the Cloudflare Worker gateway (see ../../worker/):
// it holds the Pipedream secrets and caches recurring data server-side in KV,
// so nothing sensitive is stored in the browser or shipped in this bundle.
const WORKER_URL = process.env.REACT_APP_WORKER_URL;

// ─── Auth from URL fragment ────────────────────────────────────────────────────
// Glide embeds this app in a Web Embed iframe with #uid=..&ts=..&proof=..
// (a fragment — browsers never send it to servers, so it stays out of logs).
// Read it exactly once, then scrub it from the address bar. Idempotent so
// re-renders (or StrictMode double-invokes) can't lose the credentials.
let _authFromFragment = null;
const readAuthFromFragment = () => {
    if (_authFromFragment) return _authFromFragment;
    const params = new URLSearchParams(window.location.hash.slice(1));
    _authFromFragment = {
        uid: params.get("uid"),
        ts: params.get("ts"),
        proof: params.get("proof"),
    };
    if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return _authFromFragment;
};

// ─── Sidebar: How It Works ─────────────────────────────────────────────────────

const HOW_STEPS = [
    {
        color: "#1d4ed8",
        title: "Connect your bank",
        body: "Link your account through Plaid's encrypted portal. Your login credentials are never stored.",
    },
    {
        color: "#1d4ed8",
        title: "We scan transactions",
        body: "We read up to 24 months of outflow transactions in read-only mode — no money ever moves.",
    },
    {
        color: "#1d4ed8",
        title: "Charges identified",
        body: "Recurring charges are automatically detected and grouped using Plaid's intelligence engine.",
    },
    {
        color: "#1d4ed8",
        title: "Review & act",
        body: "See every subscription's amount, frequency, and next charge — then cancel what you don't need.",
    },
];

function HowItWorksPanel() {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(15,23,42,0.07)",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    borderBottom: "1px solid #e2e8f0",
                    background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.3 }}>
                    How It Works
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                    From bank connect to insight in seconds.
                </Typography>
            </Box>

            {/* Steps */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 2.5 }}>
                <Stack spacing={0}>
                    {HOW_STEPS.map((step, idx) => (
                        <Box key={step.title} sx={{ display: "flex", gap: 1.5 }}>
                            {/* Timeline column */}
                            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                                {/* Numbered circle */}
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "50%",
                                        bgcolor: step.color,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        boxShadow: `0 2px 8px ${step.color}40`,
                                    }}
                                >
                                    <Typography sx={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1 }}>
                                        {idx + 1}
                                    </Typography>
                                </Box>

                                {/* Connector line */}
                                {idx < HOW_STEPS.length - 1 && (
                                    <Box
                                        sx={{
                                            width: 2,
                                            flex: 1,
                                            minHeight: 28,
                                            bgcolor: "#e2e8f0",
                                            my: 0.75,
                                            borderRadius: 1,
                                        }}
                                    />
                                )}
                            </Box>

                            {/* Text */}
                            <Box sx={{ pb: idx < HOW_STEPS.length - 1 ? 2.5 : 0, pt: 0.5 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#0f172a", lineHeight: 1.3, mb: 0.5 }}>
                                    {step.title}
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.55 }}>
                                    {step.body}
                                </Typography>
                            </Box>
                        </Box>
                    ))}
                </Stack>
            </Box>
        </Box>
    );
}

// ─── Sidebar: Risk Flag Guide ──────────────────────────────────────────────────

const RISK_LEVELS = [
    {
        icon: <WarningAmberRoundedIcon />,
        label: "LIKELY FRAUD",
        iconColor: "#ef4444",
        iconBg: "#fee2e2",
        chipColor: "#b91c1c",
        chipBg: "#fee2e2",
        chipBorder: "#fca5a5",
        body: "Patterns match known fraudulent or unauthorised charges. Contact your bank immediately to dispute.",
    },
    {
        icon: <WarningAmberRoundedIcon />,
        label: "LIKELY SCAM",
        iconColor: "#f59e0b",
        iconBg: "#fef3c7",
        chipColor: "#92400e",
        chipBg: "#fef3c7",
        chipBorder: "#fde68a",
        body: "Predatory subscription tactics — misleading trials, hidden fees, or near-impossible cancellations.",
    },
    {
        icon: <RemoveRedEyeRoundedIcon />,
        label: "WORTH WATCHING",
        iconColor: "#3b82f6",
        iconBg: "#dbeafe",
        chipColor: "#1e40af",
        chipBg: "#dbeafe",
        chipBorder: "#93c5fd",
        body: "Not confirmed risky but worth a closer look. Verify you still actively use this service.",
    },
    {
        icon: <CheckCircleRoundedIcon />,
        label: "NONE",
        iconColor: "#22c55e",
        iconBg: "#dcfce7",
        chipColor: "#166534",
        chipBg: "#dcfce7",
        chipBorder: "#86efac",
        body: "No risk indicators detected. Consistent with a standard recurring charge.",
    },
];

function RiskGuidePanel() {
    return (
        <Box
            sx={{
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(15,23,42,0.07)",
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    px: 2.5,
                    py: 2,
                    borderBottom: "1px solid #e2e8f0",
                    background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%)",
                }}
            >
                <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#fff", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.3 }}>
                    Risk Flag Guide
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.4 }}>
                    What each flag means for your finances.
                </Typography>
            </Box>

            {/* Risk levels */}
            <Stack
                spacing={0}
                divider={<Divider sx={{ borderColor: "#f1f5f9" }} />}
                sx={{ px: 2.5, py: 1.5 }}
            >
                {RISK_LEVELS.map((r) => (
                    <Box key={r.label} sx={{ py: 1.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6 }}>
                            {/* Mini chip */}
                            <Box
                                sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.4,
                                    px: 0.8,
                                    py: 0.3,
                                    borderRadius: "5px",
                                    bgcolor: r.chipBg,
                                    border: `1px solid ${r.chipBorder}`,
                                }}
                            >
                                {React.cloneElement(r.icon, { sx: { fontSize: 11, color: r.chipColor } })}
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: r.chipColor, letterSpacing: "0.05em", lineHeight: 1 }}>
                                    {r.label.toUpperCase()}
                                </Typography>
                            </Box>
                        </Box>
                        <Typography sx={{ fontSize: 12, color: "#64748b", lineHeight: 1.55 }}>
                            {r.body}
                        </Typography>
                    </Box>
                ))}
            </Stack>

            {/* Security footer */}
            <Box
                sx={{
                    borderTop: "1px solid #f1f5f9",
                    bgcolor: "#fafafa",
                    px: 2.5,
                    py: 1.5,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1,
                }}
            >
                <LockRoundedIcon sx={{ fontSize: 14, color: "#94a3b8", mt: 0.2, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.5 }}>
                    All data is encrypted in transit. Read-only access — your credentials are never stored.
                </Typography>
            </Box>
        </Box>
    );
}

// ─── Page component ────────────────────────────────────────────────────────────

const SIDEBAR_W = 380;
const TOP_OFFSET = 88; // AppBar height + 24px breathing room

const LinkPage = () => {
    const [linkToken, setLinkToken] = useState(null);
    // Per-user proof minted by Glide; the Worker rejects any request whose
    // proof is missing, forged, stale, or from an unprovisioned user.
    const { uid, ts, proof } = readAuthFromFragment();
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [subs, setSubs] = useState([]);

    const fetchFromApi = useCallback(async (attempt = 0) => {
        if (!uid) return;
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(
                `${WORKER_URL}/transactions?uid=${encodeURIComponent(uid)}` +
                `&ts=${encodeURIComponent(ts)}&proof=${encodeURIComponent(proof)}`
            );
            if (res.status === 401 && attempt === 0) {
                // KV eventual consistency right after provisioning — retry once.
                await new Promise((r) => setTimeout(r, 2000));
                return fetchFromApi(1);
            }
            if (res.status === 401) {
                setMessage("Your session has expired. Please reopen this page from the app.");
                return;
            }
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            const data = await res.json();
            const tag = data?.response_object?.tag;

            if (tag === "recurring_data") {
                const items = await toRecurringItems(data?.response_object?.data);
                setSubs(items);
                setLinkToken(null);
                setMessage(items.length ? "" : "No recurring transactions found.");
            } else if (tag === "link_token") {
                setLinkToken(data?.response_object?.data?.link_token);
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
    }, [uid, ts, proof]);

    useEffect(() => {
        // ── Mock short-circuit ──────────────────────────────────────────────────
        if (USE_MOCK) {
            toRecurringItems(MOCK_RESPONSE.response_object.data).then((items) => {
                setSubs(items);
                setLoading(false);
            });
            return;
        }
        // ───────────────────────────────────────────────────────────────────────

        if (!uid || !ts || !proof) {
            console.error("Missing auth fragment (uid/ts/proof)");
            setMessage("Please open this page from the app.");
            setLoading(false);
            return;
        }

        // No client-side cache or storage: the Worker serves cached recurring
        // data from KV, so every load is a single request either way.
        fetchFromApi();
    }, [uid, ts, proof, fetchFromApi]);

    const handlePlaidData = (items) => {
        if (Array.isArray(items)) {
            setSubs(items);
            setLinkToken(null);
            setMessage(items.length ? "" : "No recurring transactions found.");
        }
    };

    const Loader = () => (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                py: 14,
                gap: 2,
            }}
        >
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
                Loading your subscriptions…
            </Typography>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Box>
    );

    // ── Shared page shell ──────────────────────────────────────────────────────
    const PageShell = ({ children }) => (
        <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <TopBar />
            <PageHeader />
            <Box sx={{ flex: 1, bgcolor: "#f8fafc" }}>
                {children}
            </Box>
            <Footer />
        </Box>
    );

    // Sidebar is shown while loading (loader appears centre) and once subs exist.
    // Hidden when the user needs to connect via Plaid (no subs yet, linkToken present)
    // or when showing a fallback error message.
    const showSidebar = loading || subs.length > 0;

    // Match the right column to the sidebar's height. We measure it directly rather
    // than rely on flex `stretch` propagating through nested wrappers, so the content
    // card has a definite height to fill (and the list can grow cards into it).
    const sidebarRef = useRef(null);
    const [sidebarH, setSidebarH] = useState(0);
    useEffect(() => {
        const el = sidebarRef.current;
        if (!el || typeof ResizeObserver === "undefined") {
            setSidebarH(0);
            return;
        }
        const update = () => setSidebarH(el.offsetHeight);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [showSidebar, subs, loading]);

    return (
        <PageShell>
            <Box
                sx={{
                    maxWidth: 1420,
                    mx: "auto",
                    px: { xs: 2, sm: 3 },
                    py: { xs: 2, sm: 3 },
                    display: "flex",
                    flexWrap: { xs: "wrap", lg: "nowrap" },
                    gap: 2.5,
                    alignItems: "stretch",
                }}
            >
                {/* ── Left column: hidden during connect / error states ── */}
                {showSidebar && (
                    <Box
                        ref={sidebarRef}
                        sx={{
                            order: { xs: 2, lg: 1 },
                            width: { xs: "100%", lg: SIDEBAR_W },
                            flexShrink: 0,
                            display: "flex",
                            flexDirection: { xs: "column", sm: "row", lg: "column" },
                            gap: 2.5,
                            position: { lg: "sticky" },
                            top: { lg: TOP_OFFSET },
                            alignSelf: "flex-start",
                        }}
                    >
                        <Box sx={{ flex: { sm: 1, lg: "none" } }}>
                            <HowItWorksPanel />
                        </Box>
                        <Box sx={{ flex: { sm: 1, lg: "none" } }}>
                            <RiskGuidePanel />
                        </Box>
                    </Box>
                )}

                {/* ── Right column: content varies by state ── */}
                <Box
                    sx={{
                        order: { xs: 1, lg: 2 },
                        flex: "1 1 0",
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        // Fixed to the sidebar's height so the list scrolls inside the
                        // card instead of growing the card. `auto` below lg (stacked).
                        height: { lg: sidebarH ? `${sidebarH}px` : "auto" },
                    }}
                >
                    {loading ? (
                        <Loader />
                    ) : subs.length > 0 ? (
                        <Subscriptions items={subs} />
                    ) : linkToken ? (
                        <Box sx={{ display: "grid", placeItems: "center", px: 2, py: 6 }}>
                            <PlaidButton linkToken={linkToken} uid={uid} ts={ts} proof={proof} onData={handlePlaidData} />
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                maxWidth: 480,
                                mx: "auto",
                                mt: 8,
                                px: 3,
                                py: 2.5,
                                bgcolor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: 2,
                                boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                                textAlign: "center",
                                color: "#64748b",
                                fontWeight: 500,
                                fontSize: 15,
                            }}
                        >
                            {message || "Ready."}
                        </Box>
                    )}
                </Box>
            </Box>
        </PageShell>
    );
};

export default LinkPage;
