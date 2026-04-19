// src/components/RecordAudio.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./RecordAudio.css";
import { saveAudioBlob, deleteAudioBlob } from "../utils/audioStorage";

function pickMimeType() {
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
  return types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
}

/**
 * Returns the AI server base URL.
 * - In dev (import.meta.env.DEV): falls back to localhost:3001 if env var not set.
 * - In production: returns null when VITE_AI_SERVER_URL is not configured so the
 *   caller can show a clear "AI unavailable" message instead of failing silently.
 */
function getAiServerUrl() {
  const envUrl = import.meta.env.VITE_AI_SERVER_URL;
  if (envUrl) return String(envUrl).replace(/\/$/, "");
  if (import.meta.env.DEV) return "http://localhost:3001";
  return null; // production with no AI server configured
}

/** Simple local formatter used only when the AI server is unavailable. */
function improveTranscriptionLocal(text) {
  if (!text) return "";
  let result = text.trim().replace(/\s+/g, " ");
  if (!/[.!?]$/.test(result)) result += ".";
  return `Clinical summary: ${result.charAt(0).toUpperCase()}${result.slice(1)}`;
}

/**
 * Calls the AI server to improve a clinical visit note.
 * Throws:
 *   - "AI_UNAVAILABLE"  — server not configured (production, no env var)
 *   - AbortError        — request was cancelled by the caller or timed out
 *   - Error(message)    — server returned an error or empty response
 */
