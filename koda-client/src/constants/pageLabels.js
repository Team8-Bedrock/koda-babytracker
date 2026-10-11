export const PAGE_LABELS = {
  "/parentdashboard": "",
  "/add-activity": "log activity",
  "/history": "log history",
  "/full-log": "full log",
  "/analytics": "analytics",
  "/chat": "chat",
  "/account": "settings",
};

export const getPageLabel = (pathname, name) => {
  const suffix = PAGE_LABELS[pathname.toLowerCase()];
  if (suffix === undefined) return name;
  return suffix ? `${name}'s ${suffix}` : name;
};

export const getPillFontSize = (label) => {
  if (label.length <= 10) return 19;
  if (label.length <= 16) return 15;
  if (label.length <= 22) return 12;
  return 10;
};
