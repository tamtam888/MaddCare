function MediaPage() {
  const handleOpenVideoModule = () => {
    window.open("https://maddvideo.vercel.app/patients", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-placeholder">
      <h1 className="page-placeholder-title">Media Workflow</h1>
      <p className="page-placeholder-text">
        This module connects patient intake, video sessions, and visual progress tracking
        as part of the broader clinical workflow.
      </p>

      <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button type="button" className="primary-button" onClick={handleOpenVideoModule}>
          Open Video Module
        </button>
      </div>
    </div>
  );
}

export default MediaPage;