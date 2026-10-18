// non-interactive habitat background for the avatar selection page
import React, { Suspense, useEffect, useRef, useState } from "react";
import { HABITAT_COMPONENTS } from "./habitats/habitatRegistry";
import { getAvatarById } from "../constants/avatars";
import "../styling/components/avatarHabitatBackdrop.css";

const FADE_MS = 500;
const SETTLE_MS = 2200;
const RETRY_MS = 400;
const MAX_TRIES = 12;

const snapshots = new Map();

const nextFrames = (n) =>
  new Promise((resolve) => {
    const step = (left) => requestAnimationFrame(() => (left <= 1 ? resolve() : step(left - 1)));
    step(n);
  });

function isBlank(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 12;
        c.height = 12;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, 12, 12);
        const data = ctx.getImageData(0, 0, 12, 12).data;
        let filled = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 10) filled++;
        resolve(filled < 40);
      } catch {
        resolve(true);
      }
    };
    img.onerror = () => resolve(true);
    img.src = dataUrl;
  });
}

async function captureCanvas(canvas) {
  await nextFrames(2);
  try {
    const url = canvas.toDataURL("image/webp", 0.86);
    if (!url || url.length < 2000) return null;
    return (await isBlank(url)) ? null : url;
  } catch {
    return null;
  }
}

const HabitatLayer = ({ avatarId, visible }) => {
  const avatar = getAvatarById(avatarId);
  const HabitatComponent = HABITAT_COMPONENTS[avatar?.customHabitat];
  const [still, setStill] = useState(() => snapshots.get(avatarId) || null);
  const host = useRef(null);

  useEffect(() => {
    if (still || !HabitatComponent) return undefined;
    let cancelled = false;
    let timer = null;
    let tries = 0;
    let seenAt = null;

    const attempt = async () => {
      if (cancelled) return;
      const canvas = host.current?.querySelector("canvas");
      if (canvas && seenAt === null) seenAt = performance.now();
      if (canvas && performance.now() - seenAt >= SETTLE_MS) {
        const url = await captureCanvas(canvas);
        if (cancelled) return;
        if (url) {
          snapshots.set(avatarId, url);
          setStill(url);
          return;
        }
        tries += 1;
        if (tries >= MAX_TRIES) return;
      }
      timer = setTimeout(attempt, RETRY_MS);
    };
    timer = setTimeout(attempt, RETRY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [avatarId, still, HabitatComponent]);

  if (!avatar || !HabitatComponent) return null;

  return (
    <div ref={host} className={`avatar-habitat-layer ${visible ? "avatar-habitat-layer--visible" : ""}`}>
      {still ? (
        <img
          src={still}
          alt=""
          draggable={false}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none", userSelect: "none" }}
        />
      ) : (
        <Suspense fallback={null}>
          <HabitatComponent showCharacter={false} />
        </Suspense>
      )}
    </div>
  );
};

const AvatarHabitatBackdrop = ({ avatarId }) => {
  const [visibleId, setVisibleId] = useState(avatarId);
  const [enteringId, setEnteringId] = useState(null);
  const [entered, setEntered] = useState(false);
  const settleTimeoutRef = useRef(null);

  useEffect(() => {
    if (avatarId === visibleId || avatarId === enteringId) return;

    clearTimeout(settleTimeoutRef.current);
    setEnteringId(avatarId);
    setEntered(false);

    const raf = requestAnimationFrame(() => setEntered(true));
    settleTimeoutRef.current = setTimeout(() => {
      setVisibleId(avatarId);
      setEnteringId(null);
    }, FADE_MS);

    return () => cancelAnimationFrame(raf);
  }, [avatarId, visibleId, enteringId]);

  useEffect(() => () => clearTimeout(settleTimeoutRef.current), []);

  return (
    <div className="avatar-habitat-backdrop">
      <HabitatLayer key={visibleId} avatarId={visibleId} visible />
      {enteringId && <HabitatLayer key={enteringId} avatarId={enteringId} visible={entered} />}
      <div className="avatar-habitat-scrim" />
    </div>
  );
};

export default AvatarHabitatBackdrop;