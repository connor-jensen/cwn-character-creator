import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  rollDie,
  offerBackgrounds,
  applyBackground,
  resolveGrowthRoll,
  resolveLearningPick,
  resolvePending,
  backgrounds as allBackgrounds,
} from "../../cwn-engine.js";

const ALL_SKILLS = [
  "Connect", "Drive", "Exert", "Fight", "Fix", "Heal",
  "Know", "Notice", "Program", "Shoot", "Sneak", "Talk",
];
const COMBAT_SKILLS = ["Shoot", "Fight"];
const ATTR_NAMES = [
  "strength", "dexterity", "constitution",
  "intelligence", "wisdom", "charisma",
];

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function BackgroundSequence({ char, onComplete }) {
  /* ---- pre-compute rolls ---- */
  const preRolls = useRef(null);
  if (preRolls.current === null) {
    preRolls.current = {
      growth: rollDie(6),
      learn1: rollDie(8),
      learn2: rollDie(8),
    };
  }

  /* ---- core state ---- */
  const [phase, setPhase] = useState("eliminate");
  const [workingChar, setWorkingChar] = useState(() => deepClone(char));
  const wcRef = useRef(workingChar);
  useEffect(() => { wcRef.current = workingChar; }, [workingChar]);

  /* ---- elimination state ---- */
  const [eliminatedNames, setEliminatedNames] = useState(new Set());
  const [bgPhase, setBgPhase] = useState("eliminating");
  const [offers, setOffers] = useState(null);
  const [selectedBg, setSelectedBg] = useState(null);
  const cancelledRef = useRef(false);

  /* ---- background data ---- */
  const [bgData, setBgData] = useState(null);
  const bgDataRef = useRef(null);
  useEffect(() => { bgDataRef.current = bgData; }, [bgData]);

  /* ---- pending (free skill) ---- */
  const [pendingItems, setPendingItems] = useState([]);

  /* ---- roll state ---- */
  const [spinValue, setSpinValue] = useState(1);
  const [dieLocked, setDieLocked] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState(-1);

  /* ---- resolve state ---- */
  const [growthEntry, setGrowthEntry] = useState(null);
  const [resolveInfo, setResolveInfo] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [stat1, setStat1] = useState("");
  const [stat2, setStat2] = useState("");

  /* ---- roll outcome (for done phases) ---- */
  const [rollOutcome, setRollOutcome] = useState("");

  /* stable ref for onComplete */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /* ================================================================
     ELIMINATE — show all backgrounds, remove non-selected one by one
     ================================================================ */
  useEffect(() => {
    if (phase !== "eliminate") return;
    let cancelled = false;
    setEliminatedNames(new Set());
    setBgPhase("eliminating");

    const generated = offerBackgrounds(wcRef.current, 3);
    setOffers(generated);

    const selectedNames = new Set(generated.map((b) => b.name));
    const toEliminate = allBackgrounds
      .filter((b) => !selectedNames.has(b.name))
      .map((b) => b.name);

    /* Fisher-Yates shuffle for random elimination order */
    for (let i = toEliminate.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toEliminate[i], toEliminate[j]] = [toEliminate[j], toEliminate[i]];
    }

    const delay = 2400 / toEliminate.length;

    async function run() {
      await sleep(400);

      for (let i = 0; i < toEliminate.length; i++) {
        if (cancelled) return;
        setEliminatedNames((prev) => new Set([...prev, toEliminate[i]]));
        await sleep(delay);
      }

      if (cancelled) return;
      setBgPhase("highlighting");
      await sleep(800);

      if (cancelled) return;
      setBgPhase("expanding");
      await sleep(1000);

      if (!cancelled) {
        setBgPhase("pickable");
        setPhase("pick");
      }
    }

    run();
    return () => { cancelled = true; };
  }, [phase]);

  /* ================================================================
     DIE SPINNING interval
     ================================================================ */
  useEffect(() => {
    if (!phase.endsWith("_roll") || dieLocked) return;
    const sides = phase === "growth_roll" ? 6 : 8;
    const iv = setInterval(() => {
      setSpinValue(Math.ceil(Math.random() * sides));
    }, 50);
    return () => clearInterval(iv);
  }, [phase, dieLocked]);

  /* ================================================================
     AUTO-LOCK + PROCESS after die animation
     ================================================================ */
  useEffect(() => {
    if (!phase.endsWith("_roll")) return;
    const currentPhase = phase;
    setDieLocked(false);
    setHighlightedRow(-1);

    const rollKey =
      currentPhase === "growth_roll" ? "growth" :
      currentPhase === "learn1_roll" ? "learn1" : "learn2";
    const actual = preRolls.current[rollKey];
    let cancelled = false;

    /* lock die at 2s */
    const lockTimer = setTimeout(() => {
      if (cancelled) return;
      setDieLocked(true);
      setSpinValue(actual);
      setHighlightedRow(actual - 1);
    }, 2000);

    /* process result at 2.8s */
    const processTimer = setTimeout(() => {
      if (cancelled) return;
      const bd = bgDataRef.current;
      const wc = wcRef.current;
      if (!bd) return;

      if (currentPhase === "growth_roll") {
        const entry = bd.growth[actual - 1];
        setGrowthEntry(entry);

        if (!entry.startsWith("+") && entry !== "Any Skill") {
          const next = deepClone(wc);
          try {
            resolveGrowthRoll(next, entry, {});
            setWorkingChar(next);
            setRollOutcome(`Gained ${entry}`);
            setTimeout(() => { if (!cancelled) setPhase("growth_done"); }, 600);
          } catch {
            setResolveInfo({ type: "growth_redirect", original: entry });
            setPhase("growth_resolve");
          }
        } else {
          const type = entry === "Any Skill" ? "growth_any_skill" : "growth_stat";
          setResolveInfo({ type, entry });
          setPhase("growth_resolve");
        }
      } else {
        /* learning roll */
        const entry = bd.learning[actual - 1];

        if (entry === "Any Skill" || entry === "Any Combat") {
          setResolveInfo({
            type: entry === "Any Combat" ? "learning_combat" : "learning_any_skill",
          });
          setPhase(currentPhase === "learn1_roll" ? "learn1_resolve" : "learn2_resolve");
        } else {
          const next = deepClone(wc);
          try {
            resolveLearningPick(next, entry);
            setWorkingChar(next);
            setRollOutcome(`Learned ${entry}`);
            const donePh = currentPhase === "learn1_roll" ? "learn1_done" : "learn2_done";
            setTimeout(() => { if (!cancelled) setPhase(donePh); }, 600);
          } catch {
            setResolveInfo({ type: "learning_redirect", original: entry });
            setPhase(currentPhase === "learn1_roll" ? "learn1_resolve" : "learn2_resolve");
          }
        }
      }
    }, 2800);

    return () => {
      cancelled = true;
      clearTimeout(lockTimer);
      clearTimeout(processTimer);
    };
  }, [phase]);

  /* ================================================================
     HANDLERS
     ================================================================ */

  const handlePickBg = (bgName) => {
    const next = deepClone(workingChar);
    const { pending, pendingChoices } = applyBackground(next, bgName);
    setWorkingChar(next);
    setBgData(pendingChoices);
    if (pending.length > 0) {
      setPendingItems(pending);
      setPhase("free_skill_resolve");
    } else {
      setPhase("growth_roll");
    }
  };

  const handleFreeSkillResolve = (choice) => {
    const next = deepClone(workingChar);
    resolvePending(next, pendingItems[0], choice);
    setWorkingChar(next);
    const remaining = pendingItems.slice(1);
    if (remaining.length > 0) {
      setPendingItems(remaining);
    } else {
      setPendingItems([]);
      setPhase("growth_roll");
    }
  };

  const handleGrowthStatResolve = (stat) => {
    const next = deepClone(workingChar);
    resolveGrowthRoll(next, growthEntry, { stat });
    setWorkingChar(next);
    setRollOutcome(`Applied ${growthEntry} \u2192 ${stat}`);
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleGrowthSplitResolve = () => {
    const next = deepClone(workingChar);
    resolveGrowthRoll(next, growthEntry, { split: { stat1, stat2 } });
    setWorkingChar(next);
    setRollOutcome(`Applied +1 ${stat1}, +1 ${stat2}`);
    setSplitMode(false);
    setStat1("");
    setStat2("");
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleGrowthSkillResolve = (skillName) => {
    const next = deepClone(workingChar);
    resolveLearningPick(next, skillName);
    setWorkingChar(next);
    setRollOutcome(`Gained ${skillName}`);
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleLearningResolve = (skillName) => {
    const currentPhase = phase;
    const next = deepClone(workingChar);
    resolveLearningPick(next, skillName);
    setWorkingChar(next);
    setRollOutcome(`Learned ${skillName}`);
    const donePh = currentPhase === "learn1_resolve" ? "learn1_done" : "learn2_done";
    setTimeout(() => setPhase(donePh), 400);
  };

  const handleNextAfterRoll = () => {
    if (phase === "growth_done") setPhase("learn1_roll");
    else if (phase === "learn1_done") setPhase("learn2_roll");
    else onComplete(workingChar);
  };

  const availableSkills = ALL_SKILLS.filter(
    (s) => workingChar.skills[s] === undefined || workingChar.skills[s] < 1
  );

  /* ================================================================
     RENDER HELPERS
     ================================================================ */

  const renderGrowthResolver = () => {
    if (!resolveInfo) return null;

    if (resolveInfo.type === "growth_redirect") {
      return (
        <>
          <p className="step-desc">
            Rolled <strong className="growth-result">{resolveInfo.original}</strong>{" "}
            but it&apos;s already at cap. Pick any other skill:
          </p>
          <div className="choices">
            {availableSkills.map((s) => (
              <button key={s} className="btn-choice" onClick={() => handleGrowthSkillResolve(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      );
    }

    if (resolveInfo.type === "growth_any_skill") {
      return (
        <>
          <p className="step-desc">
            Rolled: <strong className="growth-result">Any Skill</strong> &mdash; pick one:
          </p>
          <div className="choices">
            {availableSkills.map((s) => (
              <button key={s} className="btn-choice" onClick={() => handleGrowthSkillResolve(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      );
    }

    /* growth_stat — parse "+N Category" */
    const match = growthEntry.match(/^\+(\d)\s+(.+)$/);
    if (!match) return null;
    const bonus = parseInt(match[1]);
    const category = match[2];
    const validStats =
      category === "Physical" ? ["strength", "dexterity", "constitution"] :
      category === "Mental" ? ["intelligence", "wisdom", "charisma"] :
      ATTR_NAMES;

    return (
      <>
        <p className="step-desc">
          Rolled: <strong className="growth-result">{growthEntry}</strong>
        </p>
        {bonus === 2 && (
          <label className="bg-resolve-split-label">
            <input
              type="checkbox"
              checked={splitMode}
              onChange={() => setSplitMode(!splitMode)}
            />
            Split into +1/+1
          </label>
        )}
        {splitMode ? (
          <div className="choices" style={{ alignItems: "flex-end" }}>
            <select value={stat1} onChange={(e) => setStat1(e.target.value)}>
              <option value="">Stat 1</option>
              {validStats.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={stat2} onChange={(e) => setStat2(e.target.value)}>
              <option value="">Stat 2</option>
              {validStats.filter((s) => s !== stat1).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              className="btn-action"
              disabled={!stat1 || !stat2}
              onClick={handleGrowthSplitResolve}
            >
              Apply
            </button>
          </div>
        ) : (
          <div className="choices">
            {validStats.map((s) => (
              <button
                key={s}
                className="btn-choice"
                onClick={() => handleGrowthStatResolve(s)}
              >
                {s}
                <span className="btn-choice-sub">
                  {workingChar.attributes[s].score}
                </span>
              </button>
            ))}
          </div>
        )}
      </>
    );
  };

  const renderLearningResolver = () => {
    if (!resolveInfo) return null;

    if (resolveInfo.type === "learning_redirect") {
      return (
        <>
          <p className="step-desc">
            Rolled <strong className="growth-result">{resolveInfo.original}</strong>{" "}
            but it&apos;s already at cap. Pick any other skill:
          </p>
          <div className="choices">
            {availableSkills.map((s) => (
              <button key={s} className="btn-choice" onClick={() => handleLearningResolve(s)}>
                {s}
              </button>
            ))}
          </div>
        </>
      );
    }

    const skills =
      resolveInfo.type === "learning_combat"
        ? COMBAT_SKILLS.filter(
            (s) => workingChar.skills[s] === undefined || workingChar.skills[s] < 1
          )
        : availableSkills;

    return (
      <>
        <p className="step-desc">
          Rolled:{" "}
          <strong className="growth-result">
            {resolveInfo.type === "learning_combat" ? "Any Combat" : "Any Skill"}
          </strong>{" "}
          &mdash; pick a skill:
        </p>
        <div className="choices">
          {skills.map((s) => (
            <button key={s} className="btn-choice" onClick={() => handleLearningResolve(s)}>
              {s}
            </button>
          ))}
        </div>
      </>
    );
  };

  const renderDie = () => (
    <motion.div
      className={`die-block ${dieLocked ? "locked" : "spinning"} bg-die`}
      animate={
        dieLocked
          ? {
              scale: [1, 1.25, 0.95, 1],
              boxShadow: [
                "0 0 0px rgba(0,229,255,0)",
                "0 0 30px rgba(0,229,255,0.6)",
                "0 0 15px rgba(0,229,255,0.3)",
                "0 0 8px rgba(0,229,255,0.15)",
              ],
            }
          : {}
      }
      transition={dieLocked ? { duration: 0.5, ease: "easeOut" } : {}}
    >
      {spinValue}
    </motion.div>
  );

  const renderRollTable = (entries) => (
    <div className="bg-roll-table">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`bg-roll-table-row${highlightedRow === i ? " highlighted" : ""}`}
        >
          <span className="bg-table-index">{i + 1}</span>
          <span>{entry}</span>
        </div>
      ))}
    </div>
  );

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="bg-sequence">
      <AnimatePresence mode="wait">
        {/* ---- ELIMINATE / PICK (unified) ---- */}
        {(phase === "eliminate" || phase === "pick") && (
          <motion.div
            key="bg-selection"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {bgPhase === "eliminating" && (
                <motion.div
                  key="bg-pool-header"
                  className="bg-item-row bg-pool-header"
                  exit={{ opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3 }}
                >
                  <span>#</span>
                  <span>Background</span>
                  <span>Description</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="bg-pool-list">
              <AnimatePresence>
                {allBackgrounds
                  .filter((b) => !eliminatedNames.has(b.name))
                  .map((b) => {
                    const isHighlighted =
                      bgPhase === "highlighting" ||
                      bgPhase === "expanding" ||
                      bgPhase === "pickable";
                    const isExpanded =
                      bgPhase === "expanding" || bgPhase === "pickable";
                    const isPickable = bgPhase === "pickable";
                    const isSelected = selectedBg === b.name;
                    const bgIdx = allBackgrounds.indexOf(b) + 1;
                    const offerIdx = offers
                      ? offers.findIndex((o) => o.name === b.name)
                      : -1;

                    return (
                      <motion.div
                        key={b.name}
                        layout
                        className={`bg-item${isExpanded ? " bg-item-expanded" : ""}${isPickable ? " bg-item-pickable" : ""}${isSelected ? " bg-item-selected" : ""}`}
                        animate={{
                          backgroundColor: isSelected
                            ? "rgba(255, 182, 39, 0.1)"
                            : isHighlighted
                              ? "rgba(0, 229, 255, 0.08)"
                              : "rgba(0, 0, 0, 0)",
                          borderColor: isSelected
                            ? "rgba(255, 182, 39, 0.5)"
                            : isHighlighted
                              ? "rgba(0, 229, 255, 0.2)"
                              : "rgba(255, 255, 255, 0.06)",
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
                          backgroundColor: { duration: 0.3 },
                          borderColor: { duration: 0.3 },
                          default: { duration: 0.2 },
                        }}
                        onClick={isPickable ? () => setSelectedBg(b.name) : undefined}
                      >
                        {!isExpanded && (
                          <div className="bg-item-row">
                            <span
                              className={`bg-pool-idx${isHighlighted ? " bg-highlighted" : ""}`}
                            >
                              {bgIdx}
                            </span>
                            <span
                              className={`bg-pool-name${isHighlighted ? " bg-highlighted" : ""}`}
                            >
                              {b.name}
                            </span>
                            <span className="bg-pool-desc">{b.description}</span>
                          </div>
                        )}

                        {isExpanded && (
                          <motion.div
                            className="bg-item-details"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                          >
                            {offerIdx >= 0 && (
                              <span className="offer-card-id">
                                #{String(offerIdx + 1).padStart(2, "0")}
                              </span>
                            )}
                            <h3>{b.name}</h3>
                            <p className="offer-card-desc">{b.description}</p>
                            <span className="offer-card-detail">
                              Free skill: {b.free_skill}
                            </span>
                            <div className="bg-table-section">
                              <div className="bg-table">
                                <div className="bg-table-title">Growth (d6)</div>
                                {b.growth.map((entry, gi) => (
                                  <div key={gi} className="bg-table-row">
                                    <span className="bg-table-index">{gi + 1}</span>
                                    <span>{entry}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="bg-table">
                                <div className="bg-table-title">Learning (d8)</div>
                                {b.learning.map((entry, li) => (
                                  <div key={li} className="bg-table-row">
                                    <span className="bg-table-index">{li + 1}</span>
                                    <span>{entry}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {selectedBg && (
                <motion.div
                  key="bg-confirm"
                  className="bg-confirm-wrap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    className="btn-action"
                    onClick={() => handlePickBg(selectedBg)}
                  >
                    <span className="btn-prompt">&gt;_</span> Confirm {selectedBg}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ---- FREE SKILL RESOLVE ---- */}
        {phase === "free_skill_resolve" && pendingItems.length > 0 && (
          <motion.div
            key="free-skill"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-resolve-inline"
          >
            <p className="step-desc">
              Your background&apos;s free skill requires a choice:
            </p>
            <div className="choices">
              {(pendingItems[0].category === "combat"
                ? COMBAT_SKILLS
                : pendingItems[0].options || ALL_SKILLS
              )
                .filter(
                  (s) =>
                    workingChar.skills[s] === undefined ||
                    workingChar.skills[s] < 1
                )
                .map((s) => (
                  <button
                    key={s}
                    className="btn-choice"
                    onClick={() => handleFreeSkillResolve(s)}
                  >
                    {s}
                  </button>
                ))}
            </div>
          </motion.div>
        )}

        {/* ---- GROWTH ROLL ---- */}
        {phase === "growth_roll" && bgData && (
          <motion.div
            key="growth-roll"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-roll-section"
          >
            <div className="bg-roll-header">
              <span className="bg-roll-label">Growth Roll</span>
              <span className="bg-roll-sub">d6</span>
            </div>
            <div className="bg-roll-body">
              {renderRollTable(bgData.growth)}
              <div className="bg-roll-die-area">{renderDie()}</div>
            </div>
          </motion.div>
        )}

        {/* ---- GROWTH RESOLVE ---- */}
        {phase === "growth_resolve" && (
          <motion.div
            key="growth-resolve"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-resolve-inline"
          >
            {renderGrowthResolver()}
          </motion.div>
        )}

        {/* ---- LEARNING ROLLS ---- */}
        {(phase === "learn1_roll" || phase === "learn2_roll") && bgData && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-roll-section"
          >
            <div className="bg-roll-header">
              <span className="bg-roll-label">
                Learning Roll ({phase === "learn1_roll" ? "1" : "2"} of 2)
              </span>
              <span className="bg-roll-sub">d8</span>
            </div>
            <div className="bg-roll-body">
              {renderRollTable(bgData.learning)}
              <div className="bg-roll-die-area">{renderDie()}</div>
            </div>
          </motion.div>
        )}

        {/* ---- LEARNING RESOLVE ---- */}
        {(phase === "learn1_resolve" || phase === "learn2_resolve") && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-resolve-inline"
          >
            {renderLearningResolver()}
          </motion.div>
        )}

        {/* ---- ROLL DONE (pause for user to read) ---- */}
        {(phase === "growth_done" || phase === "learn1_done" || phase === "learn2_done") && bgData && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-roll-section"
          >
            <div className="bg-roll-header">
              <span className="bg-roll-label">
                {phase === "growth_done"
                  ? "Growth Roll"
                  : `Learning Roll (${phase === "learn1_done" ? "1" : "2"} of 2)`}
              </span>
              <span className="bg-roll-sub">
                {phase === "growth_done" ? "d6" : "d8"}
              </span>
            </div>
            <div className="bg-roll-body">
              {renderRollTable(
                phase === "growth_done" ? bgData.growth : bgData.learning
              )}
              <div className="bg-roll-die-area">
                <div className="die-block locked bg-die">
                  {preRolls.current[
                    phase === "growth_done" ? "growth" :
                    phase === "learn1_done" ? "learn1" : "learn2"
                  ]}
                </div>
              </div>
            </div>
            <div className="bg-roll-result">
              <span className="bg-roll-result-text">{rollOutcome}</span>
              <button className="btn-action" onClick={handleNextAfterRoll}>
                <span className="btn-prompt">&gt;_</span> Continue
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
