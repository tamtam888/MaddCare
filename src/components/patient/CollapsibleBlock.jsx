import { useId, useState } from "react";

export default function CollapsibleBlock({
  title,
  subtitle = "",
  defaultOpen = false,
  children,
}) {
  const rid = useId();
  const panelId = `pd_panel_${String(rid).replace(/:/g, "")}`;
  const btnId = `pd_btn_${String(rid).replace(/:/g, "")}`;
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <div className="pd-card">
      <button
        id={btnId}
        type="button"
        className="pd-header-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open ? "true" : "false"}
        aria-controls={panelId}
      >
        <span className="pd-header-left">
          <span className="pd-title">{title}</span>
          {subtitle ? <span className="pd-subtitle">{subtitle}</span> : null}
        </span>
        <span className={`pd-chevron ${open ? "open" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className={`pd-panel ${open ? "open" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}
