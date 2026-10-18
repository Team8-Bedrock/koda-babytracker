import React, { useEffect, useState } from "react";
import CharacterHead, { animalOf, headShot } from "./CharacterHead";

const STORAGE_KEY = "koda-child-switch";
const OUT_MS = 720;
const HOLD_MS = 650;
const IN_MS = 620;
const MAX_WAIT_MS = 7000;

const ANIMALS = {
    bear: { day: ["#f1e2c8", "#8a5a3a", "#e6c89a"] },
    panda: { day: ["#dff1e8", "#2f5a52", "#b8dccb"] },
    bunny: { day: ["#fbe3ec", "#b8577e", "#f6c3d5"] },
    frog: { day: ["#dcefc7", "#3f7d54", "#b9dc98"] },
    fox: { day: ["#f8e2bf", "#c0602b", "#f2c48a"] },
    koala: { day: ["#e3eadd", "#5e7a62", "#c6d6bf"] },
};
const NIGHT = ["#262f58", "#f4d77a", "#3a4680"];

function Paw({ color, size = 22 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
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

const isNight = () => {
    try {
        return localStorage.getItem("koda-dark-mode") === "true";
    } catch {
        return false;
    }
};

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function readPending() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (!data || Date.now() - data.at > 15000) return null;
        return data;
    } catch {
        return null;
    }
}

function clearPending() {
    try {
        sessionStorage.removeItem(STORAGE_KEY);
        return true;
    } catch {
        return false;
    }
}

export function startChildSwitch(child, originEl, onSwap) {
    const rect = originEl?.getBoundingClientRect?.();
    const x = rect ? ((rect.left + rect.width / 2) / window.innerWidth) * 100 : 50;
    const y = rect ? ((rect.top + rect.height / 2) / window.innerHeight) * 100 : 8;
    const detail = { name: child?.name || "your little one", animal: animalOf(child), x, y, at: Date.now() };
    headShot(detail.animal);
    if (!onSwap) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
        } catch {
            detail.noStore = true;
        }
    }
    window.dispatchEvent(new CustomEvent("koda-child-switch", { detail }));
    setTimeout(() => {
        if (!onSwap) {
            window.location.reload();
            return;
        }
        window.__moodAnchor = null;
        onSwap();
        window.dispatchEvent(new CustomEvent("koda-child-arrive", { detail }));
    }, reducedMotion() ? 250 : OUT_MS);
}

const KEYFRAMES = `
@keyframes kcsIrisOut { from { clip-path: circle(0% at var(--ox) var(--oy)); } to { clip-path: circle(150% at var(--ox) var(--oy)); } }
@keyframes kcsIrisIn { from { clip-path: circle(150% at 50% 55%); } to { clip-path: circle(0% at 50% 55%); } }
@keyframes kcsFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes kcsFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes kcsBadgeIn { 0% { transform: scale(0.3) rotate(-18deg); opacity: 0; } 60% { transform: scale(1.12) rotate(6deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
@keyframes kcsBob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-7px) rotate(3deg); } }
@keyframes kcsWave { 0%, 100% { transform: rotate(0deg); } 25% { transform: rotate(-14deg); } 75% { transform: rotate(14deg); } }
@keyframes kcsText { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes kcsDot { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 25% { opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; } }
@keyframes kcsHop { 0%, 100% { transform: translateY(0) rotate(var(--r)) scale(0.9); opacity: 0.35; } 35% { transform: translateY(-10px) rotate(var(--r)) scale(1.05); opacity: 1; } 60% { transform: translateY(0) rotate(var(--r)) scale(0.96); opacity: 0.8; } }
@keyframes kcsPaw { 0%, 100% { opacity: 0.15; transform: scale(0.85) rotate(var(--r)); } 50% { opacity: 0.55; transform: scale(1) rotate(var(--r)); } }
`;

