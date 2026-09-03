import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import TextsmsRoundedIcon from "@mui/icons-material/TextsmsRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import { countFlagged } from "./Subscriptions.jsx";

/**
 * The two first-scan dialogs, one component with a `variant`.
 *
 *   "scan"    — fires the moment a user's first scan lands, before they've seen
 *               the list, so "setup is done, monitoring is automatic, we'll text
 *               you" is impossible to miss. Its single button hands over to the
 *               results.
 *   "support" — fires after the user has had the list to themselves for a few
 *               minutes. Its single button offers a call with the support team,
 *               which only makes sense once they've read what was found.
 *
 * Neither closes on a backdrop click or Escape: no `onClose` reaches the Dialog
 * and Escape is disabled, so the X in the header is the only way out (plus the
 * scan dialog's own button, which is the point of that dialog). Dismissing
 * either leaves the same points permanently available in the sidebar
 * (PostScanPanel), so these are emphasis rather than the only telling.
 */

const SCHEDULE_URL = process.env.REACT_APP_SUPPORT_SCHEDULE_URL || "";

// LinkPage skips scheduling the support dialog entirely when there's no link to
// offer — a popup whose only action is missing is just an obstacle.
export const HAS_SCHEDULE_URL = Boolean(SCHEDULE_URL);

const SCAN_POINTS = [
    {
        icon: <AutorenewRoundedIcon />,
        text: "Monitoring keeps running automatically — there's nothing left to set up.",
    },
    {
        icon: <TextsmsRoundedIcon />,
        text: "We'll text you when a new charge appears, an amount changes, or something looks risky.",
    },
    {
        icon: <PhoneIphoneRoundedIcon />,
        text: "No need to sign back in. This page was a one-time setup.",
    },
];

const SUPPORT_POINTS = [
    {
        icon: <SupportAgentRoundedIcon />,
        text: "We'll walk through anything flagged here — what it means and what to do next.",
    },
    {
        icon: <AutorenewRoundedIcon />,
        text: "Monitoring keeps running either way, whether or not you book a call.",
    },
];

const primaryButtonSx = {
    borderRadius: "12px",
    fontWeight: 700,
    fontSize: 15,
    textTransform: "none",
    py: 1.3,
    background: "linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)",
    boxShadow: "0 4px 14px rgba(29,78,216,0.35)",
    "&:hover": {
        background: "linear-gradient(90deg, #1e40af 0%, #1d4ed8 100%)",
        boxShadow: "0 6px 20px rgba(29,78,216,0.4)",
    },
};

export default function PostScanDialog({ open, onClose, items = [], variant = "scan" }) {
    const total = items.length;
    const flagged = countFlagged(items);
    const isSupport = variant === "support";

    const points = isSupport ? SUPPORT_POINTS : SCAN_POINTS;

    const title = isSupport
        ? "Questions about what we found?"
        : "Your first scan is complete";

    let subtitle;
    if (isSupport) {
        subtitle = SCHEDULE_URL
            ? "Book a short call and our support team will talk you through your charges."
            : "Reply to any finEquity text message and our support team will talk you through your charges.";
    } else if (total === 0) {
        subtitle = "We didn't find any recurring charges on this account.";
    } else {
        subtitle = `We found ${total} recurring ${total === 1 ? "charge" : "charges"} on your account.`;
    }

    return (
        <Dialog
            // No onClose here on purpose — MUI only closes on a backdrop click if
            // it's given one. Escape is off for the same reason.
            open={open}
            disableEscapeKeyDown
            fullWidth
            maxWidth="xs"
            aria-labelledby="post-scan-title"
            slotProps={{
                paper: {
                    sx: {
                        borderRadius: 3,
                        overflow: "hidden",
                        m: 2,
                    },
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
                    px: 3,
                    py: 3.5,
                    textAlign: "center",
                    position: "relative",
                }}
            >
                <IconButton
                    onClick={onClose}
                    aria-label="Close"
                    size="small"
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: "rgba(255,255,255,0.7)",
                        "&:hover": { color: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
                    }}
                >
                    <CloseRoundedIcon fontSize="small" />
                </IconButton>

                <Box
                    sx={{
                        width: 58,
                        height: 58,
                        borderRadius: "50%",
                        // Green reads as "done" — right for the scan result, wrong
                        // for an invitation, which gets the calm white badge.
                        bgcolor: isSupport ? "#fff" : "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.75,
                        boxShadow: isSupport
                            ? "0 0 0 7px rgba(255,255,255,0.16)"
                            : "0 0 0 7px rgba(34,197,94,0.18)",
                    }}
                >
                    {isSupport ? (
                        <SupportAgentRoundedIcon sx={{ color: "#1d4ed8", fontSize: 30 }} />
                    ) : (
                        <TaskAltRoundedIcon sx={{ color: "#fff", fontSize: 30 }} />
                    )}
                </Box>

                <Typography
                    id="post-scan-title"
                    sx={{ color: "#fff", fontWeight: 800, fontSize: 19, mb: 0.5 }}
                >
                    {title}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 13.5, lineHeight: 1.55 }}>
                    {subtitle}
                </Typography>
            </Box>

            <Box sx={{ px: 3, py: 2.5 }}>
                {/* Flagged summary — the one number worth acting on, and the
                    reason a call is worth having. */}
                {flagged > 0 && (
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            bgcolor: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: 2,
                            px: 1.75,
                            py: 1.25,
                            mb: 2.25,
                        }}
                    >
                        <ReportProblemRoundedIcon sx={{ fontSize: 17, color: "#f59e0b", flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                            <Box component="span" sx={{ fontWeight: 700 }}>
                                {flagged} {flagged === 1 ? "charge is" : "charges are"} flagged
                            </Box>{" "}
                            {isSupport ? "for review." : "for review — worth a look before you go."}
                        </Typography>
                    </Box>
                )}

                <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", mb: 1.5 }}>
                    {isSupport ? "What a call covers" : "What happens from here"}
                </Typography>

                <Stack spacing={1.5}>
                    {points.map(({ icon, text }) => (
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

            {/* Actions — one button per dialog. The scan dialog hands over to the
                results; the support dialog opens the booking page in a new tab and
                stays put, since the X is what closes it. */}
            <Box
                sx={{
                    px: 3,
                    pb: 3,
                    pt: 0.5,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {isSupport
                    ? SCHEDULE_URL && (
                        <Button
                            variant="contained"
                            size="large"
                            href={SCHEDULE_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            startIcon={<EventAvailableRoundedIcon />}
                            sx={primaryButtonSx}
                        >
                            Schedule a conversation
                        </Button>
                    )
                    : (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={onClose}
                            sx={primaryButtonSx}
                        >
                            {total === 0 ? "Got it" : "View my subscriptions"}
                        </Button>
                    )}
            </Box>
        </Dialog>
    );
}
