import { useState, useCallback, useEffect, useRef } from "react";
import {
  createCharacter,
  setStatToFourteen,
  applyEdge,
  applyFocus,
  addBonusSkill,
  resolvePending,
  calculateDerivedStats,
  equipStartingGear,
  equipSpecialtyItem,
  getBonusProgramPending,
  generateContact,
  addGeneratedContact,
  getContactAllotment,
  offerEdges,
  offerFoci,
  edges as allEdges,
  foci as allFoci,
  updateModifiers,
} from "../../../../cwn-engine.js";
import { STEPS } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";

export default function useCharacterCreation({ step = 0, navigateToStep }) {
  const [char, setChar] = useState(createCharacter);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [offers, setOffers] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [selectedArmor, setSelectedArmor] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [generatedContacts, setGeneratedContacts] = useState(null);
  const [rollMode, setRollMode] = useState("standard");
  const [bonusSkillPick, setBonusSkillPick] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const devModeRef = useRef(false);
  const toggleDevMode = useCallback(() => {
    setDevMode(prev => {
      const next = !prev;
      devModeRef.current = next;
      return next;
    });
  }, []);

  // Keep a stable ref to navigateToStep so callbacks don't go stale
  const navigateRef = useRef(navigateToStep);
  useEffect(() => {
    navigateRef.current = navigateToStep;
  }, [navigateToStep]);

  const currentStep = STEPS[step];
  const isViewingLockedStep = step < maxStepReached;

  const offersForStep = (stepName, currentChar) => {
    if (stepName === "pick_edge_1" || stepName === "pick_edge_2") {
      if (devModeRef.current) {
        const exclude = currentChar.edges.map((e) => (typeof e === "string" ? e : e.name));
        return allEdges.filter((e) => !exclude.includes(e.name));
      }
      return offerEdges(currentChar, 3);
    }
    if (stepName === "pick_focus") {
      if (devModeRef.current) {
        const exclude = currentChar.foci.map((f) => f.name);
        return allFoci.filter((f) => !exclude.includes(f.name));
      }
      return offerFoci(currentChar, 3);
    }
    return null;
  };

  const advanceTo = useCallback((nextIdx, currentChar) => {
    const nextStepName = STEPS[nextIdx];
    setOffers(offersForStep(nextStepName, currentChar));

    if (nextStepName === "generate_contacts") {
      const allotment = getContactAllotment(currentChar.attributes.charisma.mod);
      if (allotment.length === 0) {
        setOffers(null);
        setMaxStepReached((prev) => Math.max(prev, nextIdx + 1));
        navigateRef.current(STEPS[nextIdx + 1]);
        return;
      }
      setGeneratedContacts(allotment.map((rel) => generateContact(rel)));
    }

    setMaxStepReached((prev) => Math.max(prev, nextIdx));
    navigateRef.current(STEPS[nextIdx]);
  }, []);

  const handleStepClick = useCallback((i) => {
    // Can't skip ahead past the frontier
    if (i > maxStepReached) return;

    // Navigating to a locked (completed) step — just view it, preserve working state
    if (i < maxStepReached) {
      navigateRef.current(STEPS[i]);
      return;
    }

    // i === maxStepReached — restore working state at the frontier (existing behavior)
    const stepName = STEPS[i];
    setOffers(offersForStep(stepName, char));
    setRolling(false);
    setPendingQueue([]);
    setSelectedWeapon(null);
    setSelectedArmor(null);
    setSelectedSpecialty(null);
    if (stepName === "generate_contacts") {
      const allotment = getContactAllotment(char.attributes.charisma.mod);
      if (allotment.length > 0) {
        setGeneratedContacts(allotment.map((rel) => generateContact(rel)));
      } else {
        setGeneratedContacts(null);
      }
    } else {
      setGeneratedContacts(null);
    }
    navigateRef.current(STEPS[i]);
  }, [maxStepReached, char]);

  const handleResolvePending = (choice) => {
    const next = deepClone(char);
    const item = pendingQueue[0];
    const { pending: newPending } = resolvePending(next, item, choice);
    setChar(next);
    const remaining = [...newPending, ...pendingQueue.slice(1)];
    setPendingQueue(remaining);
    if (remaining.length === 0) {
      advanceTo(step + 1, next);
    }
  };

  const handleStartRoll = () => setRolling(true);

  const handleRollComplete = (rollData, bumpStat) => {
    const next = deepClone(char);
    for (const [attr, data] of Object.entries(rollData)) {
      next.attributes[attr].score = data.score;
    }
    updateModifiers(next);
    if (bumpStat) {
      setStatToFourteen(next, bumpStat);
    }
    setChar(next);
    setRolling(false);
    advanceTo(step + 1, next);
  };

  const handleBackgroundComplete = (updatedChar) => {
    setChar(updatedChar);
    advanceTo(step + 1, updatedChar);
  };

  const handlePickEdge = (edgeName) => {
    const next = deepClone(char);
    const { pending } = applyEdge(next, edgeName);
    setChar(next);
    if (pending.length > 0) {
      setPendingQueue(pending);
    } else {
      advanceTo(step + 1, next);
    }
  };

  const handlePickFocus = (focusName) => {
    const next = deepClone(char);
    const { pending } = applyFocus(next, focusName);
    setChar(next);
    if (pending.length > 0) {
      setPendingQueue(pending);
    } else {
      advanceTo(step + 1, next);
    }
  };

  const handleBonusSkill = (skillName) => {
    const next = deepClone(char);
    addBonusSkill(next, skillName);
    setBonusSkillPick(skillName);
    setChar(next);
    advanceTo(step + 1, next);
  };

  const handleEquipGear = () => {
    const next = deepClone(char);
    equipStartingGear(next, selectedWeapon, selectedArmor);
    equipSpecialtyItem(next, selectedSpecialty);
    // Clear any previously-picked bonus programs (for re-doing gear)
    next.programs = next.programs.filter((p) => !p.bonusPick);
    const bonusPending = getBonusProgramPending(next);
    setChar(next);
    if (bonusPending.length > 0) {
      setPendingQueue(bonusPending);
    } else {
      advanceTo(step + 1, next);
    }
  };

  const handleContactsComplete = (names) => {
    if (!generatedContacts) return;
    const next = deepClone(char);
    for (let i = 0; i < generatedContacts.length; i++) {
      const contact = { ...generatedContacts[i], name: names[i].trim() };
      addGeneratedContact(next, contact);
    }
    setChar(next);
    advanceTo(step + 1, next);
  };

  const handleFinish = () => {
    const next = deepClone(char);
    calculateDerivedStats(next);
    setChar(next);
  };

  // Dev mode toggle (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleDevMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleDevMode]);

  const handleDevReset = useCallback(() => {
    setChar(createCharacter());
    setMaxStepReached(0);
    setRolling(false);
    setOffers(null);
    setPendingQueue([]);
    setSelectedWeapon(null);
    setSelectedArmor(null);
    setSelectedSpecialty(null);
    setGeneratedContacts(null);
    setRollMode("standard");
    setBonusSkillPick(null);
    navigateRef.current(STEPS[0]);
  }, []);

  const availableSkills = getAvailableSkills(char);
  const isFinalized = currentStep === "done" && char.hp > 0;

  return {
    char, setChar,
    step, maxStepReached,
    rolling, rollMode, setRollMode,
    devMode, toggleDevMode,
    offers,
    pendingQueue,
    selectedWeapon, setSelectedWeapon,
    selectedArmor, setSelectedArmor,
    selectedSpecialty, setSelectedSpecialty,
    generatedContacts,
    currentStep,
    availableSkills,
    isFinalized,
    isViewingLockedStep,
    bonusSkillPick,
    handleStepClick,
    handleResolvePending,
    handleStartRoll,
    handleRollComplete,
    handleBackgroundComplete,
    handlePickEdge,
    handlePickFocus,
    handleBonusSkill,
    handleEquipGear,
    handleContactsComplete,
    handleFinish,
    handleDevReset,
  };
}
