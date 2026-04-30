import React, { useCallback, useEffect, useRef, useState } from "react";
import "./PatientDocuments.css";
import { useLanguage } from "../i18n/LanguageContext";
import {
  addDocument,
  deleteDocument,
  getDocumentBlob,
  inferDocKind,
  isSupportedDocumentFile,
  listDocuments,
} from "../services/documentsStore";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function kindLabel(kind) {
  if (kind === "pdf") return "PDF";
  if (kind === "image") return "Image";
  if (kind === "docx") return "DOCX";
  return "File";
}

function kindIcon(kind) {
  if (kind === "pdf") return "📄";
  if (kind === "image") return "🖼️";
  if (kind === "docx") return "📝";
  return "📎";
}

function DocPreviewModal({ doc, onClose }) {
  const [url, setUrl] = useState(null);
  const kind = inferDocKind(doc);
  const { t } = useLanguage();

  useEffect(() => {
    let objectUrl = null;

    if (kind === "image" || kind === "pdf") {
      getDocumentBlob(doc.id).then((blob) => {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      });
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, kind]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="doc-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview: ${doc.filename}`}
    >
      <div className="doc-modal-backdrop" onClick={onClose} />

      <div className="doc-modal-box">
        <div className="doc-modal-header">
          <span className="doc-modal-title">{doc.filename}</span>
          <button
            type="button"
            className="doc-modal-close"
            onClick={onClose}
            aria-label={t('closePreview')}
          >
            ✕
          </button>
        </div>

        <div className="doc-modal-body">
          {kind === "image" && url && (
            <img className="doc-modal-img" src={url} alt={doc.filename} />
          )}

          {kind === "pdf" && url && (
            <iframe
              className="doc-modal-iframe"
              title={doc.filename}
              src={url}
            />
          )}

          {(kind === "docx" || kind === "file") && (
            <p className="doc-modal-unavailable">
              {t('previewNotAvailable')}
            </p>
          )}

          {(kind === "image" || kind === "pdf") && !url && (
            <p className="doc-modal-loading">Loading…</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientDocuments({ patientKey }) {
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const fileInputRef = useRef(null);
  const { t } = useLanguage();

  const refresh = useCallback(() => {
    if (!patientKey) return;
    listDocuments(patientKey).then(setDocs);
  }, [patientKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    if (!isSupportedDocumentFile(file)) {
      setError(t('unsupportedFileType'));
      return;
    }

    setError("");
    setUploading(true);
    try {
      await addDocument(patientKey, file);
      refresh();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    const ok = window.confirm(t('deleteDocumentConfirm'));
    if (!ok) return;
    await deleteDocument(docId);
    refresh();
  };

  const handleDownload = async (doc) => {
    const blob = await getDocumentBlob(doc.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!patientKey) {
    return (
      <div className="doc-surface">
        <p className="doc-empty">
          {t('syncPatientForDocuments')}
        </p>
      </div>
    );
  }

  return (
    <div className="doc-surface">
      <div className="doc-toolbar">
        <label className="doc-upload-btn">
          {uploading ? t('uploading') : t('uploadDocument')}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="doc-hidden-input"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {error && <p className="doc-error">{error}</p>}

      {docs.length === 0 ? (
        <p className="doc-empty">{t('noDocuments')}</p>
      ) : (
        <ul className="doc-list">
          {docs.map((doc) => {
            const kind = inferDocKind(doc);
            return (
              <li key={doc.id} className="doc-item">
                <div className="doc-item-left">
                  <span className="doc-item-icon" aria-hidden="true">
                    {kindIcon(kind)}
                  </span>
                  <div className="doc-item-info">
                    <span className="doc-item-name">{doc.filename}</span>
                    <span className="doc-item-meta">
                      {kindLabel(kind)} · {formatBytes(doc.size)} ·{" "}
                      {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="doc-item-actions">
                  <button
                    type="button"
                    className="doc-action-btn"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    {t('preview')}
                  </button>

                  <button
                    type="button"
                    className="doc-action-btn"
                    onClick={() => handleDownload(doc)}
                  >
                    Download
                  </button>

                  <button
                    type="button"
                    className="doc-action-btn doc-action-btn-danger"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {previewDoc && (
        <DocPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
