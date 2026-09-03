import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import TextsmsRoundedIcon from "@mui/icons-material/TextsmsRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";

/**
 * Panel shown under the subscription list once a scan has results.
 *
 * Two jobs:
 *   1. Reinforce that this portal was a one-time setup — ongoing monitoring and
 *      communication happen automatically over SMS.
 *   2. Offer a human: a call with the support team for questions about what the
 *      scan turned up (headline is stronger right after the first scan).
 *
 * Job 1 is only news to someone who just finished setup, so it renders for
 * firstScan only. A returning user gets the support offer by itself — repeating
 * "here's what happens next" to someone already living with the answer buries
 * the one thing on this card they can still act on.
 *
 * The scheduling link comes from REACT_APP_SUPPORT_SCHEDULE_URL. When it isn't
 * configured the card falls back to the SMS route rather than showing a button
 * that goes nowhere.
 */

const SCHEDULE_URL = process.env.REACT_APP_SUPPORT_SCHEDULE_URL || "";

const MONITORING_POINTS = [
    {
        icon: <TextsmsRoundedIcon />,
        text: "We'll text you when a new charge appears, an amount changes, or something looks risky.",
    },
    {
        icon: <PhoneIphoneRoundedIcon />,
        text: "No need to sign back in — monitoring keeps running whether you open this page again or not.",
    },
];

export default function PostScanPanel({ firstScan = false }) {
    return (
        <Box
            sx={{
                // Spacing is owned by the container (the sidebar stack's gap), so
                // the panel can sit anywhere without carrying its own margin.
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 3,
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)",
            }}
        >
            {/* ── What happens from here (one-time portal → SMS monitoring) ── */}
            {firstScan && (
                <>
                    <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 2.25 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#0f172a", mb: 0.5 }}>
                            That's your setup done
                        </Typography>
                        <Typography sx={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, mb: 1.75 }}>
                            Your first scan is complete. From here everything happens
                            automatically — you don't need to come back to this page.
                        </Typography>

                        <Stack spacing={1.25}>
                            {MONITORING_POINTS.map(({ icon, text }) => (
                                <Box key={text} sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: "8px",
                                            bgcolor: "#f0fdf4",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                            mt: 0.1,
                                        }}
                                    >
                                        {React.cloneElement(icon, { sx: { fontSize: 15, color: "#16a34a" } })}
                                    </Box>
                                    <Typography sx={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                                        {text}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    </Box>

                    <Divider sx={{ borderColor: "#f1f5f9" }} />
                </>
            )}

            {/* ── Talk to a human about the findings ── */}
            <Box
                sx={{
                    px: { xs: 2, sm: 2.5 },
                    py: 2.25,
                    // Grey reads as a footer under the recap above it. Standing
                    // alone there's nothing to be a footer to, so it takes the
                    // plain card white the other sidebar panels use.
                    bgcolor: firstScan ? "#f8fafc" : "#fff",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 2,
                }}
            >
                <Box
                    sx={{
                        width: 42,
                        height: 42,
                        borderRadius: "12px",
                        bgcolor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <SupportAgentRoundedIcon sx={{ fontSize: 22, color: "#1d4ed8" }} />
                </Box>

                <Box sx={{ flex: "1 1 240px", minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", mb: 0.35 }}>
                        {firstScan
                            ? "Questions about what we found?"
                            : "Want to talk through your charges?"}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                        {SCHEDULE_URL
                            ? "Book a short call and our support team will walk you through anything flagged here — what it means and what to do next."
                            : "Reply to any finEquity text message and our support team will walk you through anything flagged here."}
                    </Typography>
                </Box>

                {SCHEDULE_URL && (
                    <Button
                        variant="outlined"
                        href={SCHEDULE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<EventAvailableRoundedIcon />}
                        sx={{
                            flexShrink: 0,
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: 13.5,
                            textTransform: "none",
                            px: 2,
                            py: 1,
                            color: "#1d4ed8",
                            borderColor: "#bfdbfe",
                            bgcolor: "#fff",
                            // Two rings swelling out of the button on a short
                            // cycle, the button itself breathing with them. This
                            // is the one thing on the page a user can still act
                            // on after the scan, so it asks out loud rather than
                            // flickering at the edge of vision.
                            //
                            // Both effects are box-shadow and transform only —
                            // no layout, no repaint of anything around it — and
                            // they share a cycle length so the ring always
                            // leaves at the top of the breath.
                            animation:
                                "fe-cta-pulse 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite, " +
                                "fe-cta-breathe 2.4s ease-in-out infinite",
                            "&:hover": {
                                borderColor: "#1d4ed8",
                                bgcolor: "#eff6ff",
                                // Noticed — stop asking.
                                animation: "none",
                            },
                            "&:focus-visible": { animation: "none" },
                            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                        }}
                    >
                        Schedule a conversation
                    </Button>
                )}
            </Box>

            <style>{`
                /* Two rings, the second trailing the first by ~25% of the cycle,
                   so the button reads as pushing them out rather than blinking. */
                @keyframes fe-cta-pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(29,78,216,0.55),
                                    0 0 0 0 rgba(29,78,216,0);
                    }
                    25% {
                        box-shadow: 0 0 0 8px rgba(29,78,216,0.14),
                                    0 0 0 0 rgba(29,78,216,0.4);
                    }
                    55% {
                        box-shadow: 0 0 0 16px rgba(29,78,216,0),
                                    0 0 0 10px rgba(29,78,216,0.1);
                    }
                    80%, 100% {
                        box-shadow: 0 0 0 16px rgba(29,78,216,0),
                                    0 0 0 18px rgba(29,78,216,0);
                    }
                }

                /* A shallow swell timed to the first ring. Small enough that
                   nothing around it appears to move, big enough to catch a
                   glance from across the page. */
                @keyframes fe-cta-breathe {
                    0%, 100% { transform: scale(1); }
                    22%      { transform: scale(1.045); }
                    60%      { transform: scale(0.998); }
                }
            `}</style>
        </Box>
    );
}
