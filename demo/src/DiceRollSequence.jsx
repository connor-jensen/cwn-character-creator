import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { rollDie } from "../../cwn-engine.js";

const ATTR_NAMES = [
  "strength", "dexterity", "constitution",
  "intelligence", "wisdom", "charisma",
];
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

const T_LOCK1 = 4000 / 2;
const T_LOCK2 = 7000 / 2;
const T_LOCK3 = 10000 / 2;
const T_SETTLE = 13000 / 2;
const T_NEXT = 14000 / 2;

export default function DiceRollSequence({ onComplete }) {
  const rolls = useRef(null);
  if (rolls.current === null) {
    rolls.current = ATTR_NAMES.map(() => [rollDie(6), rollDie(6), rollDie(6)]);
  }

  const [activeAttr, setActiveAttr] = useState(0);
  const [lockedCount, setLockedCount] = useState(0);
  const [settled, setSettled] = useState(false);
  const [selectable, setSelectable] = useState(false);
  const [hoveredAttr, setHoveredAttr] = useState(null);
  const [selectedAttr, setSelectedAttr] = useState(null);
  const [spinValues, setSpinValues] = useState([1, 1, 1]);

  const spinRef = useRef(null);

  // Spinning interval
  useEffect(() => {
    if (activeAttr >= ATTR_NAMES.length) return;
    spinRef.current = setInterval(() => {
      setSpinValues([
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
        Math.ceil(Math.random() * 6),
      ]);
    }, 50);
    return () => clearInterval(spinRef.current);
  }, [activeAttr]);

  // Orchestrate per-attribute
  useEffect(() => {
    if (activeAttr >= ATTR_NAMES.length) return;
    setLockedCount(0);
    setSettled(false);
    const t = [];
    t.push(setTimeout(() => setLockedCount(1), T_LOCK1));
    t.push(setTimeout(() => setLockedCount(2), T_LOCK2));
    t.push(setTimeout(() => { setLockedCount(3); clearInterval(spinRef.current); }, T_LOCK3));
    t.push(setTimeout(() => setSettled(true), T_SETTLE));
    t.push(setTimeout(() => setActiveAttr((a) => a + 1), T_NEXT));
    return () => t.forEach(clearTimeout);
  }, [activeAttr]);

  // Transition to selectable after all rolls
  useEffect(() => {
    if (activeAttr < ATTR_NAMES.length) return;
    const t = setTimeout(() => setSelectable(true), 600);
    return () => clearTimeout(t);
  }, [activeAttr]);

  const handleSelect = (attrName) => {
    setSelectedAttr(attrName);
  };

  const handleConfirm = () => {
    const rollData = {};
    ATTR_NAMES.forEach((name, i) => {
      const dice = rolls.current[i];
      const total = dice[0] + dice[1] + dice[2];
      rollData[name] = { score: total, mod: scoreMod(total) };
    });
    onComplete(rollData, selectedAttr);
  };

  const getRunningScore = (attrIdx, locked) => {
    const dice = rolls.current[attrIdx];
    let sum = 0;
    for (let i = 0; i < locked; i++) sum += dice[i];
    return sum;
  };

  const getMeterColor = (runningScore, locked) => {
    if (locked === 0) return "var(--border)";
    if (runningScore >= 14) return "var(--green)";
    if (runningScore <= 7) return "var(--magenta)";
    return "var(--cyan)";
  };

  const allDone = activeAttr >= ATTR_NAMES.length;

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

      <AnimatePresence mode="popLayout">
        {/* Completed rows */}
        {rolls.current.slice(0, allDone ? ATTR_NAMES.length : activeAttr).map((dice, i) => {
          const total = dice[0] + dice[1] + dice[2];
          const mod = scoreMod(total);
          const modClass = mod > 0 ? "positive" : mod < 0 ? "negative" : "neutral";
          const name = ATTR_NAMES[i];
          const isHovered = selectable && hoveredAttr === name && selectedAttr !== name;
          const isSelected = selectedAttr === name;
          const isNotSelected = selectedAttr !== null && selectedAttr !== name && hoveredAttr !== name;
          const wouldChange = total < BUMP_TARGET;
          const showPreview = (isHovered || isSelected) && wouldChange;
          const displayScore = showPreview ? BUMP_TARGET : total;
          const displayMod = scoreMod(displayScore);
          const displayModClass = displayMod > 0 ? "positive" : displayMod < 0 ? "negative" : "neutral";

          return (
            <motion.div
              key={name}
              className={[
                "dice-row-container done",
                selectable && "selectable",
                isHovered && "hovered",
                isSelected && "selected",
                isNotSelected && "dimmed",
              ].filter(Boolean).join(" ")}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: isNotSelected ? 0.55 : 1, height: "auto" }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              layout
              onClick={selectable ? () => handleSelect(name) : undefined}
              onMouseEnter={selectable ? () => setHoveredAttr(name) : undefined}
              onMouseLeave={selectable ? () => setHoveredAttr(null) : undefined}
              role={selectable ? "button" : undefined}
              tabIndex={selectable ? 0 : undefined}
              onKeyDown={selectable ? (e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleSelect(name); }
              } : undefined}
            >
              <div className="dice-row-inner">
                <span className={`dice-row-label ${isHovered || isSelected ? "gold-label" : ""}`}>
                  {ATTR_LABELS[i]}
                </span>
                <div className="dice-row-dice">
                  {dice.map((v, di) => (
                    <div key={di} className="die-block locked mini">{v}</div>
                  ))}
                </div>
                <div className="dice-row-meter-wrap">
                  <div className="dice-row-meter-track">
                    {selectable && wouldChange && (
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
                      initial={false}
                      animate={{
                        width: isSelected && wouldChange
                          ? `${(BUMP_TARGET / MAX_SCORE) * 100}%`
                          : `${(total / MAX_SCORE) * 100}%`,
                        backgroundColor: isSelected && wouldChange
                          ? getMeterColor(BUMP_TARGET, 3)
                          : getMeterColor(total, 3),
                      }}
                      transition={{
                        duration: isSelected ? 0.6 : 0.5,
                        delay: isSelected ? 0.2 : 0,
                      }}
                    />
                  </div>
                </div>
                <span className={`dice-row-score ${showPreview ? "score-gold" : ""}`}>
                  {displayScore}
                </span>
                <span className={`dice-row-mod ${showPreview ? "gold-mod" : displayModClass}`}>
                  {fmtMod(displayMod)}
                </span>
              </div>
              <p className="dice-row-desc">{ATTR_DESC[name]}</p>
              {selectable && (
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

        {/* Active rolling row */}
        {activeAttr < ATTR_NAMES.length && (
          <motion.div
            key={`active-${activeAttr}`}
            className={`dice-row-container active ${settled ? "settled" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            layout
          >
            <div className="dice-row-inner">
              <motion.span
                className="dice-row-label active-label"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {ATTR_LABELS[activeAttr]}
              </motion.span>

              <div className="dice-row-dice">
                {[0, 1, 2].map((di) => {
                  const isLocked = di < lockedCount;
                  const dice = rolls.current[activeAttr];
                  return (
                    <motion.div
                      key={di}
                      className={`die-block ${isLocked ? "locked" : "spinning"}`}
                      animate={isLocked ? {
                        scale: [1, 1.25, 0.95, 1],
                        boxShadow: [
                          "0 0 0px rgba(0,229,255,0)",
                          "0 0 30px rgba(0,229,255,0.6)",
                          "0 0 15px rgba(0,229,255,0.3)",
                          "0 0 8px rgba(0,229,255,0.15)",
                        ],
                      } : {}}
                      transition={isLocked ? { duration: 0.5, ease: "easeOut" } : {}}
                    >
                      {isLocked ? dice[di] : spinValues[di]}
                    </motion.div>
                  );
                })}
              </div>

              <div className="dice-row-meter-wrap">
                <div className="dice-row-meter-track">
                  <motion.div
                    className="dice-row-meter-fill"
                    style={{ backgroundColor: getMeterColor(getRunningScore(activeAttr, lockedCount), lockedCount) }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${(getRunningScore(activeAttr, lockedCount) / MAX_SCORE) * 100}%` }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  />
                  {lockedCount < 3 && (
                    <motion.div
                      className="dice-row-meter-shimmer"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                </div>
              </div>

              <motion.span
                className="dice-row-score"
                key={`score-${lockedCount}`}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: lockedCount > 0 ? 1 : 0.3 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {lockedCount > 0 ? getRunningScore(activeAttr, lockedCount) : "\u2014"}
              </motion.span>

              <AnimatePresence mode="wait">
                <motion.span
                  key={`mod-${lockedCount}`}
                  className={`dice-row-mod ${lockedCount === 3
                    ? (scoreMod(getRunningScore(activeAttr, 3)) > 0 ? "positive" : scoreMod(getRunningScore(activeAttr, 3)) < 0 ? "negative" : "neutral")
                    : "pending"}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: lockedCount > 0 ? 1 : 0.3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  {lockedCount > 0
                    ? fmtMod(scoreMod(getRunningScore(activeAttr, lockedCount)))
                    : "\u2014"}
                </motion.span>
              </AnimatePresence>
            </div>
            <motion.p
              className="dice-row-desc"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {ATTR_DESC[ATTR_NAMES[activeAttr]]}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm button */}
      <AnimatePresence>
        {selectedAttr !== null && (
          <motion.div
            className="dice-confirm-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <button className="btn-action" onClick={handleConfirm}>
              <span className="btn-prompt">&gt;_</span> Confirm &amp; Continue
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
