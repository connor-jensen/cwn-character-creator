// eslint-disable-next-line no-unused-vars -- motion is used as JSX namespace (motion.div)
import { motion, AnimatePresence } from "motion/react";
import {
  edges as allEdges,
  foci as allFoci,
} from "../../../../cwn-engine.js";
import useCharacterCreation from "./useCharacterCreation.js";
import Header from "../Header";
import ProgressBar from "../ProgressBar";
import Sidebar from "../Sidebar";
import PendingResolver from "../PendingResolver";
import GearSelection from "../GearSelection";
import DiceRollSequence from "../DiceRollSequence";
import BackgroundSequence from "../BackgroundSequence";
import SelectionSequence from "../SelectionSequence";
import ContactSequence from "../ContactSequence";
import { ALL_SKILLS } from "../../constants.js";
import "./App.css";

export default function App() {
  const {
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
  } = useCharacterCreation();

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

              {/* --- Pick Edge (1 or 2) --- */}
              {(currentStep === "pick_edge_1" || currentStep === "pick_edge_2") && (
                <div className="step-panel" key={currentStep}>
                  <div className="step-label">Step {currentStep === "pick_edge_1" ? "03" : "04"}</div>
                  <h2 className="step-title">Choose Edge ({currentStep === "pick_edge_1" ? "1" : "2"} of 2)</h2>
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
                          <span className="offer-card-detail">{focus.level_1_full}</span>
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
                  <div className="skill-pick-grid">
                    {ALL_SKILLS.map((skill) => {
                      const isEligible = availableSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          className={`btn-choice${!isEligible ? " btn-choice-disabled" : ""}`}
                          disabled={!isEligible}
                          onClick={() => handleBonusSkill(skill)}
                        >
                          {skill}
                        </button>
                      );
                    })}
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
