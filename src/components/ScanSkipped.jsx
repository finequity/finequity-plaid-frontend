import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import TextsmsRoundedIcon from "@mui/icons-material/TextsmsRounded";

/**
 * Landing screen after a user opts out of running their first scan.
 *
 * Deliberately a confirmation, not a dead end: it closes the loop ("you can
 * leave, we'll text you") and still offers the scan, so skipping is reversible
 * for as long as the page is open.
 */
export default function ScanSkipped({ onRetrieve }) {
    return (
        <Box sx={{ maxWidth: 560, mx: "auto", px: { xs: 2, sm: 0 }, py: { xs: 1, sm: 2 } }}>
            <Box
                sx={{
                    bgcolor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 3,
                    boxShadow: "0 4px 24px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)",
                    overflow: "hidden",
                    textAlign: "center",
                    px: 3,
                    py: 4.5,
                }}
            >
                <Box
                    sx={{
                        width: 60,
                        height: 60,
                        borderRadius: "50%",
                        bgcolor: "#dcfce7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2.25,
                    }}
                >
                    <TaskAltRoundedIcon sx={{ color: "#16a34a", fontSize: 32 }} />
                </Box>

                <Typography sx={{ fontWeight: 800, fontSize: 20, color: "#0f172a", mb: 1 }}>
                    We'll take it from here
                </Typography>
                <Typography
                    sx={{ fontSize: 14, color: "#64748b", lineHeight: 1.65, maxWidth: 400, mx: "auto" }}
                >
                    Your bank is connected and monitoring is running. We'll text your
                    results to the number on file — you can close this page.
                </Typography>

                {/* Restates the delivery channel so the promise is concrete. */}
                <Box
                    sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.75,
                        mt: 2.5,
                        px: 1.75,
                        py: 0.9,
                        borderRadius: 999,
                        bgcolor: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                    }}
                >
                    <TextsmsRoundedIcon sx={{ fontSize: 15, color: "#16a34a" }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#166534", lineHeight: 1 }}>
                        Results arrive by text
                    </Typography>
                </Box>

                <Box sx={{ mt: 3, pt: 2.5, borderTop: "1px solid #f1f5f9" }}>
                    <Typography sx={{ fontSize: 13, color: "#94a3b8", mb: 1 }}>
                        Changed your mind?
                    </Typography>
                    <Button
                        variant="outlined"
                        onClick={onRetrieve}
                        sx={{
                            borderRadius: "10px",
                            fontWeight: 700,
                            fontSize: 13.5,
                            textTransform: "none",
                            px: 2.5,
                            py: 0.9,
                            color: "#1d4ed8",
                            borderColor: "#bfdbfe",
                            "&:hover": { borderColor: "#1d4ed8", bgcolor: "#eff6ff" },
                        }}
                    >
                        Show my subscriptions now
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
