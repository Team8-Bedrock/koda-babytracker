import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Clock, PartyPopper, X, ArrowRight } from "lucide-react";
import { API_URL } from "../config";
import { getCurrentUserId } from "../utils/authStorage";
import "../styling/components/caregiverLinkPrompt.css";

const POLL_MS = 15000;

const snoozeKey = () => `koda-link-prompt-snoozed:${getCurrentUserId()}`;

const readSnooze = () => {
    try {
        return sessionStorage.getItem(snoozeKey()) || "";
    } catch {
        return "";
    }
};

const writeSnooze = (value) => {
    try {
        sessionStorage.setItem(snoozeKey(), value);
    } catch {
        return;
    }
};

export default function CaregiverLinkPrompt({ isCaregiver, hasChild }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [link, setLink] = useState(undefined);
    const [code, setCode] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [snoozed, setSnoozed] = useState(readSnooze);
    const [leaving, setLeaving] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isCaregiver) return undefined;
        const token = localStorage.getItem("token");
        if (!token) return undefined;
        let active = true;

        const load = async () => {
            try {
                const response = await fetch(`${API_URL}/api/caregiver-links/mine`, {
                    headers: { "x-auth-token": token },
                });
                if (!response.ok) return;
                const raw = await response.text();
                let data = null;
                try {
                    data = raw ? JSON.parse(raw) : null;
                } catch {
                    return;
                }
                if (active) setLink(data || null);
            } catch {
                return;
            }
        };

        load();
        const interval = setInterval(load, POLL_MS);
        window.addEventListener("focus", load);
        return () => {
            active = false;
            clearInterval(interval);
            window.removeEventListener("focus", load);
        };
    }, [isCaregiver]);

    const status = link === undefined ? "loading" : !link ? "none" : link.status;
    const stage =
        status === "none" || status === "denied"
            ? "code"
            : status === "pending"
                ? "pending"
                : status === "approved" && !hasChild
                    ? "pick"
                    : null;

    useEffect(() => {
        setLeaving(false);
    }, [stage]);

    const onSettings = location.pathname.toLowerCase() === "/account";

    if (!isCaregiver || !stage || onSettings || snoozed === stage) return null;

    const close = () => {
        setLeaving(true);
        setTimeout(() => {
            writeSnooze(stage);
            setSnoozed(stage);
        }, 220);
    };

    const submit = async (event) => {
        event.preventDefault();
        const clean = code.trim().toUpperCase();
        if (clean.length !== 6) {
            setError("codes are 6 letters and numbers.");
            inputRef.current?.focus();
            return;
        }
        setSending(true);
        setError("");
        try {
            const response = await fetch(`${API_URL}/api/caregiver-links/redeem`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-auth-token": localStorage.getItem("token") },
                body: JSON.stringify({ code: clean }),
            });
            const raw = await response.text();
            let data = {};
            try {
                data = raw ? JSON.parse(raw) : {};
            } catch {
                data = {};
            }
            if (!response.ok) throw new Error(data.msg || "could not send that code.");
            setCode("");
            setLink({ status: data.status || "pending", parent: null });
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    };

    const goPick = () => navigate("/account", { state: { openCategory: "caretaker" } });

    const boxes = Array.from({ length: 6 }, (_, i) => code[i] || "");

    return (
        <div className={`link-prompt ${leaving ? "link-prompt--leaving" : ""}`} role="dialog" aria-labelledby="link-prompt-title">
            <div className="link-prompt__card">
                <button type="button" className="link-prompt__close" onClick={close} aria-label="Close">
                    <X size={16} strokeWidth={2.5} />
                </button>

                {stage === "code" && (
                    <>
                        <span className="link-prompt__badge" aria-hidden="true">
                            <KeyRound size={22} strokeWidth={2.2} />
                        </span>
                        <h2 id="link-prompt-title">let's find your family</h2>
                        <p className="link-prompt__lead">
                            {status === "denied"
                                ? "that request wasn't approved. double-check the code with the parent and try again."
                                : "you're not linked to a parent yet. ask them for the 6-character code in their settings, then pop it in here."}
                        </p>
                        <ol className="link-prompt__steps">
                            <li><span>1</span>parent opens settings → caregiver settings</li>
                            <li><span>2</span>they share their link code with you</li>
                            <li><span>3</span>you enter it here and they approve</li>
                        </ol>
                        <form className="link-prompt__form" onSubmit={submit}>
                            <label className="link-prompt__code" onClick={() => inputRef.current?.focus()}>
                                <input
                                    ref={inputRef}
                                    value={code}
                                    onChange={(e) => {
                                        setError("");
                                        setCode(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6));
                                    }}
                                    maxLength={6}
                                    autoComplete="off"
                                    autoCapitalize="characters"
                                    spellCheck={false}
                                    aria-label="Parent's link code"
                                    disabled={sending}
                                />
                                {boxes.map((char, i) => (
                                    <span
                                        key={i}
                                        className={`link-prompt__box ${char ? "link-prompt__box--filled" : ""} ${i === code.length ? "link-prompt__box--next" : ""}`}
                                        aria-hidden="true"
                                    >
                                        {char}
                                    </span>
                                ))}
                            </label>
                            {error && <p className="link-prompt__error" role="alert">{error}</p>}
                            <button type="submit" className="link-prompt__primary" disabled={sending || code.length !== 6}>
                                {sending ? "sending…" : "send request"}
                                {!sending && <ArrowRight size={17} strokeWidth={2.6} />}
                            </button>
                        </form>
                        <button type="button" className="link-prompt__later" onClick={close}>maybe later</button>
                    </>
                )}

                {stage === "pending" && (
                    <>
                        <span className="link-prompt__badge link-prompt__badge--waiting" aria-hidden="true">
                            <Clock size={22} strokeWidth={2.2} />
                        </span>
                        <h2 id="link-prompt-title">request sent!</h2>
                        <p className="link-prompt__lead">
                            {link?.parent?.username ? `waiting for ${link.parent.username} to approve you.` : "waiting for the parent to approve you."}
                            {" "}we'll let you in as soon as they do.
                        </p>
                        <div className="link-prompt__waiting" aria-hidden="true">
                            <span /><span /><span />
                        </div>
                        <button type="button" className="link-prompt__later" onClick={close}>got it</button>
                    </>
                )}

                {stage === "pick" && (
                    <>
                        <span className="link-prompt__badge link-prompt__badge--yay" aria-hidden="true">
                            <PartyPopper size={22} strokeWidth={2.2} />
                        </span>
                        <h2 id="link-prompt-title">you're in!</h2>
                        <p className="link-prompt__lead">
                            {link?.parent?.username ? `${link.parent.username} approved you.` : "the parent approved you."}
                            {" "}pick which little one you're visiting and we'll fly you to their habitat.
                        </p>
                        <button type="button" className="link-prompt__primary" onClick={goPick}>
                            pick a little one
                            <ArrowRight size={17} strokeWidth={2.6} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}