import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import { rollDie } from "../../../../cwn-engine.js";
import { ATTR_NAMES, ROLL_STEP } from "../../constants.js";
import "./DiceRollSequence.css";

const ATTR_LABELS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ATTR_DESC = {
  strength: "Melee weapon attacks and damage. Bonus to damage soak \u2014 how much punishment you shrug off before it hurts.",
  dexterity: "Ranged weapons, finesse melee, and your armor class. Keeps you alive when bullets fly.",
  constitution: "Hit point totals and system strain capacity. Determines how much chrome and trauma your body can handle.",
  intelligence: "Hacking, technical skills, and program execution. Your edge in the digital layer of the city.",
  wisdom: "Initiative rolls and trauma target threshold. How fast you react, and how hard you are to break.",
  charisma: "Starting contact count and quality. Fuels the social skill rolls that move the city\u2019s power networks.",
};

function scoreMod(score) {
  if (score <= 3) return -2;
  if (score <= 7) return -1;
  if (score <= 13) return 0;
  if (score <= 17) return 1;
  return 2;
}

function fmtMod(m) { return m >= 0 ? `+${m}` : `${m}`; }

const MAX_SCORE = 18;
const BUMP_TARGET = 14;

// Standard timings (3 dice)
const T_LOCK1 = ROLL_STEP + 500;
const T_LOCK2 = T_LOCK1 + ROLL_STEP;
const T_LOCK3 = T_LOCK2 + ROLL_STEP;
const T_SETTLE = T_LOCK3 + ROLL_STEP;
const T_NEXT = T_SETTLE + 500;

// High variance timings (2 dice)
const T_HV_LOCK1 = ROLL_STEP + 500;
const T_HV_LOCK2 = T_HV_LOCK1 + ROLL_STEP;
const T_HV_SETTLE = T_HV_LOCK2 + ROLL_STEP;
const T_HV_NEXT = T_HV_SETTLE + 500;

function computeBonusRolls(mainRolls) {
  const scores = mainRolls.map((dice) => dice[0] + dice[1]);
  const bonuses = [];

  for (let i = 0; i < 3; i++) {
    if (scores.every((s) => s >= 18)) break;

    const attempts = [];
    let roll;
    do {
      roll = rollDie(6);
      attempts.push(roll);
    } while (scores[roll - 1] >= 18);

    scores[roll - 1] = Math.min(18, scores[roll - 1] + 1);
    bonuses.push({ attempts, finalRoll: roll, attrIdx: roll - 1 });
  }

  return { bonuses, finalScores: scores };
}

