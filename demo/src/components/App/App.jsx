import { useState, useCallback } from "react";
// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
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
  generateContact,
  addGeneratedContact,
  getContactAllotment,
  offerEdges,
  offerFoci,
  updateModifiers,
  edges as allEdges,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import { STEPS, ALL_SKILLS } from "../../constants.js";
import { deepClone } from "../../helpers/deep-clone.js";
import Header from "../Header";
import ProgressBar from "../ProgressBar";
import Sidebar from "../Sidebar";
import PendingResolver from "../PendingResolver";
import GearSelection from "../GearSelection";
import DiceRollSequence from "../DiceRollSequence";
import BackgroundSequence from "../BackgroundSequence";
import SelectionSequence from "../SelectionSequence";
import ContactSequence from "../ContactSequence";
import "./App.css";

export default function App() {
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

  // --- Pending resolution ---
  const handleResolvePending = (choice) => {
    const next = deepClone(char);
    const item = pendingQueue[0];
    resolvePending(next, item, choice);
    setChar(next);
    const remaining = pendingQueue.slice(1);
    setPendingQueue(remaining);
    if (remaining.length === 0) {
      advanceTo(step + 1, next);
    }
  };

  if (pendingQueue.length > 0) {
    return (
      <div className="app">
        <Header step={step} />
        <ProgressBar step={step} onStepClick={handleStepClick} />
        <div className="layout">
          <div className="main">
            <div className="pending-panel">
              <div className="step-label">Resolve Pending</div>
              <h2 className="step-title">
                {pendingQueue[0].reason || pendingQueue[0].type}
              </h2>
              <PendingResolver
                item={pendingQueue[0]}
                char={char}
                onResolve={handleResolvePending}
              />
            </div>
          </div>
          <Sidebar char={char} />
        </div>
      </div>
    );
  }

  // --- Step handlers ---

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
    setChar(next);
    advanceTo(step + 1, next);
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

  const availableSkills = ALL_SKILLS.filter(
    (s) => char.skills[s] === undefined || char.skills[s] < 1
  );

  const isFinalized = currentStep === "done" && char.hp > 0;

  return (
    <div className="app">
      <Header step={step} />
      <ProgressBar step={step} onStepClick={handleStepClick} />

      <div className="layout">
        <AnimatePresence mode="popLayout">
          {!isFinalized && (
            <motion.div
              key="main-panel"
              className="main"
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* --- Roll Attributes --- */}
              {currentStep === "roll_attributes" && (
                <div className="step-panel" key="roll">
                  <div className="step-label">Step 01</div>
                  <h2 className="step-title">Roll Attributes</h2>
                  {!rolling ? (
                    <>
                      <p className="step-desc">
                        {rollMode === "standard"
                          ? "Generate your operative\u2019s base attributes by rolling 3d6 for each stat."
                          : "Roll 1d6 + 1d12 for each stat, then roll 3d6 for random +1 bonuses."}
                      </p>
                      <div className="roll-mode-toggle">
                        <button
                          className={`roll-mode-btn ${rollMode === "standard" ? "active" : ""}`}
                          onClick={() => setRollMode("standard")}
                        >
                          Standard
                          <span className="roll-mode-sub">3d6</span>
                        </button>
                        <button
                          className={`roll-mode-btn ${rollMode === "highVariance" ? "active" : ""}`}
                          onClick={() => setRollMode("highVariance")}
                        >
                          High Variance
                          <span className="roll-mode-sub">d6 + d12</span>
                        </button>
                      </div>
                      <button className="btn-action" onClick={handleStartRoll}>
                        <span className="btn-prompt">&gt;_</span>
                        {rollMode === "standard"
                          ? " Roll 3d6 for each stat"
                          : " Roll d6 + d12 for each stat"}
                      </button>
                    </>
                  ) : (
                    <DiceRollSequence mode={rollMode} onComplete={handleRollComplete} />
                  )}
                </div>
              )}

              {/* --- Background Assignment --- */}
              {currentStep === "pick_background" && (
                <div className="step-panel" key="bg">
                  <div className="step-label">Step 02</div>
                  <h2 className="step-title">Background Assignment</h2>
                  <BackgroundSequence
                    char={char}
                    onComplete={handleBackgroundComplete}
                  />
                </div>
              )}

              {/* --- Pick Edge 1 --- */}
              {currentStep === "pick_edge_1" && (
                <div className="step-panel" key="edge1">
                  <div className="step-label">Step 03</div>
                  <h2 className="step-title">Choose Edge (1 of 2)</h2>
                  {offers && (
                    <SelectionSequence
                      allItems={allEdges}
                      offeredItems={offers}
                      poolLabel="Edge"
                      showPoolDescription={false}
                      renderCardContent={(edge, offerIdx) => (
                        <>
                          <span className="offer-card-id">
                            #{String(offerIdx + 1).padStart(2, "0")}
                          </span>
                          <h3>{edge.name}</h3>
                          <p className="offer-card-desc">{edge.description}</p>
                        </>
                      )}
                      onComplete={(name) => handlePickEdge(name)}
                    />
                  )}
                </div>
              )}

              {/* --- Pick Edge 2 --- */}
              {currentStep === "pick_edge_2" && (
                <div className="step-panel" key="edge2">
                  <div className="step-label">Step 04</div>
                  <h2 className="step-title">Choose Edge (2 of 2)</h2>
                  {offers && (
                    <SelectionSequence
                      allItems={allEdges}
                      offeredItems={offers}
                      poolLabel="Edge"
                      showPoolDescription={false}
                      renderCardContent={(edge, offerIdx) => (
                        <>
                          <span className="offer-card-id">
                            #{String(offerIdx + 1).padStart(2, "0")}
                          </span>
                          <h3>{edge.name}</h3>
                          <p className="offer-card-desc">{edge.description}</p>
                        </>
                      )}
                      onComplete={(name) => handlePickEdge(name)}
                    />
                  )}
                </div>
              )}

              {/* --- Pick Focus --- */}
              {currentStep === "pick_focus" && (
                <div className="step-panel" key="focus">
                  <div className="step-label">Step 05</div>
                  <h2 className="step-title">Choose Focus</h2>
                  {offers && (
                    <SelectionSequence
                      allItems={allFoci}
                      offeredItems={offers}
                      poolLabel="Focus"
                      renderCardContent={(focus, offerIdx) => (
                        <>
                          <span className="offer-card-id">
                            #{String(offerIdx + 1).padStart(2, "0")}
                          </span>
                          <h3>{focus.name}</h3>
                          <p className="offer-card-desc">{focus.description}</p>
                          <span className="offer-card-detail">{focus.level_1}</span>
                        </>
                      )}
                      onComplete={(name) => handlePickFocus(name)}
                    />
                  )}
                </div>
              )}

              {/* --- Bonus Skill --- */}
              {currentStep === "bonus_skill" && (
                <div className="step-panel" key="bonus">
                  <div className="step-label">Step 06</div>
                  <h2 className="step-title">Bonus Skill</h2>
                  <p className="step-desc">
                    Select one final skill to add to your operative&apos;s repertoire.
                  </p>
                  <div className="choices">
                    {availableSkills.map((skill) => (
                      <button
                        key={skill}
                        className="btn-choice"
                        onClick={() => handleBonusSkill(skill)}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* --- Choose Gear --- */}
              {currentStep === "choose_gear" && (
                <div className="step-panel" key="gear">
                  <div className="step-label">Step 07</div>
                  <h2 className="step-title">Starting Gear</h2>
                  <GearSelection
                    char={char}
                    selectedWeapon={selectedWeapon}
                    selectedArmor={selectedArmor}
                    selectedSpecialty={selectedSpecialty}
                    onWeaponSelect={setSelectedWeapon}
                    onArmorSelect={setSelectedArmor}
                    onSpecialtySelect={setSelectedSpecialty}
                    onConfirm={handleEquipGear}
                  />
                </div>
              )}

              {/* --- Generate Contacts --- */}
              {currentStep === "generate_contacts" && generatedContacts && (
                <div className="step-panel" key="contacts">
                  <div className="step-label">Step 08</div>
                  <h2 className="step-title">Starting Contacts</h2>
                  <ContactSequence
                    contacts={generatedContacts}
                    onComplete={handleContactsComplete}
                  />
                </div>
              )}

              {/* --- Done (finalize button) --- */}
              {currentStep === "done" && (
                <div className="step-panel" key="done">
                  <div className="step-label">Step 09</div>
                  <h2 className="step-title">Character Complete</h2>
                  <p className="step-desc">
                    Name your operative, then finalize. Roll for hit points and calculate combat readiness.
                  </p>
                  <div className="char-name-input-wrap">
                    <label className="char-name-label" htmlFor="char-name">Operative Name</label>
                    <input
                      id="char-name"
                      className="char-name-input"
                      type="text"
                      placeholder="Enter name..."
                      value={char.name}
                      onChange={(e) => setChar((prev) => ({ ...prev, name: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <button className="btn-action" disabled={!char.name.trim()} onClick={handleFinish}>
                    <span className="btn-prompt">&gt;_</span> Roll HP &amp;
                    Calculate Stats
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar char={char} isFullWidth={isFinalized} />
      </div>
    </div>
  );
}
