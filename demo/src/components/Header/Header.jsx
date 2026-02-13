import { STEPS } from "../../constants.js";
import "./Header.css";

export default function Header({ step }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-prefix">SYS://</span>
        <h1>CWN Character Creator</h1>
      </div>
      <div className="header-status">
        <span className="status-label">STEP</span>
        <span className="status-value">
          {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
        </span>
      </div>
    </header>
  );
}
