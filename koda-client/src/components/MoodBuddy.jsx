
import React, { Suspense, lazy, useEffect, useState } from "react";
import axios from "axios";
import { Canvas } from "@react-three/fiber";
import { API_URL } from "../config";
import BabyProfile from "./BabyProfile";
const own = (load) => ({ kind: "own", Comp: lazy(load) });
const scene = (load) => ({ kind: "scene", Comp: lazy(load) });

const ANIMATIONS = {
    fox: {
        angry: own(() => import("./animations/fox/AngryFox")),
        feeding: scene(() => import("./animations/fox/FeedingFox")),
    },
    frog: {
        angry: own(() => import("./animations/frog/AngryFrog")),
        feeding: scene(() => import("./animations/frog/FeedingFrog")),
    },
    koala: {
        angry: own(() => import("./animations/koala/AngryKoala")),
        feeding: scene(() => import("./animations/koala/FeedingKoala")),
    },
    bunny: {
        angry: own(() => import("./animations/bunny/AngryBunny")),
        feeding: scene(() => import("./animations/bunny/FeedingBunny")),
        crying: scene(() => import("./animations/bunny/CryingBunny")),
        hungry: scene(() => import("./animations/bunny/HungryBunny")),
    },
    bear: {
        angry: own(() => import("./animations/bear/AngryBear")),
        sleepy: own(() => import("./animations/bear/Feedingbear")),
    },
    panda: {
        angry: own(() => import("./animations/panda/AngryPanda")),
        feeding: scene(() => import("./animations/panda/FeedingPanda")),
        crying: scene(() => import("./animations/panda/CryingPanda")),
    },
};
const GRACE_MINUTES = 30;
const LOOKBACK_DAYS = 7;

const LOG_TO_MOOD = { feeding: "feeding", sleep: "sleeping" };
const MISSED_TO_MOOD = {
    playtime: "angry",
    diaper: "crying",
    feeding: "hungry",
    sleep: "sleepy",
};
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function entryTime(log) {
    const raw = log.timestamp || log.time || log.createdAt || log.date;
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? d : new Date(0);
}

function moodFromLog(log) {
    if (log.activityType === "feeding") return "feeding";
    if (log.activityType === "sleep") return "sleeping";
    if (log.activityType === "mood") {
        const text = String(log.value || log.mood || log.details?.value || log.text || log.note || "").toLowerCase();
        if (/(angry|mad)/.test(text)) return "angry";
        if (/(sad|cry)/.test(text)) return "crying";
        return null;
    }
    return null;
}
function occurrences(s, now) {
    const [h, m] = String(s.time || "00:00").split(":").map(Number);
    const out = [];
    if (s.repeat === "once") {
        if (s.date) {
            const d = new Date(`${String(s.date).slice(0, 10)}T00:00`);
            d.setHours(h, m, 0, 0);
            out.push(d);
        }
        return out;
    }
    const days = (s.daysOfWeek || []).map((d) => String(d).slice(0, 3).toLowerCase());
    for (let i = 0; i <= LOOKBACK_DAYS; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(h, m, 0, 0);
        if (s.repeat === "weekly" && !days.includes(DAY_KEYS[d.getDay()])) continue;
        out.push(d);
    }
    return out;
}

