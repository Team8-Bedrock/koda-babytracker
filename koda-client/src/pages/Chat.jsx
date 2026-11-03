import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { ArrowUp, ChevronLeft, ChevronRight, ImagePlus, Mic, Square, Users } from "lucide-react";
import { API_URL } from "../config";
import { getCurrentUserId, getSelectedChildForUser } from "../utils/authStorage";
import "../styling/pages/chat.css";

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

function Attachment({ childId, message }) {
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!message.attachmentId) return;

        let active = true;
        let objectUrl;

        async function load() {
            try {
                const response = await fetch(
                    `${API_URL}/api/chat/${childId}/attachments/${message.attachmentId}`,
                    { headers: { "x-auth-token": localStorage.getItem("token") } }
                );
                if (!response.ok) throw new Error("Could not load attachment.");

                const blob = await response.blob();
                objectUrl = URL.createObjectURL(blob);
                if (active) setUrl(objectUrl);
            } catch (err) {
                if (active) setError(err.message);
            }
        }

        load();
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [childId, message.attachmentId]);

    if (error) return <p className="chat-attachment-error">{error}</p>;
    if (!url) return <p className="chat-attachment-error">Loading attachment...</p>;

    return message.kind === "photo" ? (
        <img className="chat-photo" src={url} alt="Shared in chat" />
    ) : (
        <audio className="chat-audio" src={url} controls />
    );
}

const AVATAR_COLORS = [
    ["#f8d9c2", "#b5562c"],
    ["#d6e6f4", "#3b6a96"],
    ["#f7d6e3", "#a1466c"],
    ["#dce5d4", "#3f6647"],
    ["#efe3c4", "#7d6430"],
    ["#e3dcf4", "#5f4b9a"],
];

function colorFor(name) {
    const text = String(name || "?");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function PersonAvatar({ name, size = 44 }) {
    const [bg, fg] = colorFor(name);
    return (
        <span
            className="chat-avatar"
            style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}
            aria-hidden="true"
        >
            {String(name || "?").trim().charAt(0).toUpperCase()}
        </span>
    );
}

function GroupAvatar({ size = 44 }) {
    return (
        <span className="chat-avatar chat-avatar--group" style={{ width: size, height: size }} aria-hidden="true">
            <Users size={size * 0.46} strokeWidth={2.2} />
        </span>
    );
}

function previewOf(last, currentUserId, isGroup) {
    if (!last) return "no messages yet";
    const mine = String(last.senderId?._id || last.senderId) === String(currentUserId);
    const body = last.kind === "photo" ? "sent a photo" : last.kind === "voice" ? "sent a voice message" : last.text;
    const who = mine ? "you" : isGroup ? last.senderId?.username : "";
    return `${last.urgent ? "⚠ " : ""}${who ? `${who}: ` : ""}${body}`;
}

