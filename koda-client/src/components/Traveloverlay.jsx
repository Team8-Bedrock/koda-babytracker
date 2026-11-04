import React, { useEffect, useState } from "react";
import CharacterHead, { animalOf, headShot } from "./CharacterHead";

const STORAGE_KEY = "koda-travel";
const TAKEOFF_MS = 1300;
const MIN_FLIGHT_MS = 2200;
const MAX_FLIGHT_MS = 9000;
const LAND_MS = 1100;

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
        if (!data || Date.now() - data.at > 20000) return null;
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

export function startTravel(child, onBoard) {
    const detail = { name: child?.name || "your little one", animal: animalOf(child), at: Date.now() };
    headShot(detail.animal);
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(detail));
    } catch {
        detail.noStore = true;
    }
    window.dispatchEvent(new CustomEvent("koda-travel", { detail }));
    setTimeout(() => {
        window.__moodAnchor = null;
        onBoard?.();
        window.dispatchEvent(new CustomEvent("koda-travel-board", { detail }));
    }, reducedMotion() ? 300 : TAKEOFF_MS);
}

const KEYFRAMES = `
@keyframes ktSkyIn { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes ktFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes ktFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes ktDrift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes ktPartLeft { from { transform: translateX(0); } to { transform: translateX(-110%); } }
@keyframes ktPartRight { from { transform: translateX(0); } to { transform: translateX(110%); } }
@keyframes ktSkyOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes ktFly { 0% { transform: translate(-60vw, 24px) rotate(-8deg); } 55% { transform: translate(0, -8px) rotate(4deg); } 100% { transform: translate(0, 0) rotate(0deg); } }
@keyframes ktBob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(3deg); } }
@keyframes ktLand { 0% { transform: translate(0, 0) rotate(0deg) scale(1); } 100% { transform: translate(60vw, 40px) rotate(10deg) scale(0.7); opacity: 0; } }
@keyframes ktProp { from { transform: scaleY(1); } to { transform: scaleY(0.15); } }
@keyframes ktTrail { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -40; } }
@keyframes ktPass { 0% { transform: translateY(40px) rotate(-6deg); opacity: 0; } 70% { transform: translateY(-4px) rotate(2deg); opacity: 1; } 100% { transform: translateY(0) rotate(-2deg); opacity: 1; } }
@keyframes ktStamp { 0% { transform: scale(2.2) rotate(18deg); opacity: 0; } 60% { transform: scale(0.95) rotate(-10deg); opacity: 1; } 100% { transform: scale(1) rotate(-8deg); opacity: 1; } }
@keyframes ktDot { 0%, 60%, 100% { opacity: 0.3; transform: translateY(0); } 30% { opacity: 1; transform: translateY(-3px); } }
@keyframes ktTwinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
`;

function Cloud({ color, width, style }) {
    return (
        <svg viewBox="0 0 200 90" width={width} style={{ display: "block", ...style }} aria-hidden="true">
            <path
                fill={color}
                d="M28 78 C 6 78, 2 52, 24 48 C 22 26, 50 16, 66 32 C 74 10, 112 6, 122 30 C 138 16, 172 24, 168 48 C 194 48, 198 78, 174 78 Z"
            />
        </svg>
    );
}

function CloudRow({ color, top, size, speed, opacity, reverse }) {
    const clouds = [0, 1, 2, 3, 4, 5];
    return (
        <div style={{ position: "absolute", left: 0, top, width: "200%", display: "flex", opacity, animation: reducedMotion() ? "none" : `ktDrift ${speed}s linear infinite ${reverse ? "reverse" : ""}` }}>
            {clouds.map((i) => (
                <Cloud key={i} color={color} width={size} style={{ marginLeft: i % 2 ? size * 0.35 : size * 0.1, marginTop: i % 3 === 1 ? size * 0.18 : 0 }} />
            ))}
        </div>
    );
}

