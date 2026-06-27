import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

const LINKS = [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Use", href: "#" },
    { label: "Support", href: "#" },
];

export default function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
            }}
        >
            {/* Main footer body */}
            <Box
                sx={{
                    maxWidth: 1420,
                    mx: "auto",
                    px: { xs: 2, sm: 4 },
                    py: { xs: 4, sm: 5 },
                    display: "flex",
                    flexWrap: "wrap",
                    gap: { xs: 4, sm: 0 },
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                {/* Brand column */}
                <Box sx={{ maxWidth: 300 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                        <Box
                            sx={{
                                width: 30,
                                height: 30,
                                borderRadius: "8px",
                                bgcolor: "rgba(255,255,255,0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ShieldRoundedIcon sx={{ fontSize: 17, color: "#fff" }} />
                        </Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.3px" }}>
                            fin<Box component="span" sx={{ color: "#bfdbfe" }}>Equity</Box>
                        </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.6)" }}>
                        Helping you see every recurring charge — and cut the ones you don't need.
                    </Typography>
                </Box>

                {/* Links column */}
                <Stack direction={{ xs: "row", sm: "column" }} spacing={{ xs: 0, sm: 1.25 }} sx={{ flexWrap: "wrap", gap: { xs: 1.5, sm: 0 } }}>
                    {LINKS.map(({ label, href }) => (
                        <Box
                            key={label}
                            component="a"
                            href={href}
                            sx={{
                                fontSize: 13,
                                color: "rgba(255,255,255,0.7)",
                                textDecoration: "none",
                                fontWeight: 500,
                                "&:hover": { color: "#fff" },
                                transition: "color 0.15s",
                            }}
                        >
                            {label}
                        </Box>
                    ))}
                </Stack>

                {/* Security note column */}
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, maxWidth: 260 }}>
                    <Box
                        sx={{
                            width: 28,
                            height: 28,
                            borderRadius: "7px",
                            bgcolor: "rgba(255,255,255,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            mt: 0.2,
                        }}
                    >
                        <LockRoundedIcon sx={{ fontSize: 14, color: "#fff" }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>
                        Bank connections are powered by{" "}
                        <Box component="span" sx={{ color: "#fff", fontWeight: 600 }}>Plaid</Box>.
                        {" "}We use read-only access and never store your credentials.
                    </Typography>
                </Box>
            </Box>

            {/* Bottom bar */}
            <Box
                sx={{
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    px: { xs: 2, sm: 4 },
                    py: 2,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    alignItems: "center",
                    justifyContent: "space-between",
                    maxWidth: 1420,
                    mx: "auto",
                }}
            >
                <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                    © {new Date().getFullYear()} finEquity. All rights reserved.
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)" }}>
                    Not affiliated with Plaid Inc.
                </Typography>
            </Box>
        </Box>
    );
}
