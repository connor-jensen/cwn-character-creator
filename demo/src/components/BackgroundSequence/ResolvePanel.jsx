// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import ConfirmButton from "../ConfirmButton";

export default function ResolvePanel({ isVisible, motionKey, children, showConfirm, confirmLabel, onConfirm }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={motionKey}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-resolve-inline"
        >
          {children}
          <ConfirmButton
            isVisible={showConfirm}
            label={confirmLabel}
            onClick={onConfirm}
            duration={0.25}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
