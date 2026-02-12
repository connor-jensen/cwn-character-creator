import { useState, useCallback, useEffect } from "react";
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
  SPECIALTY_ITEMS,
  getAvailableSpecialtyItems,
  equipSpecialtyItem,
  generateContact,
  addGeneratedContact,
  getContactAllotment,
  STARTING_WEAPONS,
  STARTING_KNIFE,
  STARTING_ARMOR,
  offerEdges,
  offerFoci,
  updateModifiers,
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
  cyberwarePackages,
} from "../../cwn-engine.js";
import DiceRollSequence from "./DiceRollSequence.jsx";
import BackgroundSequence from "./BackgroundSequence.jsx";
import SelectionSequence from "./SelectionSequence.jsx";
import ContactSequence from "./ContactSequence.jsx";
import CharacterDossier from "./CharacterDossier.jsx";
import "./App.css";

const STEPS = [
  "roll_attributes",
  "pick_background",
  "pick_edge_1",
  "pick_edge_2",
  "pick_focus",
  "bonus_skill",
  "choose_gear",
  "generate_contacts",
  "done",
];

const STEP_LABELS = [
  "ATTRIBUTES", "BACKGROUND", "EDGE 1", "EDGE 2", "FOCUS", "BONUS", "GEAR", "CONTACTS", "DONE",
];

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


