import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, ImagePlus, Mic, Square } from "lucide-react";
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

function Chat() {
    const selectedChild = getSelectedChildForUser();
    const childId = selectedChild?._id;
    const currentUserId = getCurrentUserId();

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
    const recorderRef = useRef(null);
    const recordingTimerRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!childId) return;

        let active = true;

        async function loadMessages() {
            try {
                const response = await fetch(`${API_URL}/api/chat/${childId}/messages`, {
                    headers: { "x-auth-token": localStorage.getItem("token") },
                });
                const data = await response.json();

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
    }, [childId]);

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
        if (!messageText || !childId || sending || uploading || accessDenied) return;

        setSending(true);
        setError("");

        try {
            const response = await fetch(`${API_URL}/api/chat/${childId}/messages`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({ text: messageText, urgent }),
            });
            const data = await response.json();
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
        if (!childId || accessDenied) return;
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
                }),
            });
            const result = await response.json();
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

    return (
        <main className="chat-page">
            <section className="chat-panel">
                <div className="chat-panel-header">
                    <h1>
                        {selectedChild ? `${selectedChild.name}'s Family Chat` : "Family Chat"}
                    </h1>
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
                        <p className="chat-empty">No messages yet. Start the conversation below.</p>
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
                                <strong>
                                    {isMine ? "You" : message.senderId?.username || "Caregiver"}
                                </strong>

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
                        className="chat-text-input"
                        type="text"
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder="Write a message..."
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