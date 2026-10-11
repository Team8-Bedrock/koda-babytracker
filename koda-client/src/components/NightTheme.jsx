import { useLayoutEffect } from "react";

const CSS = `
html.koda-night body { background: #2a3560 !important; color: #e8e6ff; }
html.koda-night .layout-header,
html.koda-night .layout-bottom-nav {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
html.koda-night .layout-bottom-nav button,
html.koda-night .layout-bottom-nav svg,
html.koda-night .header-bell-btn,
html.koda-night .header-bell-btn svg { color: #27305a !important; }
html.koda-night .name-dropdown-btn,
html.koda-night .child-switcher-menu {
  background: #e4e7ff !important;
  color: #27305a !important;
  border-color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .glass-card,
html.koda-night .glass-card--translucent,
html.koda-night .activities-glass-card,
html.koda-night .setup-card,
html.koda-night .account-expanded-card,
html.koda-night .account-menu-btn,
html.koda-night .hm-list-item,
html.koda-night .history-quick-stat-card,
html.koda-night .analytics-trend-card,
html.koda-night .caregiver-link-panel,
html.koda-night .duplicate-dialog,
html.koda-night .log-form-container,
html.koda-night .koda-sky-card + * {
  background: rgba(64, 76, 130, 0.9) !important;
  color: #ece9ff !important;
  border-color: rgba(160, 170, 235, 0.28) !important;
  box-shadow: 0 10px 26px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .setup-container { background: transparent !important; }
html.koda-night .log-form-title,
html.koda-night .setup-title,
html.koda-night .hm-title,
html.koda-night .card-header,
html.koda-night .account-menu-label,
html.koda-night .history-quick-stat-value,
html.koda-night .analytics-trend-value { color: #fff3c4 !important; }
html.koda-night .log-label,
html.koda-night .log-form-subtitle,
html.koda-night .account-field-label,
html.koda-night .setup-sub,
html.koda-night .empty-msg-light,
html.koda-night .account-empty-msg,
html.koda-night .hm-empty,
html.koda-night .history-quick-stat-label,
html.koda-night .analytics-trend-label,
html.koda-night .legend-row,
html.koda-night .account-menu-icon,
html.koda-night .account-menu-chevron { color: #c9c6ef !important; }
html.koda-night .log-input,
html.koda-night .log-input-wrapper,
html.koda-night .activity-input,
html.koda-night .account-field-input,
html.koda-night .setup-field input,
html.koda-night .setup-field select,
html.koda-night input,
html.koda-night select,
html.koda-night textarea {
  background: #34407a !important;
  color: #f3efff !important;
  border-color: rgba(160, 170, 235, 0.35) !important;
}
html.koda-night input::placeholder,
html.koda-night textarea::placeholder { color: #b4b1de !important; }
html.koda-night .log-option-row button,
html.koda-night .activities-option-row button,
html.koda-night .activity-menu-btn,
html.koda-night .hm-secondary-btn,
html.koda-night .activities-cancel-btn,
html.koda-night .schedule-days-row button,
html.koda-night .account-toggle-link {
  background: #4a5794 !important;
  color: #ece9ff !important;
  border-color: rgba(170, 180, 240, 0.35) !important;
}
html.koda-night .setup-btn-primary,
html.koda-night .save-btn-card,
html.koda-night .hm-submit-btn,
html.koda-night .btn-leaf,
html.koda-night .koda-logout-pill {
  background: linear-gradient(135deg, #5e7fd6, #7b6fd1) !important;
  color: #ffffff !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
  box-shadow: 0 8px 20px rgba(10, 14, 40, 0.3) !important;
}
html.koda-night .hm-link-btn,
html.koda-night .hm-inline-link { color: #f4d77a !important; }

html.koda-night { color-scheme: dark; }
/* round nav/header buttons + name pill: soft night glass, matches the bars */
html.koda-night .layout-bottom-nav button,
html.koda-night .layout-header button:not(.layout-logo-btn),
html.koda-night .header-bell-btn,
html.koda-night .layout-name-pill-static,
html.koda-night .koda-night-surface {
  background: #e4e7ff !important;
  color: #27305a !important;
  border-color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .name-dropdown-btn svg { color: #27305a !important; }
html.koda-night .child-switcher-item { background: transparent !important; color: #27305a !important; }
html.koda-night .child-switcher-item--active { background: #ccd2fb !important; }
html.koda-night .child-switcher-empty { color: #4a5384 !important; }
html.koda-night .layout-logo-btn { background: transparent !important; box-shadow: none !important; }
html.koda-night :focus-visible { outline: 2px solid #f4d77a !important; outline-offset: 2px !important; }


/* any heading on a page = soft yellow, any icon that was hard-coded green/brown = soft yellow */
html.koda-night .layout-mobile-frame :is(h1, h2, h3, h4),
html.koda-night .history-section-title,
html.koda-night [class*="collapsible"] [class*="title"] { color: #fff3c4 !important; }
html.koda-night svg[stroke="#315b3d"],
html.koda-night svg[stroke="#2f5a3a"],
html.koda-night svg[stroke="#4a3a26"],
html.koda-night svg[stroke="#5a4635"] { stroke: #f4d77a !important; }

/* collapsible cards (history + analytics): "show more / show less" links */
html.koda-night [class*="collapsible"] button { color: #f4d77a !important; background: transparent !important; }

html.koda-night .hm-sticker-stack > * {
  background: rgba(64, 76, 130, 0.92) !important;
  color: #ece9ff !important;
  border-color: rgba(160, 170, 235, 0.28) !important;
  box-shadow: 0 10px 26px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .hm-sticker-stack > * button:not(.hm-link-btn):not(.hm-inline-link) {
  background: #e4e7ff !important;
  color: #27305a !important;
}
/* clipboard + other icons in the card turn soft yellow (buttons keep their navy icons) */
html.koda-night .hm-sticker-stack > * svg { color: #f4d77a !important; stroke: #f4d77a !important; }
html.koda-night .hm-sticker-stack > * button:not(.hm-link-btn):not(.hm-inline-link) svg {
  color: #27305a !important;
  stroke: #27305a !important;
}
html.koda-night .dashboard-corner-btn {
  background: #e4e7ff !important;
  color: #27305a !important;
  border-color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .dashboard-corner-btn svg { color: #27305a !important; stroke: #27305a !important; }
html.koda-night .offline-save-notice {
  background: rgba(64, 76, 130, 0.95) !important;
  color: #ece9ff !important;
  border-color: rgba(160, 170, 235, 0.28) !important;
}
html.koda-night .offline-save-notice button { color: #f4d77a !important; background: transparent !important; }

html.koda-night .account-menu-icon {
  background: #56649f !important;
  color: #f4e3a6 !important;
}
html.koda-night .account-menu-icon svg { color: #f4e3a6 !important; }

html.koda-night .history-segmented-wrap {
  background: rgba(64, 76, 130, 0.85) !important;
  border-color: rgba(160, 170, 235, 0.28) !important;
}
html.koda-night .history-segment-btn { background: transparent !important; color: #c9c6ef !important; }
html.koda-night .history-segment-btn[data-active="true"] { background: #e4e7ff !important; color: #27305a !important; }
html.koda-night .history-item {
  background: rgba(56, 68, 120, 0.9) !important;
  color: #ece9ff !important;
  border-color: rgba(160, 170, 235, 0.22) !important;
}
html.koda-night .analytics-insight-bullet { background: #f4d77a !important; }
html.koda-night .legend-row-percent { color: #ece9ff !important; }
html.koda-night .recharts-cartesian-axis-tick-value,
html.koda-night .recharts-label,
html.koda-night .recharts-label-list text { fill: #c9c6ef !important; }
html.koda-night .recharts-cartesian-axis-line,
html.koda-night .recharts-cartesian-axis-tick-line { stroke: rgba(201, 198, 239, 0.4) !important; }
html.koda-night .recharts-default-tooltip {
  background: #34407a !important;
  border-color: rgba(160, 170, 235, 0.35) !important;
  color: #ece9ff !important;
}

html.koda-night .log-option-btn,
html.koda-night .schedule-day-btn {
  background: #4a5794 !important;
  color: #ece9ff !important;
  border-color: rgba(170, 180, 240, 0.35) !important;
}
html.koda-night .log-option-btn.selected,
html.koda-night .schedule-day-btn.selected { background: #e4e7ff !important; color: #27305a !important; }
html.koda-night .sleep-warning {
  background: rgba(120, 60, 70, 0.55) !important;
  color: #ffe1e1 !important;
  border-color: rgba(255, 170, 170, 0.4) !important;
}
html.koda-night .duplicate-dialog h2 { color: #fff3c4 !important; }
html.koda-night .duplicate-details { background: rgba(56, 68, 120, 0.9) !important; color: #ece9ff !important; }
html.koda-night .duplicate-actions button { background: #4a5794 !important; color: #ece9ff !important; }
html.koda-night .duplicate-actions button:first-child { background: linear-gradient(135deg, #5e7fd6, #7b6fd1) !important; color: #fff !important; }
html.koda-night .duplicate-error { color: #ffc4c4 !important; }

html.koda-night .chat-page { background: transparent !important; }
html.koda-night .chat-panel {
  background: rgba(64, 76, 130, 0.9) !important;
  color: #ece9ff !important;
  border-color: rgba(160, 170, 235, 0.28) !important;
  box-shadow: 0 10px 26px rgba(10, 14, 40, 0.25) !important;
}
html.koda-night .chat-panel-header {
  background: rgba(56, 68, 120, 0.95) !important;
  border-color: rgba(160, 170, 235, 0.22) !important;
}
html.koda-night .chat-panel-header h1 { color: #fff3c4 !important; }
html.koda-night .chat-messages { background: transparent !important; }
html.koda-night .chat-empty { color: #c9c6ef !important; }
html.koda-night .chat-message {
  background: #4a5794 !important;
  color: #ece9ff !important;
  border-color: rgba(170, 180, 240, 0.25) !important;
}
html.koda-night .chat-message--mine { background: #6170b8 !important; color: #ffffff !important; }
html.koda-night .chat-message time { color: #c9c6ef !important; }
html.koda-night .chat-urgent-label { color: #ffd479 !important; }
html.koda-night .chat-composer {
  background: rgba(56, 68, 120, 0.95) !important;
  border-color: rgba(160, 170, 235, 0.22) !important;
}
html.koda-night .chat-tool-button { background: transparent !important; color: #f4e3a6 !important; }
html.koda-night .chat-tool-button svg { color: #f4e3a6 !important; }
html.koda-night .chat-urgent-toggle--active { background: rgba(255, 212, 121, 0.2) !important; }
html.koda-night .chat-send-button { background: #e4e7ff !important; color: #27305a !important; }
html.koda-night .chat-send-button:disabled { background: #56649f !important; color: #b0b6dc !important; }
html.koda-night .chat-pinned-urgent {
  background: rgba(120, 90, 40, 0.55) !important;
  color: #fff3c4 !important;
  border-color: rgba(255, 212, 121, 0.4) !important;
}
html.koda-night .chat-pinned-urgent button { background: #e4e7ff !important; color: #27305a !important; }
html.koda-night .chat-error,
html.koda-night .chat-attachment-error { color: #ffc4c4 !important; }
`;

export function applyNight(on) {
  document.documentElement.classList.toggle("koda-night", on);
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  if (!meta.dataset.dayColor) meta.dataset.dayColor = meta.content || "#f6f0e1";
  meta.content = on ? "#2a3560" : meta.dataset.dayColor;
}

export default function NightTheme() {
  useLayoutEffect(() => {
    let tag = document.getElementById("koda-night-style");
    if (!tag) {
      tag = document.createElement("style");
      tag.id = "koda-night-style";
      document.head.appendChild(tag);
    }
    tag.textContent = CSS;
    const sync = () => applyNight(localStorage.getItem("koda-dark-mode") === "true");
    const onEvent = (e) => {
      if (e && e.detail && typeof e.detail.isDarkMode === "boolean") applyNight(e.detail.isDarkMode);
      else sync();
    };
    sync();
    window.addEventListener("koda-dark-mode", onEvent);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("koda-dark-mode", onEvent);
      window.removeEventListener("storage", sync);
      applyNight(false);
    };
  }, []);
  return null;
}