function Overlay({ info, phase }) {
    const night = isNight();
    const [bg, ink, soft] = night ? NIGHT : ANIMALS[info.animal]?.day || ANIMALS.bear.day;
    const calm = reducedMotion();
    const leaving = phase === "out";
    const anim = calm
        ? leaving
            ? "kcsFade 0.25s ease-out both"
            : phase === "reveal"
                ? "kcsFadeOut 0.3s ease-in both"
                : "none"
        : leaving
            ? `kcsIrisOut ${OUT_MS / 1000}s cubic-bezier(.6,0,.3,1) both`
            : phase === "reveal"
                ? `kcsIrisIn ${IN_MS / 1000}s cubic-bezier(.6,0,.4,1) both`
                : "none";
    const waiting = phase === "in";

    return (
        <div
            aria-live="polite"
            role="status"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: `radial-gradient(circle at 50% 42%, ${soft} 0%, ${bg} 62%)`,
                color: ink,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                fontFamily: "inherit",
                pointerEvents: "all",
                "--ox": `${info.x ?? 50}%`,
                "--oy": `${info.y ?? 8}%`,
                animation: anim,
            }}
        >
            <style>{KEYFRAMES}</style>
            {[
                [14, 22, -20],
                [80, 30, 18],
                [22, 74, 12],
                [76, 78, -14],
                [48, 14, 4],
            ].map(([l, t, r], i) => (
                <span key={i} style={{ position: "absolute", left: `${l}%`, top: `${t}%`, display: "inline-flex", "--r": `${r}deg`, animation: calm ? "none" : `kcsPaw 1.6s ease-in-out ${i * 0.18}s infinite`, opacity: 0.3 }}>
                    <Paw color={ink} />
                </span>
            ))}
            <div style={{ position: "relative", width: 132, height: 132 }}>
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        background: night ? "#1f2850" : "#fffaf0",
                        border: `3px dashed ${ink}`,
                        boxShadow: night ? "0 10px 28px rgba(5,8,25,0.45)" : "0 10px 28px rgba(60,40,20,0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        animation: calm ? "none" : `kcsBadgeIn 0.5s cubic-bezier(.2,1.4,.4,1) ${leaving ? 0.28 : 0}s both`,
                    }}
                >
                    <span style={{ display: "inline-flex", color: ink, animation: calm ? "none" : leaving ? "kcsBob 1.2s ease-in-out infinite" : "kcsWave 0.6s ease-in-out 0.1s 2" }}>
                        <CharacterHead animal={info.animal} size={112} />
                    </span>
                </div>
                {!calm &&
                    Array.from({ length: 10 }).map((_, i) => {
                        const a = (i / 10) * Math.PI * 2;
                        return (
                            <span
                                key={i}
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    width: i % 3 ? 8 : 6,
                                    height: i % 3 ? 8 : 12,
                                    marginLeft: -4,
                                    marginTop: -4,
                                    borderRadius: i % 3 ? 999 : 3,
                                    background: i % 2 ? ink : soft,
                                    "--dx": `${Math.cos(a) * 96}px`,
                                    "--dy": `${Math.sin(a) * 96}px`,
                                    animation: `kcsDot 0.8s ease-out ${(leaving ? 0.42 : 0.1) + (i % 3) * 0.05}s both`,
                                }}
                            />
                        );
                    })}
            </div>
            <div style={{ textAlign: "center", animation: calm ? "none" : `kcsText 0.35s ease-out ${leaving ? 0.38 : 0.05}s both` }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", opacity: 0.7 }}>{leaving ? "hopping over to" : "welcome back"}</div>
                <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>{leaving ? `${info.name}'s habitat` : `hi, ${info.name}!`}</div>
                <div style={{ height: 30, marginTop: 10, display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, opacity: waiting ? 1 : 0, transition: "opacity 0.25s" }}>
                    {[-14, 8, -6].map((r, i) => (
                        <span key={i} style={{ display: "inline-flex", "--r": `${r}deg`, animation: calm ? "none" : `kcsHop 1.2s ease-in-out ${i * 0.18}s infinite` }}>
                            <Paw color={ink} size={20} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ChildSwitchOverlay() {
    const [state, setState] = useState(() => {
        const pending = readPending();
        return pending ? { info: pending, phase: "in" } : null;
    });

    useEffect(() => {
        if (state?.phase !== "in") return undefined;
        clearPending();
        const started = performance.now();
        let done = false;
        const reveal = () => {
            if (done) return;
            done = true;
            setState((cur) => (cur ? { ...cur, phase: "reveal" } : cur));
        };
        const check = () => {
            const waited = performance.now() - started;
            if (waited < HOLD_MS) return;
            if (window.__moodAnchor || waited > MAX_WAIT_MS) reveal();
        };
        const poll = setInterval(check, 150);
        const onAnchor = () => setTimeout(check, 250);
        window.addEventListener("mood-anchor", onAnchor);
        return () => {
            clearInterval(poll);
            window.removeEventListener("mood-anchor", onAnchor);
        };
    }, [state?.phase]);

    useEffect(() => {
        if (state?.phase !== "reveal") return undefined;
        const id = setTimeout(() => {
            setState(null);
            window.dispatchEvent(new CustomEvent("koda-child-switched"));
        }, (reducedMotion() ? 320 : IN_MS) + 40);
        return () => clearTimeout(id);
    }, [state?.phase]);

    useEffect(() => {
        const onSwitch = (e) => setState({ info: e.detail, phase: "out" });
        const onArrive = (e) => setState({ info: e.detail, phase: "in" });
        window.addEventListener("koda-child-switch", onSwitch);
        window.addEventListener("koda-child-arrive", onArrive);
        return () => {
            window.removeEventListener("koda-child-switch", onSwitch);
            window.removeEventListener("koda-child-arrive", onArrive);
        };
    }, []);

    if (!state) return null;
    return <Overlay info={state.info} phase={state.phase} />;
}