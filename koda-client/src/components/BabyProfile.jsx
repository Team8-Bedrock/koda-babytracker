import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import { getCurrentUserId, setSelectedChildForUser } from "../utils/authStorage";

const INK = "#2f4a3a";
const PAPER = "#f5efdc";
const LINE = "rgba(47,74,58,0.18)";

const ageText = (dob) => {
  if (!dob) return "";
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + now.getMonth() - d.getMonth();
  let days = now.getDate() - d.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months >= 24) return `${Math.floor(months / 12)} years`;
  return `${months} months ${days} days`;
};

const dateText = (v) => {
  if (!v) return "n/a";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
};

const Field = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", opacity: 0.55 }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>{value || "n/a"}</div>
  </div>
);

const Toggle = ({ on, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!on)}
    aria-pressed={on}
    style={{
      width: 38,
      height: 22,
      borderRadius: 999,
      border: "none",
      padding: 2,
      cursor: disabled ? "default" : "pointer",
      background: on ? "#6b9f6e" : "rgba(47,74,58,0.2)",
      transition: "background 0.2s",
      flexShrink: 0,
    }}
  >
    <span
      style={{
        display: "block",
        width: 18,
        height: 18,
        borderRadius: 999,
        background: "#fff",
        transform: on ? "translateX(16px)" : "translateX(0)",
        transition: "transform 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
    />
  </button>
);

const card = {
  background: PAPER,
  borderRadius: 22,
  border: `1.5px solid ${LINE}`,
  boxShadow: "0 14px 34px rgba(20,45,30,0.22)",
  color: INK,
  fontFamily: "inherit",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: `1.5px solid ${LINE}`,
  borderRadius: 12,
  padding: "7px 10px",
  background: "#fffaf0",
  color: INK,
  fontFamily: "inherit",
  fontSize: 13,
};

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const CLOSE_KEYFRAMES = `@keyframes bpBtnAway{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.7)}}@keyframes bpFadeOut{to{opacity:0}}@keyframes bpSettle{0%{transform:scale(1)}55%{transform:scale(0.965) rotate(-1deg)}100%{transform:scale(0.955) rotate(0.6deg)}}@keyframes bpSheetIn{0%{transform:translate(var(--sx),-120px) rotate(var(--rot)) scale(0.6);opacity:0}55%{transform:translate(var(--sx),7px) rotate(var(--rot)) scale(1.05);opacity:1}75%{transform:translate(var(--sx),-3px) rotate(var(--rot)) scale(0.99)}100%{transform:translate(var(--sx),0) rotate(var(--rot)) scale(1);opacity:1}}@keyframes bpStackUp{0%{transform:translate(0,0) rotate(0)}65%{transform:translate(var(--sx),calc(var(--ty) + 8px)) rotate(var(--rot)) scale(1.02)}82%{transform:translate(var(--sx),calc(var(--ty) - 3px)) rotate(var(--rot))}100%{transform:translate(var(--sx),var(--ty)) rotate(var(--rot))}}@keyframes bpBlank{from{opacity:0}to{opacity:1}}@keyframes bpAway{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(-30px,360px) rotate(-14deg)}}@keyframes bpStampSlam{0%{transform:translate(-50%,-160px) scale(1.1);opacity:0}12%{opacity:1}32%{transform:translate(-50%,0) scale(1)}40%{transform:translate(-50%,-8px) scale(1.03)}48%,82%{transform:translate(-50%,0) scale(1)}100%{transform:translate(-50%,-170px) scale(1);opacity:0}}@keyframes bpMark{0%{transform:translate(-50%,-50%) scale(2.2) rotate(10deg);opacity:0}55%{transform:translate(-50%,-50%) scale(1) rotate(-7deg);opacity:1}100%{transform:translate(-50%,-50%) scale(1) rotate(-7deg);opacity:1}}@keyframes bpThump{0%{transform:translate(-50%,-50%) scale(0.3);opacity:0}15%{opacity:0.9}100%{transform:translate(-50%,-50%) scale(1.6);opacity:0}}@keyframes bpConfetti{0%{transform:translate(0,0) scale(0.3) rotate(0);opacity:0}15%{opacity:1}60%{transform:translate(var(--dx),var(--dy)) scale(1) rotate(var(--r));opacity:1}100%{transform:translate(var(--dx),calc(var(--dy) + 40px)) scale(0.8) rotate(var(--r));opacity:0}}`;

export default function BabyProfile({ child, mood, photo, onClose }) {
  const [closing, setClosing] = useState(false);
  const [stack, setStack] = useState({ mood: 0, notes: 0 });
  const passRef = React.useRef(null);
  const moodRef = React.useRef(null);
  const notesRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const closeRef = React.useRef(onClose);
  closeRef.current = onClose;
  const shut = React.useCallback(() => {
    const base = passRef.current ? passRef.current.getBoundingClientRect().top : 0;
    const off = (el, extra) => (el ? base - el.getBoundingClientRect().top + extra : 0);
    setStack({ mood: off(moodRef.current, 10), notes: off(notesRef.current, 22) });
    setClosing((was) => {
      if (!was) setTimeout(() => closeRef.current && closeRef.current(), 2550);
      return true;
    });
  }, []);
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") shut(); };
    const onNav = (event) => {
      const root = rootRef.current;
      if (root && root.contains(event.target)) return;
      if (event.target.closest && event.target.closest("a, button, nav, footer, [role='link'], [role='button']")) closeRef.current && closeRef.current();
    };
    const onPop = () => closeRef.current && closeRef.current();
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onNav, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onNav, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [shut]);
  const [notes, setNotes] = useState([]);
  const [isParent, setIsParent] = useState(() => String(child?.userId || "") === String(getCurrentUserId() || ""));
  const [profile, setProfile] = useState(child || {});
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const childId = child?._id;
  const name = profile?.name || "your little one";
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  useEffect(() => {
    if (!childId || !token) return;
    let active = true;
    axios
      .get(`${API_URL}/api/child-notes/${childId}`, { headers: { "x-auth-token": token } })
      .then(({ data }) => {
        if (!active) return;
        setNotes(data.notes || []);
        setIsParent(!!data.isParent);
      })
      .catch(() => active && setError("could not load notes"));
    return () => {
      active = false;
    };
  }, [childId, token]);

  const addNote = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API_URL}/api/child-notes/${childId}`,
        { label: label.trim() || "note", text: text.trim(), visibleToCaregiver: share },
        { headers }
      );
      setNotes((n) => [...n, data]);
      setLabel("");
      setText("");
      setShare(false);
    } catch {
      setError("could not save note");
    }
    setBusy(false);
  };

  const toggleShare = async (note, value) => {
    setNotes((n) => n.map((x) => (x._id === note._id ? { ...x, visibleToCaregiver: value } : x)));
    try {
      await axios.put(`${API_URL}/api/child-notes/${childId}/${note._id}`, { visibleToCaregiver: value }, { headers });
    } catch {
      setNotes((n) => n.map((x) => (x._id === note._id ? { ...x, visibleToCaregiver: !value } : x)));
      setError("could not update note");
    }
  };

  const removeNote = async (note) => {
    const before = notes;
    setNotes((n) => n.filter((x) => x._id !== note._id));
    try {
      await axios.delete(`${API_URL}/api/child-notes/${childId}/${note._id}`, { headers });
    } catch {
      setNotes(before);
      setError("could not delete note");
    }
  };

  const saveProfile = async () => {
    if (!profile.name?.trim() || !childId) return;
    setSavingProfile(true);
    setError("");
    try {
      const { data } = await axios.put(
        `${API_URL}/api/children/${childId}`,
        {
          name: profile.name.trim(),
          dob: profile.dob || "",
          avatar: profile.avatar || child?.avatar,
          weight: profile.weight || "",
          allergies: profile.allergies || "",
          other: profile.other || "",
          moodExplanation: profile.moodExplanation || "",
        },
        { headers }
      );
      setProfile(data);
      setSelectedChildForUser(data);
      window.dispatchEvent(new CustomEvent("koda-header-label", { detail: { label: `${data.name}'s passport` } }));
      setEditing(false);
    } catch {
      setError("could not save passport");
    }
    setSavingProfile(false);
  };

  const code = `KODA<<${String(name).toUpperCase().replace(/[^A-Z]/g, "")}<<${String(childId || "").slice(-8).toUpperCase()}`;
  const mrz = (code + "<".repeat(44)).slice(0, 44);

  const blank = (delay) => closing ? <span style={{ position: "absolute", inset: 0, borderRadius: "inherit", background: PAPER, zIndex: 5, pointerEvents: "none", animation: `bpBlank 0.25s ease-out ${delay}s both` }} /> : null;
  const stackStyle = (ty, sx, rot, delay, z) => closing ? { position: "relative", zIndex: z, "--ty": `${ty}px`, "--sx": `${sx}px`, "--rot": rot, animation: `bpStackUp 0.55s cubic-bezier(.3,1.3,.5,1) ${delay}s both`, pointerEvents: "none" } : {};

  return (
    <div
      ref={rootRef}
      onClick={shut}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(20,45,30,0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        overflowY: "auto",
        padding: "92px 16px 110px",
        animation: closing ? "bpFadeOut 0.55s ease-in 2s forwards" : "mbFade 0.25s ease-out",
      }}
    >
      <style>{CLOSE_KEYFRAMES}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14, animation: closing ? "bpAway 0.55s cubic-bezier(.5,0,.7,.4) 2s both" : undefined }}>
        <div ref={passRef} style={{ position: "relative" }}>
          <div style={{ ...card, position: "relative", overflow: "hidden", animation: closing ? "bpSettle 0.45s ease-out both" : "mbPop 0.35s ease-out both" }}>
            {blank(0)}
            <div style={{ background: "#6b9f6e", color: "#fffaf0", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>
              <span>KODA PASSPORT</span>
              <span>{String(name).toUpperCase()}</span>
            </div>
            <div style={{ display: "flex", gap: 12, padding: 12 }}>
              <div style={{ width: 84, height: 104, flexShrink: 0, borderRadius: 12, border: `1.5px dashed ${LINE}`, background: "#ebe3c8", overflow: "hidden" }}>
                {photo}
              </div>
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", alignContent: "start", minWidth: 0 }}>
                {editing ? (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}><input value={profile.name || ""} onChange={(event) => setProfile((value) => ({ ...value, name: event.target.value }))} placeholder="name" style={inputStyle} /></div>
                    <input type="date" value={profile.dob ? String(profile.dob).slice(0, 10) : ""} onChange={(event) => setProfile((value) => ({ ...value, dob: event.target.value }))} aria-label="birthday" style={inputStyle} />
                    <input value={profile.weight || ""} onChange={(event) => setProfile((value) => ({ ...value, weight: event.target.value }))} placeholder="weight" style={inputStyle} />
                    <input value={profile.allergies || ""} onChange={(event) => setProfile((value) => ({ ...value, allergies: event.target.value }))} placeholder="allergies" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                    <input value={profile.other || ""} onChange={(event) => setProfile((value) => ({ ...value, other: event.target.value }))} placeholder="other notes" style={{ ...inputStyle, gridColumn: "1 / -1" }} />
                  </>
                ) : (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}><Field label="name" value={name} /></div>
                    <Field label="birthday" value={dateText(profile?.dob)} />
                    <Field label="age" value={ageText(profile?.dob)} />
                    <Field label="weight" value={profile?.weight ? `${profile.weight} pounds` : "n/a"} />
                    <Field label="animal" value={profile?.avatar} />
                    <div style={{ gridColumn: "1 / -1" }}><Field label="allergies" value={profile?.allergies} /></div>
                    {profile?.other ? <div style={{ gridColumn: "1 / -1" }}><Field label="other" value={profile?.other} /></div> : null}
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "6px 12px",
                borderTop: `1px dashed ${LINE}`,
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: 10, letterSpacing: 1, opacity: 0.55, wordBreak: "break-all", flex: 1, minWidth: 0 }}>
                {mrz}
              </span>
              {isParent ? (
                editing ? (
                  <span style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      aria-label="cancel editing"
                      style={{ border: `1.5px solid ${LINE}`, borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fffaf0", color: INK, cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={savingProfile || !profile.name?.trim()}
                      aria-label="save passport"
                      style={{ border: "none", borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#6b9f6e", color: "#fffaf0", cursor: savingProfile ? "default" : "pointer", fontSize: 13, fontWeight: 700, opacity: savingProfile ? 0.55 : 1 }}
                    >
                      ✓
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    aria-label="edit passport"
                    style={{ border: `1.5px solid ${LINE}`, borderRadius: 999, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", background: "#fffaf0", color: INK, cursor: "pointer", flexShrink: 0 }}
                  >
                    <PencilIcon />
                  </button>
                )
              ) : null}
            </div>
          </div>
          {closing && (
            <div style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, zIndex: 9, pointerEvents: "none" }}>
              <div style={{ position: "absolute", left: 0, top: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    whiteSpace: "nowrap",
                    color: "#3f7d54",
                    border: "3.5px solid #3f7d54",
                    borderRadius: 12,
                    padding: "8px 20px",
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: 2,
                    background: "rgba(255,248,238,0.6)",
                    animation: "bpMark 0.35s cubic-bezier(.2,1.4,.4,1) 1.05s both",
                  }}
                >
                  SEE YOU SOON ✦
                </span>
                <span style={{ position: "absolute", left: "50%", top: 0, width: 210, height: 210, borderRadius: 999, border: "4px solid rgba(63,125,84,0.5)", animation: "bpThump 0.5s ease-out 1.05s both" }} />
              </div>
              <div style={{ position: "absolute", left: "50%", top: -116, width: 108, height: 96, animation: "bpStampSlam 1.5s cubic-bezier(.55,0,.45,1) 0.68s both" }}>
                <span style={{ position: "absolute", left: "50%", top: 0, transform: "translateX(-50%)", width: 40, height: 36, borderRadius: "50%", background: "#c99b6b", boxShadow: "inset 0 -5px 0 rgba(0,0,0,0.12)" }} />
                <span style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)", width: 22, height: 30, borderRadius: 6, background: "#b98a5a" }} />
                <span style={{ position: "absolute", left: 0, bottom: 0, width: 108, height: 40, borderRadius: 11, background: "#2f5a3a", boxShadow: "inset 0 -6px 0 rgba(0,0,0,0.18)" }}>
                  <span style={{ position: "absolute", inset: 6, borderRadius: 6, border: "2px dashed rgba(255,248,238,0.55)" }} />
                </span>
              </div>
              {Array.from({ length: 14 }).map((_, i) => {
                const ang = -Math.PI / 2 + ((i / 13) - 0.5) * Math.PI * 1.5;
                const dist = 70 + (i % 4) * 18;
                const colors = ["#ffb7c9", "#f6c945", "#7fd34e", "#9fd3ff", "#ff9f6b"];
                const shape = i % 3;
                return (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      left: -5,
                      top: -5,
                      width: shape === 1 ? 6 : 9,
                      height: shape === 1 ? 13 : 9,
                      borderRadius: shape === 0 ? 999 : 3,
                      background: colors[i % 5],
                      "--dx": `${Math.cos(ang) * dist}px`,
                      "--dy": `${Math.sin(ang) * dist}px`,
                      "--r": `${i * 47}deg`,
                      animation: `bpConfetti 1s cubic-bezier(.2,.8,.4,1) ${1.02 + (i % 4) * 0.04}s both`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {mood ? (
          <div ref={moodRef} style={{ ...card, padding: "14px 16px", position: "relative", animation: "mbPop 0.35s 0.08s ease-out both", ...stackStyle(stack.mood, -6, "-4deg", 0.1, 2) }}>
            {blank(0.05)}
            <div className="hm-title" style={{ fontSize: 20, marginBottom: 6, paddingRight: 60 }}>mood explanation</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>{mood.sentence}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45, opacity: 0.75 }}>→ {mood.cause}</p>
            {mood.when ? <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 700, opacity: 0.55 }}>since {mood.when}</p> : null}
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 14,
                transform: "rotate(-12deg)",
                border: "2px solid rgba(178,74,74,0.55)",
                color: "rgba(178,74,74,0.7)",
                borderRadius: 8,
                padding: "2px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              {String(mood.short || "").replace(/[.!?]/g, "").toUpperCase()}
            </div>
          </div>
        ) : null}

        <div ref={notesRef} style={{ ...card, padding: "14px 16px", animation: "mbPop 0.35s 0.16s ease-out both", ...stackStyle(stack.notes, 7, "3deg", 0.3, 3) }}>
          {blank(0.2)}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>notes</div>
            {isParent ? <div style={{ fontSize: 10, letterSpacing: 0.5, opacity: 0.55, textTransform: "uppercase" }}>caretaker visibility</div> : null}
          </div>

          {notes.length === 0 ? (
            <p style={{ margin: "0 0 8px", fontSize: 13, opacity: 0.6 }}>{isParent ? "no notes yet, add allergies or anything important below." : "no notes shared yet."}</p>
          ) : null}

          {notes.map((note) => (
            <div key={note._id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${LINE}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", opacity: 0.55 }}>{note.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{note.text}</div>
              </div>
              {isParent ? (
                <>
                  <Toggle on={!!note.visibleToCaregiver} onChange={(v) => toggleShare(note, v)} />
                  <button
                    type="button"
                    onClick={() => removeNote(note)}
                    aria-label="delete note"
                    style={{ border: "none", background: "transparent", color: INK, opacity: 0.45, cursor: "pointer", fontSize: 14 }}
                  >
                    ✕
                  </button>
                </>
              ) : null}
            </div>
          ))}

          {isParent ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="title (e.g. allergies)" style={inputStyle} />
              <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={2} placeholder="write a note..." style={{ ...inputStyle, resize: "vertical" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <Toggle on={share} onChange={setShare} />
                  caretaker visibility
                </label>
                <button
                  type="button"
                  onClick={addNote}
                  disabled={busy || !text.trim()}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    padding: "7px 14px",
                    background: "#6b9f6e",
                    color: "#fffaf0",
                    fontFamily: "inherit",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                    opacity: busy || !text.trim() ? 0.5 : 1,
                  }}
                >
                  add note
                </button>
              </div>
            </div>
          ) : null}

          {error ? <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b24a4a" }}>{error}</p> : null}
        </div>
        <button
          type="button"
          onClick={shut}
          style={{ ...(closing ? { animation: "bpBtnAway 0.4s ease-in 0.9s forwards", pointerEvents: "none" } : {}), alignSelf: "center", marginTop: 4, border: `1.5px solid ${LINE}`, background: "#6b9f6e", color: "#fffaf0", padding: "10px 22px", borderRadius: 999, fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer", boxShadow: "0 6px 16px rgba(20,45,30,0.25)" }}
        >
          close passport
        </button>
      </div>
    </div>
  );
}