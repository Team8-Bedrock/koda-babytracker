// circle icon button used in the header and bottom nav bar

import React from "react";
import "../styling/components/navIconButton.css";

const NavIconButton = ({ icon: Icon, size = 22, strokeWidth = 1.8, onClick, className = "", ...props }) => (
  <button type="button" className={`nav-icon-btn ${className}`} onClick={onClick} {...props}>
    <Icon size={size} strokeWidth={strokeWidth} color="#2c2c2c" />
  </button>
);

export default NavIconButton;