function shortTime(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

async function readJson(response) {
    const raw = await response.text();
    try {
        return raw ? JSON.parse(raw) : {};
    } catch {
        return { msg: "" };
    }
}

function lastReadKey(userId, childId, threadKey) {
    return `chatLastRead:${userId}:${childId}:${threadKey}`;
}

function readLastRead(userId, childId, threadKey) {
    try {
        return Number(localStorage.getItem(lastReadKey(userId, childId, threadKey))) || 0;
    } catch {
        return 0;
    }
}

function Chat() {
    const selectedChild = getSelectedChildForUser();
    const childId = selectedChild?._id;
    const currentUserId = getCurrentUserId();
    const location = useLocation();
    const [thread, setThread] = useState(() => location.state?.with || null);
    const [inbox, setInbox] = useState(null);
    const [inboxError, setInboxError] = useState("");
    const threadPartner = thread && thread !== "group" ? thread : null;

    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [urgent, setUrgent] = useState(false);
    const [sending, setSending] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [recording, setRecording] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);
    const [error, setError] = useState("");
    const [chatPermissions, setChatPermissions] = useState(null);
    const urgentSeenKey = `chatUrgentSeen:${currentUserId}:${childId}`;
    const [seenUrgentIds, setSeenUrgentIds] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(urgentSeenKey) || "[]");
            return Array.isArray(saved) ? saved : [];
        } catch {
            return [];
        }
    });

    const photoInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const recorderRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (location.state?.with) setThread(location.state.with);
    }, [location.state]);

    useEffect(() => {
        if (!childId) return undefined;
        let active = true;

        async function loadInbox() {
            try {
                const response = await fetch(`${API_URL}/api/chat/${childId}/contacts`, {
                    headers: { "x-auth-token": localStorage.getItem("token") },
                });
                const data = await readJson(response);
                if (response.status === 401 || response.status === 403) {
                    if (active) setAccessDenied(true);
                    throw new Error(data.msg || "Could not load your contacts.");
                }
                if (!response.ok || !data.group) {
                    if (active) {
                        setInbox((current) => current && !current.fallback ? current : {
                            group: { name: null, memberCount: null, last: null },
                            contacts: [],
                            fallback: true,
                        });
                        setInboxError("");
                    }
                    return;
                }
                if (active) {
                    setInbox(data);
                    setInboxError("");
                }
            } catch (err) {
                if (active) setInboxError(err.message);
            }
        }

        loadInbox();
        const interval = setInterval(loadInbox, 8000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [childId, thread]);

    useEffect(() => {
        if (!childId || !thread) return undefined;

        let active = true;
        setMessages([]);
        setError("");

        async function loadMessages() {
            try {
                const query = threadPartner ? `?with=${encodeURIComponent(threadPartner)}` : "";
                const response = await fetch(`${API_URL}/api/chat/${childId}/messages${query}`, {
                    headers: { "x-auth-token": localStorage.getItem("token") },
                });
                const data = await readJson(response);

                if (!response.ok) {
                    if (active && (response.status === 401 || response.status === 403)) {
                        setMessages([]);
                        setAccessDenied(true);
                    }
                    throw new Error(data.msg || "Could not load messages.");
                }

                if (active) {
                    setMessages(data);
                    setAccessDenied(false);
                    setError("");
                }
            } catch (err) {
                if (active) setError(err.message);
            }
        }

        loadMessages();
        const interval = setInterval(loadMessages, 8000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [childId, thread, threadPartner]);

    useEffect(() => {
        if (!thread || !childId || !messages.length) return;
        const latest = new Date(messages[messages.length - 1].createdAt).getTime();
        if (!Number.isFinite(latest)) return;
        try {
            localStorage.setItem(lastReadKey(currentUserId, childId, thread), String(latest));
        } catch {
            return;
        }
    }, [messages, thread, childId, currentUserId]);

    useEffect(() => {
        let active = true;
        let interval;

        async function loadPermissions() {
            try {
                const headers = { "x-auth-token": localStorage.getItem("token") };
                const userResponse = await fetch(`${API_URL}/api/auth/me`, { headers });
                if (!userResponse.ok) throw new Error("Could not load chat permissions.");
                const user = await userResponse.json();

                if (user.role !== "caregiver") {
                    if (active) setChatPermissions({
                        enabled: true, photos: true, voice: true, urgent: true,
                    });
                    return;
                }

                async function refreshCaregiverPermissions() {
                    const response = await fetch(`${API_URL}/api/caregiver-links/mine`, { headers });
                    if (!response.ok) throw new Error("Could not load chat permissions.");
                    const link = await response.json();

                    if (active) {
                        setChatPermissions(
                            link?.status === "approved"
                                ? {
                                    enabled: true, photos: true, voice: true, urgent: true,
                                    ...link.chatPermissions,
                                }
                                : { enabled: false, photos: false, voice: false, urgent: false }
                        );
                    }
                }

                await refreshCaregiverPermissions();
                interval = setInterval(refreshCaregiverPermissions, 3000);
            } catch (err) {
                if (active) setError(err.message);
            }
        }

        loadPermissions();
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, []);

    const lastMessageId = messages[messages.length - 1]?._id;

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [lastMessageId]);

    useEffect(() => {
        return () => {
            clearTimeout(recordingTimerRef.current);
            const recorder = recorderRef.current;
            if (recorder) {
                recorder.onstop = null;
                if (recorder.state !== "inactive") recorder.stop();
                recorder.stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    function addMessage(message) {
        setMessages((previous) =>
            previous.some((item) => item._id === message._id)
                ? previous
                : [...previous, message]
        );
        setUrgent(false);
    }

    async function sendMessage(event) {
        event.preventDefault();
        const messageText = text.trim();
        if (!messageText || !childId || !thread || sending || uploading || accessDenied) return;

        setSending(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/api/chat/${childId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({ text: messageText, urgent, ...(threadPartner ? { to: threadPartner } : {}) }),
            });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.msg || "Could not send message.");

            addMessage(data);
            setText("");
        } catch (err) {
            setError(err.message);
        } finally {
            setSending(false);
        }
    }

    async function uploadAttachment(blob, kind) {
        if (!childId || !thread || accessDenied) return;
        if (!blob || blob.size > MAX_FILE_SIZE) {
            setError("Attachment must be under 1 MB.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result).split(",")[1]);
                reader.onerror = () => reject(new Error("Could not read attachment."));
                reader.readAsDataURL(blob);
            });

            const response = await fetch(`${API_URL}/api/chat/${childId}/attachments`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({
                    kind,
                    mimeType: blob.type,
                    data: base64,
                    urgent,
                    ...(threadPartner ? { to: threadPartner } : {}),
                }),
            });
            const result = await readJson(response);
            if (!response.ok) throw new Error(result.msg || "Could not upload attachment.");

            addMessage(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    async function handlePhoto(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setError("Choose a JPG, PNG, or WebP photo.");
            return;
        }

        if (file.size <= MAX_FILE_SIZE) {
            await uploadAttachment(file, "photo");
            return;
        }

        try {
            const image = await createImageBitmap(file);
            const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(image.width * scale);
            canvas.height = Math.round(image.height * scale);
            const context = canvas.getContext("2d");
            context.fillStyle = "#ffffff";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            image.close();

            const compressed = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/jpeg", 0.75)
            );
            await uploadAttachment(compressed, "photo");
        } catch (err) {
            setError("Could not prepare that photo. Try a smaller image.");
        }
    }

    async function toggleRecording() {
        const current = recorderRef.current;
        if (current?.state === "recording") {
            current.stop();
            return;
        }

        if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
            setError("Voice recording is not supported in this browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferredType = ["audio/webm", "audio/mp4", "audio/ogg"].find(
                (type) => MediaRecorder.isTypeSupported(type)
            );
            const recorder = new MediaRecorder(
                stream,
                preferredType ? { mimeType: preferredType } : undefined
            );
            const chunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size) chunks.push(event.data);
            };
            recorder.onstop = () => {
                clearTimeout(recordingTimerRef.current);
                stream.getTracks().forEach((track) => track.stop());
                setRecording(false);
                recorderRef.current = null;

                const recording = new Blob(chunks, {
                    type: recorder.mimeType || chunks[0]?.type || "audio/webm",
                });
                if (recording.size) uploadAttachment(recording, "voice");
            };

            recorderRef.current = recorder;
            recorder.start();
            setRecording(true);
            setError("");
            recordingTimerRef.current = setTimeout(() => {
                if (recorder.state === "recording") recorder.stop();
            }, 30000);
        } catch (err) {
            setError("Microphone access was unavailable.");
        }
    }
    const canChat = chatPermissions?.enabled === true && !accessDenied;
    const canPhoto = canChat && chatPermissions.photos !== false;
    const canVoice = canChat && chatPermissions.voice !== false;
    const canUrgent = canChat && chatPermissions.urgent !== false;

    useEffect(() => {
        if (!sending && canChat) {
            messageInputRef.current?.focus();
        }
    }, [sending, canChat]);

    const latestUrgent = [...messages].reverse().find(
        (message) =>
            message.urgent &&
            String(message.senderId?._id) !== String(currentUserId) &&
            !seenUrgentIds.includes(message._id)
    );

    function markUrgentSeen() {
        if (!latestUrgent) return;
        const next = [...seenUrgentIds, latestUrgent._id];
        setSeenUrgentIds(next);
        localStorage.setItem(urgentSeenKey, JSON.stringify(next));
    }

    const contacts = inbox?.contacts || [];
    const activeContact = threadPartner ? contacts.find((person) => String(person.id) === String(threadPartner)) : null;
    const groupName = inbox?.group?.name || (selectedChild ? `${selectedChild.name}'s family` : "family chat");

    const isUnread = (key, last) => {
        if (!last) return false;
        const mine = String(last.senderId?._id || last.senderId) === String(currentUserId);
        if (mine) return false;
        return new Date(last.createdAt).getTime() > readLastRead(currentUserId, childId, key);
    };

    const openThread = (key) => {
        setText("");
        setUrgent(false);
        setThread(key);
    };

    if (!thread) {
        const rows = [
            {
                key: "group",
                name: groupName,
                sub: inbox?.group?.memberCount
                    ? `everyone · ${inbox.group.memberCount} ${inbox.group.memberCount === 1 ? "person" : "people"}`
                    : "everyone",
                last: inbox?.group?.last,
                group: true,
            },
            ...contacts.map((person) => ({
                key: String(person.id),
                name: person.username,
                sub: person.role === "parent" ? "parent" : "caregiver",
                last: person.last,
            })),
        ].sort((x, y) => {
            if (x.group) return -1;
            if (y.group) return 1;
            return new Date(y.last?.createdAt || 0) - new Date(x.last?.createdAt || 0);
        });

        return (
            <main className="chat-page">
                <section className="chat-panel">
                    <div className="chat-panel-header">
                        <h1>messages</h1>
                        <p className="chat-panel-sub">
                            {selectedChild ? `about ${selectedChild.name}` : "your family"}
                        </p>
                    </div>
                    <div className="chat-inbox">
                        {!childId && <p className="chat-empty">pick a child to start chatting.</p>}
                        {childId && accessDenied && (
                            <p className="chat-empty">chat isn't turned on for you yet.</p>
                        )}
                        {childId && !accessDenied && !inbox && !inboxError && (
                            <p className="chat-empty">loading your contacts...</p>
                        )}
                        {inboxError && !inbox && <p className="chat-error" role="alert">{inboxError}</p>}
                        {childId && !accessDenied && inbox && (
                            <ul className="chat-contact-list">
                                {rows.map((row, index) => {
                                    const unread = isUnread(row.key, row.last);
                                    return (
                                        <li key={row.key} style={{ animationDelay: `${index * 0.04}s` }}>
                                            <button
                                                type="button"
                                                className={`chat-contact ${unread ? "chat-contact--unread" : ""}`}
                                                onClick={() => openThread(row.key)}
                                            >
                                                {row.group ? <GroupAvatar /> : <PersonAvatar name={row.name} />}
                                                <span className="chat-contact__body">
                                                    <span className="chat-contact__top">
                                                        <strong>{row.name}</strong>
                                                        <time>{shortTime(row.last?.createdAt)}</time>
                                                    </span>
                                                    <span className="chat-contact__sub">{row.sub}</span>
                                                    <span className="chat-contact__preview">{previewOf(row.last, currentUserId, row.group)}</span>
                                                </span>
                                                {unread ? (
                                                    <span className="chat-contact__dot" aria-label="unread" />
                                                ) : (
                                                    <ChevronRight size={18} className="chat-contact__chevron" aria-hidden="true" />
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {childId && !accessDenied && inbox && contacts.length === 0 && !inbox.fallback && (
                            <p className="chat-inbox-hint">
                                once a caregiver is approved, they'll show up here so you can message them directly.
                            </p>
                        )}
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="chat-page">
            <section className="chat-panel chat-panel--thread">
                <div className="chat-panel-header chat-thread-header">
                    <button type="button" className="chat-back" onClick={() => setThread(null)} aria-label="Back to messages">
                        <ChevronLeft size={22} strokeWidth={2.4} />
                    </button>
                    {threadPartner ? <PersonAvatar name={activeContact?.username} size={38} /> : <GroupAvatar size={38} />}
                    <div className="chat-thread-title">
                        <h1>{threadPartner ? activeContact?.username || "..." : groupName}</h1>
                        <p className="chat-panel-sub">
                            {threadPartner
                                ? `${activeContact?.role === "parent" ? "parent" : "caregiver"} · only you two can see this`
                                : inbox?.group?.memberCount ? `everyone · ${inbox.group.memberCount} people` : "everyone"}
                        </p>
                    </div>
                </div>
                {latestUrgent && (
                    <div className="chat-pinned-urgent" role="alert">
                        <div>
                            <strong>⚠ Urgent message</strong>
                            <p>
                                {latestUrgent.kind === "text"
                                    ? latestUrgent.text
                                    : latestUrgent.kind === "photo"
                                        ? "Photo shared as urgent"
                                        : "Voice message shared as urgent"}
                            </p>
                        </div>
                        <div className="chat-pinned-urgent-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    document.getElementById(`chat-message-${latestUrgent._id}`)
                                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                                }
                            >
                                View
                            </button>
                            <button type="button" onClick={markUrgentSeen}>
                                Mark seen
                            </button>
                        </div>
                    </div>
                )}
                <div className="chat-messages" aria-live="polite">
                    {messages.length === 0 && !error && (
                        <p className="chat-empty">
                            {threadPartner
                                ? `say hi to ${activeContact?.username || "them"}!`
                                : "No messages yet. Start the conversation below."}
                        </p>
                    )}

                    {messages.map((message) => {
                        const isMine = String(message.senderId?._id) === String(currentUserId);

                        return (
                            <div
                                key={message._id}
                                id={`chat-message-${message._id}`}
                                className={`chat-message ${isMine ? "chat-message--mine" : ""} ${message.kind === "voice" ? "chat-message--voice" : ""
                                    }`}
                            >
                                {message.urgent && (
                                    <span className="chat-urgent-label">⚠ Urgent</span>
                                )}
                                {!threadPartner && (
                                    <strong>
                                        {isMine ? "You" : message.senderId?.username || "Caregiver"}
                                    </strong>
                                )}

                                {message.kind === "photo" || message.kind === "voice" ? (
                                    <Attachment childId={childId} message={message} />
                                ) : (
                                    <p>{message.text}</p>
                                )}

                                <time dateTime={message.createdAt}>
                                    {new Date(message.createdAt).toLocaleTimeString([], {
                                        hour: "numeric",
                                        minute: "2-digit",
                                    })}
                                </time>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {error && <p className="chat-error" role="alert">{error}</p>}

                <form className="chat-composer" onSubmit={sendMessage}>
                    <input
                        ref={messageInputRef}
                        className="chat-text-input"
                        type="text"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={threadPartner ? `message ${activeContact?.username || ""}...` : "message everyone..."}
                        aria-label="Write a message"
                        maxLength={2000}
                        disabled={!childId || !canChat || sending || uploading}
                    />

                    <div className="chat-composer-actions">
                        <div className="chat-tools">
                            <input
                                ref={photoInputRef}
                                className="chat-file-input"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                aria-label="Choose a photo"
                                onChange={handlePhoto}
                                disabled={!childId || !canPhoto || uploading || recording}
                            />
                            <button
                                type="button"
                                className="chat-tool-button"
                                aria-label="Attach photo"
                                title="Attach photo"
                                onClick={() => photoInputRef.current?.click()}
                                disabled={!childId || !canPhoto || uploading || recording}
                            >
                                <ImagePlus size={21} />
                            </button>

                            <button
                                type="button"
                                className={`chat-tool-button ${recording ? "chat-recording" : ""}`}
                                aria-label={recording ? "Stop recording" : "Record voice message"}
                                title={recording ? "Stop recording" : "Record voice message"}
                                onClick={toggleRecording}
                                disabled={!childId || (!recording && !canVoice) || uploading}
                            >
                                {recording ? <Square size={19} /> : <Mic size={21} />}
                            </button>

                            <button
                                type="button"
                                className={`chat-tool-button ${urgent ? "chat-urgent-toggle--active" : ""}`}
                                aria-label="Mark message as urgent"
                                aria-pressed={urgent}
                                title="Mark as urgent"
                                onClick={() => setUrgent((value) => !value)}
                                disabled={!childId || !canUrgent || uploading}
                            >
                                ⚠
                            </button>
                        </div>

                        <button
                            className="chat-send-button"
                            type="submit"
                            aria-label="Send message"
                            title="Send message"
                            disabled={!childId || !canChat || !text.trim() || sending || uploading}
                        >
                            <ArrowUp size={22} strokeWidth={2.5} />
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}

export default Chat;