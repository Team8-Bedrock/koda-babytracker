import React from "react";

const CSS = `
@keyframes kldHop { 0%, 100% { transform: translateY(0) rotate(var(--r)) scale(0.9); opacity: 0.35; } 35% { transform: translateY(-12px) rotate(var(--r)) scale(1.05); opacity: 1; } 60% { transform: translateY(0) rotate(var(--r)) scale(0.96); opacity: 0.8; } }
@keyframes kldBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
@keyframes kldDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.35; } 30% { transform: translateY(-4px); opacity: 1; } }
@keyframes kldIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes kldSpark { 0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(45deg); } }
`;

function Paw({ color }) {
    return (
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
            <g fill={color}>
                <ellipse cx="12" cy="16" rx="5.2" ry="4.4" />
                <ellipse cx="5.4" cy="10.4" rx="2.1" ry="2.6" transform="rotate(-18 5.4 10.4)" />
                <ellipse cx="9.4" cy="6.6" rx="2.1" ry="2.7" transform="rotate(-6 9.4 6.6)" />
                <ellipse cx="14.6" cy="6.6" rx="2.1" ry="2.7" transform="rotate(6 14.6 6.6)" />
                <ellipse cx="18.6" cy="10.4" rx="2.1" ry="2.6" transform="rotate(18 18.6 10.4)" />
            </g>
        </svg>
    );
}

function Spark({ style }) {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" style={{ position: "absolute", animation: "kldSpark 1.8s ease-in-out infinite", ...style }}>
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="#f6c945" />
        </svg>
    );
}

export default function KodaLoader({ label = "getting cozy", color = "#7a5c45", glow = "rgba(255, 248, 238, 0.85)" }) {
    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                zIndex: 2,
                animation: "kldIn 0.3s ease-out both",
            }}
        >
            <style>{CSS}</style>
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 26px 14px", borderRadius: 28, background: glow, boxShadow: "0 8px 24px rgba(90, 70, 53, 0.12)", border: "2px solid rgba(90, 70, 53, 0.12)", animation: "kldBreathe 2.4s ease-in-out infinite" }}>
                <Spark style={{ top: -4, left: 8 }} />
                <Spark style={{ top: 10, right: -2, animationDelay: "0.6s" }} />
                <Spark style={{ bottom: 4, left: -4, animationDelay: "1.2s" }} />
                <div style={{ display: "flex", gap: 10, height: 34, alignItems: "flex-end" }}>
                    {[-14, 8, -6].map((r, i) => (
                        <span key={i} style={{ display: "inline-flex", "--r": `${r}deg`, animation: `kldHop 1.2s ease-in-out ${i * 0.18}s infinite` }}>
                            <Paw color={color} />
                        </span>
                    ))}
                </div>
                <div style={{ color, fontWeight: 800, fontSize: 14, letterSpacing: 0.4, display: "flex", alignItems: "baseline" }}>
                    {label}
                    {[0, 1, 2].map((i) => (
                        <span key={i} style={{ display: "inline-block", marginLeft: 1, animation: `kldDot 1.1s ease-in-out ${i * 0.15}s infinite` }}>
                            .
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}