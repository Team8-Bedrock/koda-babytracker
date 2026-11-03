// Child list + "create new child" button, used inline in the account settings baby panel.
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { API_URL } from "../../config";
import { AVATARS } from "../../constants/avatars";
import { getCurrentUserId, getSelectedChildForUser, setSelectedChildForUser } from "../../utils/authStorage";
import CharacterHead from "../CharacterHead";

const PUFFS = [0, 60, 120, 180, 240, 300];

const AvatarMoveOverlay = ({ move }) => {
  const from = AVATARS.find((a) => a.id === move.from);
  const to = AVATARS.find((a) => a.id === move.to);
  return (
    <div className="avatar-move" role="status" aria-live="polite">
      <div className="avatar-move__stage">
        <span className="avatar-move__ring" style={{ background: from?.bg }} />
        <span className="avatar-move__ring avatar-move__ring--to" style={{ background: to?.bg }} />
        <span className="avatar-move__head avatar-move__head--from">
          <CharacterHead animal={move.from} size={112} />
        </span>
        {PUFFS.map((deg) => (
          <span key={deg} className="avatar-move__puff" style={{ "--puff-angle": `${deg}deg` }} />
        ))}
        <span className="avatar-move__head avatar-move__head--to">
          <CharacterHead animal={move.to} size={124} />
        </span>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`avatar-move__spark avatar-move__spark--${i}`} />
        ))}
      </div>
      <p className="avatar-move__label">
        <strong>{move.name} moved in!</strong>
        <span>welcome to {to?.habitat || "a new home"}</span>
      </p>
    </div>
  );
};

