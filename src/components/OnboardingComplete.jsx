import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import TextsmsRoundedIcon from "@mui/icons-material/TextsmsRounded";
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

/**
 * "Onboarding complete" screen — shown as soon as the token exchange comes back
 * 200 with tag "storage_success" (the access token is stored; nothing has been
 * scanned yet).
 *
 * Its job is reassurance, not data: setup is finished, monitoring from here is
 * automatic, and logging back in is optional because everything that matters
 * arrives by SMS. The primary CTA runs the user's first scan on demand; opting
 * out (onSkip) is a first-class choice, since the whole promise of the page is
 * that results reach them by text whether or not they wait around.
 */

const REASSURANCES = [
    {
        icon: <AutorenewRoundedIcon />,
        title: "Monitoring is automatic",
        body: "We keep watching your account for new, changed, and suspicious recurring charges. There's nothing left for you to set up.",
    },
    {
        icon: <TextsmsRoundedIcon />,
        title: "We'll text you what we find",
        body: "Alerts about risky or unexpected charges come straight to your phone — no app to check, no inbox to dig through.",
    },
    {
        icon: <PhoneIphoneRoundedIcon />,
        title: "Signing back in is optional",
        body: "This portal is a one-time setup. You're welcome to return any time, but you don't need to for monitoring to continue.",
    },
];

export default function OnboardingComplete({ onRetrieve, onSkip, notice = "" }) {
    return (
        <Box sx={{ maxWidth: 560, mx: "auto", px: { xs: 2, sm: 0 }, py: { xs: 1, sm: 2 } }}>
            <Box
                sx={{
                    bgcolor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)",
                    overflow: "hidden",
                }}
            >
                {/* Success banner */}
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

                    <Box
                        sx={{
                            width: 68,
                            height: 68,
                            borderRadius: "50%",
                            bgcolor: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            mb: 2,
                            position: "relative",
                            zIndex: 1,
                            boxShadow: "0 0 0 8px rgba(34,197,94,0.18)",
                        }}
                    >
                        <TaskAltRoundedIcon sx={{ color: "#fff", fontSize: 36 }} />
                    </Box>

                    <Typography
                        sx={{ color: "#fff", fontWeight: 800, fontSize: 22, mb: 0.75, position: "relative", zIndex: 1 }}
                    >
                        You're all set
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: 14,
                            lineHeight: 1.55,
                            maxWidth: 380,
                            mx: "auto",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        Your bank is securely connected and your account is now being
                        monitored. Setup is complete — this was the only step that needed you.
                    </Typography>
                </Box>

                {/* Reassurances */}
                <Box sx={{ px: 3, py: 2.5 }}>
                    <Stack spacing={2}>
                        {REASSURANCES.map(({ icon, title, body }) => (
                            <Box key={title} sx={{ display: "flex", gap: 1.5 }}>
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: "10px",
                                        bgcolor: "#eff6ff",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    {React.cloneElement(icon, { sx: { fontSize: 18, color: "#1d4ed8" } })}
                                </Box>
                                <Box>
                                    <Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", lineHeight: 1.35, mb: 0.35 }}>
                                        {title}
                                    </Typography>
                                    <Typography sx={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                                        {body}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                </Box>

                {/* CTA — runs the first scan */}
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
                    {notice && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 1,
                                borderRadius: "10px",
                                px: 2,
                                py: 1.25,
                                bgcolor: "#fffbeb",
                                border: "1px solid #fde68a",
                            }}
                        >
                            <InfoOutlinedIcon sx={{ fontSize: 16, color: "#b45309", mt: 0.2, flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 13, color: "#92400e", lineHeight: 1.55 }}>
                                {notice}
                            </Typography>
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForwardRoundedIcon />}
                        onClick={onRetrieve}
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
                            "&:disabled": { background: "#e2e8f0", color: "#94a3b8" },
                        }}
                    >
                        Show my subscriptions
                    </Button>

                    {/* Opting out is a real option, not a hidden one: the page has just
                        promised that results arrive by text regardless. */}
                    <Button
                        variant="text"
                        onClick={onSkip}
                        sx={{
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: 13.5,
                            textTransform: "none",
                            py: 1,
                            color: "#64748b",
                            "&:hover": { bgcolor: "#f1f5f9", color: "#334155" },
                        }}
                    >
                        Skip for now — text me my results
                    </Button>

                    <Typography sx={{ fontSize: 12.5, color: "#94a3b8", textAlign: "center", lineHeight: 1.55 }}>
                        The scan takes a few moments. Either way, nothing else is needed
                        from you — monitoring is already running.
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
