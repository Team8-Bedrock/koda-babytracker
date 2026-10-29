// Child list + "create new child" button, used inline in the account settings baby panel.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { API_URL } from "../../config";
import { AVATARS } from "../../constants/avatars";
import { getSelectedChildForUser, setSelectedChildForUser } from "../../utils/authStorage";

const ChildProfilePicker = ({ onSelectedChildChange }) => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(getSelectedChildForUser());
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [status, setStatus] = useState("");

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

  const selectChild = (child) => {
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
      setSelectedChild(updatedChild);
      setChildren((current) => current.map((child) => (
        child._id === updatedChild._id ? updatedChild : child
      )));
      setSelectedChildForUser(updatedChild);
      onSelectedChildChange?.(updatedChild);
      window.dispatchEvent(new CustomEvent("koda-selected-child-updated", {
        detail: { child: updatedChild },
      }));
      setStatus(`${updatedChild.name}'s avatar was updated.`);
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
              <div className="child-avatar-options">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    className={`child-avatar-option ${selectedAvatar === avatar.id ? "child-avatar-option--selected" : ""}`}
                    onClick={() => setSelectedAvatar(avatar.id)}
                    aria-pressed={selectedAvatar === avatar.id}
                    aria-label={`Select ${avatar.id} avatar (${avatar.habitat})`}
                    disabled={savingAvatar}
                  >
                    <span>{avatar.id}</span>
                    <small>{avatar.habitat}</small>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="glass-card save-btn-card"
                onClick={saveAvatar}
                disabled={savingAvatar || selectedAvatar === selectedChild.avatar}
              >
                <span>{savingAvatar ? "saving…" : "save avatar"}</span>
              </button>
            </section>
          )}
        </>
      ) : (
        <p className="empty-msg-light account-empty-msg--panel">
          no child profiles yet. add one to get started.
        </p>
      )}

      <button type="button" className="glass-card save-btn-card" onClick={handleAddChild}>
        <PlusCircle size={20} />
        <span>create new child</span>
      </button>
    </div>
  );
};

export default ChildProfilePicker;
