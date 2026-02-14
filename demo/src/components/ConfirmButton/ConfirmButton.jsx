// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import "./ConfirmButton.css";

export default function ConfirmButton({
  isVisible,
  label,
  onClick,
  disabled = false,
  delay = 0,
  duration = 0.4,
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="confirm-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration, delay }}
        >
          <button className="btn-action" disabled={disabled} onClick={onClick}>
            <span className="btn-prompt">&gt;_</span> {label}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
