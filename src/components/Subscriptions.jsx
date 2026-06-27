import * as React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import RepeatRoundedIcon from "@mui/icons-material/RepeatRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

/* --------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------*/

const toUSD = (n) =>
    Math.abs(Number(n ?? 0)).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
    });

const freqText = (f = "") => (f ? f[0] + f.slice(1).toLowerCase() : "Unknown");

const fmtDate = (iso) =>
    iso
        ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric" })
        : "—";

/* --------------------------------------------------------------------------
 * Risk config
 * ------------------------------------------------------------------------*/

const RISK = {
    likely_fraud: {
        label: "LIKELY FRAUD",
        leftBorder: "#ef4444",
        borderColor: "#fca5a5",
        bgColor: "#fff5f5",
        chipSx: { color: "#b91c1c", borderColor: "#fca5a5", bgcolor: "#fee2e2" },
        textColor: "#b91c1c",
    },
    likely_scam: {
        label: "LIKELY SCAM",
        leftBorder: "#f59e0b",
        borderColor: "#fcd34d",
        bgColor: "#fffbeb",
        chipSx: { color: "#92400e", borderColor: "#fcd34d", bgcolor: "#fef3c7" },
        textColor: "#b45309",
    },
    worth_watching: {
        label: "WORTH WATCHING",
        leftBorder: "#3b82f6",
        borderColor: "#93c5fd",
        bgColor: "#eff6ff",
        chipSx: { color: "#1d4ed8", borderColor: "#93c5fd", bgcolor: "#dbeafe" },
        textColor: "#1d4ed8",
    },
};

/* --------------------------------------------------------------------------
 * StatCard
 * ------------------------------------------------------------------------*/

function StatCard({ icon, label, value, accent }) {
    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 2,
                px: { xs: 1.5, sm: 2 },
                py: 1.5,
                boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
            }}
        >
            <Box
                sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "11px",
                    bgcolor: accent ? `${accent}18` : "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {React.cloneElement(icon, { sx: { fontSize: 20, color: accent ?? "#64748b" } })}
            </Box>
            <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: { xs: 15, sm: 17 }, lineHeight: 1.2, color: "#0f172a" }}>
                    {value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, mt: 0.15 }}>
                    {label}
                </Typography>
            </Box>
        </Box>
    );
}

/* --------------------------------------------------------------------------
 * SubscriptionCard
 * ------------------------------------------------------------------------*/

function SubscriptionCard({ item }) {
    const riskKey = item?.risk && item.risk.toLowerCase() !== "none" ? item.risk : null;
    const config = riskKey ? RISK[riskKey] : null;

    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: 2,
                border: "1px solid",
                borderColor: config ? config.borderColor : "#e2e8f0",
                bgcolor: config ? config.bgColor : "#fff",
                overflow: "hidden",
                boxShadow: config
                    ? "none"
                    : "0 1px 3px rgba(15,23,42,0.05)",
                transition: "box-shadow 0.15s",
                "&:hover": {
                    boxShadow: config ? "none" : "0 4px 12px rgba(15,23,42,0.08)",
                },
            }}
        >
            <Box sx={{ flex: 1, px: { xs: 1.5, sm: 2.5 }, py: 2 }}>
                {/* Risk chip + hover hint */}
                {config && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1 }}>
                        <Tooltip
                            title={item?.risk_reason || ""}
                            placement="top"
                            arrow
                            enterDelay={100}
                            slotProps={{
                                tooltip: {
                                    sx: {
                                        bgcolor: "#0f172a",
                                        color: "#f1f5f9",
                                        fontSize: 12,
                                        fontWeight: 400,
                                        maxWidth: 320,
                                        lineHeight: 1.65,
                                        borderRadius: "10px",
                                        p: 1.5,
                                        boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
                                    },
                                },
                                arrow: { sx: { color: "#0f172a" } },
                            }}
                        >
                            <Chip
                                icon={<WarningAmberRoundedIcon />}
                                label={config.label}
                                size="small"
                                variant="filled"
                                sx={{
                                    height: 22,
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: 0.6,
                                    borderRadius: "6px",
                                    cursor: "help",
                                    "& .MuiChip-icon": { fontSize: "13px !important", color: "inherit" },
                                    ...config.chipSx,
                                }}
                            />
                        </Tooltip>

                        {/* Hover hint */}
                        {item?.risk_reason && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <InfoOutlinedIcon sx={{ fontSize: 12, color: "#94a3b8" }} />
                                <Typography sx={{ fontSize: 11, color: "#94a3b8", lineHeight: 1, fontStyle: "italic" }}>
                                    Hover badge for explanation
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                {/* Name + amount */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: 14, sm: 15 },
                            lineHeight: 1.35,
                            color: "#0f172a",
                            wordBreak: "break-word",
                        }}
                    >
                        {item?.description || "Subscription"}
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: { xs: 14, sm: 15 },
                            color: config ? config.textColor : "#0f172a",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                    >
                        {toUSD(item?.average_amount?.amount)}
                    </Typography>
                </Box>

                {/* Frequency · Next date */}
                <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.4, fontSize: 13, fontWeight: 500 }}>
                    {freqText(item?.frequency)}&nbsp;·&nbsp;Next:&nbsp;{fmtDate(item?.predicted_next_date)}
                </Typography>
            </Box>
        </Box>
    );
}

