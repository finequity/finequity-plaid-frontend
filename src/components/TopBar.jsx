/**
 * TopBar + PageHeader
 * -------------------
 * A fixed (sticky) top navigation bar plus a centered page header section.
 * - The TopBar uses MUI's AppBar and Toolbar. It's fixed to the top and stays visible
 *   while scrolling. We add a *spacer* Toolbar after it so page content doesn't hide
 *   beneath the fixed bar.
 * - The PageHeader is a simple section below the bar with a title and subtitle,
 *   centered and responsive.
 *
 * Tech notes:
 * - CssBaseline normalizes styles across browsers and applies MUI's sensible defaults.
 * - We use the `sx` prop to keep styling colocated and responsive (xs/sm/md breakpoints).
 * - `barHeights` matches MUI's default Toolbar heights (56 on mobile, 64 on larger screens).
 * - The AppBar's `zIndex` is left at the appBar default, but we explicitly reference the theme
 *   so this component plays nicely with Drawers or other layered components if added later.
 */

import * as React from "react";

// Material UI components for layout and typography.
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";


function TopBar() {
    /**
     * Default MUI toolbar heights:
     * - 56px on extra-small screens (xs)
     * - 64px on small and up (sm+)
     *
     * We reuse these values for both the actual Toolbar and the spacer Toolbar below
     * so the page content sits exactly below the fixed AppBar (no overlap).
     */
    const barHeights = { xs: 56, sm: 64 };

    return (
        // Box is a lightweight wrapper that accepts the `sx` styling prop.
        <Box sx={{ flexGrow: 1 }}>
            {/* CssBaseline resets/normalizes browser CSS and sets a consistent base */}
            <CssBaseline />

            {/**
                * AppBar is fixed to the top so it remains visible while scrolling.
                * We remove the drop shadow for a flatter, modern look and set a custom background color.
            */}
            <AppBar
                position="fixed"
                sx={(theme) => ({
                    bgcolor: "#1d4ed8",       // Brand blue (override with theme.palette.primary.main if preferred)
                    boxShadow: "none",        // Clean, flat header
                    zIndex: theme.zIndex.appBar, // Keep above page content; plays well with Drawer if added later
                })}
            >
                {/**
                    * Toolbar handles vertical sizing/padding and horizontal layout.
                    * `justifyContent: "center"` centers the title text within the bar.
                    * `minHeight` uses our responsive barHeights for consistent vertical rhythm.
                */}
                <Toolbar sx={{ justifyContent: "center", minHeight: barHeights, py: 0.5 }}>
                    <Typography
                        component="div"
                        sx={{
                            color: "#fff",
                            fontWeight: 800,                         // Bold, prominent title
                            textAlign: "center",
                            fontSize: { xs: 22, sm: 26, md: 28 },   // Responsive sizing
                            lineHeight: 1.2,
                        }}
                    >
                        Subscriptions
                    </Typography>
                </Toolbar>
            </AppBar>

            {/**
                * Spacer Toolbar:
                * Because the AppBar is `position="fixed"`, it is removed from normal document flow
                * and overlays content. This empty Toolbar with the SAME height pushes the rest of
                * the page down so nothing hides under the bar.
                *
                * If you ever change the AppBar height, update this too.
            */}
            <Toolbar sx={{ minHeight: barHeights }} />
        </Box>
    );
}

/**
 * PageHeader
 * ----------
 * A centered header section typically placed right below the TopBar. It provides
 * a page title and a short subtitle for context.
 *
 * - `maxWidth: 1100` and horizontal auto margins keep the text centered and at a
 *   readable line length on large screens.
 * - Responsive padding ensures comfortable spacing on mobile and desktop.
 * - `textAlign: "center"` centers the text without extra grid/flex wrappers.
 */
export function PageHeader() {
    return (
        <Box
            sx={{
                maxWidth: 1100,                 // Keep line length readable on large screens
                mx: "auto",                     // Center container horizontally
                px: { xs: 2, sm: 3 },           // Comfortable side padding (more on larger screens)
                pt: 2,                          // Space from the fixed AppBar spacer
                pb: 1.5,                        // Space below the header section
                textAlign: "center",            // Center text content
            }}
        >
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 600,
                    color: "#0b4ea5",             // Accent color for the heading (can map to theme.palette.primary.dark)
                    fontSize: { xs: 22, sm: 28 }, // Responsive heading size
                    mb: 0.5,                      // Tight margin below heading
                }}
            >
                Review Your Subscriptions
            </Typography>

            <Typography sx={{ color: "text.secondary", mb: 2 }}>
                {/* Short, helpful subtitle for context */}
                Next charges at a glance—cancel what you don’t need.
            </Typography>
        </Box>
    );
}

export default TopBar;


/**
 * Customization tips
 * 
 * Colors: Replace hard-coded hex values with your theme (e.g., theme.palette.primary.main) for better theming support.
 * Heights: If you increase the AppBar height, update the spacer <Toolbar /> to match so content doesn’t overlap.
 * Left/Right content: If you need a logo on the left and actions on the right, remove justifyContent: "center" and use a flex row with space-between, adding two containers inside the Toolbar.
 * Accessibility: AppBar/Toolbar/Typography are already accessible; keep button/icon contrast high if you add actions later.
 * 
 */