export function resolveMood(logs, schedules, now = new Date()) {
    const events = [];
    const grace = GRACE_MINUTES * 60000;

    for (const log of logs) {
        const mood = moodFromLog(log);
        if (mood) events.push({ at: entryTime(log), mood, reason: `${log.activityType} logged` });
    }

    for (const s of schedules) {
        const mood = MISSED_TO_MOOD[s.activityType];
        if (!mood) continue;
        for (const when of occurrences(s, now)) {
            const deadline = new Date(when.getTime() + grace);
            if (deadline > now) continue;
            const done = logs.some((l) => {
                if (l.activityType !== s.activityType) return false;
                const t = entryTime(l).getTime();
                return t >= when.getTime() - 2 * grace && t <= deadline.getTime();
            });
            if (!done) events.push({ at: deadline, mood, reason: `scheduled ${s.activityType} missed` });
        }
    }

    events.sort((a, b) => b.at - a.at);
    return events[0] || { mood: "content", at: null, reason: "nothing logged yet" };
}
async function loadChildData(childId, token) {
    const headers = { "x-auth-token": token };
    const [acts, sched] = await Promise.allSettled([
        axios.get(`${API_URL}/api/activities`, { params: { childId }, headers, timeout: 10000 }),
        axios.get(`${API_URL}/api/schedule`, { params: { childId }, headers, timeout: 10000 }),
    ]);

    const d = acts.status === "fulfilled" ? acts.value.data : {};
    const tag = (list, activityType) => (list || []).map((e) => ({ ...e, activityType }));
    const logs = [
        ...tag(d.feedings, "feeding"),
        ...tag(d.sleeps, "sleep"),
        ...tag(d.diapers, "diaper"),
        ...tag(d.playtimes || d.playtime, "playtime"),
        ...tag(d.moods || d.mood, "mood"),
    ];

    const s = sched.status === "fulfilled" ? sched.value.data : [];
    const schedules = Array.isArray(s) ? s : s?.schedules || [];
    return { logs, schedules };
}
const MOOD_INFO = {
    feeding: {
        dots: true,
        short: "nom nom",
        sentence: (n) => `${n} was just fed, so her animated self is happily munching.`,
        cause: () => "straight from a feeding log",
    },
    sleeping: {
        short: "zzz...",
        sentence: (n) => `${n} is resting right now, so her animated self is snoozing.`,
        cause: () => "straight from a sleep log",
    },
    sleepy: {
        short: "so sleepy",
        sentence: (n) => `${n} has been noted as tired and cranky.`,
        cause: () => "possibly due to a skipped sleep log",
    },
    hungry: {
        short: "hungry!",
        sentence: (n) => `${n} has been noted as hungry and fussy.`,
        cause: () => "possibly due to a skipped feeding log",
    },
    angry: {
        short: "grrr!",
        sentence: (n) => `${n} has been noted as mad and grumpy.`,
        cause: (r) => (r && r.includes("playtime") ? "possibly due to a missed playtime" : "noted as upset in the mood log"),
    },
    crying: {
        short: "sniff...",
        sentence: (n) => `${n} has been noted as sad and teary.`,
        cause: (r) => (r && r.includes("diaper") ? "possibly due to a missed diaper change" : "noted as sad in the mood log"),
    },
};