function renderSpecialtyStats(item) {
  const s = item.stats;
  const pills = [];
  // Weapon stats
  if (s.damage) pills.push(["DMG", s.damage]);
  if (s.shock) pills.push(["Shock", s.shock]);
  if (s.range) pills.push(["RNG", s.range]);
  if (s.mag) pills.push(["MAG", s.mag]);
  if (s.trauma) pills.push(["Trauma", s.trauma]);
  if (s.attribute) pills.push(["Attr", s.attribute]);
  // Armor stats
  if (s.meleeAC) pills.push(["Melee AC", s.meleeAC]);
  if (s.rangedAC) pills.push(["Ranged AC", s.rangedAC]);
  if (s.meleeACBonus) pills.push(["Melee AC", `+${s.meleeACBonus}`]);
  if (s.rangedACBonus) pills.push(["Ranged AC", `+${s.rangedACBonus}`]);
  if (s.soak) pills.push(["Soak", s.soak]);
  if (s.traumaTargetMod) pills.push(["Trauma Mod", `+${s.traumaTargetMod}`]);
  if (s.conceal) pills.push(["Conceal", s.conceal.charAt(0).toUpperCase() + s.conceal.slice(1), `gear-stat-conceal-${s.conceal}`]);
  // Cyberware
  if (s.strain !== undefined) pills.push(["Strain", s.strain]);
  if (s.concealment) pills.push(["Conceal", s.concealment]);
  // Hacking
  if (s.memory) pills.push(["MEM", s.memory]);
  if (s.shielding) pills.push(["Shield", s.shielding]);
  if (s.cpu) pills.push(["CPU", s.cpu]);
  if (s.bonusAccess) pills.push(["Access", `+${s.bonusAccess}`]);
  // Vehicle / drone
  if (s.hp) pills.push(["HP", s.hp]);
  if (s.ac) pills.push(["AC", s.ac]);
  if (s.speed !== undefined) pills.push(["Speed", s.speed]);
  if (s.move) pills.push(["Move", s.move]);
  if (s.traumaTarget) pills.push(["Trauma Tgt", s.traumaTarget]);
  if (s.crew) pills.push(["Crew", s.crew]);
  if (s.fittings !== undefined) pills.push(["Fittings", s.fittings]);
  // Tech / generic
  if (s.effect) pills.push(["Effect", s.effect]);
  if (s.enc) pills.push(["ENC", s.enc]);
  if (s.special) pills.push(["Special", s.special]);
  if (pills.length === 0) return null;
  return (
    <div className="gear-card-stats">
      {pills.map(([label, value, className]) => (
        <div key={label} className="gear-stat">
          <span className="gear-stat-label">{label}</span>
          <span className={`gear-stat-value${className ? ` ${className}` : ""}`}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ===== Progress Components ===== */

function Header({ step }) {
  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-prefix">SYS://</span>
        <h1>CWN Character Creator</h1>
      </div>
      <div className="header-status">
        <span className="status-label">STEP</span>
        <span className="status-value">
          {String(step + 1).padStart(2, "0")}/{String(STEPS.length).padStart(2, "0")}
        </span>
      </div>
    </header>
  );
}

function ProgressBar({ step, onStepClick }) {
  return (
    <div>
      <div className="progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`progress-segment ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
            onClick={() => onStepClick(i)}
          />
        ))}
      </div>
      <div className="progress-labels">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`progress-label ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
            onClick={() => onStepClick(i)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ===== Main App ===== */

function App() {
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

  const advance = useCallback(() => {
    setOffers(null);
    setStep((s) => s + 1);
  }, []);

  const handleStepClick = (i) => {
    setStep(i);
    setOffers(null);
    setRolling(false);
    setPendingQueue([]);
    setSelectedWeapon(null);
    setSelectedArmor(null);
    setSelectedSpecialty(null);
    setGeneratedContacts(null);
  };

  // Auto-generate offers when entering edge/focus steps
  useEffect(() => {
    if ((currentStep === "pick_edge_1" || currentStep === "pick_edge_2") && !offers) {
      setOffers(offerEdges(char, 3));
    } else if (currentStep === "pick_focus" && !offers) {
      setOffers(offerFoci(char, 3));
    }
  }, [currentStep]);

  // Auto-generate contacts when entering contacts step
  useEffect(() => {
    if (currentStep !== "generate_contacts") return;
    const allotment = getContactAllotment(char.attributes.charisma.mod);
    if (allotment.length === 0) {
      advance();
      return;
    }
    const generated = allotment.map((rel) => generateContact(rel));
    setGeneratedContacts(generated);
  }, [currentStep]);

  // --- Pending resolution ---
  const handleResolvePending = (choice) => {
    const next = deepClone(char);
    const item = pendingQueue[0];
    resolvePending(next, item, choice);
    setChar(next);
    const remaining = pendingQueue.slice(1);
    setPendingQueue(remaining);
    if (remaining.length === 0) {
      advance();
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
    advance();
  };

  const handleBackgroundComplete = (updatedChar) => {
    setChar(updatedChar);
    advance();
  };

  const handlePickEdge = (edgeName) => {
    const next = deepClone(char);
    const { pending } = applyEdge(next, edgeName);
    setChar(next);
    if (pending.length > 0) {
      setPendingQueue(pending);
    } else {
      advance();
    }
  };

  const handlePickFocus = (focusName) => {
    const next = deepClone(char);
    const { pending } = applyFocus(next, focusName);
    setChar(next);
    if (pending.length > 0) {
      setPendingQueue(pending);
    } else {
      advance();
    }
  };

  const handleBonusSkill = (skillName) => {
    const next = deepClone(char);
    addBonusSkill(next, skillName);
    setChar(next);
    advance();
  };

  const handleEquipGear = () => {
    const next = deepClone(char);
    equipStartingGear(next, selectedWeapon, selectedArmor);
    equipSpecialtyItem(next, selectedSpecialty);
    setChar(next);
    advance();
  };

  const handleContactsComplete = (names) => {
    if (!generatedContacts) return;
    const next = deepClone(char);
    for (let i = 0; i < generatedContacts.length; i++) {
      const contact = { ...generatedContacts[i], name: names[i].trim() };
      addGeneratedContact(next, contact);
    }
    setChar(next);
    advance();
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
                  <p className="step-desc">
                    Select one weapon and one armor loadout. A knife ({STARTING_KNIFE.damage}, shock {STARTING_KNIFE.shock}) is automatically included.
                  </p>

                  <div className="gear-columns">
                    <div className="gear-column">
                      <div className="gear-section-label">Choose Weapon</div>
                      {STARTING_WEAPONS.map((w) => (
                        <button
                          key={w.name}
                          className={`gear-card${selectedWeapon === w.name ? " gear-card-selected" : ""}`}
                          onClick={() => setSelectedWeapon(w.name)}
                        >
                          <span className="gear-card-type">{w.type}</span>
                          <h3>{w.name}</h3>
                          <p className="gear-card-hint">
                            {w.name === "Light Pistol" && "Less damage, crits more often."}
                            {w.name === "Heavy Pistol" && "More damage, crits less often."}
                            {w.name === "Rifle" && "Long range, high damage, high crit rate, but can\u2019t be concealed."}
                          </p>
                          <div className="gear-card-stats">
                            <div className="gear-stat">
                              <span className="gear-stat-label">DMG</span>
                              <span className="gear-stat-value">{w.damage}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">RNG</span>
                              <span className="gear-stat-value">{w.range}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">MAG</span>
                              <span className="gear-stat-value">{w.mag || "\u2014"}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">ENC</span>
                              <span className="gear-stat-value">{w.enc}</span>
                            </div>
                          </div>
                          <div className="gear-card-stats">
                            <div className="gear-stat">
                              <span className="gear-stat-label">Trauma</span>
                              <span className="gear-stat-value">{w.trauma_die}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">Rating</span>
                              <span className="gear-stat-value">{w.trauma_rating}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">Conceal</span>
                              <span className={`gear-stat-value gear-stat-conceal-${w.conceal}`}>
                                {w.conceal.charAt(0).toUpperCase() + w.conceal.slice(1)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="gear-column">
                      <div className="gear-section-label">Choose Armor</div>
                      {STARTING_ARMOR.map((a) => (
                        <button
                          key={a.name}
                          className={`gear-card${selectedArmor === a.name ? " gear-card-selected" : ""}`}
                          onClick={() => setSelectedArmor(a.name)}
                        >
                          <h3>{a.name}</h3>
                          <div className="gear-card-stats">
                            <div className="gear-stat">
                              <span className="gear-stat-label">Melee AC</span>
                              <span className="gear-stat-value">{a.meleeAC}</span>
                            </div>
                            <div className="gear-stat">
                              <span className="gear-stat-label">Ranged AC</span>
                              <span className="gear-stat-value">{a.rangedAC}</span>
                            </div>
                            {a.soak > 0 && (
                              <div className="gear-stat">
                                <span className="gear-stat-label">Soak</span>
                                <span className="gear-stat-value">{a.soak}</span>
                              </div>
                            )}
                            {a.traumaMod !== 0 && (
                              <div className="gear-stat">
                                <span className="gear-stat-label">Trauma Mod</span>
                                <span className="gear-stat-value">{a.traumaMod >= 0 ? "+" : ""}{a.traumaMod}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const availableSpecialty = getAvailableSpecialtyItems(char);
                    return (
                      <div className="gear-specialty-section">
                        <div className="gear-section-label">Choose Specialty Item</div>
                        {availableSpecialty.length === 0 ? (
                          <p className="gear-specialty-empty">
                            No specialty items available — your current skills and attributes don&apos;t meet any prerequisites.
                          </p>
                        ) : (
                          <div className="gear-specialty-grid">
                            {availableSpecialty.map((item) => (
                              <button
                                key={item.name}
                                className={`gear-card${selectedSpecialty === item.name ? " gear-card-selected" : ""}`}
                                onClick={() => setSelectedSpecialty(item.name)}
                              >
                                <span className="gear-card-category">{item.category}</span>
                                <h3>{item.name}</h3>
                                <p className="gear-card-hint">{item.description}</p>
                                {renderSpecialtyStats(item)}
                                <div className="gear-prereq-pills">
                                  {Object.entries(item.prereqs.attributes).map(([attr, mod]) => (
                                    <span key={attr} className="gear-prereq-pill">
                                      {attr.slice(0, 3).toUpperCase()} {mod >= 0 ? "+" : ""}{mod}
                                    </span>
                                  ))}
                                  {item.prereqs.skills.map((skill) => (
                                    <span key={skill} className="gear-prereq-pill">{skill}</span>
                                  ))}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <AnimatePresence>
                    {selectedWeapon && selectedArmor && selectedSpecialty && (
                      <motion.div
                        className="gear-confirm-wrap"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.25 }}
                      >
                        <button className="btn-action" onClick={handleEquipGear}>
                          <span className="btn-prompt">&gt;_</span> Confirm Loadout
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
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

/* ===== PendingResolver ===== */

function PendingResolver({ item, char, onResolve }) {
  const skills = item.options
    ? item.options
    : item.category === "combat"
      ? COMBAT_SKILLS
      : item.category === "non-combat"
        ? ALL_SKILLS.filter((s) => !COMBAT_SKILLS.includes(s))
        : ALL_SKILLS;

  const available = skills.filter(
    (s) => char.skills[s] === undefined || char.skills[s] < 1
  );

  if (item.type === "pickAttribute") {
    const attrs = ATTR_NAMES.filter(
      (a) => !item.exclude || !item.exclude.includes(a)
    );
    return (
      <div>
        <p className="step-desc">
          Pick an attribute to set to {item.setTo}:
        </p>
        <div className="choices">
          {attrs.map((a) => (
            <button
              key={a}
              className="btn-choice"
              onClick={() => onResolve(a)}
            >
              {a}
              <span className="btn-choice-sub">
                currently {char.attributes[a].score}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === "pickFocus") {
    return (
      <div>
        <p className="step-desc">Pick an additional focus:</p>
        <div className="offer-grid">
          {offerFoci(char, 3).map((f, i) => (
            <button
              key={f.name}
              className="offer-card"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => onResolve(f.name)}
            >
              <span className="offer-card-id">
                #{String(i + 1).padStart(2, "0")}
              </span>
              <h3>{f.name}</h3>
              <p className="offer-card-desc">{f.description}</p>
              <span className="offer-card-detail">{f.level_1}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === "pickCyberwarePackage") {
    return (
      <div>
        <p className="step-desc">Choose a cyberware package:</p>
        <div className="cyber-package-grid">
          {cyberwarePackages.map((pkg) => (
            <button
              key={pkg.name}
              className="cyber-package-card"
              onClick={() => onResolve(pkg.name)}
            >
              <h3>{pkg.name}</h3>
              <p className="cyber-package-desc">{pkg.description}</p>
              <div className="cyber-package-items">
                {pkg.items.map((item) => (
                  <div key={item.name} className="cyber-item">
                    <span className="cyber-item-name">{item.name}</span>
                    <span className="cyber-item-desc">{item.description}</span>
                    <span className="cyber-item-stats">
                      ${(item.cost / 1000).toFixed(0)}K &middot; SS {item.systemStrain}
                    </span>
                  </div>
                ))}
              </div>
              <div className="cyber-package-totals">
                <span>Total: ${(pkg.totalCost / 1000).toFixed(0)}K</span>
                <span>SS: {pkg.totalSystemStrain}</span>
                <span>Maint: ${pkg.monthlyMaintenance.toLocaleString()}/mo</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === "addContact") {
    return (
      <div>
        <p className="step-desc">
          Name a contact ({item.relationship}, {item.context}):
        </p>
        <form
          className="contact-form"
          onSubmit={(e) => {
            e.preventDefault();
            onResolve(e.target.elements.contactName.value);
          }}
        >
          <input name="contactName" placeholder="Contact name" required />
          <button type="submit" className="btn-action">
            Add Contact
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="step-desc">
        Pick a skill{item.reason ? ` (${item.reason})` : ""}:
      </p>
      <div className="choices">
        {available.map((s) => (
          <button
            key={s}
            className="btn-choice"
            onClick={() => onResolve(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===== Sheet Contact ===== */

function SheetContact({ contact }) {
  const [expanded, setExpanded] = useState(false);
  const c = contact;

  // Old-format contacts (from Voice of the People)
  if (!c.whatTheyCanDoForYou) {
    return (
      <div className="sheet-list-item">
        <strong>
          {c.name || "Unnamed"}{" "}
          <span className="sheet-contact-rel">{c.relationship}</span>
        </strong>
        {c.description && <span className="sheet-item-desc">{c.description}</span>}
      </div>
    );
  }

  return (
    <div className="sheet-list-item sheet-contact">
      <div className="sheet-contact-header">
        <strong>
          {c.name || "Unnamed"}{" "}
          <span className="sheet-contact-rel">{c.relationship}</span>
        </strong>
        <button
          className="sheet-contact-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? "\u25B4" : "\u25BE"}
        </button>
      </div>
      <ul className="sheet-contact-abilities">
        {c.whatTheyCanDoForYou.map((ability, i) => (
          <li key={i}>{ability}</li>
        ))}
      </ul>
      {expanded && (
        <div className="sheet-contact-details">
          <div className="sheet-contact-detail"><span>Circle:</span> {c.socialCircle}</div>
          <div className="sheet-contact-detail"><span>Known:</span> {c.howWellKnown}</div>
          <div className="sheet-contact-detail"><span>Met:</span> {c.howMet}</div>
          <div className="sheet-contact-detail"><span>Last:</span> {c.lastInteraction}</div>
          <div className="sheet-contact-detail"><span>They get:</span> {c.whatTheyGet}</div>
        </div>
      )}
    </div>
  );
}

/* ===== Sidebar ===== */

function Sidebar({ char, isFullWidth }) {
  const bgObj =
    char.background &&
    allBackgrounds.find((b) => b.name === char.background);
  const edgeObjs = char.edges
    .map((name) => allEdges.find((e) => e.name === name))
    .filter(Boolean);
  const fociObjs = char.foci
    .map((f) => allFoci.find((d) => d.name === f.name))
    .filter(Boolean);

  return (
    <motion.aside
      className={`sheet${isFullWidth ? " sheet-full" : ""}`}
      layout
      transition={{ layout: { duration: 0.5, ease: "easeInOut" } }}
    >
      <div className="sheet-header">
        <span className="sheet-header-label">Dossier</span>
        <div className="sheet-header-line" />
      </div>

      {isFullWidth ? (
        <CharacterDossier char={char} />
      ) : (
        <div className="sheet-body">
          <div className="sheet-name">{char.name || "Unregistered"}</div>

          {bgObj && (
            <div>
              <span className="sheet-bg-tag">{bgObj.name}</span>
              <p className="sheet-bg-desc">{bgObj.description}</p>
            </div>
          )}

          <div className="sheet-section">
            <div className="sheet-section-title">
              <span>Attributes</span>
            </div>
            <div className="attr-legend">
              <div className="attr-legend-label">
                <span>score</span>
                <span>mod</span>
              </div>
              {[
                { score: "3", mod: "-2" },
                { score: "4\u20137", mod: "-1" },
                { score: "8\u201313", mod: "+0" },
                { score: "14\u201317", mod: "+1" },
                { score: "18", mod: "+2" },
              ].map((b) => (
                <div key={b.score} className="attr-legend-col">
                  <span className="attr-legend-score">{b.score}</span>
                  <span className="attr-legend-mod">{b.mod}</span>
                </div>
              ))}
            </div>
            <div className="attr-grid">
              {ATTR_NAMES.map((a) => (
                <div key={a} className="attr-row">
                  <span className="attr-name">
                    {a.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="attr-score">
                    {char.attributes[a].score}
                  </span>
                  <span
                    className={`attr-mod ${char.attributes[a].mod > 0 ? "positive" : char.attributes[a].mod < 0 ? "negative" : "neutral"}`}
                  >
                    {char.attributes[a].mod >= 0 ? "+" : ""}
                    {char.attributes[a].mod}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {edgeObjs.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Edges</span>
              </div>
              <div className="sheet-list">
                {edgeObjs.map((e) => (
                  <div key={e.name} className="sheet-list-item">
                    <strong>{e.name}</strong>
                    <span className="sheet-item-desc">{e.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fociObjs.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Foci</span>
              </div>
              <div className="sheet-list">
                {char.foci.map((f) => {
                  const data = allFoci.find((d) => d.name === f.name);
                  return (
                    <div key={f.name} className="sheet-list-item">
                      <strong>
                        {f.name}{" "}
                        <span style={{ color: "var(--amber)" }}>
                          L{f.level}
                        </span>
                      </strong>
                      {data && (
                        <span className="sheet-item-desc">
                          {data.level_1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sheet-section">
            <div className="sheet-section-title">
              <span>Skills</span>
            </div>
            <div className="skill-grid">
              {ALL_SKILLS.map((name) => {
                const lvl = char.skills[name];
                const hasSkill = lvl !== undefined;
                return (
                  <span key={name} className={`skill-pill${hasSkill ? '' : ' skill-pill-untrained'}`}>
                    {name}
                    <span className="skill-level">{hasSkill ? lvl : '-1'}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {char.inventory.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Gear</span>
              </div>
              <div className="sheet-gear-list">
                {char.inventory
                  .filter((item) => item.category === "weapon" && !item.specialty)
                  .map((w) => (
                    <div key={w.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">
                        {w.name}
                        <span className="sheet-gear-type-tag">{w.type}</span>
                      </div>
                      <div className="sheet-gear-stats">
                        <span className="sheet-gear-pill">DMG {w.damage}</span>
                        <span className="sheet-gear-pill">RNG {w.range}</span>
                        {w.mag && <span className="sheet-gear-pill">MAG {w.mag}</span>}
                        <span className="sheet-gear-pill">Trauma {w.trauma_die} {w.trauma_rating}</span>
                        {w.shock && <span className="sheet-gear-pill">Shock {w.shock}</span>}
                        {w.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${w.conceal}`}>{w.conceal.charAt(0).toUpperCase() + w.conceal.slice(1)}</span>}
                      </div>
                    </div>
                  ))}
                {char.inventory
                  .filter((item) => item.category === "armor" && !item.specialty)
                  .map((a) => (
                    <div key={a.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">{a.name}</div>
                      <div className="sheet-gear-stats">
                        <span className="sheet-gear-pill">Melee AC {a.meleeAC}</span>
                        <span className="sheet-gear-pill">Ranged AC {a.rangedAC}</span>
                        {a.soak > 0 && <span className="sheet-gear-pill">Soak {a.soak}</span>}
                        {a.traumaMod !== 0 && <span className="sheet-gear-pill">Trauma Mod {a.traumaMod >= 0 ? "+" : ""}{a.traumaMod}</span>}
                        {a.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${a.conceal}`}>{a.conceal.charAt(0).toUpperCase() + a.conceal.slice(1)}</span>}
                      </div>
                    </div>
                  ))}
                {char.inventory
                  .filter((item) => item.specialty)
                  .map((item) => (
                    <div key={item.name} className="sheet-gear-item">
                      <div className="sheet-gear-name">
                        {item.name}
                        <span className="sheet-gear-type-tag">{item.category}</span>
                      </div>
                      <div className="sheet-gear-stats">
                        {item.stats.damage && <span className="sheet-gear-pill">DMG {item.stats.damage}</span>}
                        {item.stats.shock && <span className="sheet-gear-pill">Shock {item.stats.shock}</span>}
                        {item.stats.range && <span className="sheet-gear-pill">RNG {item.stats.range}</span>}
                        {item.stats.mag && <span className="sheet-gear-pill">MAG {item.stats.mag}</span>}
                        {item.stats.trauma && <span className="sheet-gear-pill">Trauma {item.stats.trauma}</span>}
                        {item.stats.meleeAC && <span className="sheet-gear-pill">Melee AC {item.stats.meleeAC}</span>}
                        {item.stats.rangedAC && <span className="sheet-gear-pill">Ranged AC {item.stats.rangedAC}</span>}
                        {item.stats.meleeACBonus && <span className="sheet-gear-pill">Melee AC +{item.stats.meleeACBonus}</span>}
                        {item.stats.rangedACBonus && <span className="sheet-gear-pill">Ranged AC +{item.stats.rangedACBonus}</span>}
                        {item.stats.soak > 0 && <span className="sheet-gear-pill">Soak {item.stats.soak}</span>}
                        {item.stats.traumaTargetMod > 0 && <span className="sheet-gear-pill">Trauma Mod +{item.stats.traumaTargetMod}</span>}
                        {item.stats.strain !== undefined && <span className="sheet-gear-pill">Strain {item.stats.strain}</span>}
                        {item.stats.memory && <span className="sheet-gear-pill">MEM {item.stats.memory}</span>}
                        {item.stats.shielding && <span className="sheet-gear-pill">Shield {item.stats.shielding}</span>}
                        {item.stats.cpu && <span className="sheet-gear-pill">CPU {item.stats.cpu}</span>}
                        {item.stats.bonusAccess && <span className="sheet-gear-pill">Access +{item.stats.bonusAccess}</span>}
                        {item.stats.hp && <span className="sheet-gear-pill">HP {item.stats.hp}</span>}
                        {item.stats.ac && <span className="sheet-gear-pill">AC {item.stats.ac}</span>}
                        {item.stats.speed !== undefined && <span className="sheet-gear-pill">Speed {item.stats.speed}</span>}
                        {item.stats.move && <span className="sheet-gear-pill">Move {item.stats.move}</span>}
                        {item.stats.fittings !== undefined && <span className="sheet-gear-pill">Fittings {item.stats.fittings}</span>}
                        {item.stats.effect && <span className="sheet-gear-pill">{item.stats.effect}</span>}
                        {item.stats.conceal && <span className={`sheet-gear-pill sheet-gear-pill-conceal-${item.stats.conceal}`}>{item.stats.conceal.charAt(0).toUpperCase() + item.stats.conceal.slice(1)}</span>}
                        {item.stats.special && <span className="sheet-gear-pill">{item.stats.special}</span>}
                        {item.stats.enc && <span className="sheet-gear-pill">ENC {item.stats.enc}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {char.cyberwarePackage && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Cyberware</span>
              </div>
              <div className="sheet-cyber-header">
                <span className="sheet-bg-tag">{char.cyberwarePackage.name}</span>
                <span className="sheet-cyber-meta">
                  SS {char.cyberwarePackage.totalSystemStrain} &middot; ${char.cyberwarePackage.monthlyMaintenance.toLocaleString()}/mo
                </span>
              </div>
              <div className="sheet-list">
                {char.cyberwarePackage.items.map((item) => (
                  <div key={item.name} className="sheet-list-item">
                    <strong>{item.name}</strong>
                    <span className="sheet-item-desc">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {char.contacts.length > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Contacts</span>
              </div>
              <div className="sheet-list">
                {char.contacts.map((c, i) => (
                  <SheetContact key={i} contact={c} />
                ))}
              </div>
            </div>
          )}

          {char.hp > 0 && (
            <div className="sheet-section">
              <div className="sheet-section-title">
                <span>Combat</span>
              </div>
              <div className="combat-grid">
                <div className="combat-stat hp">
                  <span className="combat-stat-label">HP</span>
                  <span className="combat-stat-value">{char.hp}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Base Atk Bonus</span>
                  <span className="combat-stat-value">+{char.bab}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Phys</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.physical}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Eva</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.evasion}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Ment</span>
                  <span className="combat-stat-value">
                    {char.savingThrows.mental}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Init</span>
                  <span className="combat-stat-value">
                    {char.initiative >= 0 ? "+" : ""}{char.initiative}
                  </span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Soak</span>
                  <span className="combat-stat-value">{char.damageSoak}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Trauma</span>
                  <span className="combat-stat-value">{char.traumaTarget}</span>
                </div>
                <div className="combat-stat">
                  <span className="combat-stat-label">Contacts</span>
                  <span className="combat-stat-value">
                    {char.startingContactBonus >= 0 ? "+" : ""}{char.startingContactBonus}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  );
}

export default App;
