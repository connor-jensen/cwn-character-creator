import { useState, useEffect, useRef } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import {
  rollDie,
  offerBackgrounds,
  applyBackground,
  resolvePending,
  backgrounds as allBackgrounds,
} from "../../../../cwn-engine.js";
import { COMBAT_SKILLS } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";
import {
  getActiveRollType,
  getRollDisplayState as _getRollDisplayState,
  getRollLabel,
  getRollDieType,
  computeHighlightSets,
} from "./BackgroundSequence.helpers.js";
import useRollPhase from "./useRollPhase.js";
import GrowthResolver from "./GrowthResolver.jsx";
import LearningResolver from "./LearningResolver.jsx";
import ResolvePanel from "./ResolvePanel.jsx";
import BackgroundCard from "./BackgroundCard.jsx";
import ConfirmButton from "../ConfirmButton";
import ChoiceGrid from "../ChoiceGrid";
import DieBlock from "../DieBlock";
import "./BackgroundSequence.css";

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

  /* stable ref for onComplete */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /* ---- roll phase hook (die spinning, auto-lock, resolve handlers) ---- */
  const {
    spinValue, dieLocked, highlightedRow,
    growthEntry, resolveInfo,
    selectedResolveChoice, setSelectedResolveChoice,
    rollOutcomes,
    handleConfirmResolve,
    resolveGrowthSplit,
  } = useRollPhase({ phase, setPhase, wcRef, setWorkingChar, bgDataRef, preRolls });

  /* ---- phase helpers (delegated to helpers module) ---- */
  const getRollDisplayState = (rollPhase, rollKey) =>
    _getRollDisplayState(phase, rollPhase, rollKey, spinValue, dieLocked, highlightedRow, preRolls.current);
  const activeRollType = getActiveRollType(phase);

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

  const availableSkills = getAvailableSkills(workingChar);

  const renderDie = (value, locked, isStatic = false) => (
    <DieBlock
      value={value}
      locked={locked}
      animate={!isStatic}
      className="bg-die"
    />
  );

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

  const rollLabel = getRollLabel(activeRollType);
  const rollDieType = getRollDieType(activeRollType);
  const { growthHighlights, learningHighlights } = computeHighlightSets(phase, growthDisplay, learn1Display, learn2Display);

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

                  return (
                    <BackgroundCard
                      key={b.name}
                      bg={b}
                      bgIdx={allBackgrounds.indexOf(b) + 1}
                      offerIdx={offers ? offers.findIndex((o) => o.name === b.name) : -1}
                      isExpanded={bgPhase === "expanding" || bgPhase === "pickable" || confirmedBg === b.name}
                      isPickable={bgPhase === "pickable" && !confirmedBg}
                      isSelected={selectedBg === b.name}
                      isConfirmed={confirmedBg === b.name}
                      isDimmed={isRevealing && !isRevealed}
                      showCyan={(isRevealing && isRevealed) || bgPhase === "expanding" || bgPhase === "pickable"}
                      activeRollType={activeRollType}
                      activeDieDisplay={activeDieDisplay}
                      rollLabel={rollLabel}
                      rollDieType={rollDieType}
                      growthHighlights={growthHighlights}
                      learningHighlights={learningHighlights}
                      rollOutcomes={rollOutcomes}
                      renderDie={renderDie}
                      onSelect={setSelectedBg}
                      onConfirm={handlePickBg}
                    />
                  );
                })}
            </AnimatePresence>
          </div>

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
            <ChoiceGrid
              prompt={
                <p className="step-desc">
                  Your background&apos;s free skill requires a choice:
                </p>
              }
              items={getAvailableSkills(
                workingChar,
                pendingItems[0].category === "combat"
                  ? COMBAT_SKILLS
                  : pendingItems[0].options || undefined
              )}
              onSelect={handleFreeSkillResolve}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- GROWTH RESOLVE ---- */}
      <ResolvePanel
        isVisible={phase === "growth_resolve"}
        motionKey="growth-resolve"
        showConfirm={!!selectedResolveChoice}
        confirmLabel={`Confirm ${selectedResolveChoice}`}
        onConfirm={handleConfirmResolve}
      >
        <GrowthResolver
          resolveInfo={resolveInfo}
          growthEntry={growthEntry}
          workingChar={workingChar}
          availableSkills={availableSkills}
          selectedChoice={selectedResolveChoice}
          onSelect={setSelectedResolveChoice}
          onSplitApply={resolveGrowthSplit}
        />
      </ResolvePanel>

      {/* ---- LEARNING 1 RESOLVE ---- */}
      <ResolvePanel
        isVisible={phase === "learn1_resolve"}
        motionKey="learn1-resolve"
        showConfirm={!!selectedResolveChoice}
        confirmLabel={`Confirm ${selectedResolveChoice}`}
        onConfirm={handleConfirmResolve}
      >
        <LearningResolver
          resolveInfo={resolveInfo}
          workingChar={workingChar}
          availableSkills={availableSkills}
          selectedChoice={selectedResolveChoice}
          onSelect={setSelectedResolveChoice}
        />
      </ResolvePanel>

      {/* ---- LEARNING 2 RESOLVE ---- */}
      <ResolvePanel
        isVisible={phase === "learn2_resolve"}
        motionKey="learn2-resolve"
        showConfirm={!!selectedResolveChoice}
        confirmLabel={`Confirm ${selectedResolveChoice}`}
        onConfirm={handleConfirmResolve}
      >
        <LearningResolver
          resolveInfo={resolveInfo}
          workingChar={workingChar}
          availableSkills={availableSkills}
          selectedChoice={selectedResolveChoice}
          onSelect={setSelectedResolveChoice}
        />
      </ResolvePanel>

      {/* ---- CONFIRM BACKGROUND (after all rolls done) ---- */}
      <ConfirmButton
        isVisible={phase === "confirm"}
        label="Confirm Background"
        onClick={() => onCompleteRef.current(wcRef.current)}
      />
    </div>
  );
}
