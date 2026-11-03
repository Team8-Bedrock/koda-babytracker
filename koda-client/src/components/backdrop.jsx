import React from "react";
import "../styling/components/backdrop.css";

const PALETTES = {
    bear: {
        day: { sky: "#f4e7d4", mid: "#fbf6ec", hillA: "#e3d0ae", hillB: "#d2ba92", blobA: "#f6d9ad", blobB: "#e3ebcb", speck: "#e9b872" },
        night: { sky: "#1f2448", mid: "#2b2f55", hillA: "#3a3a5a", hillB: "#33324f", blobA: "#4b4566", blobB: "#3c4a5e", speck: "#f4d77a" },
    },
    frog: {
        day: { sky: "#dcf0ee", mid: "#f6fbf1", hillA: "#c6e2b6", hillB: "#afd59f", blobA: "#cbe8f4", blobB: "#e4f3c8", speck: "#9fd27c" },
        night: { sky: "#172a45", mid: "#1f3350", hillA: "#25433f", hillB: "#203a37", blobA: "#25465c", blobB: "#2c4a3a", speck: "#c9f29a" },
    },
    bunny: {
        day: { sky: "#fbe4ee", mid: "#fff8f5", hillA: "#f4d0dd", hillB: "#ebbdcf", blobA: "#fde1ec", blobB: "#efe2fb", speck: "#f6a9c6" },
        night: { sky: "#261f45", mid: "#30284f", hillA: "#4a3556", hillB: "#40304d", blobA: "#523c63", blobB: "#3d3a66", speck: "#ffc4dc" },
    },
    panda: {
        day: { sky: "#e3f1e6", mid: "#f7fbf4", hillA: "#cde3cb", hillB: "#b8d7b8", blobA: "#d8edd9", blobB: "#eef6dc", speck: "#8cc79a" },
        night: { sky: "#16283f", mid: "#1d3148", hillA: "#23413e", hillB: "#1e3936", blobA: "#244657", blobB: "#2b4637", speck: "#b8f0c8" },
    },
    koala: {
        day: { sky: "#e2eaef", mid: "#f8f6f1", hillA: "#d4ddd2", hillB: "#c2cfc1", blobA: "#dde8f0", blobB: "#eee6d8", speck: "#a9bfae" },
        night: { sky: "#1b2445", mid: "#243050", hillA: "#2e3c4a", hillB: "#283544", blobA: "#2d4058", blobB: "#3a3c52", speck: "#ffd59a" },
    },
    fox: {
        day: { sky: "#fbe7d3", mid: "#fff8ef", hillA: "#f3d0ab", hillB: "#e9bd91", blobA: "#fbdcbc", blobB: "#f6e7c6", speck: "#eea067" },
        night: { sky: "#231f45", mid: "#2d2850", hillA: "#45344f", hillB: "#3d2f48", blobA: "#4e3a58", blobB: "#3e3a5a", speck: "#ffb27a" },
    },
};

const SPECKS = [
    [12, 22, 0], [78, 16, 1.4], [30, 48, 2.6], [86, 52, 0.8], [56, 34, 3.4], [20, 70, 1.9], [66, 66, 4.2],
];

const toVars = (prefix, p) => ({
    [`--${prefix}-sky`]: p.sky,
    [`--${prefix}-mid`]: p.mid,
    [`--${prefix}-hill-a`]: p.hillA,
    [`--${prefix}-hill-b`]: p.hillB,
    [`--${prefix}-blob-a`]: p.blobA,
    [`--${prefix}-blob-b`]: p.blobB,
    [`--${prefix}-speck`]: p.speck,
});

export function WelcomeBackdrop() {
    return (
        <div className="backdrop backdrop--welcome" aria-hidden="true">
            <div className="firefly-layer">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="firefly" />
                ))}
            </div>
        </div>
    );
}

export default function Backdrop({ animal }) {
    const palette = PALETTES[animal] || PALETTES.bear;
    return (
        <div className="backdrop" style={{ ...toVars("cbd", palette.day), ...toVars("cbn", palette.night) }} aria-hidden="true">
            <div className="backdrop__blob backdrop__blob--a" />
            <div className="backdrop__blob backdrop__blob--b" />
            {SPECKS.map(([x, y, delay], i) => (
                <span key={i} className="backdrop__speck" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}s` }} />
            ))}
            <svg className="backdrop__hills" viewBox="0 0 400 160" preserveAspectRatio="none">
                <path className="backdrop__hill backdrop__hill--back" d="M0 92 C 60 58, 120 60, 180 80 S 300 104, 400 62 L 400 160 L 0 160 Z" />
                <path className="backdrop__hill backdrop__hill--front" d="M0 122 C 70 96, 150 100, 220 116 S 340 132, 400 104 L 400 160 L 0 160 Z" />
            </svg>
        </div>
    );
}