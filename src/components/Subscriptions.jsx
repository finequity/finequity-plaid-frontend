/**
 * CardGrid (Subscriptions list)
 * -----------------------------
 * Renders a responsive, centered grid of uniform subscription cards using MUI.
 *
 * UX goals:
 * - Cards have consistent height/width so the grid looks tidy across breakpoints.
 * - Description and amount share the first line (desc is ellipsized to avoid overflow).
 * - Category/Frequency are presented as chips.
 * - Upcoming/Last charge rows include icons and short, friendly dates.
 *
 * Props:
 * - items: Array of normalized recurring items (see toRecurringItems), e.g.:
 *   {
 *     account_id: "abc",
 *     description: "Spotify",
 *     personal_finance_category: { detailed: "DIGITAL_MUSIC" },
 *     frequency: "MONTHLY",
 *     average_amount: { amount: 9.99 },
 *     predicted_next_date: "2025-09-14",
 *     last_date: "2025-08-14"
 *   }
 */

import * as React from "react";

// Core MUI building blocks
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

// Icons for visual semantics
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

// ---- Layout constants -------------------------------------------------------
// Keep min/max widths close so columns align cleanly; fixed height for tidy rows.
const CARD_MIN_WIDTH = 340;
const CARD_MAX_WIDTH = 360;
const CARD_HEIGHT = 250;

// ---- Formatting helpers -----------------------------------------------------

// Format any numeric amount as USD, always positive (subscriptions show cost, not sign)
const toUSD = (n) =>
    Math.abs(Number(n ?? 0)).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    });

// Humanize category enums like "FOOD_AND_DRINK_RESTAURANT" → "Food and Drink Restaurant"
const humanize = (s = "") =>
    String(s)
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
        .replace("And", "and");

// Normalize frequency like "MONTHLY" → "Monthly"
const freqText = (f = "") => (f ? f[0] + f.slice(1).toLowerCase() : "Unknown");

// ---- Component --------------------------------------------------------------

export default function CardGrid({ items = [] }) {
    return (
        <Box sx={{ pb: 4 }}>
            {/* Constrain overall content width and add horizontal padding */}
            <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
                {/* Empty state: keep it gentle and centered */}
                {items.length === 0 ? (
                    <Typography sx={{ textAlign: "center", color: "text.secondary", py: 6 }}>
                        No subscriptions found.
                    </Typography>
                ) : (
                    // Responsive, centered grid; each item column will flex within our min/max width
                    <Grid
                        container
                        spacing={2}
                        justifyContent="center"
                        alignItems="stretch"
                        sx={{ mx: "auto" }}
                    >
                        {items.map((item, idx) => {
                            // Derived fields for display
                            const amountDisplay = toUSD(item?.average_amount?.amount);
                            const category = humanize(item?.personal_finance_category?.detailed);
                            const freq = freqText(item?.frequency);

                            // Dates shown as "Sep 14"
                            const next = item?.predicted_next_date
                                ? new Date(item.predicted_next_date).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                })
                                : "—";

                            const last = item?.last_date
                                ? new Date(item.last_date).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                })
                                : "—";

                            return (
                                <Grid
                                    item
                                    key={
                                        // Composite key is safer when multiple accounts share descriptions.
                                        item?.account_id ? `${item.account_id}|${item.description}|${idx}` : idx
                                    }
                                    sx={{
                                        // Allow wrapping while keeping a tidy column width range
                                        flex: `1 1 ${CARD_MIN_WIDTH}px`,
                                        maxWidth: { sm: CARD_MAX_WIDTH },
                                        display: "flex", // so the Card can stretch to equal height
                                    }}
                                >
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            width: 1,                      // fill the Grid cell
                                            minWidth: CARD_MIN_WIDTH,      // consistent column width
                                            height: CARD_HEIGHT,           // uniform height across cards
                                            display: "flex",
                                            flexDirection: "column",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            border: "1px solid",
                                            borderColor: "grey.300",
                                            // Soft gradient and gentle shadows for depth without heaviness
                                            background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
                                            boxShadow:
                                                "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(15,23,42,0.08), 0 8px 16px rgba(15,23,42,0.08)",
                                            p: 2, // inner padding to match mock
                                        }}
                                    >
                                        <CardContent sx={{ p: 0, flexGrow: 1 }}>
                                            {/* Header row: description (left, clipped) + amount (right) */}
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    gap: 1.5,
                                                    mb: 0.25,
                                                }}
                                            >
                                                {/* Wrap in minWidth:0 container so ellipsis works within flex */}
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontSize: { xs: 16, sm: 18 }, // slightly smaller so long names fit
                                                            lineHeight: 1.2,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={item?.description || ""} // tooltip for full name
                                                    >
                                                        {item?.description || "Subscription"}
                                                    </Typography>
                                                </Box>

                                                {/* Amount stays on the same line; no wrapping */}
                                                <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                                                    {amountDisplay}
                                                </Typography>
                                            </Box>

                                            {/* Second line: chips for category & frequency */}
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                useFlexGap
                                                flexWrap="wrap"
                                                sx={{ mb: 2 }} // leave breathing room before details
                                            >
                                                <Chip
                                                    size="small"
                                                    icon={<CategoryRoundedIcon sx={{ color: "warning.main !important" }} />}
                                                    label={category || "Category"}
                                                    sx={{
                                                        bgcolor: "warning.50",
                                                        color: "warning.800",
                                                        borderColor: "warning.200",
                                                        borderStyle: "solid",
                                                        borderWidth: 1,
                                                        fontWeight: 600,
                                                    }}
                                                    variant="outlined"
                                                />
                                                <Chip
                                                    size="small"
                                                    icon={<CalendarMonthRoundedIcon />}
                                                    label={freq}
                                                    sx={{
                                                        bgcolor: "grey.100",
                                                        color: "grey.800",
                                                        borderColor: "grey.300",
                                                        borderStyle: "solid",
                                                        borderWidth: 1,
                                                        fontWeight: 600,
                                                    }}
                                                    variant="outlined"
                                                />
                                            </Stack>

                                            {/* Third line: details rows with icons */}
                                            <Stack spacing={0.75}>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <AccessTimeRoundedIcon sx={{ color: "warning.main" }} />
                                                    <Typography variant="body2">
                                                        <strong>Upcoming Charge:</strong> {next}
                                                    </Typography>
                                                </Stack>
                                                <Stack direction="row" spacing={1} alignItems="center">
                                                    <HistoryRoundedIcon sx={{ color: "text.secondary" }} />
                                                    <Typography variant="body2">
                                                        <strong>Last Charge:</strong> {last}
                                                    </Typography>
                                                </Stack>
                                            </Stack>
                                        </CardContent>

                                        {/* CTA row; kept minimal. Wire this to your disable/cancel flow as needed. */}
                                        <CardActions sx={{ p: 0, pt: 1 }}>
                                            <Button size="small" sx={{ fontWeight: 700, px: 0, textTransform: "uppercase" }}>
                                                Disable Subscription
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>
        </Box>
    );
}
