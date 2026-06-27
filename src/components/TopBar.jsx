import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

const BAR_H = { xs: 56, sm: 64 };

function TopBar() {
    return (
        <Box>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={(theme) => ({
                    background: "linear-gradient(90deg, #1e3a8a 0%, #1d4ed8 100%)",
                    boxShadow: "0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(15,23,42,0.18)",
                    zIndex: theme.zIndex.appBar,
                })}
            >
                <Toolbar sx={{ minHeight: BAR_H, px: { xs: 2, sm: 3 } }}>
                    {/* Brand */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, userSelect: "none" }}>
                        <Box
                            sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "10px",
                                bgcolor: "rgba(255,255,255,0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                            }}
                        >
                            <ShieldRoundedIcon sx={{ color: "#93c5fd", fontSize: 20 }} />
                        </Box>
                        <Typography
                            sx={{
                                fontWeight: 800,
                                fontSize: { xs: 18, sm: 21 },
                                color: "#fff",
                                letterSpacing: "-0.3px",
                            }}
                        >
                            fin<Box component="span" sx={{ color: "#93c5fd" }}>Equity</Box>
                        </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />

                    {/* Secured badge */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.6,
                            bgcolor: "rgba(255,255,255,0.10)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            px: 1.4,
                            py: 0.5,
                            borderRadius: 999,
                        }}
                    >
                        <LockRoundedIcon sx={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }} />
                        <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600, lineHeight: 1 }}>
                            Secured by Plaid
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Spacer so content doesn't hide under the fixed bar */}
            <Toolbar sx={{ minHeight: BAR_H }} />
        </Box>
    );
}

export function PageHeader() {
    return (
        <Box
            sx={{
                background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 55%, #2563eb 100%)",
                py: { xs: 4, sm: 5 },
                px: 2,
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Decorative rings */}
            {[260, 420, 580].map((size) => (
                <Box
                    key={size}
                    sx={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.06)",
                        pointerEvents: "none",
                    }}
                />
            ))}

            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography
                    variant="h4"
                    sx={{
                        fontWeight: 800,
                        color: "#fff",
                        fontSize: { xs: 24, sm: 30, md: 34 },
                        letterSpacing: "-0.5px",
                        mb: 1,
                    }}
                >
                    Your Subscriptions
                </Typography>
                <Typography
                    sx={{
                        color: "rgba(255,255,255,0.72)",
                        fontSize: { xs: 14, sm: 15 },
                        maxWidth: 460,
                        mx: "auto",
                        lineHeight: 1.6,
                    }}
                >
                    Recurring charges decoded — see exactly what you're paying for and cancel what you don't need.
                </Typography>
            </Box>
        </Box>
    );
}

export default TopBar;
