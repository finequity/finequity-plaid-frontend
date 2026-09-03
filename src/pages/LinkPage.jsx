import React, { useEffect, useState, useCallback, useRef } from "react";
import PlaidButton from "../components/PlaidButton.jsx";
import TopBar, { PageHeader } from "../components/TopBar";
import Footer from "../components/Footer";
import Subscriptions from "../components/Subscriptions.jsx";
import OnboardingComplete from "../components/OnboardingComplete.jsx";
import OnboardingSteps from "../components/OnboardingSteps.jsx";
import ScanSkipped from "../components/ScanSkipped.jsx";
import PostScanDialog, { HAS_SCHEDULE_URL } from "../components/PostScanDialog.jsx";
import PostScanPanel from "../components/PostScanPanel.jsx";
import { toRecurringItems } from "../utils/recurring-data-formatter.js";
import { MOCK_RESPONSE } from "../mocks/recurring-mock-response.js";

// MUI layout + typography
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import GlobalStyles from "@mui/material/GlobalStyles";

// Icons for sidebars (Risk Guide + security footer only)
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import RemoveRedEyeRoundedIcon from "@mui/icons-material/RemoveRedEyeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

// ─── Mock mode ─────────────────────────────────────────────────────────────────
// Set to true to bypass the API and use local test data (see ../mocks/recurring-mock-response.js).
// Mock mode replays the *onboarding* path — first bank connection, setup
// complete, first scan — rather than dropping straight into the results list,
// so a demo shows what a brand-new user actually sees.
// Must remain false in production.
const USE_MOCK = false;

// How long the demo pauses to stand in for a real network round-trip.
const DEMO_DELAY_MS = 1400;

// How long the user has the results to themselves before the support dialog
// offers a call. Asking someone to talk it through only makes sense once
// they've read what was found, so it arrives as a nudge rather than as a
// curtain over the results it's describing. Counted from the moment they
// dismiss the scan dialog — that's when the viewing actually starts.
const SUPPORT_DIALOG_DELAY_MS = 3 * 60 * 1000;

// ─── Onboarding stages ─────────────────────────────────────────────────────────
// The web app is a one-time onboarding portal: connect a bank once, run a first
// scan, then monitoring continues automatically over SMS. These stages track
// where in that path the user is, and returning users (whose recurring data is
// already cached) land straight in RESULTS without any of the setup framing.
const STAGE = {
    LOADING: "loading",       // initial /transactions call in flight
    CONNECT: "connect",       // link token ready — first bank connection
    ONBOARDED: "onboarded",   // exchange stored the access token; first scan not run yet
    SCANNING: "scanning",     // first scan in flight
    SKIPPED: "skipped",       // user opted out of the first scan — results come by SMS
    RESULTS: "results",       // recurring data on screen
    MESSAGE: "message",       // nothing to show — expired session / error / no data
};

const SESSION_EXPIRED_MSG = "Your session has expired. Please reopen this page from the app.";
// Same 401, but the bank is already linked at this point — say so, or the user
// reasonably assumes setup failed and tries to connect all over again.
const SESSION_EXPIRED_AFTER_LINK_MSG =
    "Your bank is connected and monitoring is on — this page's session just timed out before we could show your results. Reopen it from the app to see them, or wait for your text.";
const SCAN_PENDING_MSG =
    "Your first scan is still finishing up on our side. Give it a moment and try again — either way, we'll text you as soon as your results are ready.";
const SCAN_FAILED_MSG =
    "We couldn't reach your scan just then. Please try again — your connection is safely in place.";

