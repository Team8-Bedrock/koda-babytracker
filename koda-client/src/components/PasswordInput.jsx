// Password textfield with a show/hide toggle, styled to match the setup-field inputs.
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const PasswordInput = ({ id, value, onChange, placeholder, autoComplete }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="setup-password-wrap">
      <input
        id={id}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="setup-password-toggle"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