export default function DiceRollSequence({ onComplete, mode = "standard" }) {
  const isHighVar = mode === "highVariance";
  const diceCount = isHighVar ? 2 : 3;

  // Pre-roll all dice (computed once via lazy initializer)
  const [rolls] = useState(() => {
    if (isHighVar) {
      return ATTR_NAMES.map(() => [rollDie(6), rollDie(12)]);
    }
    return ATTR_NAMES.map(() => [rollDie(6), rollDie(6), rollDie(6)]);
  });
  const [bonusData] = useState(() => {
    if (isHighVar) {
      return computeBonusRolls(rolls);
    }
    return null;
  });

  // Main roll states
  const [activeAttr, setActiveAttr] = useState(0);
  const [lockedCount, setLockedCount] = useState(0);
  const [settled, setSettled] = useState(false);
  const [selectable, setSelectable] = useState(false);
  const [hoveredAttr, setHoveredAttr] = useState(null);
  const [selectedAttr, setSelectedAttr] = useState(null);
  const [lockedLowestAttr, setLockedLowestAttr] = useState(null);
  const [noBump, setNoBump] = useState(false);
  const [spinValues, setSpinValues] = useState(
    isHighVar ? [1, 1] : [1, 1, 1]
  );

  const spinRef = useRef(null);

  // Reset animation state when activeAttr changes (render-time derivation)
  const [prevActiveAttr, setPrevActiveAttr] = useState(0);
  if (activeAttr !== prevActiveAttr) {
    setPrevActiveAttr(activeAttr);
    setLockedCount(0);
    setSettled(false);
  }

  // Bonus roll states (high variance only)
  const [bonusPhaseActive, setBonusPhaseActive] = useState(false);
  const [activeBonusIdx, setActiveBonusIdx] = useState(0);
  const [bonusLocked, setBonusLocked] = useState(false);

  // Reset bonusLocked when activeBonusIdx changes (render-time derivation)
  const [prevBonusIdx, setPrevBonusIdx] = useState(0);
  if (activeBonusIdx !== prevBonusIdx) {
    setPrevBonusIdx(activeBonusIdx);
    setBonusLocked(false);
  }
  const [appliedBonusCount, setAppliedBonusCount] = useState(0);
  const [bonusSpinValue, setBonusSpinValue] = useState(1);
  const bonusSpinRef = useRef(null);

  // Spinning interval for main dice
  useEffect(() => {
    if (activeAttr >= ATTR_NAMES.length) return;
    spinRef.current = setInterval(() => {
      if (isHighVar) {
        setSpinValues([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 12),
        ]);
      } else {
        setSpinValues([
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
          Math.ceil(Math.random() * 6),
        ]);
      }
    }, 50);
    return () => clearInterval(spinRef.current);
  }, [activeAttr, isHighVar]);

  // Orchestrate per-attribute (standard mode - 3 dice)
  useEffect(() => {
    if (activeAttr >= ATTR_NAMES.length) return;
    if (isHighVar) return;
    const t = [];
    t.push(setTimeout(() => setLockedCount(1), T_LOCK1));
    t.push(setTimeout(() => setLockedCount(2), T_LOCK2));
    t.push(setTimeout(() => { setLockedCount(3); clearInterval(spinRef.current); }, T_LOCK3));
    t.push(setTimeout(() => setSettled(true), T_SETTLE));
    t.push(setTimeout(() => setActiveAttr((a) => a + 1), T_NEXT));
    return () => t.forEach(clearTimeout);
  }, [activeAttr, isHighVar]);

  // Orchestrate per-attribute (high variance mode - 2 dice)
  useEffect(() => {
    if (activeAttr >= ATTR_NAMES.length) return;
    if (!isHighVar) return;
    const t = [];
    t.push(setTimeout(() => setLockedCount(1), T_HV_LOCK1));
    t.push(setTimeout(() => { setLockedCount(2); clearInterval(spinRef.current); }, T_HV_LOCK2));
    t.push(setTimeout(() => setSettled(true), T_HV_SETTLE));
    t.push(setTimeout(() => setActiveAttr((a) => a + 1), T_HV_NEXT));
    return () => t.forEach(clearTimeout);
  }, [activeAttr, isHighVar]);

  // Transition after all main rolls
  useEffect(() => {
    if (activeAttr < ATTR_NAMES.length) return;
    if (isHighVar) {
      const t = setTimeout(() => setBonusPhaseActive(true), 600);
      return () => clearTimeout(t);
    } else {
      // Check if total modifiers are negative — offer bump only for weak rolls
      const totals = ATTR_NAMES.map((_, i) => {
        const dice = rolls[i];
        return dice[0] + dice[1] + dice[2];
      });
      const totalMods = totals.reduce((sum, s) => sum + scoreMod(s), 0);
      if (totalMods < 0) {
        // Offer bump selection, lock lowest stat
        const minScore = Math.min(...totals);
        const minIdx = totals.indexOf(minScore);
        const t = setTimeout(() => {
          setLockedLowestAttr(ATTR_NAMES[minIdx]);
          setSelectable(true);
        }, 600);
        return () => clearTimeout(t);
      } else {
        // Good rolls — no bump needed
        const t = setTimeout(() => setNoBump(true), 600);
        return () => clearTimeout(t);
      }
    }
  }, [activeAttr, isHighVar, rolls]);

  // Bonus die spinning
  useEffect(() => {
    if (!bonusPhaseActive) return;
    if (!bonusData) return;
    if (activeBonusIdx >= bonusData.bonuses.length) return;
    if (bonusLocked) return;
    bonusSpinRef.current = setInterval(() => {
      setBonusSpinValue(Math.ceil(Math.random() * 6));
    }, 50);
    return () => clearInterval(bonusSpinRef.current);
  }, [bonusPhaseActive, activeBonusIdx, bonusLocked, bonusData]);

  // Orchestrate each bonus roll
  useEffect(() => {
    if (!bonusPhaseActive) return;
    if (!bonusData) return;
    if (activeBonusIdx >= bonusData.bonuses.length) {
      const totals = bonusData.finalScores;
      const totalMods = totals.reduce((sum, s) => sum + scoreMod(s), 0);
      if (totalMods < 0) {
        const minScore = Math.min(...totals);
        const minIdx = totals.indexOf(minScore);
        const t = setTimeout(() => {
          setLockedLowestAttr(ATTR_NAMES[minIdx]);
          setSelectable(true);
        }, 600);
        return () => clearTimeout(t);
      } else {
        const t = setTimeout(() => setNoBump(true), 600);
        return () => clearTimeout(t);
      }
    }
    const t = [];
    t.push(setTimeout(() => {
      setBonusLocked(true);
      clearInterval(bonusSpinRef.current);
    }, 600));
    t.push(setTimeout(() => {
      setAppliedBonusCount((prev) => prev + 1);
    }, 900));
    t.push(setTimeout(() => {
      setActiveBonusIdx((prev) => prev + 1);
    }, 1300));
    return () => t.forEach(clearTimeout);
  }, [bonusPhaseActive, activeBonusIdx, bonusData]);

  const handleSelect = (attrName) => {
    setSelectedAttr(attrName);
  };

  const handleConfirm = () => {
    const rollData = {};
    ATTR_NAMES.forEach((name, i) => {
      const dice = rolls[i];
      let total;
      if (isHighVar) {
        total = dice[0] + dice[1];
        if (bonusData) {
          for (const bonus of bonusData.bonuses) {
            if (bonus.attrIdx === i) {
              total = Math.min(18, total + 1);
            }
          }
        }
      } else {
        total = dice[0] + dice[1] + dice[2];
      }
      rollData[name] = { score: total, mod: scoreMod(total) };
    });
    onComplete(rollData, selectedAttr);
  };

  const getRunningScore = (attrIdx, locked) => {
    const dice = rolls[attrIdx];
    let sum = 0;
    for (let i = 0; i < locked; i++) sum += dice[i];
    return sum;
  };

  const getTotal = (attrIdx) => {
    const dice = rolls[attrIdx];
    let total = isHighVar ? dice[0] + dice[1] : dice[0] + dice[1] + dice[2];
    if (isHighVar && bonusData) {
      for (let j = 0; j < appliedBonusCount && j < bonusData.bonuses.length; j++) {
        if (bonusData.bonuses[j].attrIdx === attrIdx) {
          total = Math.min(18, total + 1);
        }
      }
    }
    return total;
  };

  const getBonusCountForAttr = (attrIdx) => {
    if (!isHighVar || !bonusData) return 0;
    return bonusData.bonuses
      .slice(0, appliedBonusCount)
      .filter((b) => b.attrIdx === attrIdx).length;
  };

  const getMeterColor = (runningScore, locked) => {
    if (locked === 0) return "var(--border)";
    if (runningScore >= 14) return "var(--green)";
    if (runningScore <= 7) return "var(--magenta)";
    return "var(--cyan)";
  };

  return (
    <div className="dice-sequence">
      {/* Selection prompt */}
      <AnimatePresence>
        {selectable && (
          <motion.div
            className="dice-select-prompt"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <div className="dice-select-prompt-line" />
            <span className="dice-select-prompt-text">
              {selectedAttr
                ? `${selectedAttr.charAt(0).toUpperCase() + selectedAttr.slice(1)} \u2192 14`
                : "Set one attribute to 14"}
            </span>
            <div className="dice-select-prompt-line" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attribute rows */}
      {ATTR_NAMES.slice(0, Math.min(activeAttr + 1, ATTR_NAMES.length)).map((name, i) => {
        const isRolling = i === activeAttr && activeAttr < ATTR_NAMES.length;
        const isDone = !isRolling;
        const dice = rolls[i];
        const total = getTotal(i);
        const rowLocked = isDone ? diceCount : lockedCount;
        const runningScore = getRunningScore(i, rowLocked);
        const bonusCountForAttr = getBonusCountForAttr(i);

        // Selection-phase states
        const isHovered = selectable && hoveredAttr === name && selectedAttr !== name;
        const isSelected = selectedAttr === name;
        const isNotSelected = selectedAttr !== null && selectedAttr !== name && hoveredAttr !== name;
        const isLockedLowest = lockedLowestAttr === name;
        const wouldChange = total < BUMP_TARGET;
        const showPreview = isDone && (isHovered || isSelected) && wouldChange;
        const displayScore = showPreview ? BUMP_TARGET : total;
        const displayMod = scoreMod(displayScore);
        const displayModClass = displayMod > 0 ? "positive" : displayMod < 0 ? "negative" : "neutral";

        // Highlight attribute row when bonus is being applied to it
        const isBonusTarget = isHighVar && bonusPhaseActive && !selectable
          && bonusData
          && activeBonusIdx < bonusData.bonuses.length
          && bonusData.bonuses[activeBonusIdx].attrIdx === i
          && bonusLocked;

        return (
          <motion.div
            key={name}
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
            onClick={selectable && !isLockedLowest ? () => handleSelect(name) : undefined}
            onMouseEnter={selectable && !isLockedLowest ? () => setHoveredAttr(name) : undefined}
            onMouseLeave={selectable && !isLockedLowest ? () => setHoveredAttr(null) : undefined}
            role={selectable && !isLockedLowest ? "button" : undefined}
            tabIndex={selectable && !isLockedLowest ? 0 : undefined}
            onKeyDown={selectable && !isLockedLowest ? (e) => {
              if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(name); }
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
                {ATTR_LABELS[i]}
              </motion.span>

              {/* Dice */}
              <div className="dice-row-dice">
                {Array.from({ length: diceCount }, (_, di) => {
                  const isLocked = di < rowLocked;
                  const isD12 = isHighVar && di === 1;
                  return (
                    <motion.div
                      key={di}
                      className={`die-block ${isLocked || isDone ? "locked" : "spinning"} ${isDone ? "mini" : ""} ${isD12 ? "die-d12" : ""}`}
                      animate={isRolling && isLocked ? {
                        scale: [1, 1.25, 0.95, 1],
                        boxShadow: [
                          "0 0 0px rgba(0,229,255,0)",
                          "0 0 30px rgba(0,229,255,0.6)",
                          "0 0 15px rgba(0,229,255,0.3)",
                          "0 0 8px rgba(0,229,255,0.15)",
                        ],
                      } : {}}
                      transition={isRolling && isLocked ? { duration: 0.5, ease: "easeOut" } : {}}
                    >
                      {isLocked || isDone ? dice[di] : spinValues[di]}
                    </motion.div>
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
                    style={isRolling ? { backgroundColor: getMeterColor(runningScore, rowLocked) } : undefined}
                    initial={{ width: "0%" }}
                    animate={{
                      width: isDone && isSelected && wouldChange
                        ? `${(BUMP_TARGET / MAX_SCORE) * 100}%`
                        : `${((isDone ? total : runningScore) / MAX_SCORE) * 100}%`,
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
                key={`score-${i}-${rowLocked}-${bonusCountForAttr}`}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: rowLocked > 0 ? 1 : 0.3 }}
                transition={isRolling
                  ? { type: "spring", stiffness: 300, damping: 20 }
                  : { duration: 0.3 }}
              >
                {rowLocked > 0
                  ? (isDone ? displayScore : runningScore)
                  : "\u2014"}
              </motion.span>

              {/* Mod */}
              <motion.span
                key={`mod-${i}-${rowLocked}-${bonusCountForAttr}`}
                className={`dice-row-mod ${
                  isDone
                    ? (showPreview ? "gold-mod" : displayModClass)
                    : (rowLocked === diceCount
                      ? (scoreMod(runningScore) > 0 ? "positive" : scoreMod(runningScore) < 0 ? "negative" : "neutral")
                      : "pending")
                }`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: rowLocked > 0 ? 1 : 0.3 }}
                transition={isRolling
                  ? { type: "spring", stiffness: 400, damping: 25 }
                  : { duration: 0.3 }}
              >
                {rowLocked > 0
                  ? fmtMod(isDone ? displayMod : scoreMod(runningScore))
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
      })}

      {/* Bonus rolls section (high variance only) */}
      {isHighVar && bonusPhaseActive && bonusData && bonusData.bonuses.length > 0 && (
        <motion.div
          className="dice-bonus-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="dice-select-prompt">
            <div className="dice-select-prompt-line" />
            <span className="dice-bonus-prompt-text">
              Bonus Rolls
            </span>
            <div className="dice-select-prompt-line" />
          </div>

          {bonusData.bonuses.slice(0, activeBonusIdx + 1).map((bonus, i) => {
            const isCurrent = i === activeBonusIdx;
            const isDone = i < activeBonusIdx || (isCurrent && bonusLocked);
            const attrLabel = ATTR_LABELS[bonus.attrIdx];
            const rerolls = bonus.attempts.slice(0, -1);

            return (
              <motion.div
                key={`bonus-${i}`}
                className={`bonus-roll-row ${isDone ? "done" : "active"}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="bonus-roll-label">#{i + 1}</span>
                <div className="bonus-roll-dice">
                  {/* Rerolled dice (attribute was at 18) */}
                  {rerolls.map((val, j) => (
                    <div key={`reroll-${j}`} className="die-block mini rerolled">
                      {val}
                    </div>
                  ))}
                  {/* Active/final die */}
                  <motion.div
                    className={`die-block mini ${isDone ? "locked" : "spinning"}`}
                    animate={isCurrent && bonusLocked ? {
                      scale: [1, 1.25, 0.95, 1],
                      boxShadow: [
                        "0 0 0px rgba(0,229,255,0)",
                        "0 0 30px rgba(0,229,255,0.6)",
                        "0 0 15px rgba(0,229,255,0.3)",
                        "0 0 8px rgba(0,229,255,0.15)",
                      ],
                    } : {}}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    {isDone ? bonus.finalRoll : bonusSpinValue}
                  </motion.div>
                </div>
                <AnimatePresence>
                  {isDone && (
                    <motion.div
                      className="bonus-roll-result"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      <span className="bonus-roll-arrow">{"\u2192"}</span>
                      <span className="bonus-roll-attr">{attrLabel}</span>
                      <span className="bonus-roll-plus">+1</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Confirm button */}
      <AnimatePresence>
        {(selectedAttr !== null || noBump) && (
          <motion.div
            className="dice-confirm-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: noBump ? 0.3 : 0.5 }}
          >
            <button className="btn-action" onClick={handleConfirm}>
              <span className="btn-prompt">&gt;_</span>
              {noBump ? " Continue" : " Confirm & Continue"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
