import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import {
  rollDie,
  offerBackgrounds,
  applyBackground,
  resolveGrowthRoll,
  resolveLearningPick,
  resolvePending,
  backgrounds as allBackgrounds,
} from "../../../../cwn-engine.js";
import { ALL_SKILLS, COMBAT_SKILLS, ATTR_NAMES, ROLL_STEP } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";
import "./BackgroundSequence.css";

const PHASE_ORDER = [
  "eliminate", "pick", "free_skill_resolve",
  "growth_roll", "growth_resolve", "growth_done",
  "learn1_roll", "learn1_resolve", "learn1_done",
  "learn2_roll", "learn2_resolve", "learn2_done",
  "confirm",
];

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
  const [revealedNames, setRevealedNames] = useState(new Set());
  const [bgPhase, setBgPhase] = useState("revealing");
  const [offers, setOffers] = useState(null);
  const [selectedBg, setSelectedBg] = useState(null);
  const [confirmedBg, setConfirmedBg] = useState(null);

  /* ---- background data ---- */
  const [bgData, setBgData] = useState(null);
  const bgDataRef = useRef(null);
  useEffect(() => { bgDataRef.current = bgData; }, [bgData]);

  /* ---- pending (free skill) ---- */
  const [pendingItems, setPendingItems] = useState([]);

  /* ---- roll state (shared for active roll) ---- */
  const [spinValue, setSpinValue] = useState(1);
  const [dieLocked, setDieLocked] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState(-1);

  /* ---- resolve state ---- */
  const [growthEntry, setGrowthEntry] = useState(null);
  const [resolveInfo, setResolveInfo] = useState(null);
  const [splitMode, setSplitMode] = useState(false);
  const [stat1, setStat1] = useState("");
  const [stat2, setStat2] = useState("");
  const [selectedResolveChoice, setSelectedResolveChoice] = useState(null);

  /* ---- roll outcomes (per roll type) ---- */
  const [rollOutcomes, setRollOutcomes] = useState({ growth: "", learn1: "", learn2: "" });

  /* stable ref for onComplete */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /* reset resolve choice on phase change */
  useEffect(() => {
    setSelectedResolveChoice(null);
  }, [phase]);

  /* ---- phase helpers ---- */
  const phaseAtLeast = (target) =>
    PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(target);

  const getRollDisplayState = (rollPhase, rollKey) => {
    if (phase === rollPhase) {
      return { dieValue: spinValue, locked: dieLocked, highlight: highlightedRow, isStatic: false };
    }
    return {
      dieValue: preRolls.current[rollKey],
      locked: true,
      highlight: preRolls.current[rollKey] - 1,
      isStatic: true,
    };
  };

  /* active roll type (growth / learn1 / learn2 / null) */
  const activeRollType = (() => {
    if (["growth_roll", "growth_resolve", "growth_done"].includes(phase)) return "growth";
    if (["learn1_roll", "learn1_resolve", "learn1_done"].includes(phase)) return "learn1";
    if (["learn2_roll", "learn2_resolve", "learn2_done"].includes(phase)) return "learn2";
    return null;
  })();

  /* ================================================================
     ELIMINATE — all dimmed, reveal 3 selected, then collapse others
     ================================================================ */
  useEffect(() => {
    if (phase !== "eliminate") return;
    let cancelled = false;
    setEliminatedNames(new Set());
    setRevealedNames(new Set());
    setBgPhase("revealing");

    const generated = offerBackgrounds(wcRef.current, 3);
    setOffers(generated);

    const toReveal = generated.map((b) => b.name);
    for (let i = toReveal.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [toReveal[i], toReveal[j]] = [toReveal[j], toReveal[i]];
    }

    const nonSelected = new Set(
      allBackgrounds.filter((b) => !toReveal.includes(b.name)).map((b) => b.name)
    );

    async function run() {
      await sleep(600);
      for (let i = 0; i < toReveal.length; i++) {
        if (cancelled) return;
        setRevealedNames((prev) => new Set([...prev, toReveal[i]]));
        await sleep(500);
      }
      if (cancelled) return;
      setBgPhase("highlighting");
      await sleep(1000);
      if (cancelled) return;
      setEliminatedNames(nonSelected);
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

    const lockTimer = setTimeout(() => {
      if (cancelled) return;
      setDieLocked(true);
      setSpinValue(actual);
      setHighlightedRow(actual - 1);
    }, ROLL_STEP * 2);

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
            setRollOutcomes(prev => ({ ...prev, growth: `Gained ${entry}` }));
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
        const entry = bd.learning[actual - 1];
        const outcomeKey = currentPhase === "learn1_roll" ? "learn1" : "learn2";

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
            setRollOutcomes(prev => ({ ...prev, [outcomeKey]: `Learned ${entry}` }));
            const donePh = currentPhase === "learn1_roll" ? "learn1_done" : "learn2_done";
            setTimeout(() => { if (!cancelled) setPhase(donePh); }, 600);
          } catch {
            setResolveInfo({ type: "learning_redirect", original: entry });
            setPhase(currentPhase === "learn1_roll" ? "learn1_resolve" : "learn2_resolve");
          }
        }
      }
    }, ROLL_STEP * 2 + 800);

    return () => {
      cancelled = true;
      clearTimeout(lockTimer);
      clearTimeout(processTimer);
    };
  }, [phase]);

  /* ================================================================
     AUTO-ADVANCE from done phases
     ================================================================ */
  useEffect(() => {
    if (phase === "growth_done") {
      const timer = setTimeout(() => setPhase("learn1_roll"), 1000);
      return () => clearTimeout(timer);
    }
    if (phase === "learn1_done") {
      const timer = setTimeout(() => setPhase("learn2_roll"), 1000);
      return () => clearTimeout(timer);
    }
    if (phase === "learn2_done") {
      const timer = setTimeout(() => setPhase("confirm"), 1000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  /* ================================================================
     HANDLERS
     ================================================================ */

  const handlePickBg = (bgName) => {
    setConfirmedBg(bgName);
    const unselected = offers.filter(o => o.name !== bgName).map(o => o.name);
    setEliminatedNames(prev => new Set([...prev, ...unselected]));
    setBgPhase("confirmed");

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
    setRollOutcomes(prev => ({ ...prev, growth: `Applied ${growthEntry} \u2192 ${stat}` }));
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleGrowthSplitResolve = () => {
    const next = deepClone(workingChar);
    resolveGrowthRoll(next, growthEntry, { split: { stat1, stat2 } });
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, growth: `Applied +1 ${stat1}, +1 ${stat2}` }));
    setSplitMode(false);
    setStat1("");
    setStat2("");
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleGrowthSkillResolve = (skillName) => {
    const next = deepClone(workingChar);
    resolveLearningPick(next, skillName);
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, growth: `Gained ${skillName}` }));
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleLearningResolve = (skillName) => {
    const key = phase === "learn1_resolve" ? "learn1" : "learn2";
    const next = deepClone(workingChar);
    resolveLearningPick(next, skillName);
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, [key]: `Learned ${skillName}` }));
    const donePh = phase === "learn1_resolve" ? "learn1_done" : "learn2_done";
    setTimeout(() => setPhase(donePh), 400);
  };

  const handleConfirmResolve = () => {
    if (!selectedResolveChoice) return;
    if (phase === "growth_resolve") {
      if (resolveInfo?.type === "growth_stat") {
        handleGrowthStatResolve(selectedResolveChoice);
      } else {
        handleGrowthSkillResolve(selectedResolveChoice);
      }
    } else {
      handleLearningResolve(selectedResolveChoice);
    }
    setSelectedResolveChoice(null);
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
              <button
                key={s}
                className={`btn-choice${selectedResolveChoice === s ? " btn-choice-selected" : ""}`}
                onClick={() => setSelectedResolveChoice(s)}
              >
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
              <button
                key={s}
                className={`btn-choice${selectedResolveChoice === s ? " btn-choice-selected" : ""}`}
                onClick={() => setSelectedResolveChoice(s)}
              >
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
              onChange={() => { setSplitMode(!splitMode); setSelectedResolveChoice(null); }}
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
                className={`btn-choice${selectedResolveChoice === s ? " btn-choice-selected" : ""}`}
                onClick={() => setSelectedResolveChoice(s)}
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
              <button
                key={s}
                className={`btn-choice${selectedResolveChoice === s ? " btn-choice-selected" : ""}`}
                onClick={() => setSelectedResolveChoice(s)}
              >
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
            <button
              key={s}
              className={`btn-choice${selectedResolveChoice === s ? " btn-choice-selected" : ""}`}
              onClick={() => setSelectedResolveChoice(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </>
    );
  };

  const renderDie = (value, locked, isStatic = false) => {
    if (isStatic) {
      return <div className="die-block locked bg-die">{value}</div>;
    }
    return (
      <motion.div
        className={`die-block ${locked ? "locked" : "spinning"} bg-die`}
        animate={
          locked
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
        transition={locked ? { duration: 0.5, ease: "easeOut" } : {}}
      >
        {value}
      </motion.div>
    );
  };

  /* ================================================================
     RENDER
     ================================================================ */
  const growthDisplay = getRollDisplayState("growth_roll", "growth");
  const learn1Display = getRollDisplayState("learn1_roll", "learn1");
  const learn2Display = getRollDisplayState("learn2_roll", "learn2");

  const activeDieDisplay =
    activeRollType === "growth" ? growthDisplay :
    activeRollType === "learn1" ? learn1Display :
    activeRollType === "learn2" ? learn2Display :
    null;

  const rollLabel =
    activeRollType === "growth" ? "Growth Roll" :
    activeRollType === "learn1" ? "Learning Roll (1/2)" :
    activeRollType === "learn2" ? "Learning Roll (2/2)" :
    "";

  const rollDieType = activeRollType === "growth" ? "d6" : "d8";

  /* highlight sets for card tables */
  const growthHighlights = new Set();
  if (phaseAtLeast("growth_roll") && growthDisplay.highlight >= 0) {
    growthHighlights.add(growthDisplay.highlight);
  }
  const learningHighlights = new Set();
  if (phaseAtLeast("learn1_roll") && learn1Display.highlight >= 0) {
    learningHighlights.add(learn1Display.highlight);
  }
  if (phaseAtLeast("learn2_roll") && learn2Display.highlight >= 0) {
    learningHighlights.add(learn2Display.highlight);
  }

  return (
    <div className="bg-sequence">
      {/* ---- BACKGROUND CARDS (persist after confirmation) ---- */}
      {(phase === "eliminate" || phase === "pick" || confirmedBg) && (
        <motion.div
          key="bg-selection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence>
            {(bgPhase === "revealing" || bgPhase === "highlighting") && (
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
                  const isRevealed = revealedNames.has(b.name);
                  const isRevealing = bgPhase === "revealing" || bgPhase === "highlighting";
                  const isDimmed = isRevealing && !isRevealed;
                  const showCyan = (isRevealing && isRevealed) || bgPhase === "expanding" || bgPhase === "pickable";
                  const isConfirmed = confirmedBg === b.name;
                  const isExpanded =
                    bgPhase === "expanding" || bgPhase === "pickable" || isConfirmed;
                  const isPickable = bgPhase === "pickable" && !confirmedBg;
                  const isSelected = selectedBg === b.name;
                  const bgIdx = allBackgrounds.indexOf(b) + 1;
                  const offerIdx = offers
                    ? offers.findIndex((o) => o.name === b.name)
                    : -1;

                  return (
                    <motion.div
                      key={b.name}
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
                      onClick={isPickable ? () => setSelectedBg(b.name) : undefined}
                    >
                      {!isExpanded && (
                        <div className="bg-item-row">
                          <span
                            className={`bg-pool-idx${showCyan ? " bg-highlighted" : ""}`}
                          >
                            {bgIdx}
                          </span>
                          <span
                            className={`bg-pool-name${showCyan ? " bg-highlighted" : ""}`}
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
                          style={{ position: "relative" }}
                        >
                          {/* ---- Die area (top-right of card) ---- */}
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
                          <h3>{b.name}</h3>
                          <p className="offer-card-desc">{b.description}</p>
                          <span className="offer-card-detail">
                            Free skill: {b.free_skill}
                          </span>

                          {/* ---- Tables with roll highlights ---- */}
                          <div className="bg-table-section">
                            <div className="bg-table">
                              <div className={`bg-table-title${isConfirmed && activeRollType === "growth" ? " bg-table-title-active" : ""}`}>
                                Growth (d6)
                              </div>
                              {b.growth.map((entry, gi) => (
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
                              {b.learning.map((entry, li) => (
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

                          {/* ---- Outcomes area ---- */}
                          <AnimatePresence>
                            {isConfirmed && (rollOutcomes.growth || rollOutcomes.learn1 || rollOutcomes.learn2) && (
                              <motion.div
                                key="outcomes"
                                className="bg-card-outcomes"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                {rollOutcomes.growth && (
                                  <motion.div
                                    key="og"
                                    className="bg-card-outcome-item"
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <span className="bg-card-outcome-label">Growth:</span>
                                    <span className="bg-roll-result-text">{rollOutcomes.growth}</span>
                                  </motion.div>
                                )}
                                {rollOutcomes.learn1 && (
                                  <motion.div
                                    key="ol1"
                                    className="bg-card-outcome-item"
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <span className="bg-card-outcome-label">Learning 1:</span>
                                    <span className="bg-roll-result-text">{rollOutcomes.learn1}</span>
                                  </motion.div>
                                )}
                                {rollOutcomes.learn2 && (
                                  <motion.div
                                    key="ol2"
                                    className="bg-card-outcome-item"
                                    initial={{ opacity: 0, x: -5 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <span className="bg-card-outcome-label">Learning 2:</span>
                                    <span className="bg-roll-result-text">{rollOutcomes.learn2}</span>
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {selectedBg && !confirmedBg && (
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
      <AnimatePresence>
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
      </AnimatePresence>

      {/* ---- GROWTH RESOLVE (with confirm) ---- */}
      <AnimatePresence>
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
            <AnimatePresence>
              {selectedResolveChoice && !splitMode && (
                <motion.div
                  key="confirm-growth"
                  className="bg-confirm-wrap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <button className="btn-action" onClick={handleConfirmResolve}>
                    <span className="btn-prompt">&gt;_</span> Confirm {selectedResolveChoice}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- LEARNING 1 RESOLVE (with confirm) ---- */}
      <AnimatePresence>
        {phase === "learn1_resolve" && (
          <motion.div
            key="learn1-resolve"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-resolve-inline"
          >
            {renderLearningResolver()}
            <AnimatePresence>
              {selectedResolveChoice && (
                <motion.div
                  key="confirm-learn1"
                  className="bg-confirm-wrap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <button className="btn-action" onClick={handleConfirmResolve}>
                    <span className="btn-prompt">&gt;_</span> Confirm {selectedResolveChoice}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- LEARNING 2 RESOLVE (with confirm) ---- */}
      <AnimatePresence>
        {phase === "learn2_resolve" && (
          <motion.div
            key="learn2-resolve"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-resolve-inline"
          >
            {renderLearningResolver()}
            <AnimatePresence>
              {selectedResolveChoice && (
                <motion.div
                  key="confirm-learn2"
                  className="bg-confirm-wrap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <button className="btn-action" onClick={handleConfirmResolve}>
                    <span className="btn-prompt">&gt;_</span> Confirm {selectedResolveChoice}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- CONFIRM BACKGROUND (after all rolls done) ---- */}
      <AnimatePresence>
        {phase === "confirm" && (
          <motion.div
            key="bg-final-confirm"
            className="bg-confirm-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
          >
            <button
              className="btn-action"
              onClick={() => onCompleteRef.current(wcRef.current)}
            >
              <span className="btn-prompt">&gt;_</span> Confirm Background
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
