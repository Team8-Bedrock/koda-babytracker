//base for the activities and caregivers dashboard modals.

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import "../../styling/components/modals.css";

const HabitatModal = ({ title, icon: Icon, onClose, children, className = "" }) => {
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className={`hm-reopen-btn ${className}`}
        onClick={() => setIsOpen(true)}
        aria-label={`Open ${title}`}
      >
        {Icon && <Icon size={18} strokeWidth={2} />}
        <span>{title}</span>
      </button>
    );
  }

  return (
    <aside className={`hm-panel ${className}`} aria-label={title}>
      <div className="hm-header">
        <div className="hm-title-group">
          {Icon && <Icon size={20} strokeWidth={2} />}
          <h2 className="hm-title">{title}</h2>
        </div>
        <button
          type="button"
          className="hm-close-btn"
          onClick={handleClose}
          aria-label={`Close ${title}`}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
      <div className="hm-body">{children}</div>
    </aside>
  );
};

export default HabitatModal;