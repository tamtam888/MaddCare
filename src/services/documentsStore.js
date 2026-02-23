const DB_NAME = "medicalcare_documents_v1";
const DB_VERSION = 1;
const STORE_DOCS = "documents";
const STORE_BLOBS = "document_blobs";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        const store = db.createObjectStore(STORE_DOCS, { keyPath: "id" });
        store.createIndex("patientKey", "patientKey", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "id" });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function isSupportedDocumentFile(file) {
  return SUPPORTED_MIME_TYPES.has(file?.type);
}

export function inferDocKind(meta) {
  const mime = String(meta?.mimeType || "").toLowerCase();
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  return "file";
}

export async function listDocuments(patientKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DOCS, "readonly");
    const index = tx.objectStore(STORE_DOCS).index("patientKey");
    const req = index.getAll(patientKey);
    req.onsuccess = (e) => {
      const rows = (e.target.result || []).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      resolve(rows);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function addDocument(patientKey, file) {
  const id = crypto.randomUUID();
  const meta = {
    id,
    patientKey,
    filename: file.name,
    mimeType: file.type,
    size: file.size,
    createdAt: new Date().toISOString(),
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DOCS, STORE_BLOBS], "readwrite");
    tx.oncomplete = () => resolve(meta);
    tx.onerror = (e) => reject(e.target.error);

    tx.objectStore(STORE_DOCS).add(meta);
    tx.objectStore(STORE_BLOBS).add({ id, blob: file });
  });
}

export async function deleteDocument(docId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_DOCS, STORE_BLOBS], "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);

    tx.objectStore(STORE_DOCS).delete(docId);
    tx.objectStore(STORE_BLOBS).delete(docId);
  });
}

export async function getDocumentBlob(docId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readonly");
    const req = tx.objectStore(STORE_BLOBS).get(docId);
    req.onsuccess = (e) => resolve(e.target.result?.blob ?? null);
    req.onerror = (e) => reject(e.target.error);
  });
}
