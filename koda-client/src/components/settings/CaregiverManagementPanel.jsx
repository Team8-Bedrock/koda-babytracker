import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { KeyRound, RefreshCw, Check, X, Trash2 } from "lucide-react";
import { API_URL } from "../../config";
import { removeNotification } from "../../utils/notifications";

const authHeaders = () => ({ "x-auth-token": localStorage.getItem("token") });

// Per-child sharing toggles shown while approving a request or adjusting an existing one.
const ChildToggleList = ({ children, checkedIds, onToggle }) => (
  <div className="caregiver-child-toggle-list">
    {children.map((child) => (
      <label key={child._id} className="caregiver-child-toggle">
        <span>{child.name}</span>
        <input
          type="checkbox"
          checked={checkedIds.includes(child._id)}
          onChange={() => onToggle(child._id)}
        />
        <span className="caregiver-toggle-switch" aria-hidden="true" />
      </label>
    ))}
  </div>
);

// Parent-facing panel: share a link code, approve/deny requests, and toggle child access.
const CHAT_KEYS = ["enabled", "photos", "voice", "urgent"];

const normalizePermissions = (perms) =>
  CHAT_KEYS.reduce((acc, key) => ({ ...acc, [key]: perms?.[key] !== false }), {});

const sameIds = (a = [], b = []) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

const samePermissions = (a, b) => CHAT_KEYS.every((key) => normalizePermissions(a)[key] === normalizePermissions(b)[key]);

