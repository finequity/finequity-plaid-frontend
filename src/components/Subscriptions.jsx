import * as React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";

import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

// layout constants
const CARD_MIN_WIDTH = 340;
const CARD_MAX_WIDTH = 360;
const CARD_HEIGHT = 250;

const toUSD = (n) =>
    Math.abs(Number(n ?? 0)).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    });

const humanize = (s = "") =>
    String(s)
        .split("_")
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(" ")
        .replace("And", "and");

const freqText = (f = "") => (f ? f[0] + f.slice(1).toLowerCase() : "Unknown");

export default function CardGrid({ items = [] }) {
    return (
        <Box sx={{ pb: 4 }}>
            <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 } }}>
                {items.length === 0 ? (
                    <Typography sx={{ textAlign: "center", color: "text.secondary", py: 6 }}>
                        No subscriptions found.
                    </Typography>
                ) : (
                    <Grid
                        container
                        spacing={2}
                        justifyContent="center"
                        alignItems="stretch"
                        sx={{ mx: "auto" }}
                    >
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

                            return (
                                <Grid
                                    item
                                    key={item?.account_id ? `${item.account_id}|${item.description}|${idx}` : idx}
                                    sx={{
                                        flex: `1 1 ${CARD_MIN_WIDTH}px`,
                                        maxWidth: { sm: CARD_MAX_WIDTH },
                                        display: "flex",
                                    }}
                                >
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            width: 1,
                                            minWidth: CARD_MIN_WIDTH,
                                            height: CARD_HEIGHT,
                                            display: "flex",
                                            flexDirection: "column",
                                            borderRadius: 2,
                                            overflow: "hidden",
                                            border: "1px solid",
                                            borderColor: "grey.300",
                                            background: "linear-gradient(180deg, #fff 0%, #fafafa 100%)",
                                            boxShadow:
                                                "inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 2px rgba(15,23,42,0.08), 0 8px 16px rgba(15,23,42,0.08)",
                                            p: 2,
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
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Typography
                                                        variant="h6"
                                                        sx={{
                                                            fontWeight: 800,
                                                            fontSize: { xs: 16, sm: 18 },
                                                            lineHeight: 1.2,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                        title={item?.description || ""}
                                                    >
                                                        {item?.description || "Subscription"}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                                                    {amountDisplay}
                                                </Typography>
                                            </Box>

                                            {/* Second line: chips */}
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                useFlexGap
                                                flexWrap="wrap"
                                                sx={{ mb: 2 }}
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

                                            {/* Third line: details rows */}
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
