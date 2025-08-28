import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";

function TopBar() {
    // default toolbar heights: 56 (xs), 64 (sm+)
    const barHeights = { xs: 56, sm: 64 };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <CssBaseline />
            <AppBar
                position="fixed"
                sx={(theme) => ({
                    bgcolor: "#1d4ed8",
                    boxShadow: "none",
                    zIndex: theme.zIndex.appBar,
                })}
            >
                <Toolbar sx={{ justifyContent: "center", minHeight: barHeights, py: 0.5 }}>
                    <Typography
                        component="div"
                        sx={{
                            color: "#fff",
                            fontWeight: 800,
                            textAlign: "center",
                            fontSize: { xs: 22, sm: 26, md: 28 },
                            lineHeight: 1.2,
                        }}
                    >
                        Subscriptions
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* spacer to push content below the fixed AppBar */}
            <Toolbar sx={{ minHeight: barHeights }} />
        </Box>
    );
}

export function PageHeader() {
    return (
        <Box sx={{ maxWidth: 1100, mx: "auto", px: { xs: 2, sm: 3 }, pt: 2, pb: 1.5, textAlign: "center" }}>
            <Typography
                variant="h4"
                sx={{ fontWeight: 600, color: "#0b4ea5", fontSize: { xs: 22, sm: 28 }, mb: 0.5 }}
            >
                Review Your Subscriptions
            </Typography>
            <Typography sx={{ color: "text.secondary", mb: 2 }}>
                Next charges at a glance—cancel what you don’t need.
            </Typography>
        </Box>
    );
}

export default TopBar;
