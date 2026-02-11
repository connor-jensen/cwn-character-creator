import { useState, useCallback } from "react";
import {
  createCharacter,
  rollAttributes,
  setStatToFourteen,
  applyEdge,
  applyFocus,
  applyBackground,
  resolveGrowthRoll,
  resolveLearningPick,
  addBonusSkill,
  resolvePending,
  calculateDerivedStats,
  offerBackgrounds,
  offerEdges,
  offerFoci,
  rollDie,
  edges as allEdges,
  backgrounds as allBackgrounds,
  foci as allFoci,
} from "../../cwn-engine.js";
import "./App.css";

const STEPS = [
  "roll_attributes",
  "bump_stat",
  "pick_background",
  "growth",
  "learning_1",
  "learning_2",
  "pick_edge_1",
  "pick_edge_2",
  "pick_focus",
  "bonus_skill",
  "done",
];

const STEP_LABELS = [
  "ATTR", "BUMP", "BG", "GROW", "LRN 1", "LRN 2",
  "EDGE 1", "EDGE 2", "FOCUS", "BONUS", "DONE",
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

function ProgressBar({ step }) {
  return (
    <div>
      <div className="progress">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`progress-segment ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
          />
        ))}
      </div>
      <div className="progress-labels">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`progress-label ${i < step ? "completed" : ""} ${i === step ? "active" : ""}`}
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
  const [offers, setOffers] = useState(null);
  const [bgData, setBgData] = useState(null);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [growthResult, setGrowthResult] = useState(null);
  const [learningResult, setLearningResult] = useState(null);

  const currentStep = STEPS[step];

  const advance = useCallback(() => {
    setOffers(null);
    setStep((s) => s + 1);
  }, []);

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
        <ProgressBar step={step} />
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

  const handleRollAttributes = () => {
    const next = deepClone(char);
    rollAttributes(next);
    setChar(next);
    advance();
  };

  const handleBumpStat = (stat) => {
    const next = deepClone(char);
    setStatToFourteen(next, stat);
    setChar(next);
    advance();
  };

  const handlePickBackground = (bgName) => {
    const next = deepClone(char);
    const { pending, pendingChoices } = applyBackground(next, bgName);
    setChar(next);
    setBgData(pendingChoices);
    setPendingQueue(pending);
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

  const handleRollGrowth = () => {
    const roll = rollDie(6) - 1;
    const entry = bgData.growth[roll];
    setGrowthResult(entry);

    if (!entry.startsWith("+") && entry !== "Any Skill") {
      const next = deepClone(char);
      try {
        resolveGrowthRoll(next, entry, {});
        setChar(next);
        setGrowthResult(null);
        advance();
      } catch {
        setGrowthResult({ type: "redirect", original: entry });
      }
    }
  };

  const handleGrowthResolve = (entry, choices) => {
    const next = deepClone(char);
    resolveGrowthRoll(next, entry, choices);
    setChar(next);
    setGrowthResult(null);
    advance();
  };

  const handleGrowthRedirect = (skillName) => {
    const next = deepClone(char);
    resolveLearningPick(next, skillName);
    setChar(next);
    setGrowthResult(null);
    advance();
  };

  const handleRollLearning = (pickNum) => {
    const roll = rollDie(8) - 1;
    const entry = bgData.learning[roll];

    if (entry === "Any Skill" || entry === "Any Combat") {
      setLearningResult({ entry, pickNum });
      return;
    }

    const next = deepClone(char);
    try {
      resolveLearningPick(next, entry);
      setChar(next);
      advance();
    } catch {
      setLearningResult({ type: "redirect", original: entry, pickNum });
    }
  };

  const handleLearningResolve = (skillName) => {
    const next = deepClone(char);
    resolveLearningPick(next, skillName);
    setChar(next);
    setLearningResult(null);
    advance();
  };

  const handleBonusSkill = (skillName) => {
    const next = deepClone(char);
    addBonusSkill(next, skillName);
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

  return (
    <div className="app">
      <Header step={step} />
      <ProgressBar step={step} />

      <div className="layout">
        <div className="main">
          {/* --- Roll Attributes --- */}
          {currentStep === "roll_attributes" && (
            <div className="step-panel" key="roll">
              <div className="step-label">Step 01</div>
              <h2 className="step-title">Roll Attributes</h2>
              <p className="step-desc">
                Generate your operative&apos;s base attributes by rolling 3d6 for each stat.
              </p>
              <button className="btn-action" onClick={handleRollAttributes}>
                <span className="btn-prompt">&gt;_</span> Roll 3d6 for each stat
              </button>
            </div>
          )}

          {/* --- Bump Stat --- */}
          {currentStep === "bump_stat" && (
            <div className="step-panel" key="bump">
              <div className="step-label">Step 02</div>
              <h2 className="step-title">Bump One Stat to 14</h2>
              <p className="step-desc">
                Choose one attribute to set to 14 &mdash; this represents your operative&apos;s defining strength.
              </p>
              <div className="choices">
                {ATTR_NAMES.map((attr) => (
                  <button
                    key={attr}
                    className="btn-choice"
                    onClick={() => handleBumpStat(attr)}
                  >
                    {attr}
                    <span className="btn-choice-sub">
                      currently {char.attributes[attr].score}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* --- Pick Background --- */}
          {currentStep === "pick_background" && (
            <div className="step-panel" key="bg">
              <div className="step-label">Step 03</div>
              <h2 className="step-title">Choose Background</h2>
              {!offers ? (
                <>
                  <p className="step-desc">
                    Draw three background dossiers from the archive. Choose one to define your operative&apos;s past.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => setOffers(offerBackgrounds(char, 3))}
                  >
                    <span className="btn-prompt">&gt;_</span> Draw 3 Backgrounds
                  </button>
                </>
              ) : (
                <div className="offer-grid">
                  {offers.map((bg, i) => (
                    <button
                      key={bg.name}
                      className="offer-card"
                      style={{ animationDelay: `${i * 0.1}s` }}
                      onClick={() => handlePickBackground(bg.name)}
                    >
                      <span className="offer-card-id">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{bg.name}</h3>
                      <p className="offer-card-desc">{bg.description}</p>
                      <span className="offer-card-detail">
                        Free skill: {bg.free_skill}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Growth --- */}
          {currentStep === "growth" && bgData && (
            <div className="step-panel" key="growth">
              <div className="step-label">Step 04</div>
              <h2 className="step-title">Growth Roll</h2>
              {!growthResult ? (
                <>
                  <p className="step-desc">
                    Roll on your background&apos;s growth table to gain a stat bonus or skill.
                  </p>
                  <button className="btn-action" onClick={handleRollGrowth}>
                    <span className="btn-prompt">&gt;_</span> Roll 1d6 on growth table
                  </button>
                </>
              ) : growthResult.type === "redirect" ? (
                <div className="growth-panel">
                  <p className="step-desc">
                    Rolled{" "}
                    <strong className="growth-result">
                      {growthResult.original}
                    </strong>{" "}
                    but it&apos;s already at cap. Pick any other skill:
                  </p>
                  <div className="choices">
                    {availableSkills.map((s) => (
                      <button
                        key={s}
                        className="btn-choice"
                        onClick={() => handleGrowthRedirect(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <GrowthResolver
                  entry={growthResult}
                  char={char}
                  onResolve={handleGrowthResolve}
                  onPickSkill={handleGrowthRedirect}
                />
              )}
            </div>
          )}

          {/* --- Learning 1 --- */}
          {currentStep === "learning_1" && bgData && (
            <div className="step-panel" key="learn1">
              <div className="step-label">Step 05</div>
              <h2 className="step-title">Learning Roll (1 of 2)</h2>
              {!learningResult ? (
                <>
                  <p className="step-desc">
                    Roll on your background&apos;s learning table to acquire a new skill.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => handleRollLearning(1)}
                  >
                    <span className="btn-prompt">&gt;_</span> Roll 1d8 on learning table
                  </button>
                </>
              ) : learningResult.type === "redirect" ? (
                <div className="growth-panel">
                  <p className="step-desc">
                    Rolled{" "}
                    <strong className="growth-result">
                      {learningResult.original}
                    </strong>{" "}
                    but it&apos;s already at cap. Pick any other skill:
                  </p>
                  <div className="choices">
                    {availableSkills.map((s) => (
                      <button
                        key={s}
                        className="btn-choice"
                        onClick={() => handleLearningResolve(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="growth-panel">
                  <p className="step-desc">
                    Rolled:{" "}
                    <strong className="growth-result">
                      {learningResult.entry}
                    </strong>{" "}
                    &mdash; pick a skill:
                  </p>
                  <div className="choices">
                    {(learningResult.entry === "Any Combat"
                      ? COMBAT_SKILLS
                      : availableSkills
                    )
                      .filter(
                        (s) =>
                          char.skills[s] === undefined || char.skills[s] < 1
                      )
                      .map((s) => (
                        <button
                          key={s}
                          className="btn-choice"
                          onClick={() => handleLearningResolve(s)}
                        >
                          {s}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- Learning 2 --- */}
          {currentStep === "learning_2" && bgData && (
            <div className="step-panel" key="learn2">
              <div className="step-label">Step 06</div>
              <h2 className="step-title">Learning Roll (2 of 2)</h2>
              {!learningResult ? (
                <>
                  <p className="step-desc">
                    Roll again on your background&apos;s learning table for another skill.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => handleRollLearning(2)}
                  >
                    <span className="btn-prompt">&gt;_</span> Roll 1d8 on learning table
                  </button>
                </>
              ) : learningResult.type === "redirect" ? (
                <div className="growth-panel">
                  <p className="step-desc">
                    Rolled{" "}
                    <strong className="growth-result">
                      {learningResult.original}
                    </strong>{" "}
                    but it&apos;s already at cap. Pick any other skill:
                  </p>
                  <div className="choices">
                    {availableSkills.map((s) => (
                      <button
                        key={s}
                        className="btn-choice"
                        onClick={() => handleLearningResolve(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="growth-panel">
                  <p className="step-desc">
                    Rolled:{" "}
                    <strong className="growth-result">
                      {learningResult.entry}
                    </strong>{" "}
                    &mdash; pick a skill:
                  </p>
                  <div className="choices">
                    {(learningResult.entry === "Any Combat"
                      ? COMBAT_SKILLS
                      : availableSkills
                    )
                      .filter(
                        (s) =>
                          char.skills[s] === undefined || char.skills[s] < 1
                      )
                      .map((s) => (
                        <button
                          key={s}
                          className="btn-choice"
                          onClick={() => handleLearningResolve(s)}
                        >
                          {s}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --- Pick Edge 1 --- */}
          {currentStep === "pick_edge_1" && (
            <div className="step-panel" key="edge1">
              <div className="step-label">Step 07</div>
              <h2 className="step-title">Choose Edge (1 of 2)</h2>
              {!offers ? (
                <>
                  <p className="step-desc">
                    Draw three edge files. Edges give your operative unique advantages in the city.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => setOffers(offerEdges(char, 3))}
                  >
                    <span className="btn-prompt">&gt;_</span> Draw 3 Edges
                  </button>
                </>
              ) : (
                <div className="offer-grid">
                  {offers.map((edge, i) => (
                    <button
                      key={edge.name}
                      className="offer-card"
                      style={{ animationDelay: `${i * 0.1}s` }}
                      onClick={() => handlePickEdge(edge.name)}
                    >
                      <span className="offer-card-id">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{edge.name}</h3>
                      <p className="offer-card-desc">{edge.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Pick Edge 2 --- */}
          {currentStep === "pick_edge_2" && (
            <div className="step-panel" key="edge2">
              <div className="step-label">Step 07</div>
              <h2 className="step-title">Choose Edge (2 of 2)</h2>
              {!offers ? (
                <>
                  <p className="step-desc">
                    Draw three more edge files for your second edge.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => setOffers(offerEdges(char, 3))}
                  >
                    <span className="btn-prompt">&gt;_</span> Draw 3 Edges
                  </button>
                </>
              ) : (
                <div className="offer-grid">
                  {offers.map((edge, i) => (
                    <button
                      key={edge.name}
                      className="offer-card"
                      style={{ animationDelay: `${i * 0.1}s` }}
                      onClick={() => handlePickEdge(edge.name)}
                    >
                      <span className="offer-card-id">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{edge.name}</h3>
                      <p className="offer-card-desc">{edge.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Pick Focus --- */}
          {currentStep === "pick_focus" && (
            <div className="step-panel" key="focus">
              <div className="step-label">Step 08</div>
              <h2 className="step-title">Choose Focus</h2>
              {!offers ? (
                <>
                  <p className="step-desc">
                    Draw three focus specializations. Your focus defines your operative&apos;s trained expertise.
                  </p>
                  <button
                    className="btn-action"
                    onClick={() => setOffers(offerFoci(char, 3))}
                  >
                    <span className="btn-prompt">&gt;_</span> Draw 3 Foci
                  </button>
                </>
              ) : (
                <div className="offer-grid">
                  {offers.map((focus, i) => (
                    <button
                      key={focus.name}
                      className="offer-card"
                      style={{ animationDelay: `${i * 0.1}s` }}
                      onClick={() => handlePickFocus(focus.name)}
                    >
                      <span className="offer-card-id">
                        #{String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{focus.name}</h3>
                      <p className="offer-card-desc">{focus.description}</p>
                      <span className="offer-card-detail">{focus.level_1}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* --- Bonus Skill --- */}
          {currentStep === "bonus_skill" && (
            <div className="step-panel" key="bonus">
              <div className="step-label">Step 09</div>
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

          {/* --- Done --- */}
          {currentStep === "done" && (
            <div className="step-panel" key="done">
              <div className="step-label">Complete</div>
              <h2 className="step-title">Character Complete</h2>
              {char.hp === 0 ? (
                <>
                  <p className="step-desc">
                    Finalize your operative. Roll for hit points and calculate combat readiness.
                  </p>
                  <button className="btn-action" onClick={handleFinish}>
                    <span className="btn-prompt">&gt;_</span> Roll HP &amp;
                    Calculate Stats
                  </button>
                </>
              ) : (
                <pre className="complete-json">
                  {JSON.stringify(char, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        <Sidebar char={char} />
      </div>
    </div>
  );
}

/* ===== GrowthResolver ===== */

function GrowthResolver({ entry, char, onResolve, onPickSkill }) {
  const [splitMode, setSplitMode] = useState(false);
  const [stat1, setStat1] = useState("");
  const [stat2, setStat2] = useState("");

  if (entry === "Any Skill") {
    const available = ALL_SKILLS.filter(
      (s) => char.skills[s] === undefined || char.skills[s] < 1
    );
    return (
      <div className="growth-panel">
        <p className="step-desc">
          Rolled: <strong className="growth-result">Any Skill</strong> &mdash;
          pick one:
        </p>
        <div className="choices">
          {available.map((s) => (
            <button
              key={s}
              className="btn-choice"
              onClick={() => onPickSkill(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const match = entry.match(/^\+(\d)\s+(.+)$/);
  if (!match) return null;
  const bonus = parseInt(match[1]);
  const category = match[2];

  const validStats =
    category === "Physical"
      ? ["strength", "dexterity", "constitution"]
      : category === "Mental"
        ? ["intelligence", "wisdom", "charisma"]
        : ATTR_NAMES;

  return (
    <div className="growth-panel">
      <p className="step-desc">
        Rolled: <strong className="growth-result">{entry}</strong>
      </p>
      {bonus === 2 && (
        <label>
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
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={stat2} onChange={(e) => setStat2(e.target.value)}>
            <option value="">Stat 2</option>
            {validStats
              .filter((s) => s !== stat1)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
          <button
            className="btn-action"
            disabled={!stat1 || !stat2}
            onClick={() => onResolve(entry, { split: { stat1, stat2 } })}
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
              onClick={() => onResolve(entry, { stat: s })}
            >
              {s}
              <span className="btn-choice-sub">
                {char.attributes[s].score}
              </span>
            </button>
          ))}
        </div>
      )}
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

function Sidebar({ char }) {
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
    <aside className="sheet">
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
    </aside>
  );
}

export default App;
