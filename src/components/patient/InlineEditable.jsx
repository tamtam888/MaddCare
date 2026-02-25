import { useEffect, useState } from "react";

export default function InlineEditable({
  value,
  placeholder = "-",
  inputType = "text",
  className = "",
  onChange,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    const next = draft ?? "";
    if (next !== (value ?? "")) onChange?.(next);
  };

  if (!editing) {
    return (
      <span
        className={`editable-field ${className}`}
        onClick={() => setEditing(true)}
      >
        {String(value ?? "").trim().length ? value : placeholder}
      </span>
    );
  }

  return (
    <input
      className={`inline-input ${className}`}
      type={inputType}
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
    />
  );
}
