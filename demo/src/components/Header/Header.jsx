import { STEPS } from "../../constants.js";
import "./Header.css";

export default function Header({ step, devMode, view, onNavigate }) {
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
