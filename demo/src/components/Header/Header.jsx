import { STEPS } from "../../constants.js";
import "./Header.css";

export default function Header({ step, devMode, view, onNavigate, muted, onToggleMute }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-prefix">SYS://</span>
        <h1>CWN Character Creator</h1>
      </div>
      <div className="header-status">
        {devMode && <span className="dev-mode-badge">DEV MODE</span>}
        {view === "creator" && (
          <>
            <span className="status-label">STEP</span>
            <span className="status-value">
              {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
            </span>
          </>
        )}
        {onToggleMute && (
          <button
            className={`header-mute-btn${muted ? " muted" : ""}`}
            onClick={onToggleMute}
            title={muted ? "Unmute music" : "Mute music"}
            aria-label={muted ? "Unmute music" : "Mute music"}
          >
            {muted ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
            )}
          </button>
        )}
        {onNavigate && (
          <button
            className="header-nav-btn"
            onClick={() => onNavigate(view === "creator" ? "manager" : "creator")}
          >
            // {view === "creator" ? "ROSTER" : "CREATOR"}
          </button>
        )}
      </div>
    </header>
  );
}
