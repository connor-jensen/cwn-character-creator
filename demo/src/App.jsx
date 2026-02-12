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
  STARTING_WEAPONS,
  STARTING_ARMOR,
  offerEdges,
  offerFoci,
  updateModifiers,
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../cwn-engine.js";
import DiceRollSequence from "./DiceRollSequence.jsx";
import BackgroundSequence from "./BackgroundSequence.jsx";
import SelectionSequence from "./SelectionSequence.jsx";
import "./App.css";

const STEPS = [
  "roll_attributes",
  "pick_background",
  "pick_edge_1",
  "pick_edge_2",
  "pick_focus",
  "bonus_skill",
  "choose_gear",
  "done",
];

const STEP_LABELS = [
  "ATTR", "BG", "EDGE 1", "EDGE 2", "FOCUS", "BONUS", "GEAR", "DONE",
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
  };

  // Auto-generate offers when entering edge/focus steps
  useEffect(() => {
    if ((currentStep === "pick_edge_1" || currentStep === "pick_edge_2") && !offers) {
      setOffers(offerEdges(char, 3));
    } else if (currentStep === "pick_focus" && !offers) {
      setOffers(offerFoci(char, 3));
    }
  }, [currentStep]);

  // --- Pending resolution ---
  const handleResolvePending = (choice) => {
    const next = deepClone(char);
    const item = pendingQueue[0];
    resolvePending(next, item, choice);
    setChar(next);
    setPendingQueue((q) => q.slice(1));
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
    setStatToFourteen(next, bumpStat);
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
    setPendingQueue(pending);
    advance();
  };

  const handlePickFocus = (focusName) => {
    const next = deepClone(char);
    const { pending } = applyFocus(next, focusName);
    setChar(next);
    setPendingQueue(pending);
    advance();
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
                        Generate your operative&apos;s base attributes by rolling 3d6 for each stat.
                      </p>
                      <button className="btn-action" onClick={handleStartRoll}>
                        <span className="btn-prompt">&gt;_</span> Roll 3d6 for each stat
                      </button>
                    </>
                  ) : (
                    <DiceRollSequence onComplete={handleRollComplete} />
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
                    Select one weapon and one armor loadout for your operative.
                  </p>

                  <div className="gear-section">
                    <div className="gear-section-label">Choose Weapon</div>
                    <div className="gear-grid">
                      {STARTING_WEAPONS.map((w) => (
                        <button
                          key={w.name}
                          className={`gear-card${selectedWeapon === w.name ? " gear-card-selected" : ""}`}
                          onClick={() => setSelectedWeapon(w.name)}
                        >
                          <span className="gear-card-type">{w.type}</span>
                          <h3>{w.name}</h3>
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
                              <span className="gear-stat-value">{w.mag || "—"}</span>
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
                            {w.shock && (
                              <div className="gear-stat">
                                <span className="gear-stat-label">Shock</span>
                                <span className="gear-stat-value">{w.shock}</span>
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="gear-section">
                    <div className="gear-section-label">Choose Armor</div>
                    <div className="gear-grid">
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

                  <AnimatePresence>
                    {selectedWeapon && selectedArmor && (
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

              {/* --- Done (finalize button) --- */}
              {currentStep === "done" && (
                <div className="step-panel" key="done">
                  <div className="step-label">Step 08</div>
                  <h2 className="step-title">Character Complete</h2>
                  <p className="step-desc">
                    Finalize your operative. Roll for hit points and calculate combat readiness.
                  </p>
                  <button className="btn-action" onClick={handleFinish}>
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
                .filter((item) => item.category === "weapon")
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
                    </div>
                  </div>
                ))}
              {char.inventory
                .filter((item) => item.category === "armor")
                .map((a) => (
                  <div key={a.name} className="sheet-gear-item">
                    <div className="sheet-gear-name">{a.name} Armor</div>
                    <div className="sheet-gear-stats">
                      <span className="sheet-gear-pill">Melee AC {a.meleeAC}</span>
                      <span className="sheet-gear-pill">Ranged AC {a.rangedAC}</span>
                      {a.soak > 0 && <span className="sheet-gear-pill">Soak {a.soak}</span>}
                      {a.traumaMod !== 0 && <span className="sheet-gear-pill">Trauma Mod {a.traumaMod >= 0 ? "+" : ""}{a.traumaMod}</span>}
                    </div>
                  </div>
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
    </motion.aside>
  );
}

export default App;
