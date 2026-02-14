import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import { rollDie } from "../../../../cwn-engine.js";
import { ATTR_NAMES } from "../../constants.js";
import {
  ATTR_LABELS, scoreMod,
  T_LOCK1, T_LOCK2, T_LOCK3, T_SETTLE, T_NEXT,
  T_HV_LOCK1, T_HV_LOCK2, T_HV_SETTLE, T_HV_NEXT,
  computeBonusRolls, getTotal, getBonusCountForAttr,
} from "./DiceRollSequence.helpers.js";
import ConfirmButton from "../ConfirmButton";
import DieBlock from "../DieBlock";
import AttributeRow from "./AttributeRow.jsx";
import "./DiceRollSequence.css";

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

  // Thin wrappers binding component state to extracted helpers
  const totalScore = (attrIdx) => getTotal(rolls, attrIdx, isHighVar, bonusData, appliedBonusCount);
  const bonusCount = (attrIdx) => getBonusCountForAttr(isHighVar, bonusData, appliedBonusCount, attrIdx);

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
        const isBonusTarget = isHighVar && bonusPhaseActive && !selectable
          && bonusData
          && activeBonusIdx < bonusData.bonuses.length
          && bonusData.bonuses[activeBonusIdx].attrIdx === i
          && bonusLocked;

        return (
          <AttributeRow
            key={name}
            name={name}
            index={i}
            dice={rolls[i]}
            total={totalScore(i)}
            bonusCountForAttr={bonusCount(i)}
            isRolling={isRolling}
            diceCount={diceCount}
            isHighVar={isHighVar}
            lockedCount={lockedCount}
            settled={settled}
            spinValues={spinValues}
            selectable={selectable}
            hoveredAttr={hoveredAttr}
            selectedAttr={selectedAttr}
            lockedLowestAttr={lockedLowestAttr}
            isBonusTarget={isBonusTarget}
            onSelect={handleSelect}
            onHover={setHoveredAttr}
          />
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
                    <DieBlock key={`reroll-${j}`} value={val} locked mini className="rerolled" />
                  ))}
                  {/* Active/final die */}
                  <DieBlock
                    value={isDone ? bonus.finalRoll : bonusSpinValue}
                    locked={isDone}
                    animate={isCurrent && bonusLocked}
                    mini
                  />
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
      <ConfirmButton
        isVisible={selectedAttr !== null || noBump}
        label={noBump ? "Continue" : "Confirm & Continue"}
        onClick={handleConfirm}
        delay={noBump ? 0.3 : 0.5}
      />
    </div>
  );
}
