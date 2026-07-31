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
import { countFlagged } from "./Subscriptions.jsx";

/**
 * First-scan completion dialog.
 *
 * Fires once, the moment a user's first scan lands, so the "setup is done,
 * monitoring is automatic, we'll text you" message is impossible to miss.
 * Dismissing it leaves the same points permanently available in the sidebar
 * (PostScanPanel), so this is emphasis rather than the only telling.
 */

const SCHEDULE_URL = process.env.REACT_APP_SUPPORT_SCHEDULE_URL || "";

const POINTS = [
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

export default function PostScanDialog({ open, onClose, items = [] }) {
    const total = items.length;
    const flagged = countFlagged(items);

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                        bgcolor: "#22c55e",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 1.75,
                        boxShadow: "0 0 0 7px rgba(34,197,94,0.18)",
                    }}
                >
                    <TaskAltRoundedIcon sx={{ color: "#fff", fontSize: 30 }} />
                </Box>

                <Typography
                    id="post-scan-title"
                    sx={{ color: "#fff", fontWeight: 800, fontSize: 19, mb: 0.5 }}
                >
                    Your first scan is complete
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 13.5, lineHeight: 1.55 }}>
                    {total === 0
                        ? "We didn't find any recurring charges on this account."
                        : `We found ${total} recurring ${total === 1 ? "charge" : "charges"} on your account.`}
                </Typography>
            </Box>

            <Box sx={{ px: 3, py: 2.5 }}>
                {/* Flagged summary — the one number worth acting on */}
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
                            for review — worth a look before you go.
                        </Typography>
                    </Box>
                )}

                <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", mb: 1.5 }}>
                    What happens from here
                </Typography>

                <Stack spacing={1.5}>
                    {POINTS.map(({ icon, text }) => (
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

            {/* Actions */}
            <Box
                sx={{
                    px: 3,
                    pb: 3,
                    pt: 0.5,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.25,
                }}
            >
                <Button
                    variant="contained"
                    size="large"
                    onClick={onClose}
                    sx={{
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
                    }}
                >
                    {total === 0 ? "Got it" : "View my subscriptions"}
                </Button>

                {SCHEDULE_URL && (
                    <Button
                        variant="outlined"
                        href={SCHEDULE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<EventAvailableRoundedIcon />}
                        sx={{
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: 13.5,
                            textTransform: "none",
                            py: 0.95,
                            color: "#1d4ed8",
                            borderColor: "#bfdbfe",
                            "&:hover": { borderColor: "#1d4ed8", bgcolor: "#eff6ff" },
                        }}
                    >
                        Questions? Schedule a conversation
                    </Button>
                )}
            </Box>
        </Dialog>
    );
}
