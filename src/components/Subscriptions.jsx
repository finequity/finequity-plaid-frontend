/**
 * SubscriptionsAccordion
 * ----------------------
 * Shows a vertical list of always-expanded MUI Accordions that display
 * subscription information. The expand arrow is removed and the summary
 * is styled to feel non-interactive.
 *
 * Expected item shape (per your normalizer):
 * {
 *   account_id: string,
 *   description: string,
 *   personal_finance_category: { detailed: string|null },
 *   frequency: string|null,
 *   average_amount: { amount: number },
 *   predicted_next_date: string|null, // ISO
 *   last_date: string|null            // ISO
 * }
 */


/**
 * SubscriptionsAccordion (controlled)
 * - Only the first accordion starts expanded.
 * - Users can expand/collapse any panel.
 */


import * as React from "react";

// Layout primitives
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";

// Accordion primitives
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";

// Typography
import Typography from "@mui/material/Typography";

// Icons used in the details section
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";


/* -----------------------------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------------------------*/

/** Format any numeric amount as USD and force it positive */
const toUSD = (n) =>
    Math.abs(Number(n ?? 0)).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    });

/** "FOOD_AND_DRINK_RESTAURANT" -> "Food And Drink Restaurant" (with "and" lowercased) */
const humanize = (s = "") =>
    String(s)
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
        .replace("And", "and");

/** "MONTHLY" -> "Monthly" */
const freqText = (f = "") => (f ? f[0] + f.slice(1).toLowerCase() : "Unknown");

/* -----------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------------*/


export default function SubscriptionsAccordion({ items = [] }) {
    // Track which panel is expanded (store its index). Default: 0 (first item).
    const [expanded, setExpanded] = React.useState(items.length ? 0 : false);
    React.useEffect(() => {
        setExpanded(items.length ? 0 : false);
    }, [items]);

    const handleToggle = (panelIdx) => (event, isExpanded) => {
        setExpanded(isExpanded ? panelIdx : false); // collapse if clicking an open one
    };

    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ maxWidth: 900, mx: "auto", px: { xs: 2, sm: 3 } }}>
                {items.length === 0 ? (
                    <Typography sx={{ textAlign: "center", color: "text.secondary", py: 6 }}>
                        No subscriptions found.
                    </Typography>
                ) : (
                    <Stack spacing={1.25}>
                        {items.map((item, idx) => {
                            const amountDisplay = toUSD(item?.average_amount?.amount);
                            const category = humanize(item?.personal_finance_category?.detailed);
                            const freq = freqText(item?.frequency);

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

                            const key =
                                item?.account_id ? `${item.account_id}|${item.description}|${idx}` : idx;

                            return (
                                <Accordion
                                    key={key}
                                    expanded={expanded === idx}
                                    onChange={handleToggle(idx)}
                                    disableGutters
                                    square
                                    sx={{
                                        border: "1px solid",
                                        borderColor: "grey.300",
                                        borderRadius: 2,
                                        background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
                                        boxShadow:
                                            "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(15,23,42,0.08), 0 8px 16px rgba(15,23,42,0.08)",
                                        overflow: "hidden",
                                        "&::before": { display: "none" },
                                    }}
                                >
                                    <AccordionSummary
                                        expandIcon={<ArrowDropDownIcon />}
                                        aria-controls={`sub-panel-${idx}-content`}
                                        id={`sub-panel-${idx}-header`}
                                        sx={{
                                            px: 2,
                                            py: 1,
                                            cursor: "pointer", // make it feel non-clickable
                                            "& .MuiAccordionSummary-content": { my: 0.5, width: "100%" },
                                            "&.Mui-focusVisible": { backgroundColor: "transparent" },       // remove focus bg
                                        }}
                                    >
                                        {/* Header row: description (wraps) + amount (right) */}
                                        <Box sx={{ width: 1 }}>
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    alignItems: "flex-start",
                                                    justifyContent: "space-between",
                                                    gap: 1.5,
                                                }}
                                            >
                                                <Typography
                                                    component="span"
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 800,
                                                        fontSize: { xs: 16, sm: 18 },
                                                        lineHeight: 1.25,
                                                        whiteSpace: "normal",   // allow wrapping for long names
                                                        wordBreak: "break-word", // break very long tokens
                                                        pr: 1,
                                                    }}
                                                    title={item?.description || ""}
                                                >
                                                    {item?.description || "Subscription"}
                                                </Typography>

                                                <Typography
                                                    component="span"
                                                    variant="h6"
                                                    sx={{ fontWeight: 800, whiteSpace: "nowrap" }}
                                                >
                                                    {amountDisplay}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </AccordionSummary>

                                    {/* Body: details with icons */}
                                    <AccordionDetails sx={{ px: 2, pt: 0.5, pb: 2 }}>
                                        <Stack spacing={0.9}>
                                            {/* Category */}
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CategoryRoundedIcon sx={{ color: "warning.main" }} />
                                                <Typography variant="body2">
                                                    <strong>Category:</strong> {category || "—"}
                                                </Typography>
                                            </Stack>

                                            {/* Frequency */}
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CalendarMonthRoundedIcon sx={{ color: "text.secondary" }} />
                                                <Typography variant="body2">
                                                    <strong>Frequency:</strong> {freq}
                                                </Typography>
                                            </Stack>

                                            {/* Upcoming charge */}
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <AccessTimeRoundedIcon sx={{ color: "warning.main" }} />
                                                <Typography variant="body2">
                                                    <strong>Upcoming Charge:</strong> {next}
                                                </Typography>
                                            </Stack>

                                            {/* Last charge */}
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <HistoryRoundedIcon sx={{ color: "text.secondary" }} />
                                                <Typography variant="body2">
                                                    <strong>Last Charge:</strong> {last}
                                                </Typography>
                                            </Stack>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>
                            );
                        })}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}
