import { createPortal } from "react-dom";

import React, { Suspense, lazy, useEffect, useState } from "react";
import axios from "axios";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { API_URL } from "../config";
import BabyProfile from "./BabyProfile";
const own = (load) => ({ kind: "own", Comp: lazy(load) });
const scene = (load) => ({ kind: "scene", Comp: lazy(load) });

const ANIMATIONS = {
    fox: {
        angry: scene(() => import("./animations/fox/AngryFox")),
        feeding: scene(() => import("./animations/fox/FeedingFox")),
        crying: scene(() => import("./animations/fox/CryingFox")),
        hungry: scene(() => import("./animations/fox/HungryFox")),
        sleepy: scene(() => import("./animations/fox/SleepyFox")),
        sleeping: scene(() => import("./animations/fox/SleepingFox")),
        woke: scene(() => import("./animations/fox/WokeFox")),
        groggy: scene(() => import("./animations/fox/WokeFox")),
        happy: scene(() => import("./animations/fox/HappyFox")),
        energetic: scene(() => import("./animations/fox/EnergeticFox")),
        quiet: scene(() => import("./animations/fox/QuietFox")),
        other: scene(() => import("./animations/fox/OtherFox")),
        playtime: scene(() => import("./animations/fox/PlaytimeFox")),
        diaper: scene(() => import("./animations/fox/DiaperFox")),
    },
    frog: {
        angry: scene(() => import("./animations/frog/AngryFrog")),
        feeding: scene(() => import("./animations/frog/FeedingFrog")),
        crying: scene(() => import("./animations/frog/CryingFrog")),
        hungry: scene(() => import("./animations/frog/HungryFrog")),
        sleepy: scene(() => import("./animations/frog/SleepyFrog")),
        sleeping: scene(() => import("./animations/frog/SleepingFrog")),
        woke: scene(() => import("./animations/frog/WokeFrog")),
        groggy: scene(() => import("./animations/frog/WokeFrog")),
        happy: scene(() => import("./animations/frog/HappyFrog")),
        energetic: scene(() => import("./animations/frog/EnergeticFrog")),
        quiet: scene(() => import("./animations/frog/QuietFrog")),
        other: scene(() => import("./animations/frog/OtherFrog")),
        playtime: scene(() => import("./animations/frog/PlaytimeFrog")),
        diaper: scene(() => import("./animations/frog/DiaperFrog")),
    },
    koala: {
        angry: scene(() => import("./animations/koala/AngryKoala")),
        feeding: scene(() => import("./animations/koala/FeedingKoala")),
        crying: scene(() => import("./animations/koala/CryingKoala")),
        hungry: scene(() => import("./animations/koala/HungryKoala")),
        sleepy: scene(() => import("./animations/koala/SleepyKoala")),
        sleeping: scene(() => import("./animations/koala/SleepingKoala")),
        woke: scene(() => import("./animations/koala/WokeKoala")),
        groggy: scene(() => import("./animations/koala/WokeKoala")),
        happy: scene(() => import("./animations/koala/HappyKoala")),
        energetic: scene(() => import("./animations/koala/EnergeticKoala")),
        quiet: scene(() => import("./animations/koala/QuietKoala")),
        other: scene(() => import("./animations/koala/OtherKoala")),
        playtime: scene(() => import("./animations/koala/PlaytimeKoala")),
        diaper: scene(() => import("./animations/koala/DiaperKoala")),
    },
    bunny: {
        angry: own(() => import("./animations/bunny/AngryBunny")),
        feeding: scene(() => import("./animations/bunny/FeedingBunny")),
        crying: scene(() => import("./animations/bunny/CryingBunny")),
        hungry: scene(() => import("./animations/bunny/HungryBunny")),
        sleepy: scene(() => import("./animations/bunny/SleepyBunny")),
        sleeping: scene(() => import("./animations/bunny/SleepingBunny")),
        woke: scene(() => import("./animations/bunny/WokeBunny")),
        groggy: scene(() => import("./animations/bunny/WokeBunny")),
        happy: scene(() => import("./animations/bunny/HappyBunny")),
        energetic: scene(() => import("./animations/bunny/EnergeticBunny")),
        quiet: scene(() => import("./animations/bunny/QuietBunny")),
        other: scene(() => import("./animations/bunny/OtherBunny")),
        playtime: scene(() => import("./animations/bunny/PlaytimeBunny")),
        diaper: scene(() => import("./animations/bunny/DiaperBunny")),
    },
    bear: {
        angry: scene(() => import("./animations/bear/AngryBear")),
        feeding: scene(() => import("./animations/bear/FeedingBear")),
        crying: scene(() => import("./animations/bear/CryingBear")),
        hungry: scene(() => import("./animations/bear/HungryBear")),
        sleepy: scene(() => import("./animations/bear/SleepyBear")),
        sleeping: scene(() => import("./animations/bear/SleepingBear")),
        woke: scene(() => import("./animations/bear/WokeBear")),
        groggy: scene(() => import("./animations/bear/WokeBear")),
        happy: scene(() => import("./animations/bear/HappyBear")),
        energetic: scene(() => import("./animations/bear/EnergeticBear")),
        quiet: scene(() => import("./animations/bear/QuietBear")),
        other: scene(() => import("./animations/bear/OtherBear")),
        playtime: scene(() => import("./animations/bear/PlaytimeBear")),
        diaper: scene(() => import("./animations/bear/DiaperBear")),
    },
    panda: {
        angry: scene(() => import("./animations/panda/AngryPanda")),
        feeding: scene(() => import("./animations/panda/FeedingPanda")),
        crying: scene(() => import("./animations/panda/CryingPanda")),
        hungry: scene(() => import("./animations/panda/HungryPanda")),
        sleepy: scene(() => import("./animations/panda/SleepyPanda")),
        sleeping: scene(() => import("./animations/panda/SleepingPanda")),
        woke: scene(() => import("./animations/panda/WokePanda")),
        groggy: scene(() => import("./animations/panda/WokePanda")),
        happy: scene(() => import("./animations/panda/HappyPanda")),
        energetic: scene(() => import("./animations/panda/EnergeticPanda")),
        quiet: scene(() => import("./animations/panda/QuietPanda")),
        other: scene(() => import("./animations/panda/OtherPanda")),
        playtime: scene(() => import("./animations/panda/PlaytimePanda")),
        diaper: scene(() => import("./animations/panda/DiaperPanda")),
    },
};
const BUBBLE_GAP = 24;
const GRACE_MINUTES = 30;
const LOOKBACK_DAYS = 7;