const formatWhen = (at) => {
    if (!at || !at.getTime || at.getTime() === 0) return "";
    return at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const KEYFRAMES = `
@keyframes mbBob { 0%,100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -6px); } }
@keyframes mbBobCute { 0%,100% { transform: translate(-50%, 0) scale(1, 1); } 50% { transform: translate(-50%, -7px) scale(1.04, 0.96); } }
@keyframes mbDot { 0%,60%,100% { opacity: 0.2; transform: translateY(0) scale(0.85); } 30% { opacity: 1; transform: translateY(-3px) scale(1); } }
@keyframes mbZoom { from { opacity: 0; transform: scale(0.35) translateY(40%); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes mbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mbPop { from { opacity: 0; transform: translateY(12px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

const setPassportHeader = (label) => {
    window.dispatchEvent(new CustomEvent("koda-header-label", { detail: { label } }));
};

function AnimationView({ anim, front }) {
    if (anim.kind === "own") return <anim.Comp />;
    return (
        <Canvas
            style={{ background: "transparent" }}
            gl={{ alpha: true, antialias: true }}
            dpr={[1, 2]}
            camera={front ? { position: [0, 1.05, 4.4], fov: 34 } : { position: [0, 2.5, 3.7], fov: 34 }}
            onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}
        >
            <ambientLight intensity={0.85} />
            <directionalLight position={[2.5, 4, 5]} intensity={1.9} />
            <directionalLight position={[-3, 1, 2]} intensity={0.6} color="#cfe0ff" />
            <anim.Comp referenceHeight={1.8} />
        </Canvas>
    );
}

export default function MoodBuddy({ child, refreshKey = 0, size = 130, bottom = "21%", left = "51%" }) {
    const [state, setState] = useState(null);
    const [view, setView] = useState(null);
    const animal = child?.avatar || child?.character || child?.animal || "bear";

    useEffect(() => {
        const childId = child?._id;
        const token = localStorage.getItem("token");
        if (!childId || !token) return;
        let active = true;

        const refresh = async () => {
            try {
                const { logs, schedules } = await loadChildData(childId, token);
                if (active) setState({ ...resolveMood(logs, schedules), logs });
            } catch (err) {
                console.error("Could not load mood:", err);
            }
        };

        refresh();
        const timer = setInterval(refresh, 60000);
        window.addEventListener("offline-sync-complete", refresh);
        window.addEventListener("activity-saved", refresh);
        return () => {
            active = false;
            clearInterval(timer);
            window.removeEventListener("offline-sync-complete", refresh);
            window.removeEventListener("activity-saved", refresh);
        };
    }, [child?._id, refreshKey]);

    const mood = state?.mood || "content";
    const anim = child ? ANIMATIONS[animal]?.[mood] : null;
    const active = !!anim;

    useEffect(() => {
        window.__moodAnimationActive = active;
        window.dispatchEvent(new CustomEvent("mood-animation", { detail: { active } }));
    }, [active]);

    useEffect(() => () => {
        window.__moodAnimationActive = false;
        window.dispatchEvent(new CustomEvent("mood-animation", { detail: { active: false } }));
    }, []);

    if (!anim) return null;

    const info = MOOD_INFO[mood] || { short: "hi!", sentence: () => "", cause: () => "" };
    const name = child?.name || child?.firstName || "your little one";
    const when = formatWhen(state?.at);
    const logs = state?.logs || [];

    const openProfile = () => {
        window.dispatchEvent(new CustomEvent("close-todays-activities"));
        setPassportHeader(`${name}'s passport`);
        setView("profile");
    };

    const closeProfile = () => {
        setPassportHeader(null);
        setView(null);
    };

    return (
        <>
            <style>{KEYFRAMES}</style>
            {view !== "explain" && (
                <div
                    style={{
                        position: "fixed",
                        left,
                        bottom,
                        transform: "translateX(-50%)",
                        width: size,
                        height: size,
                        pointerEvents: "none",
                        zIndex: 1,
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setView("choose")}
                        aria-label={`see why ${name} feels this way`}
                        style={{
                            position: "absolute",
                            left: "50%",
                            top: -12,
                            transform: "translateX(-50%)",
                            animation: `${info.dots ? "mbBobCute" : "mbBob"} 2.4s ease-in-out infinite`,
                            pointerEvents: "auto",
                            visibility: view ? "hidden" : "visible",
                            cursor: "pointer",
                            border: "1.5px solid rgba(47,90,58,0.12)",
                            borderRadius: info.dots ? 14 : 999,
                            borderBottomLeftRadius: info.dots ? 5 : 999,
                            padding: info.dots ? "4px 9px" : "4px 9px",
                            background: info.dots ? "#fff8ee" : "rgba(255,255,255,0.92)",
                            boxShadow: info.dots
                                ? "0 4px 12px rgba(30,60,40,0.14), inset 0 -2px 0 rgba(47,90,58,0.06)"
                                : "0 4px 12px rgba(30,60,40,0.16)",
                            fontFamily: "inherit",
                            fontWeight: 700,
                            fontSize: 11,
                            color: "#2f5a3a",
                            whiteSpace: "nowrap",
                            zIndex: 2,
                        }}
                    >
                        {info.short}
                        {info.dots && (
                            <span style={{ display: "inline-flex", gap: 2, marginLeft: 5, verticalAlign: "baseline" }}>
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        style={{
                                            width: 4,
                                            height: 4,
                                            borderRadius: 999,
                                            background: "#2f5a3a",
                                            display: "inline-block",
                                            animation: `mbDot 1.2s ${i * 0.2}s infinite`,
                                        }}
                                    />
                                ))}
                            </span>
                        )}
                        <span
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: -5,
                                width: 10,
                                height: 10,
                                background: info.dots ? "#fff8ee" : "rgba(255,255,255,0.92)",
                                borderRight: "2px solid rgba(47,90,58,0.12)",
                                borderBottom: "2px solid rgba(47,90,58,0.12)",
                                transform: "translateX(-50%) rotate(45deg)",
                                borderRadius: 2,
                            }}
                        />
                    </button>
                    <Suspense fallback={null}>
                        <AnimationView anim={anim} front={false} />
                    </Suspense>
                </div>
            )}

            {view === "choose" && (
                <div onClick={() => setView(null)} style={{ position: "fixed", inset: 0, zIndex: 45 }}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: "fixed",
                            left,
                            bottom: `calc(${bottom} + ${size - 30}px)`,
                            transform: "translateX(-50%)",
                            zIndex: 46,
                            borderRadius: 20,
                            padding: 10,
                            background: "rgba(255,255,255,0.96)",
                            boxShadow: "0 12px 28px rgba(20,45,30,0.25)",
                            fontFamily: "inherit",
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            animation: "mbPop 0.25s ease-out",
                        }}
                    >
                        <button
                            type="button"
                            onClick={openProfile}
                            style={{
                                border: "none",
                                borderRadius: 14,
                                padding: "9px 16px",
                                background: "rgba(47,90,58,0.1)",
                                color: "#2f5a3a",
                                fontFamily: "inherit",
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {name}'s passport
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("explain")}
                            style={{
                                border: "none",
                                borderRadius: 14,
                                padding: "9px 16px",
                                background: "rgba(47,90,58,0.1)",
                                color: "#2f5a3a",
                                fontFamily: "inherit",
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                            }}
                        >
                            mood explanation
                        </button>
                        <span
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: -8,
                                width: 16,
                                height: 16,
                                background: "rgba(255,255,255,0.96)",
                                transform: "translateX(-50%) rotate(45deg)",
                                borderRadius: 3,
                            }}
                        />
                    </div>
                </div>
            )}

            {view === "profile" && (
                <BabyProfile
                    child={child}
                    mood={{ short: info.short, sentence: info.sentence(name), cause: info.cause(state?.reason), when }}
                    photo={
                        <Suspense fallback={null}>
                            <AnimationView anim={anim} front />
                        </Suspense>
                    }
                    onClose={closeProfile}
                />
            )}

            {view === "explain" && (
                <div
                    onClick={() => setView(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        background: "rgba(20,45,30,0.35)",
                        backdropFilter: "blur(6px)",
                        WebkitBackdropFilter: "blur(6px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 20,
                        animation: "mbFade 0.25s ease-out",
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "100%",
                            maxWidth: 360,
                            borderRadius: 24,
                            padding: "18px 20px",
                            background: "rgba(255,255,255,0.95)",
                            boxShadow: "0 18px 40px rgba(20,45,30,0.25)",
                            fontFamily: "inherit",
                            color: "#2f5a3a",
                            position: "relative",
                            animation: "mbPop 0.35s 0.1s ease-out both",
                        }}
                    >
                        <button
                            type="button"
                            onClick={() => setView(null)}
                            aria-label="close"
                            style={{
                                position: "absolute",
                                top: 10,
                                right: 12,
                                border: "none",
                                background: "rgba(47,90,58,0.1)",
                                color: "#2f5a3a",
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: 14,
                            }}
                        >
                            ✕
                        </button>
                        <div className="hm-title" style={{ fontSize: 22, marginBottom: 8, paddingRight: 30 }}>
                            mood explanation
                        </div>
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{info.sentence(name)}</p>
                        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45, opacity: 0.75 }}>
                            → {info.cause(state?.reason)}
                        </p>
                        {when ? (
                            <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 700, opacity: 0.6 }}>since {when}</p>
                        ) : null}
                        <span
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: -9,
                                width: 18,
                                height: 18,
                                background: "rgba(255,255,255,0.95)",
                                transform: "translateX(-50%) rotate(45deg)",
                                borderRadius: 3,
                            }}
                        />
                    </div>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: "min(80vw, 340px)",
                            height: "min(80vw, 340px)",
                            marginTop: 14,
                            animation: "mbZoom 0.45s cubic-bezier(.2,.9,.3,1.2)",
                        }}
                    >
                        <Suspense fallback={null}>
                            <AnimationView anim={anim} front />
                        </Suspense>
                    </div>
                    <p style={{ marginTop: 6, color: "#fff", fontSize: 12, opacity: 0.85, fontFamily: "inherit" }}>tap anywhere to close</p>
                </div>
            )}
        </>
    );
}