const CaregiverManagementPanel = ({ onCancel }) => {
  const [code, setCode] = useState("");
  const [children, setChildren] = useState([]);
  const [links, setLinks] = useState([]);
  const [pendingSelections, setPendingSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [drafts, setDrafts] = useState({});
  const [savingDrafts, setSavingDrafts] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [outcomes, setOutcomes] = useState({});
  const [freshId, setFreshId] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn, ms) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const playOutcome = (linkId, outcome, duration) => {
    setOutcomes((prev) => ({ ...prev, [linkId]: outcome }));
    later(async () => {
      await loadAll();
      setOutcomes((prev) => {
        const next = { ...prev };
        delete next[linkId];
        return next;
      });
      if (outcome === "approved") {
        setFreshId(linkId);
        later(() => setFreshId(null), 1700);
      }
    }, duration);
  };

  const loadAll = async () => {
    try {
      const [codeRes, requestsRes] = await Promise.all([
        axios.get(`${API_URL}/api/caregiver-links/code`, { headers: authHeaders() }),
        axios.get(`${API_URL}/api/caregiver-links/requests`, { headers: authHeaders() }),
      ]);
      setCode(codeRes.data.code);
      setChildren(requestsRes.data.children || []);
      setLinks(requestsRes.data.links || []);
    } catch (err) {
      setStatus("could not load caregiver settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateCode = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/caregiver-links/code/regenerate`, {}, { headers: authHeaders() });
      setCode(res.data.code);
    } catch (err) {
      setStatus("could not regenerate code.");
    }
  };

  const togglePendingChild = (linkId, childId) => {
    setPendingSelections((prev) => {
      const current = prev[linkId] || [];
      const next = current.includes(childId) ? current.filter((id) => id !== childId) : [...current, childId];
      return { ...prev, [linkId]: next };
    });
  };

  const approveLink = async (linkId) => {
    if (busyId) return;
    setBusyId(linkId);
    setStatus("");
    try {
      const sharedChildren = pendingSelections[linkId] || [];
      await axios.post(`${API_URL}/api/caregiver-links/${linkId}/approve`, { sharedChildren }, { headers: authHeaders() });
      removeNotification(`caregiver-request:${linkId}`);
      playOutcome(linkId, "approved", 1500);
    } catch (err) {
      setStatus("could not approve that request.");
    } finally {
      setBusyId(null);
    }
  };

  const denyLink = async (linkId) => {
    if (busyId) return;
    setBusyId(linkId);
    setStatus("");
    try {
      await axios.post(`${API_URL}/api/caregiver-links/${linkId}/deny`, {}, { headers: authHeaders() });
      removeNotification(`caregiver-request:${linkId}`);
      playOutcome(linkId, "denied", 1300);
    } catch (err) {
      setStatus("could not deny that request.");
    } finally {
      setBusyId(null);
    }
  };

  const removeLink = async (linkId) => {
    try {
      await axios.delete(`${API_URL}/api/caregiver-links/${linkId}`, { headers: authHeaders() });
      await loadAll();
    } catch (err) {
      setStatus("could not remove that caregiver.");
    }
  };

  const draftOf = (link) => drafts[link.id] || {
    sharedChildren: link.sharedChildren || [],
    chatPermissions: normalizePermissions(link.chatPermissions),
  };

  const updateDraft = (link, change) => {
    setSavedFlash(false);
    setDrafts((prev) => {
      const current = prev[link.id] || {
        sharedChildren: link.sharedChildren || [],
        chatPermissions: normalizePermissions(link.chatPermissions),
      };
      return { ...prev, [link.id]: change(current) };
    });
  };

  const toggleApprovedChild = (link, childId) => {
    updateDraft(link, (draft) => ({
      ...draft,
      sharedChildren: draft.sharedChildren.includes(childId)
        ? draft.sharedChildren.filter((id) => id !== childId)
        : [...draft.sharedChildren, childId],
    }));
  };

  const toggleChatPermission = (link, key) => {
    updateDraft(link, (draft) => ({
      ...draft,
      chatPermissions: { ...draft.chatPermissions, [key]: !draft.chatPermissions[key] },
    }));
  };

  const changedLinks = links.filter((link) => {
    const draft = drafts[link.id];
    if (!draft || link.status !== "approved") return false;
    return !sameIds(draft.sharedChildren, link.sharedChildren) || !samePermissions(draft.chatPermissions, link.chatPermissions);
  });
  const dirty = changedLinks.length > 0;

  const saveDrafts = async () => {
    if (!dirty || savingDrafts) return;
    setSavingDrafts(true);
    setStatus("");
    try {
      await Promise.all(
        changedLinks.map(async (link) => {
          const draft = drafts[link.id];
          if (!sameIds(draft.sharedChildren, link.sharedChildren)) {
            await axios.patch(
              `${API_URL}/api/caregiver-links/${link.id}/children`,
              { sharedChildren: draft.sharedChildren },
              { headers: authHeaders() }
            );
          }
          if (!samePermissions(draft.chatPermissions, link.chatPermissions)) {
            await axios.patch(
              `${API_URL}/api/caregiver-links/${link.id}/chat-permissions`,
              draft.chatPermissions,
              { headers: authHeaders() }
            );
          }
        })
      );
      await loadAll();
      setDrafts({});
      setSavedFlash(true);
      later(() => setSavedFlash(false), 2200);
    } catch (err) {
      setStatus(err.response?.data?.msg || "could not save those changes. please try again.");
      await loadAll();
    } finally {
      setSavingDrafts(false);
    }
  };

  const cancelDrafts = () => {
    setDrafts({});
    setStatus("");
    onCancel?.();
  };

  if (loading) return null;

  const pendingLinks = links.filter((l) => l.status === "pending");
  const approvedLinks = links.filter((l) => l.status === "approved");

  return (
    <div className="caregiver-management-panel">
      <div className="caregiver-code-block">
        <span className="account-field-label"><KeyRound size={14} /> your link code</span>
        <div className="caregiver-code-row">
          <span className="caregiver-code-value">{code}</span>
          <button type="button" className="account-toggle-link caregiver-regenerate-btn" onClick={regenerateCode}>
            <RefreshCw size={13} /> regenerate
          </button>
        </div>
        <p className="empty-msg-light account-empty-msg--panel">
          share this code with a caregiver so they can request access to your child's profile.
        </p>
      </div>

      {status && <p className="empty-msg-light account-empty-msg--status">{status}</p>}

      {pendingLinks.length > 0 && (
        <div className="caregiver-requests-block">
          <span className="account-field-label">pending requests</span>
          {pendingLinks.map((link) => (
            <div
              key={link.id}
              className={[
                "caregiver-request-card",
                busyId === link.id ? "caregiver-request-card--busy" : "",
                outcomes[link.id] ? `caregiver-request-card--${outcomes[link.id]}` : "",
              ].join(" ").trim()}
            >
              {outcomes[link.id] === "approved" && [0, 50, 110, 170, 230, 300].map((deg) => (
                <span key={deg} className="caregiver-request-leaf" style={{ "--leaf-angle": `${deg}deg` }} aria-hidden="true" />
              ))}
              {outcomes[link.id] && (
                <span className={`caregiver-request-stamp caregiver-request-stamp--${outcomes[link.id]}`} role="status">
                  {outcomes[link.id] === "approved" ? <Check size={20} strokeWidth={3} /> : <X size={20} strokeWidth={3} />}
                  {outcomes[link.id] === "approved" ? "welcome in" : "denied"}
                </span>
              )}
              <p className="caregiver-request-name">{link.caregiver?.username || link.caregiver?.email}</p>
              <ChildToggleList
                children={children}
                checkedIds={pendingSelections[link.id] || []}
                onToggle={(childId) => togglePendingChild(link.id, childId)}
              />
              <div className="account-form-actions caregiver-request-actions">
                <button type="button" className="glass-card save-btn-card caregiver-approve-btn" onClick={() => approveLink(link.id)} disabled={Boolean(busyId)}>
                  <Check size={16} /> {busyId === link.id ? "…" : "approve"}
                </button>
                <button type="button" className="glass-card save-btn-card caregiver-deny-btn" onClick={() => denyLink(link.id)} disabled={Boolean(busyId)}>
                  <X size={16} /> deny
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {approvedLinks.length > 0 && (
        <div className="caregiver-requests-block">
          <span className="account-field-label">linked caregivers</span>
          {approvedLinks.map((link) => {
            const draft = draftOf(link);
            const linkChanged = changedLinks.some((item) => item.id === link.id);
            return (
              <div
                key={link.id}
                className={[
                  "caregiver-request-card",
                  freshId === link.id ? "caregiver-request-card--fresh" : "",
                  linkChanged ? "caregiver-request-card--edited" : "",
                ].join(" ").trim()}
              >
                {linkChanged && <span className="caregiver-edited-tag">unsaved</span>}
                <p className="caregiver-request-name">{link.caregiver?.username || link.caregiver?.email}</p>
                <ChildToggleList
                  children={children}
                  checkedIds={draft.sharedChildren}
                  onToggle={(childId) => toggleApprovedChild(link, childId)}
                />
                <div className="caregiver-child-toggle-list caregiver-chat-permissions">
                  <span className="account-field-label">chat permissions</span>
                  {[
                    ["enabled", "allow chat"],
                    ["photos", "send photos"],
                    ["voice", "send voice messages"],
                    ["urgent", "mark messages urgent"],
                  ].map(([key, label]) => (
                    <label key={key} className="caregiver-child-toggle">
                      <span>{label}</span>
                      <input
                        type="checkbox"
                        checked={
                          draft.chatPermissions[key] !== false &&
                          (key === "enabled" || draft.chatPermissions.enabled !== false)
                        }
                        disabled={
                          savingDrafts ||
                          (key !== "enabled" && draft.chatPermissions.enabled === false)
                        }
                        onChange={() => toggleChatPermission(link, key)}
                      />
                      <span className="caregiver-toggle-switch" aria-hidden="true" />
                    </label>
                  ))}
                </div>
                <button type="button" className="account-toggle-link caregiver-remove-btn" onClick={() => removeLink(link.id)}>
                  <Trash2 size={13} /> remove access
                </button>
              </div>
            );
          })}
        </div>
      )}

      {links.length === 0 && (
        <p className="empty-msg-light account-empty-msg--panel">
          no caregivers have requested access yet.
        </p>
      )}

      <div className="panel-footer">
        <button
          type="button"
          className="account-toggle-link account-toggle-link--bottom panel-footer__cancel"
          onClick={cancelDrafts}
          disabled={savingDrafts}
        >
          cancel
        </button>
        <button
          type="button"
          className={`panel-footer__save ${dirty ? "panel-footer__save--ready" : ""} ${savedFlash ? "panel-footer__save--saved" : ""}`}
          onClick={saveDrafts}
          disabled={!dirty || savingDrafts}
        >
          {savingDrafts ? (
            <><span className="panel-footer__spinner" aria-hidden="true" /> saving…</>
          ) : savedFlash ? (
            <><Check size={16} strokeWidth={3} aria-hidden="true" /> saved</>
          ) : dirty ? (
            `save ${changedLinks.length > 1 ? `(${changedLinks.length})` : ""}`.trim()
          ) : (
            "save"
          )}
        </button>
      </div>
    </div>
  );
};

export default CaregiverManagementPanel;