function Plane({ body, wing, trim }) {
    return (
        <svg viewBox="0 0 140 80" width="132" aria-hidden="true" style={{ overflow: "visible" }}>
            <path d="M-140 46 C -100 30, -60 62, -18 44" fill="none" stroke={trim} strokeWidth="3" strokeLinecap="round" strokeDasharray="2 10" style={{ animation: "ktTrail 0.8s linear infinite", opacity: 0.7 }} />
            <ellipse cx="62" cy="44" rx="48" ry="17" fill={body} />
            <path d="M18 40 L4 22 L16 22 L34 38 Z" fill={wing} />
            <path d="M52 46 L34 72 L50 72 L76 48 Z" fill={wing} />
            <path d="M50 40 L40 22 L54 22 L70 38 Z" fill={wing} opacity="0.7" />
            <circle cx="92" cy="40" r="7" fill="#d9f1ff" stroke={trim} strokeWidth="2" />
            <circle cx="74" cy="40" r="5" fill="#d9f1ff" stroke={trim} strokeWidth="2" />
            <circle cx="58" cy="40" r="5" fill="#d9f1ff" stroke={trim} strokeWidth="2" />
            <path d="M104 34 Q 114 44 104 54 Z" fill={trim} />
            <g transform="translate(112 44)">
                <rect x="-2" y="-16" width="4" height="32" rx="2" fill={trim} style={{ transformOrigin: "0 0", animation: reducedMotion() ? "none" : "ktProp 0.08s linear infinite alternate" }} />
            </g>
            <circle cx="112" cy="44" r="3.5" fill={wing} />
        </svg>
    );
}

