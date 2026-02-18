import { useState, useCallback } from "react";
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
  updateModifiers,
} from "../../../../cwn-engine.js";
import { STEPS } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";
import { getAvailableSkills } from "../../helpers/get-available-skills.js";

export default function useCharacterCreation() {
  const [char, setChar] = useState(createCharacter);
  const [step, setStep] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [offers, setOffers] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [selectedArmor, setSelectedArmor] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [generatedContacts, setGeneratedContacts] = useState(null);
  const [rollMode, setRollMode] = useState("standard");

  const currentStep = STEPS[step];

  const offersForStep = (stepName, currentChar) => {
    if (stepName === "pick_edge_1" || stepName === "pick_edge_2") {
      return offerEdges(currentChar, 3);
    }
    if (stepName === "pick_focus") {
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
        setStep(nextIdx + 1);
        return;
      }
      setGeneratedContacts(allotment.map((rel) => generateContact(rel)));
    }

    setStep(nextIdx);
  }, []);

  const handleStepClick = (i) => {
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
    setStep(i);
  };

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

  const availableSkills = getAvailableSkills(char);
  const isFinalized = currentStep === "done" && char.hp > 0;

  return {
    char, setChar,
    step,
    rolling, rollMode, setRollMode,
    offers,
    pendingQueue,
    selectedWeapon, setSelectedWeapon,
    selectedArmor, setSelectedArmor,
    selectedSpecialty, setSelectedSpecialty,
    generatedContacts,
    currentStep,
    availableSkills,
    isFinalized,
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
  };
}