/* --------------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------------*/

export default function Subscriptions({ items = [] }) {
    const totalMonthly = items.reduce(
        (sum, item) => sum + Math.abs(Number(item?.average_amount?.amount ?? 0)),
        0
    );
    const flaggedCount = items.filter(
        (item) => item?.risk && item.risk.toLowerCase() !== "none" && RISK[item.risk]
    ).length;

    return (
        <Box sx={{ width: "100%", px: { xs: 0.5, sm: 1 }, pt: 1, pb: 4, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {items.length === 0 ? (
                <Box
                    sx={{
                        textAlign: "center",
                        bgcolor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 3,
                        py: 8,
                        px: 3,
                        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
                    }}
                >
                    <Typography sx={{ color: "#94a3b8", fontWeight: 500 }}>
                        No subscriptions found.
                    </Typography>
                </Box>
            ) : (
                <>
                    {/* ── Summary stat cards ── */}
                    <Box
                        sx={{
                            display: "flex",
                            gap: { xs: 1, sm: 1.5 },
                            mb: 2.5,
                            flexWrap: { xs: "wrap", sm: "nowrap" },
                        }}
                    >
                        <StatCard
                            icon={<PaidRoundedIcon />}
                            label="Monthly spend"
                            value={toUSD(totalMonthly)}
                            accent="#1d4ed8"
                        />
                        <StatCard
                            icon={<RepeatRoundedIcon />}
                            label="Active subscriptions"
                            value={items.length}
                            accent="#0891b2"
                        />
                        {flaggedCount > 0 && (
                            <StatCard
                                icon={<ReportProblemRoundedIcon />}
                                label="Flagged for review"
                                value={flaggedCount}
                                accent="#ef4444"
                            />
                        )}
                    </Box>

                    {/* ── Risk legend ── */}
                    {flaggedCount > 0 && (
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                bgcolor: "#fffbeb",
                                border: "1px solid #fde68a",
                                borderRadius: 2,
                                px: 2,
                                py: 1.25,
                                mb: 2,
                            }}
                        >
                            <WarningAmberRoundedIcon sx={{ fontSize: 16, color: "#f59e0b", flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 13, color: "#92400e", lineHeight: 1.5 }}>
                                <Box component="span" sx={{ fontWeight: 700 }}>
                                    {flaggedCount} {flaggedCount === 1 ? "item" : "items"}
                                </Box>
                                {" "}flagged for review. Verify these charges and cancel any you don't recognise.
                            </Typography>
                        </Box>
                    )}

                    {/* ── Card list ── */}
                    <Box
                        sx={{
                            bgcolor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 3,
                            overflow: "hidden",
                            boxShadow: "0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04)",
                            flex: 1,
                            minHeight: 0,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        {/* List header */}
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                px: { xs: 2, sm: 2.5 },
                                py: 1.75,
                                borderBottom: "1px solid #f1f5f9",
                                bgcolor: "#fafafa",
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
                                Subscription List
                            </Typography>
                            <Typography sx={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>
                                {items.length} active · {toUSD(totalMonthly)}/mo
                            </Typography>
                        </Box>

                        {/* Scrollable list — fills the fixed card height */}
                        <Stack
                            spacing={0}
                            divider={<Divider sx={{ borderColor: "#f1f5f9" }} />}
                            sx={{
                                px: { xs: 1.5, sm: 2 },
                                py: 1.5,
                                flex: 1,
                                minHeight: 0,
                                overflowY: "auto",
                                // Slim, unobtrusive scrollbar
                                scrollbarWidth: "thin",
                                scrollbarColor: "#cbd5e1 transparent",
                                "&::-webkit-scrollbar": { width: 8 },
                                "&::-webkit-scrollbar-thumb": {
                                    backgroundColor: "#cbd5e1",
                                    borderRadius: 8,
                                },
                                "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
                            }}
                        >
                            {items.map((item, idx) => {
                                const key = item?.account_id
                                    ? `${item.account_id}|${item.description}|${idx}`
                                    : `${idx}`;
                                return (
                                    <Box key={key} sx={{ py: 0.75 }}>
                                        <SubscriptionCard item={item} />
                                    </Box>
                                );
                            })}
                        </Stack>

                        {/* Data source footer */}
                        <Box
                            sx={{
                                px: { xs: 2, sm: 2.5 },
                                py: 1.25,
                                borderTop: "1px solid #f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                            }}
                        >
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#22c55e", flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 12, color: "#94a3b8" }}>
                                Data sourced from your linked bank account via Plaid. Read-only access — no transactions are made.
                            </Typography>
                        </Box>
                    </Box>
                </>
            )}
        </Box>
    );
}
