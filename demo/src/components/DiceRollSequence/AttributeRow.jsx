// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion } from "motion/react";
import {
  ATTR_LABELS, ATTR_DESC, scoreMod, fmtMod,
  MAX_SCORE, BUMP_TARGET, getMeterColor,
} from "./DiceRollSequence.helpers.js";
import DieBlock from "../DieBlock";

export default function AttributeRow({
  name,
  index,
  dice,
  total,
  bonusCountForAttr,
  isRolling,
  diceCount,
  isHighVar,
  lockedCount,
  settled,
  spinValues,
  selectable,
  hoveredAttr,
  selectedAttr,
  lockedLowestAttr,
  isBonusTarget,
  onSelect,
  onHover,
}) {
  const isDone = !isRolling;
  const rowLocked = isDone ? diceCount : lockedCount;

  let rowRunning = 0;
  for (let j = 0; j < rowLocked; j++) rowRunning += dice[j];

  const isHovered = selectable && hoveredAttr === name && selectedAttr !== name;
  const isSelected = selectedAttr === name;
  const isNotSelected = selectedAttr !== null && selectedAttr !== name && hoveredAttr !== name;
  const isLockedLowest = lockedLowestAttr === name;
  const wouldChange = total < BUMP_TARGET;
  const showPreview = isDone && (isHovered || isSelected) && wouldChange;
  const displayScore = showPreview ? BUMP_TARGET : total;
  const displayMod = scoreMod(displayScore);
  const displayModClass = displayMod > 0 ? "positive" : displayMod < 0 ? "negative" : "neutral";

  return (
    <motion.div
      className={[
        "dice-row-container",
        isRolling ? "active" : "done",
        isRolling && settled && "settled",
        isDone && selectable && !isLockedLowest && "selectable",
        isDone && isHovered && "hovered",
        isDone && isSelected && "selected",
        isDone && isNotSelected && "dimmed",
        isDone && isBonusTarget && "bonus-target",
        isDone && isLockedLowest && "locked-lowest",
      ].filter(Boolean).join(" ")}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLockedLowest ? 0.55 : (isDone && isNotSelected ? 0.55 : 1) }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      onClick={selectable && !isLockedLowest ? () => onSelect(name) : undefined}
      onMouseEnter={selectable && !isLockedLowest ? () => onHover(name) : undefined}
      onMouseLeave={selectable && !isLockedLowest ? () => onHover(null) : undefined}
      role={selectable && !isLockedLowest ? "button" : undefined}
      tabIndex={selectable && !isLockedLowest ? 0 : undefined}
      onKeyDown={selectable && !isLockedLowest ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(name); }
      } : undefined}
    >
      <div className="dice-row-inner">
        {/* Label */}
        <motion.span
          className={`dice-row-label ${isRolling ? "active-label" : ""} ${(isHovered || isSelected) ? "gold-label" : ""} ${isBonusTarget ? "bonus-label" : ""} ${isLockedLowest ? "locked-label" : ""}`}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {ATTR_LABELS[index]}
        </motion.span>

        {/* Dice */}
        <div className="dice-row-dice">
          {Array.from({ length: diceCount }, (_, di) => {
            const isLocked = di < rowLocked;
            const isD12 = isHighVar && di === 1;
            return (
              <DieBlock
                key={di}
                value={isLocked || isDone ? dice[di] : spinValues[di]}
                locked={isLocked || isDone}
                animate={isRolling && isLocked}
                mini={isDone}
                className={isD12 ? "die-d12" : undefined}
              />
            );
          })}
        </div>

        {/* Meter */}
        <div className="dice-row-meter-wrap">
          <div className="dice-row-meter-track">
            {isDone && selectable && !isLockedLowest && wouldChange && (
              <motion.div
                className="dice-row-meter-preview"
                initial={{ width: `${(total / MAX_SCORE) * 100}%`, opacity: 0 }}
                animate={{
                  width: isHovered || isSelected
                    ? `${(BUMP_TARGET / MAX_SCORE) * 100}%`
                    : `${(total / MAX_SCORE) * 100}%`,
                  opacity: isHovered || isSelected ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            )}
            <motion.div
              className="dice-row-meter-fill"
              style={isRolling ? { backgroundColor: getMeterColor(rowRunning, rowLocked) } : undefined}
              initial={{ width: "0%" }}
              animate={{
                width: isDone && isSelected && wouldChange
                  ? `${(BUMP_TARGET / MAX_SCORE) * 100}%`
                  : `${((isDone ? total : rowRunning) / MAX_SCORE) * 100}%`,
                ...(isDone ? {
                  backgroundColor: isSelected && wouldChange
                    ? getMeterColor(BUMP_TARGET, 3)
                    : getMeterColor(total, diceCount),
                } : {}),
              }}
              transition={{
                duration: 0.6,
                delay: isDone && isSelected ? 0.2 : 0,
                ease: isRolling ? [0.16, 1, 0.3, 1] : "easeOut",
              }}
            />
            {isRolling && rowLocked < diceCount && (
              <motion.div
                className="dice-row-meter-shimmer"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
        </div>

        {/* Score — key includes bonusCount so spring re-triggers on bonus apply */}
        <motion.span
          className={`dice-row-score ${showPreview ? "score-gold" : ""} ${isBonusTarget ? "score-bonus" : ""}`}
          key={`score-${index}-${rowLocked}-${bonusCountForAttr}`}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: rowLocked > 0 ? 1 : 0.3 }}
          transition={isRolling
            ? { type: "spring", stiffness: 300, damping: 20 }
            : { duration: 0.3 }}
        >
          {rowLocked > 0
            ? (isDone ? displayScore : rowRunning)
            : "\u2014"}
        </motion.span>

        {/* Mod */}
        <motion.span
          key={`mod-${index}-${rowLocked}-${bonusCountForAttr}`}
          className={`dice-row-mod ${
            isDone
              ? (showPreview ? "gold-mod" : displayModClass)
              : (rowLocked === diceCount
                ? (scoreMod(rowRunning) > 0 ? "positive" : scoreMod(rowRunning) < 0 ? "negative" : "neutral")
                : "pending")
          }`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: rowLocked > 0 ? 1 : 0.3 }}
          transition={isRolling
            ? { type: "spring", stiffness: 400, damping: 25 }
            : { duration: 0.3 }}
        >
          {rowLocked > 0
            ? fmtMod(isDone ? displayMod : scoreMod(rowRunning))
            : "\u2014"}
        </motion.span>
      </div>

      {/* Description */}
      <motion.p
        className="dice-row-desc"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {ATTR_DESC[name]}
      </motion.p>

      {/* Gold edge for selectable */}
      {isDone && selectable && !isLockedLowest && (
        <motion.div
          className="dice-row-gold-edge"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered || isSelected ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}
