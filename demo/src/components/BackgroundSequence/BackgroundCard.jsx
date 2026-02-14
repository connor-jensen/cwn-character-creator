// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";

function OutcomeItem({ motionKey, label, text }) {
  return (
    <motion.div
      key={motionKey}
      className="bg-card-outcome-item"
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="bg-card-outcome-label">{label}:</span>
      <span className="bg-roll-result-text">{text}</span>
    </motion.div>
  );
}

export default function BackgroundCard({
  bg,
  bgIdx,
  offerIdx,
  isExpanded,
  isPickable,
  isSelected,
  isConfirmed,
  isDimmed,
  showCyan,
  activeRollType,
  activeDieDisplay,
  rollLabel,
  rollDieType,
  growthHighlights,
  learningHighlights,
  rollOutcomes,
  renderDie,
  onSelect,
  onConfirm,
}) {
  return (
    <motion.div
      key={bg.name}
      layout
      className={`bg-item${isExpanded ? " bg-item-expanded" : ""}${isPickable ? " bg-item-pickable" : ""}${isSelected ? " bg-item-selected" : ""}${isDimmed ? " bg-item-dimmed" : ""}`}
      animate={{
        backgroundColor: isSelected || isConfirmed
          ? "rgba(255, 182, 39, 0.1)"
          : showCyan
            ? "rgba(0, 229, 255, 0.08)"
            : "rgba(0, 0, 0, 0)",
        borderColor: isSelected || isConfirmed
          ? "rgba(255, 182, 39, 0.5)"
          : showCyan
            ? "rgba(0, 229, 255, 0.2)"
            : "rgba(255, 255, 255, 0.06)",
        opacity: isDimmed ? 0.3 : 1,
      }}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: "hidden",
      }}
      transition={{
        layout: { duration: 0.3, ease: "easeInOut" },
        backgroundColor: { duration: 0.4 },
        borderColor: { duration: 0.4 },
        opacity: { duration: 0.4 },
        default: { duration: 0.2 },
      }}
      onClick={isPickable ? () => onSelect(bg.name) : undefined}
    >
      {isPickable && (
        <span className="bg-select-bar">SELECT</span>
      )}
      <AnimatePresence>
        {isSelected && isPickable && (
          <motion.button
            key="inline-confirm"
            className="bg-inline-confirm"
            initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
            animate={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, -15% 100%)' }}
            exit={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(bg.name);
            }}
          >
            CONFIRM
          </motion.button>
        )}
      </AnimatePresence>
      {!isExpanded && (
        <div className="bg-item-row">
          <span className={`bg-pool-idx${showCyan ? " bg-highlighted" : ""}`}>
            {bgIdx}
          </span>
          <span className={`bg-pool-name${showCyan ? " bg-highlighted" : ""}`}>
            {bg.name}
          </span>
          <span className="bg-pool-desc">{bg.description}</span>
        </div>
      )}

      {isExpanded && (
        <motion.div
          className="bg-item-details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ position: "relative" }}
        >
          {/* Die area (top-right of card) */}
          <AnimatePresence mode="wait">
            {isConfirmed && activeRollType && activeDieDisplay && (
              <motion.div
                key={activeRollType}
                className="bg-card-die-area"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
              >
                <div className="bg-card-die-header">
                  <span className="bg-roll-label">{rollLabel}</span>
                  <span className="bg-roll-sub">{rollDieType}</span>
                </div>
                {renderDie(activeDieDisplay.dieValue, activeDieDisplay.locked, activeDieDisplay.isStatic)}
              </motion.div>
            )}
          </AnimatePresence>

          {offerIdx >= 0 && (
            <span className="offer-card-id">
              #{String(offerIdx + 1).padStart(2, "0")}
            </span>
          )}
          <h3>{bg.name}</h3>
          <p className="offer-card-desc">{bg.description}</p>
          <span className="offer-card-detail">
            Free skill: {bg.free_skill}
          </span>

          {/* Tables with roll highlights */}
          <div className="bg-table-section">
            <div className="bg-table">
              <div className={`bg-table-title${isConfirmed && activeRollType === "growth" ? " bg-table-title-active" : ""}`}>
                Growth (d6)
              </div>
              {bg.growth.map((entry, gi) => (
                <div
                  key={gi}
                  className={`bg-table-row${isConfirmed && growthHighlights.has(gi) ? " highlighted" : ""}`}
                >
                  <span className="bg-table-index">{gi + 1}</span>
                  <span>{entry}</span>
                </div>
              ))}
            </div>
            <div className="bg-table">
              <div className={`bg-table-title${isConfirmed && (activeRollType === "learn1" || activeRollType === "learn2") ? " bg-table-title-active" : ""}`}>
                Learning (d8)
              </div>
              {bg.learning.map((entry, li) => (
                <div
                  key={li}
                  className={`bg-table-row${isConfirmed && learningHighlights.has(li) ? " highlighted" : ""}`}
                >
                  <span className="bg-table-index">{li + 1}</span>
                  <span>{entry}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outcomes area */}
          <AnimatePresence>
            {isConfirmed && (rollOutcomes.growth || rollOutcomes.learn1 || rollOutcomes.learn2) && (
              <motion.div
                key="outcomes"
                className="bg-card-outcomes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {rollOutcomes.growth && <OutcomeItem motionKey="og" label="Growth" text={rollOutcomes.growth} />}
                {rollOutcomes.learn1 && <OutcomeItem motionKey="ol1" label="Learning 1" text={rollOutcomes.learn1} />}
                {rollOutcomes.learn2 && <OutcomeItem motionKey="ol2" label="Learning 2" text={rollOutcomes.learn2} />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
