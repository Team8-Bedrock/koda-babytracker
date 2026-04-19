import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PencilLine } from "lucide-react";
import "./accountSettings.css";
import {
  getSelectedChildForUser,
  setSelectedChildForUser,
} from "../utils/authStorage";

const AVATARS = ["🐻", "🦊", "🐼", "🐨", "🐸", "🦁", "🐰", "🐮", "🦋"];

const AccountSettings = () => {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState("🐻");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [other, setOther] = useState("");
  const [moodExplanation, setMoodExplanation] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const applyChildProfile = (profile) => {
    if (!profile) return;

    setChild(profile);
    setName(profile.name || "");
    setDob(profile.dob || "");
    setAvatar(profile.avatar || "🐻");
    setWeight(profile.weight || "");
    setAllergies(profile.allergies || "");
    setOther(profile.other || "");
    setMoodExplanation(profile.moodExplanation || "");
  };

  const ageLabel = useMemo(() => {
    if (!dob) return "Age not set";

    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "Age not set";

    const now = new Date();
    let months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
    if (now.getDate() < birthDate.getDate()) {
      months -= 1;
    }

    if (months < 0) return "Age not set";

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return `${years > 0 ? `${years} year${years === 1 ? "" : "s"} ` : ""}${remainingMonths} month${remainingMonths === 1 ? "" : "s"} old`;
  }, [dob]);

  useEffect(() => {
    const loadChild = async () => {
      try {
        const parsedChild = getSelectedChildForUser();
        const legacyChildRaw = localStorage.getItem("selectedChild");
        const legacyChild = legacyChildRaw ? JSON.parse(legacyChildRaw) : null;

        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const token = localStorage.getItem("token");

        if (token) {
          const response = await fetch(`${apiUrl}/api/children`, {
            headers: {
              "x-auth-token": token,
            },
          });

          if (response.ok) {
            const children = await response.json();
            const matchedChild =
              children.find((item) => item._id === parsedChild?._id) ||
              children.find((item) => item._id === legacyChild?._id) ||
              children[0] ||
              parsedChild ||
              legacyChild;

            if (matchedChild) {
              applyChildProfile(matchedChild);
              setSelectedChildForUser(matchedChild);
            } else {
              setMessage("No baby profile found yet.");
            }
          } else if (parsedChild || legacyChild) {
            applyChildProfile(parsedChild || legacyChild);
          }
        } else if (parsedChild || legacyChild) {
          applyChildProfile(parsedChild || legacyChild);
        } else {
          setMessage("No baby profile found yet.");
        }
      } catch (error) {
        console.error("Could not load child profile:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChild();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();

    if (!child?._id) {
      setMessage("No baby profile found to update.");
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");

      const response = await fetch(`${apiUrl}/api/children/${child._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({ name, dob, avatar, weight, allergies, other, moodExplanation }),
      });

      const updatedChild = await response.json();

      if (!response.ok) {
        setMessage(updatedChild.msg || updatedChild.error || "Could not save profile changes.");
        return;
      }

      setSelectedChildForUser(updatedChild);
      setChild(updatedChild);
      setIsEditing(false);
      setMessage("Baby profile updated.");
    } catch (error) {
      console.error("Could not save child profile:", error);
      setMessage("Could not save profile changes.");
    }
  };

  return (
    <div className="account-settings-page">
      <div className="account-settings-shell">
        <button className="account-back-button" onClick={() => navigate("/ParentDashboard")} type="button">
          <ChevronLeft size={18} /> back
        </button>

        <header className="account-settings-header">
          <p className="account-settings-kicker">Account settings</p>
          <h1>Baby profile</h1>
          <p className="account-settings-subtitle">
            Update the child profile the parent created from the account page.
          </p>
        </header>

        {loading ? (
          <div className="account-settings-card">Loading profile...</div>
        ) : (
          <div className="profile-stack">
            <form className="account-settings-card profile-card" onSubmit={handleSave}>
              <button
                type="button"
                className="profile-edit-button"
                onClick={() => setIsEditing((current) => !current)}
                aria-label={isEditing ? "Close profile editor" : "Edit baby profile"}
              >
                <PencilLine size={18} />
              </button>

              <div className="profile-preview">
                <div className="profile-avatar">{avatar}</div>
                <div>
                  <p className="profile-label">{name || "Baby profile"}</p>
                  <h2>{ageLabel}</h2>
                </div>
              </div>

              <div className="profile-grid">
                <div>
                  <p className="profile-meta-label">birthday</p>
                  <p className="profile-meta-value">{dob ? new Date(dob).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "n/a"}</p>
                </div>
                <div>
                  <p className="profile-meta-label">weight</p>
                  <p className="profile-meta-value">{weight || "n/a"}</p>
                </div>
                <div>
                  <p className="profile-meta-label">allergies</p>
                  <p className="profile-meta-value">{allergies || "n/a"}</p>
                </div>
                <div>
                  <p className="profile-meta-label">other</p>
                  <p className="profile-meta-value">{other || "n/a"}</p>
                </div>
              </div>

              {isEditing && (
                <div className="profile-editor">
                  <label className="settings-field compact">
                    <span>Baby name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Gracie" />
                  </label>

                  <label className="settings-field compact">
                    <span>Date of birth</span>
                    <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} />
                  </label>

                  <label className="settings-field compact">
                    <span>Weight</span>
                    <input value={weight} onChange={(event) => setWeight(event.target.value)} placeholder="e.g. 13.7 pounds" />
                  </label>

                  <label className="settings-field compact">
                    <span>Allergies</span>
                    <input value={allergies} onChange={(event) => setAllergies(event.target.value)} placeholder="e.g. n/a" />
                  </label>

                  <label className="settings-field compact">
                    <span>Other</span>
                    <input value={other} onChange={(event) => setOther(event.target.value)} placeholder="e.g. n/a" />
                  </label>

                  <label className="settings-field compact">
                    <span>Mood explanation</span>
                    <textarea value={moodExplanation} onChange={(event) => setMoodExplanation(event.target.value)} placeholder="How the baby has been feeling lately" rows="3" />
                  </label>

                  <div className="settings-field compact">
                    <span>Avatar</span>
                    <div className="avatar-picker">
                      {AVATARS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`avatar-option${avatar === option ? " selected" : ""}`}
                          onClick={() => setAvatar(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button className="save-profile-button" type="submit">
                    Save changes
                  </button>
                </div>
              )}

              {message && <p className="settings-message">{message}</p>}
            </form>

            <div className="account-settings-card mood-card">
              <p className="profile-label">mood explanation</p>
              <p className="mood-copy">{moodExplanation || "No mood note added yet."}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountSettings;