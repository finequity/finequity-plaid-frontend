import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

/**
 * Three-step progress strip for first-time setup.
 *
 * Sits inside the page header (dark blue gradient), so every colour here is
 * tuned for a dark background. It renders only during onboarding — returning
 * users never see it, which is what keeps the first run visibly distinct from
 * the day-to-day view.
 */

export const ONBOARDING_STEPS = ["Connect bank", "First scan", "Your results"];

export default function OnboardingSteps({ activeStep = 0 }) {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                gap: { xs: 0.5, sm: 1 },
                mt: 3,
                position: "relative",
                zIndex: 1,
            }}
            role="list"
            aria-label="Setup progress"
        >
            {ONBOARDING_STEPS.map((label, idx) => {
                const done = idx < activeStep;
                const active = idx === activeStep;

                return (
                    <React.Fragment key={label}>
                        <Box
                            role="listitem"
                            aria-current={active ? "step" : undefined}
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: 0.75,
                                width: { xs: 78, sm: 104 },
                                flexShrink: 0,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    bgcolor: done
                                        ? "#22c55e"
                                        : active
                                            ? "#fff"
                                            : "rgba(255,255,255,0.12)",
                                    border: "1px solid",
                                    borderColor: done
                                        ? "#22c55e"
                                        : active
                                            ? "#fff"
                                            : "rgba(255,255,255,0.25)",
                                    boxShadow: active ? "0 0 0 4px rgba(255,255,255,0.15)" : "none",
                                    transition: "background-color 0.2s, box-shadow 0.2s",
                                }}
                            >
                                {done ? (
                                    <CheckRoundedIcon sx={{ fontSize: 17, color: "#fff" }} />
                                ) : (
                                    <Typography
                                        sx={{
                                            fontSize: 12.5,
                                            fontWeight: 800,
                                            lineHeight: 1,
                                            color: active ? "#1d4ed8" : "rgba(255,255,255,0.6)",
                                        }}
                                    >
                                        {idx + 1}
                                    </Typography>
                                )}
                            </Box>

                            <Typography
                                sx={{
                                    fontSize: { xs: 10.5, sm: 12 },
                                    fontWeight: active || done ? 700 : 500,
                                    textAlign: "center",
                                    lineHeight: 1.3,
                                    color:
                                        done || active
                                            ? "rgba(255,255,255,0.92)"
                                            : "rgba(255,255,255,0.5)",
                                }}
                            >
                                {label}
                            </Typography>
                        </Box>

                        {/* Connector between circles — aligned to the circle's midline. */}
                        {idx < ONBOARDING_STEPS.length - 1 && (
                            <Box
                                sx={{
                                    height: 2,
                                    flex: 1,
                                    maxWidth: { xs: 28, sm: 56 },
                                    mt: "13px",
                                    borderRadius: 1,
                                    bgcolor: idx < activeStep ? "#22c55e" : "rgba(255,255,255,0.18)",
                                    transition: "background-color 0.2s",
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </Box>
    );
}