const ChildProfilePicker = ({ onSelectedChildChange, onCancel }) => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(getSelectedChildForUser());
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [status, setStatus] = useState("");
  const [move, setMove] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/api/children`, { headers: { "x-auth-token": token } })
      .then(async (res) => {
        if (!res.ok) throw new Error("could not load your children.");
        const data = await res.json();
        const childList = Array.isArray(data) ? data : [];
        setChildren(childList);

        const savedChild = getSelectedChildForUser();
        const activeChild = childList.find((child) => child._id === savedChild?._id)
          || childList[0]
          || null;
        if (activeChild) {
          setSelectedChild(activeChild);
          setSelectedAvatar(activeChild.avatar);
          setSelectedChildForUser(activeChild);
          onSelectedChildChange?.(activeChild);
          window.dispatchEvent(new CustomEvent("koda-selected-child-updated", {
            detail: { child: activeChild },
          }));
        }
      })
      .catch(() => setStatus("could not load your children."))
      .finally(() => setLoading(false));
  }, [onSelectedChildChange]);

  const ownsChild = (child) => String(child?.userId || "") === String(getCurrentUserId() || "");

  const selectChild = (child) => {
    setStatus("");
    setSelectedChild(child);
    setSelectedAvatar(child.avatar);
    setSelectedChildForUser(child);
    onSelectedChildChange?.(child);
    window.dispatchEvent(new CustomEvent("koda-selected-child-updated", {
      detail: { child },
    }));
  };

  const saveAvatar = async () => {
    if (!selectedChild || !selectedAvatar || selectedAvatar === selectedChild.avatar) return;

    try {
      setSavingAvatar(true);
      setStatus("");
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${API_URL}/api/children/${selectedChild._id}/avatar`,
        { avatar: selectedAvatar },
        { headers: { "x-auth-token": token } }
      );
      const updatedChild = response.data;
      const fromAvatar = selectedChild.avatar;
      setMove({ from: fromAvatar, to: updatedChild.avatar, name: updatedChild.name });
      timers.current.push(setTimeout(() => setMove(null), 3200));
      setSelectedChild(updatedChild);
      setChildren((current) => current.map((child) => (
        child._id === updatedChild._id ? updatedChild : child
      )));
      setSelectedChildForUser(updatedChild);
      timers.current.push(setTimeout(() => {
        onSelectedChildChange?.(updatedChild);
        window.dispatchEvent(new CustomEvent("koda-selected-child-updated", {
          detail: { child: updatedChild },
        }));
      }, 950));
      setStatus(`${updatedChild.name} moved into ${AVATARS.find((a) => a.id === updatedChild.avatar)?.habitat || "a new home"}!`);
    } catch (error) {
      console.error("Could not update child avatar:", error);
      setStatus(error.response?.data?.msg || "could not update the avatar. please try again.");
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleAddChild = () => {
    navigate("/avatarSelection", { state: { mode: "addChild" } });
  };

  if (loading) return null;

  return (
    <div className="account-baby-panel-body">
      {status && <p className="empty-msg-light account-empty-msg--status">{status}</p>}

      {children.length > 0 ? (
        <>
          {children.length > 1 && (
            <>
              <p className="empty-msg-light account-empty-msg--panel">
                choose which child's settings to change:
              </p>
              <ul className="caregiver-shared-children-list caregiver-shared-children-list--selectable">
                {children.map((child) => (
                  <li key={child._id}>
                    <button
                      type="button"
                      className={`caregiver-child-select-btn ${selectedChild?._id === child._id ? "caregiver-child-select-btn--active" : ""}`}
                      onClick={() => selectChild(child)}
                      disabled={savingAvatar}
                    >
                      {child.name}
                      {selectedChild?._id === child._id && <CheckCircle2 size={14} />}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {selectedChild && (
            <section className="child-avatar-setting" aria-labelledby="child-avatar-setting-title">
              <h3 id="child-avatar-setting-title" className="account-field-label">
                {selectedChild.name}'s avatar
              </h3>
              {ownsChild(selectedChild) ? (
                <>
                  <p className="child-avatar-prompt">who will represent your little one?</p>
                  <div className="child-avatar-options">
                    {AVATARS.map((avatar) => {
                      const chosen = selectedAvatar === avatar.id;
                      const current = selectedChild.avatar === avatar.id;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          className={`child-avatar-option ${chosen ? "child-avatar-option--selected" : ""}`}
                          style={{ "--avatar-bg": avatar.bg, "--avatar-tint": avatar.pageBackground?.[0] || "#a8c0a0" }}
                          onClick={() => { setStatus(""); setSelectedAvatar(avatar.id); }}
                          aria-pressed={chosen}
                          aria-label={`Select ${avatar.id} avatar (${avatar.habitat})`}
                          disabled={savingAvatar}
                        >
                          {current && <em className="child-avatar-option__tag">current</em>}
                          <span className="child-avatar-option__portrait">
                            <CharacterHead animal={avatar.id} size={54} />
                          </span>
                          <span className="child-avatar-option__name">{avatar.id}</span>
                          <small>{avatar.habitat}</small>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="child-avatar-readonly">
                  <span className="child-avatar-option__portrait">
                    <CharacterHead animal={selectedChild.avatar} size={54} />
                  </span>
                  <p className="empty-msg-light">
                    only {selectedChild.name}'s parent can change the avatar.
                  </p>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <p className="empty-msg-light account-empty-msg--panel">
          no child profiles yet. add one to get started.
        </p>
      )}

      <button type="button" className="child-add-btn" onClick={handleAddChild}>
        <PlusCircle size={18} strokeWidth={2.2} aria-hidden="true" />
        <span>create new child</span>
      </button>

      <div className="panel-footer">
        <button type="button" className="account-toggle-link account-toggle-link--bottom panel-footer__cancel" onClick={() => {
          if (selectedChild) setSelectedAvatar(selectedChild.avatar);
          onCancel?.();
        }}>
          cancel
        </button>
        {selectedChild && ownsChild(selectedChild) && (
          <button
            type="button"
            className={`panel-footer__save ${selectedAvatar !== selectedChild.avatar ? "panel-footer__save--ready" : ""}`}
            onClick={saveAvatar}
            disabled={savingAvatar || selectedAvatar === selectedChild.avatar}
          >
            {savingAvatar ? (
              <><span className="panel-footer__spinner" aria-hidden="true" /> saving…</>
            ) : selectedAvatar !== selectedChild.avatar ? `save · ${selectedAvatar}` : "save"}
          </button>
        )}
      </div>

      {move && createPortal(<AvatarMoveOverlay move={move} />, document.body)}
    </div>
  );
};

export default ChildProfilePicker;