// Child list + "create new child" button, used inline in the account settings baby panel.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { API_URL } from "../../config";
import { getSelectedChildForUser, setSelectedChildForUser } from "../../utils/authStorage";

const ChildProfilePicker = () => {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [activeChildId, setActiveChildId] = useState(getSelectedChildForUser()?._id || null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${API_URL}/api/children`, { headers: { "x-auth-token": token } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setChildren(Array.isArray(data) ? data : []))
      .catch(() => setStatus("could not load your children."))
      .finally(() => setLoading(false));
  }, []);

  const selectChild = (child) => {
    setSelectedChildForUser(child);
    setActiveChildId(child._id);
  };

  const handleAddChild = () => {
    navigate("/avatarSelection", { state: { mode: "addChild" } });
  };

  if (loading) return null;

  return (
    <div className="account-baby-panel-body">
      {status && <p className="empty-msg-light account-empty-msg--status">{status}</p>}

      {children.length > 0 ? (
        <ul className="caregiver-shared-children-list caregiver-shared-children-list--selectable">
          {children.map((child) => (
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
