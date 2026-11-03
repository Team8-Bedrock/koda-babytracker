import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { KeyRound, CheckCircle2, Clock, XCircle, Check } from "lucide-react";
import { API_URL } from "../../config";
import { getSelectedChildForUser, setSelectedChildForUser } from "../../utils/authStorage";
import { startTravel } from "../Traveloverlay";

// Lets a caregiver redeem a parent's 6-character link code and see their access status.
const CaregiverLinkPanel = ({ onCancel }) => {
  const navigate = useNavigate();
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeChildId, setActiveChildId] = useState(getSelectedChildForUser()?._id || null);
  const [pickedId, setPickedId] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

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
    event?.preventDefault();
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
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setStatus(err.response?.data?.msg || "could not submit that code.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const stage = !link || link.status === "denied" ? "code" : link.status === "pending" ? "pending" : "approved";
  const cleanCode = code.trim();
  const pickedChild = link?.sharedChildren?.find((child) => child._id === pickedId) || null;
  const canSave =
    !submitting &&
    ((stage === "code" && cleanCode.length === 6) ||
      (stage === "approved" && pickedChild && pickedChild._id !== activeChildId));

  const commitChild = (child) => {
    const firstTrip = !activeChildId;
    setActiveChildId(child._id);
    setPickedId(null);
    const arrive = () => {
      setSelectedChildForUser(child);
      window.dispatchEvent(new CustomEvent("koda-selected-child-updated", { detail: { child } }));
    };
    if (!firstTrip) {
      arrive();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      return;
    }
    startTravel(child, () => {
      arrive();
      navigate("/ParentDashboard");
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    if (stage === "code") handleSubmit();
    else if (pickedChild) commitChild(pickedChild);
  };

  const handleCancel = () => {
    setPickedId(null);
    setCode("");
    setStatus("");
    onCancel?.();
  };

  const saveLabel = submitting
    ? null
    : savedFlash
      ? stage === "pending" ? "sent" : "saved"
      : stage === "code" && cleanCode.length === 6
        ? "send request"
        : stage === "approved" && pickedChild && pickedChild._id !== activeChildId
          ? `visit ${pickedChild.name}`
          : "save";

  const footer = (
    <div className="panel-footer">
      <button
        type="button"
        className="account-toggle-link account-toggle-link--bottom panel-footer__cancel"
        onClick={handleCancel}
        disabled={submitting}
      >
        cancel
      </button>
      <button
        type="button"
        className={`panel-footer__save ${canSave ? "panel-footer__save--ready" : ""} ${savedFlash ? "panel-footer__save--saved" : ""}`}
        onClick={handleSave}
        disabled={!canSave}
      >
        {submitting ? (
          <><span className="panel-footer__spinner" aria-hidden="true" /> sending…</>
        ) : savedFlash ? (
          <><Check size={16} strokeWidth={3} aria-hidden="true" /> {saveLabel}</>
        ) : (
          saveLabel
        )}
      </button>
    </div>
  );

  if (stage === "code") {
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
            onChange={(e) => {
              setStatus("");
              setCode(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase());
            }}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoComplete="off"
          />
          <p className="empty-msg-light account-empty-msg--panel">
            ask the parent for the code in their caregiver settings, then hit send request.
          </p>
          {status && <p className="empty-msg-light account-empty-msg--status">{status}</p>}
        </form>
        {footer}
      </div>
    );
  }

  if (stage === "pending") {
    return (
      <div className="caregiver-link-panel">
        <p className="empty-msg-light account-empty-msg--status caregiver-link-pending">
          <Clock size={16} /> waiting for {link.parent?.username || "the parent"} to approve your request.
        </p>
        {footer}
      </div>
    );
  }

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
            {link.sharedChildren.map((child) => {
              const shown = pickedId || activeChildId;
              return (
                <li key={child._id}>
                  <button
                    type="button"
                    className={`caregiver-child-select-btn ${shown === child._id ? "caregiver-child-select-btn--active" : ""}`}
                    onClick={() => {
                      setSavedFlash(false);
                      setPickedId(child._id === activeChildId ? null : child._id);
                    }}
                  >
                    {child.name}
                    {shown === child._id && <CheckCircle2 size={14} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="empty-msg-light account-empty-msg--panel">
          the parent hasn't shared any child profiles with you yet.
        </p>
      )}
      {footer}
    </div>
  );
};

export default CaregiverLinkPanel;