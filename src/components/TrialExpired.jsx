// src/components/TrialExpired.jsx
// Full-screen overlay shown when a pilot user's 30-day trial has expired.
// Renders on top of the app (z-index 9999) — nothing below is interactive.

import "./TrialExpired.css";

export default function TrialExpired() {
  return (
    <div className="trial-expired-overlay" role="alertdialog" aria-modal="true" aria-labelledby="trial-expired-title">
      <div className="trial-expired-card">
        <div className="trial-expired-icon" aria-hidden="true">⏳</div>
        <h1 id="trial-expired-title" className="trial-expired-title">
          Your Trial Has Ended
        </h1>
        <p className="trial-expired-body">
          Your 30-day trial period has expired. To continue using MedicalCare,
          please contact us to activate your subscription.
        </p>
        <a
          href="mailto:support@medicalcare.app"
          className="trial-expired-btn"
        >
          Contact Us
        </a>
      </div>
    </div>
  );
}