// Header copy per stage. Onboarding stages carry an eyebrow + step index, which
// is what makes the first run look and read differently from day-to-day use.
const headerFor = (stage, firstRun) => {
    switch (stage) {
        case STAGE.LOADING:
            return {
                title: "Getting things ready",
                subtitle: "One moment while we check your account.",
            };
        case STAGE.CONNECT:
            return {
                eyebrow: "Step 1 of 3 · First-time setup",
                title: "Welcome to finEquity",
                subtitle:
                    "Let's connect your bank once.",
                step: 0,
            };
        case STAGE.ONBOARDED:
            return {
                eyebrow: "Step 2 of 3 · Setup complete",
                title: "Your account is connected",
                subtitle:
                    "Monitoring is already running. Run your first scan whenever you're ready to see what we found.",
                step: 1,
            };
        case STAGE.SCANNING:
            return {
                eyebrow: "Step 2 of 3 · First scan",
                title: "Scanning your account",
                subtitle:
                    "We're reading up to 24 months of outflow transactions to find every recurring charge.",
                step: 1,
            };
        case STAGE.SKIPPED:
            // No step indicator here: the user opted out of the remaining steps,
            // so showing them as pending would nag rather than inform.
            return {
                eyebrow: "Setup complete",
                title: "You're all set",
                subtitle:
                    "Nothing else is needed from you. Monitoring is running and your results will arrive by text.",
            };
        case STAGE.RESULTS:
            return firstRun
                ? {
                    eyebrow: "Step 3 of 3 · First scan complete",
                    title: "Your first scan results",
                    subtitle:
                        "Every recurring charge we found. From here we keep watching automatically and text you when something changes.",
                    step: 2,
                }
                : {};
        default:
            return {};
    }
};

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

// Panel disabled — the onboarding screens now carry this explanation themselves,
// so the sidebar copy was redundant. Flip to true to bring it back.
// (Same pattern as SHOW_STICKY_BAR in TopBar.jsx.)
const SHOW_HOW_IT_WORKS = false;

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
    {
        color: "#16a34a",
        title: "We keep watching",
        body: "That's setup done. Monitoring continues automatically and new or risky charges reach you by text — no need to sign back in.",
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

const Loader = ({ label }) => (
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
            {label}
        </Typography>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Box>
);

// ── Shared page shell ──────────────────────────────────────────────────────────
// Module scope on purpose: defined inside the page component it would be a new
// component type on every render, remounting the whole tree (and the Plaid
// widget with it) each time a stage changes.
const PageShell = ({ header, children }) => (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Strip default document margins so the app sits flush inside the Glide embed. */}
        <GlobalStyles styles={{ "html, body, #root": { margin: 0, padding: 0 }, body: { overflowX: "hidden" } }} />
        <TopBar />
        {header}
        <Box sx={{ flex: 1, bgcolor: "#f8fafc" }}>
            {children}
        </Box>
        <Footer />
    </Box>
);