async function improveTranscriptionViaServer(text, { signal } = {}) {
  const baseUrl = getAiServerUrl();
  if (!baseUrl) {
    const err = new Error("AI_UNAVAILABLE");
    err.code = "AI_UNAVAILABLE";
    throw err;
  }

  // 15-second hard timeout so the UI never hangs
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 15_000);

  // Forward the caller's abort signal to the timeout controller
  if (signal) {
    signal.addEventListener("abort", () => timeoutController.abort(), { once: true });
  }

  try {
    const res = await fetch(`${baseUrl}/api/ai/improve-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: timeoutController.signal,
    });

    if (!res.ok) {
      let extra = "";
      try { extra = await res.text(); } catch { /* ignore */ }
      throw new Error(`AI server error (${res.status})${extra ? `: ${extra}` : ""}`);
    }

    const data = await res.json().catch(() => ({}));
    const out = data?.text ?? data?.improvedText ?? data?.result;
    if (typeof out !== "string" || !out.trim()) {
      throw new Error("AI returned an empty response");
    }
    return out.trim();
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function RecordAudio({ selectedPatient, onSaveTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const [audioId, setAudioId] = useState(null);
  const [audioURL, setAudioURL] = useState("");
  const [transcription, setTranscription] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioPreviewUrlRef = useRef("");
  const dictationWantedRef = useRef(false);
  const improveAbortRef = useRef(null);

  const canUseSpeechRecognition =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const patientKey = useMemo(() => {
    if (!selectedPatient) return null;
    return selectedPatient.idNumber || selectedPatient.id || selectedPatient.identifier || null;
  }, [selectedPatient]);

  useEffect(() => {
    return () => {
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      try { mediaRecorderRef.current?.stream?.getTracks?.().forEach((t) => t.stop()); } catch { /* ignore */ }
      try {
        dictationWantedRef.current = false;
        recognitionRef.current?.stop();
      } catch { /* ignore */ }
      if (audioPreviewUrlRef.current) {
        try { URL.revokeObjectURL(audioPreviewUrlRef.current); } catch { /* ignore */ }
        audioPreviewUrlRef.current = "";
      }
      try { improveAbortRef.current?.abort?.(); } catch { /* ignore */ }
    };
  }, []);

  const resetDraftUIOnly = () => {
    if (audioPreviewUrlRef.current) {
      try { URL.revokeObjectURL(audioPreviewUrlRef.current); } catch { /* ignore */ }
      audioPreviewUrlRef.current = "";
    }
    setAudioURL("");
    setAudioId(null);
    setTranscription("");
    setStatusMessage("");
  };

  const stopDictationIfRunning = () => {
    if (!isDictating) return;
    dictationWantedRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setIsDictating(false);
  };

  const handleStartRecording = async () => {
    if (!selectedPatient || isRecording) return;

    stopDictationIfRunning();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        audioChunksRef.current = [];

        if (!blob || blob.size < 1024) {
          console.error("Recorded blob is empty/small:", blob?.size, blob?.type);
          setStatusMessage("Recording failed — audio was empty. Please try again.");
          return;
        }

        const id =
          crypto?.randomUUID?.() ?? `a_${Date.now()}_${Math.random().toString(16).slice(2)}`;

        await saveAudioBlob(id, blob);

        if (audioPreviewUrlRef.current) {
          try { URL.revokeObjectURL(audioPreviewUrlRef.current); } catch { /* ignore */ }
          audioPreviewUrlRef.current = "";
        }

        const url = URL.createObjectURL(blob);
        audioPreviewUrlRef.current = url;

        setAudioId(id);
        setAudioURL(url);
        setStatusMessage(`Recording saved (${Math.round(blob.size / 1024)} KB).`);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      setIsRecording(true);
      setStatusMessage("Recording in progress...");
    } catch (error) {
      console.error("Microphone error:", error);
      alert("Could not access microphone. Please allow microphone permissions and try again.");
      setStatusMessage("Microphone access failed.");
    }
  };

  const handleStopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;

    try {
      try { rec.requestData(); } catch { /* ignore */ }

      setTimeout(() => {
        try { rec.stop(); } catch { /* ignore */ }
        try { rec.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
        mediaRecorderRef.current = null;
        setIsRecording(false);
      }, 200);
    } catch {
      mediaRecorderRef.current = null;
      setIsRecording(false);
    }
  };

  const handleToggleDictation = () => {
    if (!canUseSpeechRecognition || !selectedPatient) return;

    if (isDictating) {
      dictationWantedRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setIsDictating(false);
      setStatusMessage("Dictation stopped.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const r = event.results[i];
        if (r.isFinal) chunk += ` ${r[0].transcript}`;
      }
      if (chunk.trim()) {
        setTranscription((prev) => `${(prev || "").trim()} ${chunk.trim()}`.trim());
      }
    };

    recognition.onerror = (event) => {
      console.error("SpeechRecognition error:", event?.error, event);
      dictationWantedRef.current = false;
      setIsDictating(false);
      setStatusMessage(`Dictation error${event?.error ? `: ${event.error}` : ". Please try again."}`);
    };

    recognition.onend = () => {
      if (dictationWantedRef.current) {
        try {
          recognition.start();
          return;
        } catch (e) {
          console.error("SpeechRecognition restart failed:", e);
          dictationWantedRef.current = false;
        }
      }
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    dictationWantedRef.current = true;

    try {
      recognition.start();
      setIsDictating(true);
      setStatusMessage("Dictation in progress...");
    } catch (e) {
      console.error("SpeechRecognition start failed:", e);
      dictationWantedRef.current = false;
      setIsDictating(false);
      setStatusMessage("Could not start dictation. Please try again.");
    }
  };

  const handleImprove = async () => {
    const t = (transcription || "").trim();
    if (!t || isImproving) return;

    setIsImproving(true);
    setStatusMessage("Improving with AI...");

    try {
      // Cancel any in-flight request before starting a new one
      try { improveAbortRef.current?.abort?.(); } catch { /* ignore */ }
      const controller = new AbortController();
      improveAbortRef.current = controller;

      let improvedText = "";
      try {
        improvedText = await improveTranscriptionViaServer(t, { signal: controller.signal });
        setStatusMessage("Improved with AI.");
      } catch (err) {
        // User navigated away or cancelled — do not update anything
        if (err.name === "AbortError") {
          setStatusMessage("");
          setIsImproving(false);
          return;
        }

        // Production with no AI server configured
        if (err.code === "AI_UNAVAILABLE") {
          improvedText = improveTranscriptionLocal(t);
          setStatusMessage("AI not configured — text formatted locally.");
        } else {
          // Server reachable but returned an error (timeout, 500, etc.)
          console.warn("AI improve failed, using local fallback:", err.message);
          improvedText = improveTranscriptionLocal(t);
          setStatusMessage("AI unavailable — text formatted locally.");
        }
      }

      setTranscription(improvedText);
    } catch (error) {
      // Unexpected error in the outer block (should not happen, but guard anyway)
      console.error("Improve failed unexpectedly:", error);
      setStatusMessage("Improve failed. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

  const handleClear = async () => {
    if (audioId) {
      await deleteAudioBlob(audioId);
    }
    resetDraftUIOnly();
    setStatusMessage("Cleared.");
  };

  const handleSave = () => {
    if (!selectedPatient || typeof onSaveTranscription !== "function") return;

    const text = (transcription || "").trim();
    const hasAudio = Boolean(audioId);

    if (!text && !hasAudio) {
      alert("Nothing to save. Please record audio or add transcription text.");
      return;
    }

    const payload = {
      text,
      audioId: audioId || null,
      patientId: patientKey,
      createdAt: Date.now(),
    };

    try {
      if (onSaveTranscription.length <= 1) onSaveTranscription(payload);
      else onSaveTranscription(patientKey, text, audioId || null);

      resetDraftUIOnly();
      setStatusMessage("Saved to patient history.");
    } catch (error) {
      console.error("Failed to save transcription:", error);
      alert("Failed to save. Please try again.");
    }
  };

  const patientLabel = selectedPatient
    ? `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""} (ID ${
        selectedPatient.idNumber || ""
      })`
    : "No patient selected";

  return (
    <div className="record-audio-container">
      <div className="record-header">
        <h3 className="record-title">Record & transcription</h3>
        <p className="record-subtitle">
          Recording for: <span className="record-patient">{patientLabel}</span>
        </p>
      </div>

      <div className="record-controls-row">
        <button
          type="button"
          className={`record-btn record-btn-main ${isRecording ? "record-btn-active" : ""}`}
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={!selectedPatient}
        >
          {isRecording ? "Stop audio recording" : "Start audio recording"}
        </button>

        <button
          type="button"
          className={`record-btn record-btn-secondary ${isDictating ? "record-btn-active" : ""}`}
          onClick={handleToggleDictation}
          disabled={!selectedPatient || !canUseSpeechRecognition || isRecording}
          title={isRecording ? "Stop recording to start dictation" : ""}
        >
          {isDictating ? "Stop dictation" : "Start dictation"}
        </button>
      </div>

      <div className="transcription-block">
        <div className="transcription-header">
          <span className="details-label">Transcription (editable)</span>
        </div>

        <textarea
          className="transcription-textarea"
          value={transcription}
          placeholder="Type or edit the session transcription here."
          onChange={(e) => setTranscription(e.target.value)}
        />

        <div className="record-footer-buttons">
          <button type="button" className="record-footer-btn record-save-btn" onClick={handleSave}>
            Save transcription
          </button>

          <button
            type="button"
            className="record-footer-btn record-ai-btn"
            onClick={handleImprove}
            disabled={!transcription.trim() || isImproving}
          >
            {isImproving ? "Improving..." : "Improve with AI"}
          </button>

          <button
            type="button"
            className="record-footer-btn record-clear-btn"
            onClick={handleClear}
            disabled={!transcription && !audioId}
          >
            Clear
          </button>
        </div>
      </div>

      {audioURL && (
        <div className="audio-preview">
          <audio controls preload="metadata" src={audioURL} />
        </div>
      )}

      {statusMessage ? (
        <div className="record-status-line">{statusMessage}</div>
      ) : null}
    </div>
  );
}
