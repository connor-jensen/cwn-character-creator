import { STEPS, STEP_LABELS } from "../../constants.js";
import "./ProgressBar.css";

export default function ProgressBar({ step, onStepClick }) {
  return (
    <div>
      <div className="progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`progress-segment ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
            onClick={() => onStepClick(i)}
          />
        ))}
      </div>
      <div className="progress-labels">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`progress-label ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
            onClick={() => onStepClick(i)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