function BoardingPass({ info, ink, paper, accent, landed }) {
    return (
        <div style={{ position: "relative", width: 260, borderRadius: 18, background: paper, boxShadow: "0 14px 30px rgba(40,60,90,0.22)", color: ink, overflow: "hidden", animation: "ktPass 0.6s cubic-bezier(.2,1.3,.4,1) 0.2s both" }}>
            <div style={{ background: accent, color: "#fff", padding: "6px 14px", fontSize: 11, fontWeight: 800, letterSpacing: 2, display: "flex", justifyContent: "space-between" }}>
                <span>KODA AIR</span>
                <span>BOARDING PASS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px 10px" }}>
                <div style={{ width: 64, height: 64, borderRadius: 999, background: "rgba(255,255,255,0.7)", border: `2px dashed ${accent}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CharacterHead animal={info.animal} size={56} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, fontWeight: 800, letterSpacing: 1.2, opacity: 0.6 }}>
                        <span>FROM</span>
                        <span>TO</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontWeight: 800, fontSize: 15 }}>
                        <span>home</span>
                        <span style={{ flex: 1, borderTop: `2px dotted ${accent}`, margin: "0 4px", opacity: 0.6 }} />
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{info.name}</span>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginTop: 2 }}>{info.name}'s habitat</div>
                </div>
            </div>
            <div style={{ borderTop: `2px dashed ${accent}`, opacity: 0.35, margin: "0 10px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 12px" }}>
                <div style={{ display: "flex", gap: 2, height: 22, alignItems: "stretch" }}>
                    {[3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 2, 1, 3, 1, 2, 1, 3].map((w, i) => (
                        <span key={i} style={{ width: w, background: ink, opacity: 0.75, borderRadius: 1 }} />
                    ))}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: accent, display: "flex", alignItems: "baseline" }}>
                    {landed ? "landed!" : "now boarding"}
                    {!landed && [0, 1, 2].map((i) => (
                        <span key={i} style={{ display: "inline-block", marginLeft: 1, animation: `ktDot 1.1s ease-in-out ${i * 0.15}s infinite` }}>.</span>
                    ))}
                </div>
            </div>
            {landed && (
                <div style={{ position: "absolute", left: "38%", bottom: 6, padding: "4px 10px", border: `3px solid ${accent}`, borderRadius: 10, color: accent, fontWeight: 900, fontSize: 14, letterSpacing: 1, background: "rgba(255,255,255,0.6)", animation: "ktStamp 0.4s cubic-bezier(.2,1.4,.4,1) both" }}>
                    WELCOME!
                </div>
            )}
        </div>
    );
}

function Scene({ info, phase }) {
    const night = isNight();
    const calm = reducedMotion();
    const C = night
        ? { skyTop: "#1b2350", skyBottom: "#3a3f78", cloud: "#4a5290", cloudFar: "#343c76", ink: "#27305a", paper: "#f5f2ff", accent: "#7b6fd1", body: "#f4d77a", wing: "#e7b94a", trim: "#7b6fd1" }
        : { skyTop: "#9fd4f2", skyBottom: "#fdf3e3", cloud: "#ffffff", cloudFar: "#e8f5fc", ink: "#2f4a3a", paper: "#fffaf0", accent: "#e88a6a", body: "#fffaf0", wing: "#e88a6a", trim: "#5a8fb8" };
    const boarding = phase === "takeoff";
    const landing = phase === "land";

    const skyAnim = calm
        ? boarding ? "ktFadeIn 0.3s ease-out both" : landing ? "ktSkyOut 0.4s ease-in both" : "none"
        : boarding ? "ktSkyIn 0.9s cubic-bezier(.6,0,.3,1) both" : landing ? `ktSkyOut 0.5s ease-in ${(LAND_MS - 500) / 1000}s both` : "none";

    return (
        <div role="status" aria-live="polite" style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", fontFamily: "inherit", pointerEvents: "all", background: `linear-gradient(180deg, ${C.skyTop} 0%, ${C.skyBottom} 100%)`, animation: skyAnim }}>
            <style>{KEYFRAMES}</style>
            {night && [[12, 10], [30, 18], [64, 8], [82, 22], [46, 30], [90, 40], [8, 44]].map(([x, y], i) => (
                <span key={i} style={{ position: "absolute", left: `${x}%`, top: `${y}%`, width: 3, height: 3, borderRadius: 999, background: "#fff3c4", animation: `ktTwinkle ${1.4 + i * 0.3}s ease-in-out infinite` }} />
            ))}
            <CloudRow color={C.cloudFar} top="8%" size={150} speed={28} opacity={0.8} />
            <CloudRow color={C.cloudFar} top="62%" size={180} speed={34} opacity={0.7} reverse />

            <div style={{ position: "absolute", left: 0, right: 0, top: "16%", display: "flex", justifyContent: "center" }}>
                <div style={{ animation: calm ? "none" : landing ? "ktLand 0.8s ease-in both" : boarding ? "ktFly 1.2s cubic-bezier(.2,.9,.3,1) 0.3s both" : "ktBob 1.6s ease-in-out infinite" }}>
                    <Plane body={C.body} wing={C.wing} trim={C.trim} />
                </div>
            </div>

            <div style={{ position: "absolute", left: 0, right: 0, top: "36%", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: night ? "#fff3c4" : "#2f5a7a", opacity: 0.85, animation: "ktFadeIn 0.4s ease-out 0.4s both" }}>
                    {landing ? "you've arrived" : `flying to ${info.name}'s habitat`}
                </div>
                <BoardingPass info={info} ink={C.ink} paper={C.paper} accent={C.accent} landed={landing} />
            </div>

            <div style={{ position: "absolute", left: "-10%", bottom: "-4%", width: "70%", animation: landing && !calm ? `ktPartLeft ${LAND_MS / 1000}s cubic-bezier(.6,0,.3,1) both` : "none" }}>
                <Cloud color={C.cloud} width="100%" />
            </div>
            <div style={{ position: "absolute", right: "-10%", bottom: "-8%", width: "75%", animation: landing && !calm ? `ktPartRight ${LAND_MS / 1000}s cubic-bezier(.6,0,.3,1) both` : "none" }}>
                <Cloud color={C.cloud} width="100%" />
            </div>
            <div style={{ position: "absolute", left: "20%", bottom: "-12%", width: "60%", animation: landing && !calm ? `ktPartLeft ${LAND_MS / 1000}s cubic-bezier(.6,0,.3,1) 0.1s both` : "none" }}>
                <Cloud color={C.cloudFar} width="100%" />
            </div>
        </div>
    );
}

export default function TravelOverlay() {
    const [state, setState] = useState(() => {
        const pending = readPending();
        return pending ? { info: pending, phase: "flight" } : null;
    });

    useEffect(() => {
        const onTravel = (e) => setState({ info: e.detail, phase: "takeoff" });
        const onBoard = (e) => setState({ info: e.detail, phase: "flight" });
        window.addEventListener("koda-travel", onTravel);
        window.addEventListener("koda-travel-board", onBoard);
        return () => {
            window.removeEventListener("koda-travel", onTravel);
            window.removeEventListener("koda-travel-board", onBoard);
        };
    }, []);

    useEffect(() => {
        if (state?.phase !== "flight") return undefined;
        clearPending();
        const started = performance.now();
        let done = false;
        const land = () => {
            if (done) return;
            done = true;
            setState((cur) => (cur ? { ...cur, phase: "land" } : cur));
        };
        const check = () => {
            const flown = performance.now() - started;
            if (flown < MIN_FLIGHT_MS) return;
            if (window.__moodAnchor || flown > MAX_FLIGHT_MS) land();
        };
        const poll = setInterval(check, 200);
        return () => clearInterval(poll);
    }, [state?.phase]);

    useEffect(() => {
        if (state?.phase !== "land") return undefined;
        const id = setTimeout(() => {
            setState(null);
            window.dispatchEvent(new CustomEvent("koda-child-switched"));
        }, (reducedMotion() ? 400 : LAND_MS) + 60);
        return () => clearTimeout(id);
    }, [state?.phase]);

    if (!state) return null;
    return <Scene info={state.info} phase={state.phase} />;
}