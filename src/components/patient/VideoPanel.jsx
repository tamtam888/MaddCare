import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function VideoPanel({ open, src, title = "Media", onClose }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open) setLoaded(false);
  }, [open, src]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="mc-media-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="mc-media-backdrop" onClick={() => onClose?.()} />

      <div className="mc-media-drawer" role="document">
        <div className="mc-media-drawer-header">
          <div className="mc-media-drawer-title">{title}</div>
          <button
            type="button"
            className="patients-toolbar-button mc-media-close-btn"
            onClick={() => onClose?.()}
          >
            <span className="patients-toolbar-button-icon">
              <X size={16} />
            </span>
            <span>Close</span>
          </button>
        </div>

        <div className="mc-media-drawer-body">
          {!loaded ? <div className="mc-media-loading">Loading…</div> : null}

          <iframe
            className={`mc-media-iframe ${loaded ? "loaded" : ""}`}
            title={title}
            src={src}
            onLoad={() => setLoaded(true)}
            allow="camera; microphone; clipboard-read; clipboard-write"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