const MISSED_TO_MOOD = {
    playtime: "angry",
    diaper: "crying",
    feeding: "hungry",
    sleep: "sleepy",
};
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function entryTime(log) {
    const raw = log.timestamp || log.time || log.createdAt || log.date || log.loggedAt || log.updatedAt;
    const d = raw ? new Date(raw) : null;
    if (d && !isNaN(d.getTime())) return d;
    if (typeof log._id === "string" && /^[0-9a-f]{24}$/i.test(log._id)) return new Date(parseInt(log._id.slice(0, 8), 16) * 1000);
    return new Date(0);
}

function asDate(raw) {
    const d = raw ? new Date(raw) : null;
    return d && !isNaN(d.getTime()) ? d : null;
}

function sleepStart(log) {
    return asDate(log.startTime || log.details?.startTime) || entryTime(log);
}

function sleepEnd(log) {
    return asDate(log.endTime || log.details?.endTime);
}

function moodFromLog(log) {
    if (log.activityType === "feeding") return "feeding";
    if (log.activityType === "playtime") return "playtime";
    if (log.activityType === "diaper") return "diaper";
    if (log.activityType === "mood") {
        const text = String(log.mood || log.value || log.details?.value || log.text || log.note || "").toLowerCase().trim();
        if (/^other\b/.test(text)) return "other";
        if (/(angry|mad)/.test(text)) return "angry";
        if (/(sad|cry|upset)/.test(text)) return "crying";
        if (/(tired|sleepy)/.test(text)) return "groggy";
        if (/energetic/.test(text)) return "energetic";
        if (/happy/.test(text)) return "happy";
        if (/quiet/.test(text)) return "quiet";
        return text ? "other" : null;
    }
    return null;
}

