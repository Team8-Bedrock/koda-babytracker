import React, { useEffect, useState } from "react";
import axios from "axios";
import { KeyRound, RefreshCw, Check, X, Trash2 } from "lucide-react";
import { API_URL } from "../../config";

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
const CaregiverManagementPanel = () => {
  const [code, setCode] = useState("");
  const [children, setChildren] = useState([]);
  const [links, setLinks] = useState([]);
  const [pendingSelections, setPendingSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [savingPermissionId, setSavingPermissionId] = useState(null);

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
    try {
      const sharedChildren = pendingSelections[linkId] || [];
      await axios.post(`${API_URL}/api/caregiver-links/${linkId}/approve`, { sharedChildren }, { headers: authHeaders() });
      await loadAll();
    } catch (err) {
      setStatus("could not approve that request.");
    }
  };

  const denyLink = async (linkId) => {
    try {
      await axios.post(`${API_URL}/api/caregiver-links/${linkId}/deny`, {}, { headers: authHeaders() });
      await loadAll();
    } catch (err) {
      setStatus("could not deny that request.");
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

  const toggleApprovedChild = async (link, childId) => {
    const next = link.sharedChildren.includes(childId)
      ? link.sharedChildren.filter((id) => id !== childId)
      : [...link.sharedChildren, childId];

    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, sharedChildren: next } : l)));

    try {
      await axios.patch(`${API_URL}/api/caregiver-links/${link.id}/children`, { sharedChildren: next }, { headers: authHeaders() });
    } catch (err) {
      setStatus("could not update sharing for that caregiver.");
      await loadAll();
    }
  };

  const toggleChatPermission = async (link, key) => {
    const currentValue = link.chatPermissions?.[key] !== false;
    setSavingPermissionId(link.id);
    setStatus("");

    try {
      const res = await axios.patch(
        `${API_URL}/api/caregiver-links/${link.id}/chat-permissions`,
        { [key]: !currentValue },
        { headers: authHeaders() }
      );

      setLinks((prev) =>
        prev.map((item) =>
          item.id === link.id
            ? { ...item, chatPermissions: res.data.chatPermissions }
            : item
        )
      );
    } catch (err) {
      setStatus(err.response?.data?.msg || "could not update chat permissions.");
    } finally {
      setSavingPermissionId(null);
    }
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
            <div key={link.id} className="caregiver-request-card">
              <p className="caregiver-request-name">{link.caregiver?.username || link.caregiver?.email}</p>
              <ChildToggleList
                children={children}
                checkedIds={pendingSelections[link.id] || []}
                onToggle={(childId) => togglePendingChild(link.id, childId)}
              />
              <div className="account-form-actions caregiver-request-actions">
                <button type="button" className="glass-card save-btn-card caregiver-approve-btn" onClick={() => approveLink(link.id)}>
                  <Check size={16} /> approve
                </button>
                <button type="button" className="glass-card save-btn-card caregiver-deny-btn" onClick={() => denyLink(link.id)}>
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
          {approvedLinks.map((link) => (
            <div key={link.id} className="caregiver-request-card">
              <p className="caregiver-request-name">{link.caregiver?.username || link.caregiver?.email}</p>
              <ChildToggleList
                children={children}
                checkedIds={link.sharedChildren}
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
                        link.chatPermissions?.[key] !== false &&
                        (key === "enabled" || link.chatPermissions?.enabled !== false)
                      }
                      disabled={
                        savingPermissionId === link.id ||
                        (key !== "enabled" && link.chatPermissions?.enabled === false)
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
          ))}
        </div>
      )}

      {links.length === 0 && (
        <p className="empty-msg-light account-empty-msg--panel">
          no caregivers have requested access yet.
        </p>
      )}
    </div>
  );
};

export default CaregiverManagementPanel;