const LinkPage = () => {
    const [linkToken, setLinkToken] = useState(null);
    // Per-user proof minted by Glide; the Worker rejects any request whose
    // proof is missing, forged, stale, or from an unprovisioned user.
    const { uid, ts, proof } = readAuthFromFragment();
    const [stage, setStage] = useState(STAGE.LOADING);
    const [message, setMessage] = useState("");
    const [subs, setSubs] = useState([]);
    // True once this visit completed the bank connection — drives the first-run
    // copy (step indicator, "first scan" framing, post-scan CTA).
    const [firstRun, setFirstRun] = useState(false);
    // Non-fatal note shown on the onboarding-complete screen when a first scan
    // couldn't be produced yet.
    const [scanNotice, setScanNotice] = useState("");
    // The two first-scan dialogs. Both are opened explicitly — never from an
    // effect — so dismissing either is final. Because every point that opens the
    // first one is downstream of a bank connection, a returning user landing
    // straight in RESULTS sees neither.
    //
    //   1. postScanOpen  — the moment recurring data lands, before the list is
    //                      read. Its button hands over to the results.
    //   2. supportOpen   — SUPPORT_DIALOG_DELAY_MS after that hand-over, once
    //                      the user has actually had time with the list.
    const [postScanOpen, setPostScanOpen] = useState(false);
    const [supportOpen, setSupportOpen] = useState(false);
    const supportTimer = useRef(null);

    const openPostScanDialog = useCallback(() => setPostScanOpen(true), []);

    // Dismissing the scan dialog is what starts the viewing, so the support
    // offer is timed from here rather than from when the data arrived.
    const closePostScanDialog = useCallback(() => {
        setPostScanOpen(false);
        if (!HAS_SCHEDULE_URL) return; // nothing to offer — don't interrupt at all
        clearTimeout(supportTimer.current);
        supportTimer.current = setTimeout(
            () => setSupportOpen(true),
            // A three-minute wait would hide the dialog entirely from the demo
            // walkthrough, whose whole point is showing the path end to end.
            USE_MOCK ? DEMO_DELAY_MS : SUPPORT_DIALOG_DELAY_MS
        );
    }, []);

    // Drop a pending timer on unmount so it can't fire into a gone component.
    useEffect(() => () => clearTimeout(supportTimer.current), []);

    // Single trip to the Worker for recurring data. Returns { data } on success
    // or { authExpired: true }; throws on anything else.
    const requestTransactions = useCallback(async () => {
        const call = async (attempt) => {
            const res = await fetch(
                `${WORKER_URL}/transactions?uid=${encodeURIComponent(uid)}` +
                `&ts=${encodeURIComponent(ts)}&proof=${encodeURIComponent(proof)}`
            );
            if (res.status === 401 && attempt === 0) {
                // KV eventual consistency right after provisioning — retry once.
                await new Promise((r) => setTimeout(r, 2000));
                return call(1);
            }
            if (res.status === 401) return { authExpired: true };
            if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
            return { data: await res.json() };
        };
        return call(0);
    }, [uid, ts, proof]);

    // First load: cached recurring data means a returning user (straight to
    // results); a link token means this is their first bank connection.
    const loadInitial = useCallback(async () => {
        setStage(STAGE.LOADING);
        setMessage("");
        try {
            const { authExpired, data } = await requestTransactions();
            if (authExpired) {
                setMessage(SESSION_EXPIRED_MSG);
                setStage(STAGE.MESSAGE);
                return;
            }
            const tag = data?.response_object?.tag;

            if (tag === "recurring_data") {
                const items = await toRecurringItems(data?.response_object?.data);
                setSubs(items);
                setLinkToken(null);
                setStage(STAGE.RESULTS);
            } else if (tag === "link_token") {
                setLinkToken(data?.response_object?.data?.link_token);
                setStage(STAGE.CONNECT);
            } else {
                setMessage("No data returned.");
                setStage(STAGE.MESSAGE);
            }
        } catch (err) {
            console.error("Error retrieving recurring data:", err);
            setMessage("Error retrieving data. Please try again.");
            setStage(STAGE.MESSAGE);
        }
    }, [requestTransactions]);

    useEffect(() => {
        // ── Mock short-circuit: replay the onboarding path from the top ─────────
        if (USE_MOCK) {
            setStage(STAGE.CONNECT);
            return;
        }
        // ───────────────────────────────────────────────────────────────────────

        if (!uid || !ts || !proof) {
            console.error("Missing auth fragment (uid/ts/proof)");
            setMessage("Please open this page from the app.");
            setStage(STAGE.MESSAGE);
            return;
        }

        // No client-side cache or storage: the Worker serves cached recurring
        // data from KV, so every load is a single request either way.
        loadInitial();
    }, [uid, ts, proof, loadInitial]);

    // Exchange came back 200 / "storage_success": the access token is stored but
    // nothing has been scanned yet. Setup is done — hand over to the
    // onboarding-complete screen, which runs the first scan on request.
    const handleLinked = () => {
        setLinkToken(null);
        setFirstRun(true);
        setScanNotice("");
        setStage(STAGE.ONBOARDED);
    };

    // User opted out of running the first scan now. Nothing to undo server-side —
    // the access token is stored and monitoring is independent of this page — so
    // this only swaps the screen for its confirmation, which still offers the scan.
    const handleSkipScan = () => {
        setScanNotice("");
        setStage(STAGE.SKIPPED);
    };

    // Legacy exchange shape: recurring data arrived with the exchange itself.
    const handlePlaidData = (items) => {
        if (!Array.isArray(items)) return;
        setSubs(items);
        setLinkToken(null);
        setFirstRun(true);
        setStage(STAGE.RESULTS);
        openPostScanDialog();
    };

    // "Show my subscriptions" — the user's first scan. The access token was
    // stored moments ago, so a link_token here means the scan isn't ready yet;
    // that must not bounce them back into connecting a bank a second time.
    const runFirstScan = useCallback(async () => {
        setScanNotice("");
        setStage(STAGE.SCANNING);

        if (USE_MOCK) {
            await new Promise((r) => setTimeout(r, DEMO_DELAY_MS));
            setSubs(await toRecurringItems(MOCK_RESPONSE.response_object.data));
            setStage(STAGE.RESULTS);
            openPostScanDialog();
            return;
        }

        try {
            const { authExpired, data } = await requestTransactions();
            if (authExpired) {
                setMessage(SESSION_EXPIRED_AFTER_LINK_MSG);
                setStage(STAGE.MESSAGE);
                return;
            }
            const tag = data?.response_object?.tag;

            if (tag === "recurring_data") {
                setSubs(await toRecurringItems(data?.response_object?.data));
                setStage(STAGE.RESULTS);
                openPostScanDialog();
            } else {
                setScanNotice(SCAN_PENDING_MSG);
                setStage(STAGE.ONBOARDED);
            }
        } catch (err) {
            console.error("Error running first scan:", err);
            setScanNotice(SCAN_FAILED_MSG);
            setStage(STAGE.ONBOARDED);
        }
    }, [requestTransactions, openPostScanDialog]);

    // Sidebar appears only alongside real results: during loading and scanning it
    // would be reference material for data that isn't on screen yet, and the setup
    // screens carry their own explanation.
    const showSidebar = stage === STAGE.RESULTS;

    const { eyebrow, title, subtitle, step } = headerFor(stage, firstRun);

    return (
        <PageShell
            header={
                <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}>
                    {typeof step === "number" && <OnboardingSteps activeStep={step} />}
                </PageHeader>
            }
        >
            {/* Fires the moment the first scan lands. Its button is the way
                through to the results below. */}
            <PostScanDialog
                open={postScanOpen}
                onClose={closePostScanDialog}
                items={subs}
            />

            {/* Follows a few minutes into reading the list. The same offer stays
                available in the sidebar panel after it's dismissed. */}
            <PostScanDialog
                variant="support"
                open={supportOpen}
                onClose={() => setSupportOpen(false)}
                items={subs}
            />

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
                        {SHOW_HOW_IT_WORKS && (
                            <Box sx={{ flex: { sm: 1, lg: "none" } }}>
                                <HowItWorksPanel />
                            </Box>
                        )}
                        {/* Post-scan recap + support CTA: sits with the reference
                            material rather than below the list, and above the risk
                            guide — it's what the user acts on, where the guide is
                            there to be consulted once something needs decoding. */}
                        <Box sx={{ flex: { sm: 1, lg: "none" } }}>
                            <PostScanPanel firstScan={firstRun} />
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
                        // Sized to its own content — the subscription list owns a fixed
                        // scroll height (see Subscriptions.jsx), so the column no longer
                        // needs to be matched to the sidebar. flex-start keeps it from
                        // stretching to the sidebar's height and leaving empty card space.
                        alignSelf: "flex-start",
                    }}
                >
                    {stage === STAGE.LOADING ? (
                        <Loader label="Loading your subscriptions…" />
                    ) : stage === STAGE.SCANNING ? (
                        <Loader label="Running your first scan…" />
                    ) : stage === STAGE.RESULTS ? (
                        <Subscriptions items={subs} />
                    ) : stage === STAGE.ONBOARDED ? (
                        <OnboardingComplete
                            onRetrieve={runFirstScan}
                            onSkip={handleSkipScan}
                            notice={scanNotice}
                        />
                    ) : stage === STAGE.SKIPPED ? (
                        <ScanSkipped onRetrieve={runFirstScan} />
                    ) : stage === STAGE.CONNECT ? (
                        <Box sx={{ display: "grid", placeItems: "center", px: 2, py: 6 }}>
                            <PlaidButton
                                linkToken={linkToken}
                                uid={uid}
                                ts={ts}
                                proof={proof}
                                demo={USE_MOCK}
                                onLinked={handleLinked}
                                onData={handlePlaidData}
                            />
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
