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

export default function BabyProfile({ child, mood, photo, onClose }) {
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

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(20,45,30,0.35)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        overflowY: "auto",
        padding: "92px 16px 40px",
        animation: "mbFade 0.25s ease-out",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="close"
        style={{
          position: "fixed",
          top: 18,
          right: 16,
          zIndex: 60,
          border: "none",
          background: "rgba(255,255,255,0.92)",
          color: INK,
          width: 34,
          height: 34,
          borderRadius: 999,
          cursor: "pointer",
          fontSize: 15,
          fontWeight: 700,
          boxShadow: "0 4px 12px rgba(20,45,30,0.25)",
        }}
      >
        ✕
      </button>

      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 320, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ ...card, overflow: "hidden", animation: "mbPop 0.35s ease-out both" }}>
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

        {mood ? (
          <div style={{ ...card, padding: "14px 16px", position: "relative", animation: "mbPop 0.35s 0.08s ease-out both" }}>
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

        <div style={{ ...card, padding: "14px 16px", animation: "mbPop 0.35s 0.16s ease-out both" }}>
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
      </div>
    </div>
  );
}