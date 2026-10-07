import React, { useEffect, useState } from "react";
import axios from "axios";
import { KeyRound, CheckCircle2, Clock, XCircle } from "lucide-react";
import { API_URL } from "../../config";
import { getSelectedChildForUser, setSelectedChildForUser } from "../../utils/authStorage";

// Lets a caregiver redeem a parent's 6-character link code and see their access status.
const CaregiverLinkPanel = () => {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeChildId, setActiveChildId] = useState(getSelectedChildForUser()?._id || null);

  const authHeaders = { "x-auth-token": localStorage.getItem("token") };

  const fetchLink = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/caregiver-links/mine`, { headers: authHeaders });
      setLink(res.data);
    } catch (err) {
      setLink(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setStatus("codes are 6 characters (letters and numbers).");
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(`${API_URL}/api/caregiver-links/redeem`, { code: cleanCode }, { headers: authHeaders });
      setCode("");
      await fetchLink();
    } catch (err) {
      setStatus(err.response?.data?.msg || "could not submit that code.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  if (!link || link.status === "denied") {
    return (
      <div className="caregiver-link-panel">
        {link?.status === "denied" && (
          <p className="empty-msg-light account-empty-msg--status caregiver-link-denied">
            <XCircle size={16} /> your last request was denied. try entering a new code below.
          </p>
        )}
        <form onSubmit={handleSubmit} className="caregiver-link-form">
          <label className="account-field-label" htmlFor="linkCode">
            <KeyRound size={14} /> parent's link code
          </label>
          <input
            id="linkCode"
            type="text"
            maxLength={6}
            className="account-field-input caregiver-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
          />
          {status && <p className="empty-msg-light account-empty-msg--status">{status}</p>}
          <button type="submit" className="glass-card save-btn-card" disabled={submitting}>
            <span>{submitting ? "sending…" : "request access"}</span>
          </button>
        </form>
      </div>
    );
  }

  if (link.status === "pending") {
    return (
      <div className="caregiver-link-panel">
        <p className="empty-msg-light account-empty-msg--status caregiver-link-pending">
          <Clock size={16} /> waiting for {link.parent?.username || "the parent"} to approve your request.
        </p>
      </div>
    );
  }

  const selectChild = (child) => {
    setSelectedChildForUser(child);
    setActiveChildId(child._id);
  };

  return (
    <div className="caregiver-link-panel">
      <p className="empty-msg-light account-empty-msg--status caregiver-link-approved">
        <CheckCircle2 size={16} /> linked to {link.parent?.username || "a parent"}'s account
      </p>
      {link.sharedChildren?.length > 0 ? (
        <>
          <p className="empty-msg-light account-empty-msg--panel">
            choose which child you're currently logging for:
          </p>
          <ul className="caregiver-shared-children-list caregiver-shared-children-list--selectable">
            {link.sharedChildren.map((child) => (
              <li key={child._id}>
                <button
                  type="button"
                  className={`caregiver-child-select-btn ${activeChildId === child._id ? "caregiver-child-select-btn--active" : ""}`}
                  onClick={() => selectChild(child)}
                >
                  {child.name}
                  {activeChildId === child._id && <CheckCircle2 size={14} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="empty-msg-light account-empty-msg--panel">
          the parent hasn't shared any child profiles with you yet.
        </p>
      )}
    </div>
  );
};

export default CaregiverLinkPanel;