function moodNoteOf(log) {
    const direct = String(log.notes || log.details?.notes || log.note || "").trim();
    if (direct) return direct;
    const raw = String(log.value || log.details?.value || log.mood || "");
    const i = raw.indexOf(":");
    return i >= 0 ? raw.slice(i + 1).trim() : "";
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MOOD_LIFETIME_MS = DAY_MS;

function diaperKind(log) {
    const v = String(log.type || log.diaperType || log.details?.type || log.value || "").toLowerCase();
    if (v.includes("mix") || v.includes("both")) return "mixed";
    if (v.includes("dirty") || v.includes("poop") || v.includes("soiled")) return "dirty";
    return "wet";
}

function playEvent(log, now) {
    let start = asDate(log.startTime || log.details?.startTime);
    let end = asDate(log.endTime || log.details?.endTime);
    if (start) start = notInFuture(start, now);
    if (end) end = notInFuture(end, now);
    if (start && end && start > end) start = new Date(start.getTime() - DAY_MS);
    const minutes = start && end ? Number(log.duration) || Math.max(0, Math.round((end - start) / 60000)) : 0;
    return {
        at: end || start || notInFuture(entryTime(log), now),
        mood: "playtime",
        reason: "playtime logged",
        play: start && end ? { start, end, minutes } : null,
    };
}

function notInFuture(date, now) {
    if (!date) return date;
    let d = new Date(date);
    while (d.getTime() > now.getTime() + 60000) d = new Date(d.getTime() - DAY_MS);
    return d;
}

function sleepEvent(log, now = new Date()) {
    let start = notInFuture(sleepStart(log), now);
    const end = notInFuture(sleepEnd(log), now);
    if (end && start > end) start = new Date(start.getTime() - DAY_MS);
    if (!end) return { at: start, mood: "sleeping", reason: "sleep started", sleep: { start } };
    const quality = String(log.quality || log.details?.quality || "").toLowerCase();
    const minutes = Number(log.duration) || Math.max(0, Math.round((end - start) / 60000));
    return {
        at: end,
        mood: "woke",
        variant: ["good", "fair", "poor"].includes(quality) ? quality : "good",
        reason: "sleep ended",
        sleep: { start, end, minutes, quality },
    };
}

function formatDuration(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (!h) return `${m}m`;
    return m ? `${h}h ${m}m` : `${h}h`;
}

const clock = (d) => (d ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "");
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

function spanMinutes(a, b) {
    const [ah, am] = String(a).split(":").map(Number);
    const [bh, bm] = String(b).split(":").map(Number);
    let d = bh * 60 + bm - (ah * 60 + am);
    if (d < 0) d += 24 * 60;
    return d;
}

function napWindowStart(startTime, logBy) {
    const [h, m] = String(startTime).split(":").map(Number);
    const d = new Date(logBy);
    d.setHours(h, m, 0, 0);
    if (d > logBy) d.setDate(d.getDate() - 1);
    return d.getTime() - 60 * 60000;
}

export function resolveMood(logs, schedules, now = new Date()) {
    const events = [];
    const grace = GRACE_MINUTES * 60000;

    for (const log of logs) {
        if (log.activityType === "sleep") {
            events.push(sleepEvent(log, now));
            continue;
        }
        if (log.activityType === "playtime") {
            events.push(playEvent(log, now));
            continue;
        }
        const mood = moodFromLog(log);
        if (mood) {
            const at = notInFuture(entryTime(log), now);
            const text = String(log.mood || log.value || "").split(":")[0].trim().toLowerCase();
            events.push({
                at,
                mood,
                ...(mood === "groggy" ? { variant: "poor" } : {}),
                ...(mood === "other" ? { note: moodNoteOf(log) } : {}),
                ...(mood === "diaper" ? { variant: diaperKind(log) } : {}),
                reason: log.activityType === "mood" ? `mood logged: ${text}` : `${log.activityType} logged`,
            });
        }
    }

    for (const s of schedules) {
        const mood = MISSED_TO_MOOD[s.activityType];
        if (!mood) continue;
        const logBy = (s.activityType === "sleep" || s.activityType === "playtime") && s.details?.startTime && s.time !== s.details.startTime;
        const playLength = s.activityType === "playtime" && s.details?.startTime && s.details?.endTime ? spanMinutes(s.details.startTime, s.details.endTime) * 60000 : 0;
        for (const when of occurrences(s, now)) {
            const deadline = logBy ? when : new Date(when.getTime() + playLength + grace);
            if (deadline > now) continue;
            const from = logBy ? napWindowStart(s.details.startTime, when) : when.getTime() - 2 * grace;
            const done = logs.some((l) => {
                if (l.activityType !== s.activityType) return false;
                const t = notInFuture(l.activityType === "sleep" ? sleepStart(l) : asDate(l.startTime || l.details?.startTime) || entryTime(l), now).getTime();
                return t >= from && t <= deadline.getTime();
            });
            if (!done) events.push({ at: deadline, mood, reason: `scheduled ${s.activityType} missed` });
        }
    }

    const fresh = events.filter((e) => e.at && now.getTime() - new Date(e.at).getTime() <= MOOD_LIFETIME_MS);
    fresh.sort((a, b) => b.at - a.at);
    return fresh[0] || { mood: "content", at: null, reason: events.length ? "nothing new in the last 24 hours" : "nothing logged yet" };
}
async function loadChildData(childId, token) {
    const headers = { "x-auth-token": token };
    const [acts, sched, moodRes, playRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/activities`, { params: { childId }, headers, timeout: 10000 }),
        axios.get(`${API_URL}/api/schedule`, { params: { childId }, headers, timeout: 10000 }),
        axios.get(`${API_URL}/api/mood`, { params: { childId }, headers, timeout: 10000 }),
        axios.get(`${API_URL}/api/playtime`, { params: { childId }, headers, timeout: 10000 }),
    ]);

    const d = acts.status === "fulfilled" ? acts.value.data : {};
    const listFrom = (data, ...keys) => {
        if (Array.isArray(data)) return data;
        for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
        return [];
    };
    const moodList = listFrom(d, "moods", "mood", "moodLogs", "moodEntries");
    const extraMoods = moodRes.status === "fulfilled" ? listFrom(moodRes.value.data, "moods", "mood", "entries", "data") : [];
    const seen = new Set(moodList.map((m) => m._id).filter(Boolean));
    const playList = listFrom(d, "playtimes", "playtime", "playTimes", "plays", "playtimeLogs");
    const extraPlays = playRes.status === "fulfilled" ? listFrom(playRes.value.data, "playtimes", "playtime", "plays", "entries", "data") : [];
    const seenPlay = new Set(playList.map((m) => m._id).filter(Boolean));
    const plays = [...playList, ...extraPlays.filter((m) => !m.childId || String(m.childId?._id || m.childId) === String(childId)).filter((m) => !m._id || !seenPlay.has(m._id))];
    const moods = [...moodList, ...extraMoods.filter((m) => !m.childId || String(m.childId?._id || m.childId) === String(childId)).filter((m) => !m._id || !seen.has(m._id))];
    const tag = (list, activityType) => (list || []).map((e) => ({ ...e, activityType }));
    const logs = [
        ...tag(d.feedings, "feeding"),
        ...tag(d.sleeps, "sleep"),
        ...tag(d.diapers, "diaper"),
        ...tag(plays, "playtime"),
        ...tag(moods, "mood"),
    ];

    const s = sched.status === "fulfilled" ? sched.value.data : [];
    const schedules = Array.isArray(s) ? s : s?.schedules || [];
    return { logs, schedules };
}
const MOOD_INFO = {
    feeding: {
        dots: true,
        short: "nom nom",
        sentence: (n) => `${n} is enjoying a good meal!`,
        cause: () => "feeding has been logged",
    },
    sleeping: {
        short: "zzz...",
        sentence: (n, ev) => `${n} has been asleep since ${clock(ev?.sleep?.start)}, sweet dreams!`,
        cause: () => "sleep has been started",
    },
    woke: {
        short: (ev) => (ev?.variant === "poor" ? "so groggy..." : ev?.variant === "fair" ? "yawn..." : "well rested!"),
        sentence: (n, ev) =>
            `${n} slept ${formatDuration(ev?.sleep?.minutes || 0)} (${clock(ev?.sleep?.start)} – ${clock(ev?.sleep?.end)}). Sleep quality: ${ev?.variant || "good"}.`,
        cause: (r, ev) =>
            ev?.variant === "poor"
                ? "a poor sleep was logged, so they're groggy"
                : ev?.variant === "fair"
                    ? "a fair sleep was logged, so they're a little drowsy"
                    : "a good sleep was logged, so they woke up refreshed",
    },
    playtime: {
        short: "that was fun!",
        sentence: (n, ev) =>
            ev?.play
                ? `${n} played for ${formatDuration(ev.play.minutes)} (${clock(ev.play.start)} – ${clock(ev.play.end)}) and had a blast!`
                : `${n} just had playtime and had a blast!`,
        cause: () => "playtime was logged",
    },
    diaper: {
        short: (ev) => (ev?.variant === "dirty" ? "fresh & clean!" : ev?.variant === "mixed" ? "squeaky clean!" : "all dry now!"),
        sentence: (n, ev) => `${n} got a fresh diaper at ${clock(ev?.at)}. Diaper type: ${ev?.variant || "wet"}.`,
        cause: () => "a diaper change was logged",
    },
    happy: {
        short: "yay!",
        sentence: (n) => `${n} has been noted as happy and cheerful!`,
        cause: () => "noted as happy in the mood log",
    },
    energetic: {
        short: "zoom zoom!",
        sentence: (n) => `${n} has been noted as energetic and ready to go!`,
        cause: () => "noted as energetic in the mood log",
    },
    other: {
        short: "tap me!",
        sentence: (n, ev) => (ev?.note ? `a note about ${n}: "${ev.note}"` : `${n} is feeling something different today.`),
        cause: () => "noted as other in the mood log",
    },
    quiet: {
        short: "...",
        sentence: (n) => `${n} has been noted as calm and quiet.`,
        cause: () => "noted as quiet in the mood log",
    },
    groggy: {
        short: "so groggy...",
        sentence: (n) => `${n} has been noted as tired and groggy.`,
        cause: () => "noted as tired in the mood log",
    },
    sleepy: {
        short: "so sleepy",
        sentence: (n) => `${n} has been noted as tired and cranky.`,
        cause: (r) => (r && r.includes("mood logged") ? "noted as tired in the mood log" : "possibly due to a skipped sleep log"),
    },
    hungry: {
        short: "hungry!",
        sentence: (n) => `${n} has been noted as hungry and fussy.`,
        cause: () => "possibly due to a skipped feeding log",
    },
    angry: {
        short: "grrr!",
        sentence: (n) => `${n} has been noted as mad and grumpy.`,
        cause: (r) => (r && r.includes("playtime") ? "possibly due to a missed playtime" : `noted as ${r && r.includes("mood logged: ") ? r.split("mood logged: ")[1] : "mad"} in the mood log`),
    },
    crying: {
        short: "waaah!",
        sentence: (n) => `${n} has been noted as sad and teary.`,
        cause: (r) => (r && r.includes("diaper") ? "possibly due to a missed diaper change" : `noted as ${r && r.includes("mood logged: ") ? r.split("mood logged: ")[1] : "sad"} in the mood log`),
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
@keyframes mbGlow { 0%,100% { box-shadow: 0 4px 12px rgba(30,60,40,0.14), 0 0 6px 2px rgba(255,170,40,0.5); } 50% { box-shadow: 0 4px 12px rgba(30,60,40,0.14), 0 0 22px 9px rgba(255,170,40,0.85); } }
@keyframes mbGlowPill { 0%,100% { box-shadow: 0 4px 12px rgba(30,60,40,0.16), 0 0 6px 2px rgba(255,170,40,0.5); } 50% { box-shadow: 0 4px 12px rgba(30,60,40,0.16), 0 0 22px 9px rgba(255,170,40,0.85); } }
@keyframes mbSpark { 0%,100% { opacity: 0.3; transform: scale(0.7) rotate(0deg); } 50% { opacity: 1; transform: scale(1.5) rotate(45deg); } }
@keyframes mbZoom { from { opacity: 0; transform: scale(0.35) translateY(40%); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes mbFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes mbPop { from { opacity: 0; transform: translateY(12px) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;

const setPassportHeader = (label) => {
    window.dispatchEvent(new CustomEvent("koda-header-label", { detail: { label } }));
};

function useNightMode() {
    const [night, setNight] = useState(() => typeof window !== "undefined" && localStorage.getItem("koda-dark-mode") === "true");
    useEffect(() => {
        const onMode = (e) => setNight(e?.detail && typeof e.detail.isDarkMode === "boolean" ? e.detail.isDarkMode : localStorage.getItem("koda-dark-mode") === "true");
        window.addEventListener("koda-dark-mode", onMode);
        return () => window.removeEventListener("koda-dark-mode", onMode);
    }, []);
    return night;
}

const SCENE_LIGHTS = {
    day: { exposure: 1.15, ambient: 0.9, ambientColor: "#fff4e2", sun: 2.0, sunColor: "#fff0cf", rim: 0.6, rimColor: "#b6e3d6", hemiSky: "#ffffff", hemiGround: "#6f9a6e", hemi: 0.95 },
    night: { exposure: 1.0, ambient: 0.62, ambientColor: "#b9c6f0", sun: 0.85, sunColor: "#c7d4ff", rim: 0.5, rimColor: "#9fbaff", hemiSky: "#8ea3e0", hemiGround: "#34525c", hemi: 0.75 },
};


const NIGHT_LIGHTS_BY_ANIMAL = {
    bear: SCENE_LIGHTS.night,
    panda: { exposure: 1.0, ambient: 0.62, ambientColor: "#c4e6dc", sun: 0.85, sunColor: "#d6ecff", rim: 0.5, rimColor: "#a6d8e8", hemiSky: "#9fd0c8", hemiGround: "#2f5a52", hemi: 0.75 },
    frog: { exposure: 1.0, ambient: 0.6, ambientColor: "#c9dcf2", sun: 0.85, sunColor: "#d6e8ff", rim: 0.55, rimColor: "#9fd6d0", hemiSky: "#9cc4e0", hemiGround: "#2f4a3a", hemi: 0.75 },
    bunny: { exposure: 1.0, ambient: 0.62, ambientColor: "#d9cdf2", sun: 0.85, sunColor: "#e6dbff", rim: 0.55, rimColor: "#ffc4a3", hemiSky: "#b4b0e0", hemiGround: "#5a4a3a", hemi: 0.75 },
    fox: { exposure: 1.0, ambient: 0.62, ambientColor: "#d8c8e6", sun: 0.85, sunColor: "#e2d8ff", rim: 0.6, rimColor: "#ffb27a", hemiSky: "#a9a2d6", hemiGround: "#4a3a2e", hemi: 0.75 },
    koala: { exposure: 1.0, ambient: 0.62, ambientColor: "#cfd6ee", sun: 0.85, sunColor: "#d8e2ff", rim: 0.55, rimColor: "#ffd59a", hemiSky: "#9fb0dc", hemiGround: "#3e4a40", hemi: 0.75 },
};
const DAY_LIGHTS_BY_ANIMAL = {
    frog: { exposure: 1.15, ambient: 0.8, ambientColor: "#fff6e6", sun: 2.1, sunColor: "#fff3d6", rim: 0.45, rimColor: "#a8e0ea", hemiSky: "#f0ffe6", hemiGround: "#4a6b47", hemi: 0.95 },
    bunny: { exposure: 1.15, ambient: 0.72, ambientColor: "#fff4e2", sun: 2.0, sunColor: "#ffeec2", rim: 0.35, rimColor: "#ffcfa0", hemiSky: "#fff0c4", hemiGround: "#8a7a42", hemi: 0.9 },
    fox: { exposure: 1.12, ambient: 0.78, ambientColor: "#fff0dc", sun: 2.0, sunColor: "#ffe2b8", rim: 0.45, rimColor: "#ffc48a", hemiSky: "#fff2d8", hemiGround: "#7a5a36", hemi: 0.9 },
    koala: { exposure: 1.12, ambient: 0.8, ambientColor: "#f6f4ec", sun: 2.0, sunColor: "#fff1d6", rim: 0.45, rimColor: "#c8e2d0", hemiSky: "#eef6ea", hemiGround: "#5e6e52", hemi: 0.92 },
};


const HABITAT_TO_ANIM = 1.8 / 0.32;
const NIGHT_POINT_LIGHTS = [
    { name: "above", pos: [-0.05, 0.5, 0.25], color: "#ffe6c4", intensity: 0.2, distance: 0.9 },
    { name: "lantern", pos: [0.09, 0.2, -0.39], color: "#ffd27a", intensity: 0.28, distance: 0.7 },
    { name: "lantern2", pos: [-0.32, 0.2, -0.6], color: "#ffd27a", intensity: 0.28, distance: 0.7 },
    { name: "campfire", pos: [0.28, 0.19, -0.08], color: "#ff994a", intensity: 0.45, distance: 1.6, flicker: true },
].map((l) => ({
    ...l,
    pos: l.pos.map((v) => v * HABITAT_TO_ANIM),
    intensity: l.intensity * HABITAT_TO_ANIM * HABITAT_TO_ANIM,
    distance: l.distance * HABITAT_TO_ANIM,
}));

function NightPointLights() {
    const fire = React.useRef(null);
    const base = NIGHT_POINT_LIGHTS.find((l) => l.flicker).intensity;
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();
        if (fire.current) fire.current.intensity = base * (1 + (Math.sin(t * 6) * 0.04 + Math.sin(t * 9.3) * 0.025) / 0.45);
    });
    return NIGHT_POINT_LIGHTS.map((l) => (
        <pointLight
            key={l.name}
            ref={l.flicker ? fire : undefined}
            position={l.pos}
            color={l.color}
            intensity={l.intensity}
            distance={l.distance}
            decay={2}
        />
    ));
}

function ExposureSync({ exposure }) {
    const { gl } = useThree();
    useEffect(() => {
        gl.toneMappingExposure = exposure;
    }, [gl, exposure]);
    return null;
}

function makeMatte(root) {
    root.traverse((o) => {
        if (!o.isMesh) return;
        if (!o.userData.kodaShadow && !o.isSprite) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.userData.kodaShadow = true;
        }
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
            if (!m || m.userData.kodaMatte) return;
            if ("roughness" in m) m.roughness = 1;
            if ("metalness" in m) m.metalness = 0;
            if ("clearcoat" in m) m.clearcoat = 0;
            if ("specularIntensity" in m) m.specularIntensity = 0;
            m.userData.kodaMatte = true;
            m.needsUpdate = true;
        });
    });
}

function MatteScene() {
    const { scene } = useThree();
    const tick = React.useRef(0);
    useFrame(() => {
        tick.current += 1;
        if (tick.current % 30 === 1) makeMatte(scene);
    });
    return null;
}

function AnimationView({ anim, front, animal, variant }) {
    const night = useNightMode();
    const L = night
        ? NIGHT_LIGHTS_BY_ANIMAL[animal] || SCENE_LIGHTS.night
        : DAY_LIGHTS_BY_ANIMAL[animal] || SCENE_LIGHTS.day;
    if (anim.kind === "own") return <anim.Comp />;
    return (
        <Canvas
            shadows="soft"
            style={{ background: "transparent" }}
            gl={{ alpha: true, antialias: true, toneMappingExposure: L.exposure }}
            dpr={[1, 2]}
            camera={front ? { position: [0, 1.05, 4.4], fov: 34 } : { position: [0, 2.5, 3.7], fov: 34 }}
            onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}
        >
            <ExposureSync exposure={L.exposure} />
            <ambientLight intensity={L.ambient} color={L.ambientColor} />
            <directionalLight
                position={[5, 8, 3]}
                intensity={L.sun}
                color={L.sunColor}
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-bias={-0.0004}
                shadow-camera-left={-3}
                shadow-camera-right={3}
                shadow-camera-top={3}
                shadow-camera-bottom={-3}
            />
            <directionalLight position={[-5, 3, -4]} intensity={L.rim} color={L.rimColor} />
            <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
            {/* only the bear habitat has a campfire + lanterns right next to the character */}
            {night && animal === "bear" && <NightPointLights />}
            <MatteScene />
            <anim.Comp referenceHeight={1.8} variant={variant} />
        </Canvas>
    );
}

const CELEBRATE_KEYFRAMES = `@keyframes mbCelPop{0%{transform:scale(0.3) rotate(-8deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}@keyframes mbCelFade{from{opacity:0}to{opacity:1}}@keyframes mbCelOut{to{opacity:0;transform:translateY(-20px) scale(0.92)}}@keyframes mbCelDraw{to{stroke-dashoffset:0}}@keyframes mbCelHop{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(0) scale(1.1,0.9)}55%{transform:translateY(-10px) scale(0.95,1.06)}}@keyframes mbCelSwing{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}@keyframes mbCelBell{0%,100%{transform:rotate(0)}25%{transform:rotate(-18deg)}75%{transform:rotate(18deg)}}@keyframes mbCelFloat{0%{transform:translate(0,0) scale(0.4);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),-70px) scale(1.1);opacity:0}}`;

export default function MoodBuddy({ child, refreshKey = 0, size = 130, bottom = "21%", left = "51%" }) {
    const [state, setState] = useState(null);
    const [view, setView] = useState(null);
    const night = useNightMode();
    const C = night
        ? { bubble: "#e4e7ff", bubbleAlt: "#e4e7ff", ink: "#27305a", edge: "rgba(255,255,255,0.6)", card: "#262f58", cardInk: "#ece9ff", soft: "rgba(228,231,255,0.12)", overlay: "rgba(10,14,35,0.5)" }
        : { bubble: "#fff8ee", bubbleAlt: "rgba(255,255,255,0.92)", ink: "#2f5a3a", edge: "rgba(47,90,58,0.12)", card: "rgba(255,255,255,0.96)", cardInk: "#2f5a3a", soft: "rgba(47,90,58,0.1)", overlay: "rgba(20,45,30,0.35)" };
    const [celebrate, setCelebrate] = useState(0);
    const [celebrateKind, setCelebrateKind] = useState("logged");
    useEffect(() => {
        let t;
        const on = (kind) => { setCelebrateKind(kind === "scheduled" ? "scheduled" : "logged"); setCelebrate(Date.now()); clearTimeout(t); t = setTimeout(() => setCelebrate(0), 2600); };
        const raw = sessionStorage.getItem("koda-celebrate") || "";
        const [pk, pt] = raw.includes(":") ? raw.split(":") : ["logged", raw];
        if (Number(pt) && Date.now() - Number(pt) < 8000 && window.__kodaCelebrated !== raw) { window.__kodaCelebrated = raw; sessionStorage.removeItem("koda-celebrate"); on(pk); }
        return () => clearTimeout(t);
    }, []);
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
        const detail = { active, animal, mood, variant: state?.variant };
        window.__moodAnimationActive = active;
        window.__moodAnimation = detail;
        window.dispatchEvent(new CustomEvent("mood-animation", { detail }));
    }, [active, animal, mood, state?.variant]);

    useEffect(() => () => {
        window.__moodAnimationActive = false;
        window.__moodAnimation = { active: false };
        window.dispatchEvent(new CustomEvent("mood-animation", { detail: { active: false } }));
    }, []);

    const [habitatInline, setHabitatInline] = useState(() => (typeof window !== "undefined" ? window.__habitatInline || null : null));
    const [anchor, setAnchor] = useState(() => (typeof window !== "undefined" ? window.__moodAnchor || null : null));
    useEffect(() => {
        const onInline = (e) => setHabitatInline(e.detail || null);
        const onAnchor = (e) => setAnchor(e.detail || null);
        setHabitatInline(window.__habitatInline || null);
        setAnchor(window.__moodAnchor || null);
        window.addEventListener("habitat-inline", onInline);
        window.addEventListener("mood-anchor", onAnchor);
        return () => {
            window.removeEventListener("habitat-inline", onInline);
            window.removeEventListener("mood-anchor", onAnchor);
        };
    }, []);
    const inHabitat = !!anim && habitatInline?.animal === animal && !!habitatInline?.moods?.includes(mood);
    const bubbleOnly = !anim && !!child && !!MOOD_INFO[mood];
    const anchored = (inHabitat || bubbleOnly) && anchor;

    const info = MOOD_INFO[mood] || { short: "hi!", sentence: () => "", cause: () => "" };
    const shortText = typeof info.short === "function" ? info.short(state) : info.short;
    const name = child?.name || child?.firstName || "your little one";
    const when = formatWhen(state?.at);

    const openProfile = () => {
        if (!child) return;
        window.dispatchEvent(new CustomEvent("close-todays-activities"));
        setPassportHeader(`${name}'s passport`);
        setView("profile");
    };

    const closeProfile = () => {
        setPassportHeader(null);
        setView(null);
    };

    const openProfileRef = React.useRef(openProfile);
    openProfileRef.current = openProfile;
    useEffect(() => {
        const onOpen = () => openProfileRef.current();
        window.addEventListener("koda-open-profile", onOpen);
        return () => window.removeEventListener("koda-open-profile", onOpen);
    }, []);

    const profileEl = view === "profile" ? (
        <BabyProfile
            child={child}
            mood={MOOD_INFO[mood] ? { short: shortText, sentence: info.sentence(name, state), cause: info.cause(state?.reason, state), when } : null}
            photo={
                anim ? (
                    <Suspense fallback={null}>
                        <AnimationView animal={animal} anim={anim} variant={state?.variant} front />
                    </Suspense>
                ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34 }} aria-hidden="true">🐾</div>
                )
            }
            onClose={closeProfile}
        />
    ) : null;

    const celebrationEl = (
        <>
            <style>{KEYFRAMES}</style>
            <style>{CELEBRATE_KEYFRAMES}</style>
            {celebrate && typeof document !== "undefined" ? createPortal(
                <div key={celebrate} style={{ position: "fixed", inset: 0, zIndex: 2147483000, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center", animation: "mbCelOut 0.45s ease-in 2.1s forwards" }}>
                    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 50%, rgba(255,246,225,0.7), rgba(255,246,225,0) 55%)", animation: "mbCelFade 0.3s ease-out both" }} />
                    <div style={{ position: "relative", width: 170, padding: "22px 16px 16px", background: night ? C.card : "#fff8ee", border: night ? "2px solid rgba(160,170,235,0.28)" : "2px solid rgba(47,90,58,0.14)", borderRadius: 26, boxShadow: "0 14px 34px rgba(30,60,40,0.22)", textAlign: "center", animation: "mbCelPop 0.55s cubic-bezier(.34,1.7,.5,1) both" }}>
                        {celebrateKind === "scheduled" ? (
                            <div style={{ position: "relative", width: 64, height: 64, margin: "0 auto", animation: "mbCelSwing 0.9s ease-in-out 0.4s 1" }}>
                                <div style={{ position: "absolute", inset: 0, background: "#fff", borderRadius: 14, border: "2px solid #2f5a3a", overflow: "hidden" }}>
                                    <div style={{ height: 18, background: "#f6a7b8" }} />
                                    <div style={{ fontSize: 26, fontWeight: 800, color: "#2f5a3a", lineHeight: "40px" }}>{new Date().getDate()}</div>
                                </div>
                                <span style={{ position: "absolute", top: -6, left: 14, width: 6, height: 12, borderRadius: 3, background: "#2f5a3a" }} />
                                <span style={{ position: "absolute", top: -6, right: 14, width: 6, height: 12, borderRadius: 3, background: "#2f5a3a" }} />
                                <span style={{ position: "absolute", right: -12, bottom: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffd66b", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#2f5a3a", animation: "mbCelBell 0.5s ease-in-out 0.6s 1" }}>&#10003;</span>
                            </div>
                        ) : (
                            <div style={{ width: 64, height: 64, margin: "0 auto", borderRadius: "50%", background: "#8fd18a", border: "3px solid #fff", boxShadow: "0 0 0 3px #2f5a3a22", display: "flex", alignItems: "center", justifyContent: "center", animation: "mbCelHop 0.7s ease-in-out 0.35s 1" }}>
                                <svg width="34" height="34" viewBox="0 0 34 34"><path d="M8 18 L15 25 L27 10" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 40, strokeDashoffset: 40, animation: "mbCelDraw 0.4s ease-out 0.35s forwards" }} /></svg>
                            </div>
                        )}
                        <div className="hm-title" style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: night ? "#fff3c4" : "#2f5a3a" }}>{celebrateKind === "scheduled" ? "scheduled!" : "logged!"}</div>
                        <div style={{ marginTop: 2, fontSize: 12, color: C.cardInk, opacity: 0.8 }}>{celebrateKind === "scheduled" ? "we'll remind you" : "nice job!"}</div>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <span key={i} style={{ position: "absolute", left: 18 + i * 26, top: 10, fontSize: i % 2 ? 14 : 18, color: ["#f6a7b8", "#ffd66b", "#8fd18a"][i % 3], opacity: 0, "--dx": ((i % 2 ? 1 : -1) * (6 + i * 3)) + "px", animation: `mbCelFloat 1.5s ease-out ${0.3 + i * 0.12}s forwards` }}>{celebrateKind === "scheduled" ? "\u2726" : "\u2665"}</span>
                        ))}
                    </div>
                </div>,
                document.body
            ) : null}
        </>
    );


    if (!child) return celebrationEl;

    return (
        <>
            {celebrationEl}

            {view !== "explain" && (
                <div
                    style={
                        anchored
                            ? {
                                position: "fixed",
                                left: anchor.x,
                                top: anchor.top,
                                transform: "translateX(-50%)",
                                width: Math.max(44, (anchor.bottom - anchor.top) * 0.75),
                                height: Math.max(44, anchor.bottom - anchor.top),
                                pointerEvents: "none",
                                zIndex: 1,
                            }
                            : {
                                position: "fixed",
                                left,
                                bottom,
                                transform: "translateX(-50%)",
                                width: size,
                                height: size,
                                pointerEvents: "none",
                                zIndex: 1,
                            }
                    }
                >
                    {anim || bubbleOnly ? (
                        <button
                            type="button"
                            onClick={openProfile}
                            aria-label={`open ${name}'s passport`}
                            style={{
                                position: "absolute",
                                left: "50%",
                                ...(anchored ? { bottom: `calc(100% + ${BUBBLE_GAP}px)` } : { top: -12 }),
                                transform: "translateX(-50%)",
                                animation: `${info.dots ? "mbBobCute" : "mbBob"} 2.4s ease-in-out infinite, ${info.dots ? "mbGlow" : "mbGlowPill"} 1.4s ease-in-out infinite`,
                                pointerEvents: "auto",
                                visibility: view ? "hidden" : "visible",
                                cursor: "pointer",
                                border: `1.5px solid ${C.edge}`,
                                borderRadius: info.dots ? 14 : 999,
                                borderBottomLeftRadius: info.dots ? 5 : 999,
                                padding: info.dots ? "4px 9px" : "4px 9px",
                                background: info.dots ? C.bubble : C.bubbleAlt,
                                boxShadow: info.dots
                                    ? "0 4px 12px rgba(30,60,40,0.14), inset 0 -2px 0 rgba(47,90,58,0.06)"
                                    : "0 4px 12px rgba(30,60,40,0.16)",
                                fontFamily: "inherit",
                                fontWeight: 700,
                                fontSize: 11,
                                color: C.ink,
                                whiteSpace: "nowrap",
                                zIndex: 2,
                            }}
                        >
                            {shortText}
                            <span
                                style={{
                                    position: "absolute",
                                    top: -8,
                                    right: -9,
                                    fontSize: 12,
                                    color: "#f2a93b",
                                    textShadow: "0 0 8px rgba(255,186,80,0.95)",
                                    animation: "mbSpark 2.4s ease-in-out infinite",
                                    pointerEvents: "none",
                                }}
                            >
                                ✦
                            </span>
                            {info.dots && (
                                <span style={{ display: "inline-flex", gap: 2, marginLeft: 5, verticalAlign: "baseline" }}>
                                    {[0, 1, 2].map((i) => (
                                        <span
                                            key={i}
                                            style={{
                                                width: 4,
                                                height: 4,
                                                borderRadius: 999,
                                                background: C.ink,
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
                                    background: info.dots ? C.bubble : C.bubbleAlt,
                                    borderRight: `2px solid ${C.edge}`,
                                    borderBottom: `2px solid ${C.edge}`,
                                    transform: "translateX(-50%) rotate(45deg)",
                                    borderRadius: 2,
                                }}
                            />
                        </button>
                    ) : null}
                    <div
                        role="button"
                        tabIndex={0}
                        aria-label={`open ${name}'s passport`}
                        onClick={openProfile}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openProfile(); } }}
                        style={{ position: "absolute", inset: 0, pointerEvents: view ? "none" : "auto", cursor: "pointer" }}
                    >
                        {anim && !inHabitat ? (
                            <Suspense fallback={null}>
                                <AnimationView animal={animal} anim={anim} variant={state?.variant} front={false} />
                            </Suspense>
                        ) : null}
                    </div>
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
                            background: C.card,
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
                                background: C.soft,
                                color: C.cardInk,
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
                                background: C.soft,
                                color: C.cardInk,
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
                                background: C.card,
                                transform: "translateX(-50%) rotate(45deg)",
                                borderRadius: 3,
                            }}
                        />
                    </div>
                </div>
            )}

            {profileEl}

            {view === "explain" && (
                <div
                    onClick={() => setView(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 50,
                        background: C.overlay,
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
                            background: C.card,
                            boxShadow: "0 18px 40px rgba(20,45,30,0.25)",
                            fontFamily: "inherit",
                            color: C.cardInk,
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
                                background: C.soft,
                                color: C.cardInk,
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
                        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{info.sentence(name, state)}</p>
                        <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45, opacity: 0.75 }}>
                            → {info.cause(state?.reason, state)}
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
                                background: C.card,
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
                        {anim ? (
                            <Suspense fallback={null}>
                                <AnimationView animal={animal} anim={anim} variant={state?.variant} front />
                            </Suspense>
                        ) : null}
                    </div>
                    <p style={{ marginTop: 6, color: "#fff", fontSize: 12, opacity: 0.85, fontFamily: "inherit" }}>tap anywhere to close</p>
                </div>
            )}
        </>
    );
}