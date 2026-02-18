import { STEPS, STEP_LABELS } from "../../constants.js";
import "./ProgressBar.css";

export default function ProgressBar({ step, maxStepReached, onStepClick }) {
  return (
    <div>
      <div className="progress">
        {STEPS.map((s, i) => {
          const disabled = i > maxStepReached;
          return (
            <div
              key={s}
              className={`progress-segment ${i < step ? "completed" : ""} ${i === step ? "active" : ""} ${disabled ? "disabled" : ""}`}
              onClick={disabled ? undefined : () => onStepClick(i)}
            />
          );
        })}
      </div>
      <div className="progress-labels">
        {STEP_LABELS.map((label, i) => {
          const disabled = i > maxStepReached;
          return (
            <span
              key={label}
              className={`progress-label ${i < step ? "completed" : ""} ${i === step ? "active" : ""} ${disabled ? "disabled" : ""}`}
              onClick={disabled ? undefined : () => onStepClick(i)}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
