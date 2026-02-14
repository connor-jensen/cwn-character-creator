import { useState, useEffect } from "react";
import {
  resolveGrowthRoll,
  resolveLearningPick,
} from "../../../../cwn-engine.js";
import { ROLL_STEP } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";

/**
 * Manages die-spinning, auto-lock/process, auto-advance, and resolve handlers
 * for the growth and learning roll phases of the background sequence.
 */
export default function useRollPhase({
  phase,
  setPhase,
  wcRef,
  setWorkingChar,
  bgDataRef,
  preRolls,
}) {
  const [spinValue, setSpinValue] = useState(1);
  const [dieLocked, setDieLocked] = useState(false);
  const [highlightedRow, setHighlightedRow] = useState(-1);
  const [growthEntry, setGrowthEntry] = useState(null);
  const [resolveInfo, setResolveInfo] = useState(null);
  const [selectedResolveChoice, setSelectedResolveChoice] = useState(null);
  const [rollOutcomes, setRollOutcomes] = useState({ growth: "", learn1: "", learn2: "" });

  /* Reset resolve choice on phase change (render-time derivation) */
  const [prevPhase, setPrevPhase] = useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    setSelectedResolveChoice(null);
  }

  /* Reset die state when entering a roll phase (render-time derivation) */
  const currentRollPhase = phase.endsWith("_roll") ? phase : null;
  const [prevRollPhase, setPrevRollPhase] = useState(null);
  if (currentRollPhase !== prevRollPhase) {
    setPrevRollPhase(currentRollPhase);
    if (currentRollPhase) {
      setDieLocked(false);
      setHighlightedRow(-1);
    }
  }

  /* ---- DIE SPINNING interval ---- */
  useEffect(() => {
    if (!phase.endsWith("_roll") || dieLocked) return;
    const sides = phase === "growth_roll" ? 6 : 8;
    const iv = setInterval(() => {
      setSpinValue(Math.ceil(Math.random() * sides));
    }, 50);
    return () => clearInterval(iv);
  }, [phase, dieLocked]);

  /* ---- AUTO-LOCK + PROCESS after die animation ---- */
  useEffect(() => {
    if (!phase.endsWith("_roll")) return;
    const currentPhase = phase;

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
  }, [phase, preRolls, bgDataRef, wcRef, setWorkingChar, setPhase]);

  /* ---- AUTO-ADVANCE from done phases ---- */
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
  }, [phase, setPhase]);

  /* ---- RESOLVE HANDLERS ---- */

  const handleGrowthStatResolve = (stat) => {
    const next = deepClone(wcRef.current);
    resolveGrowthRoll(next, growthEntry, { stat });
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, growth: `Applied ${growthEntry} \u2192 ${stat}` }));
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleGrowthSkillResolve = (skillName) => {
    const next = deepClone(wcRef.current);
    resolveLearningPick(next, skillName);
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, growth: `Gained ${skillName}` }));
    setTimeout(() => setPhase("growth_done"), 400);
  };

  const handleLearningResolve = (skillName) => {
    const key = phase === "learn1_resolve" ? "learn1" : "learn2";
    const next = deepClone(wcRef.current);
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

  const resolveGrowthSplit = (s1, s2) => {
    const next = deepClone(wcRef.current);
    resolveGrowthRoll(next, growthEntry, { split: { stat1: s1, stat2: s2 } });
    setWorkingChar(next);
    setRollOutcomes(prev => ({ ...prev, growth: `Applied +1 ${s1}, +1 ${s2}` }));
    setTimeout(() => setPhase("growth_done"), 400);
  };

  return {
    spinValue,
    dieLocked,
    highlightedRow,
    growthEntry,
    resolveInfo,
    selectedResolveChoice,
    setSelectedResolveChoice,
    rollOutcomes,
    handleConfirmResolve,
    resolveGrowthSplit,
  };
}
