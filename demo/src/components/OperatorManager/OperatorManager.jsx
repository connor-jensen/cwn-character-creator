import { useState, useRef, useEffect, useCallback } from "react";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "motion/react";
import {
  loadRoster,
  deleteCharacter,
  importCharacter,
  exportCharacter,
} from "../../helpers/roster-storage.js";
import "./OperatorManager.css";

function Toast({ message, type, onDone }) {
  return (
    <motion.div
      className={`om-toast om-toast-${type}`}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      onAnimationComplete={(def) => {
        if (def === "exit") return;
        setTimeout(onDone, 2500);
      }}
    >
      {message}
    </motion.div>
  );
}

function OperatorCard({ record, onSelect, onDelete, onDownload }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleDeleteClick = () => {
    if (confirmDelete) {
      clearTimeout(timerRef.current);
      onDelete(record.id);
    } else {
      setConfirmDelete(true);
      timerRef.current = setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  const char = record.character;
  const savedDate = new Date(record.savedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="om-card">
      <div className="om-card-main om-card-main-clickable" onClick={() => onSelect(record.id)}>
        <div className="om-card-identity">
          <span className="om-card-name">{char.name}</span>
          <div className="om-card-tags">
            {char.background && (
              <span className="om-card-tag om-card-tag-bg">{char.background}</span>
            )}
            <span className="om-card-tag om-card-tag-lvl">LVL {char.level || 1}</span>
          </div>
        </div>
        <div className="om-card-stats">
          <div className="om-card-stat">
            <span className="om-card-stat-val">{char.hp}</span>
            <span className="om-card-stat-label">HP</span>
          </div>
          <div className="om-card-stat">
            <span className="om-card-stat-val om-card-stat-date">{savedDate}</span>
            <span className="om-card-stat-label">SAVED</span>
          </div>
        </div>
      </div>
      <div className="om-card-actions">
        <button className="om-card-btn om-card-btn-dl" onClick={() => onDownload(record)}>
          Download
        </button>
        <button
          className={`om-card-btn om-card-btn-del${confirmDelete ? " om-card-btn-confirm" : ""}`}
          onClick={handleDeleteClick}
        >
          {confirmDelete ? "CONFIRM?" : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function OperatorManager({ onNavigate, onSelect }) {
  const [roster, setRoster] = useState(() => loadRoster());
  const [toasts, setToasts] = useState([]);
  const fileInputRef = useRef(null);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message, type) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleDelete = useCallback((id) => {
    const updated = deleteCharacter(id);
    setRoster(updated);
  }, []);

  const handleDownload = useCallback((record) => {
    exportCharacter(record);
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = importCharacter(evt.target.result);
      if (result.success) {
        setRoster(loadRoster());
        addToast(`Imported "${result.record.character.name}"`, "success");
      } else {
        addToast(`Import failed: ${result.error}`, "error");
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-imported
    e.target.value = "";
  };

  return (
    <div className="om">
      <div className="om-header">
        <div className="om-header-left">
          <div className="om-header-label">
            <span className="om-header-prefix">SYS://</span>
            OPERATOR ROSTER
          </div>
          <span className="om-header-count">
            {roster.length} operative{roster.length !== 1 ? "s" : ""} on file
          </span>
        </div>
        <div className="om-header-actions">
          <button className="btn-action" onClick={() => onNavigate("creator")}>
            <span className="btn-prompt">&gt;_</span> New Character
          </button>
          <button className="btn-action" onClick={handleImportClick}>
            <span className="btn-prompt">&gt;_</span> Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {roster.length === 0 ? (
        <div className="om-empty">
          <div className="om-empty-icon">&#9744;</div>
          <p className="om-empty-text">No operatives on file.</p>
          <p className="om-empty-sub">
            Create a character or import a JSON file to populate your roster.
          </p>
        </div>
      ) : (
        <div className="om-list">
          {roster.map((record) => (
            <OperatorCard
              key={record.id}
              record={record}
              onSelect={onSelect}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      <div className="om-toast-container">
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast
              key={t.id}
              message={t.message}
              type={t.type}
              onDone={() => removeToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
